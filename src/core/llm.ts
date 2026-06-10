// 多供应商 LLM 客户端：OpenAI / Anthropic / Gemini 协议，限流、重试、JSON 解析
import { getProvider, type Settings } from '../types';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

const MAX_RETRIES = 4;
const BASE_DELAY_MS = 1500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface RequestSpec {
  url: string;
  headers: Record<string, string>;
  body: unknown;
  extract: (data: any) => string | undefined;
}

/** 按供应商协议构造请求 */
function buildRequest(settings: Settings, messages: ChatMessage[], opts: ChatOptions): RequestSpec {
  const style = getProvider(settings.provider).apiStyle;
  const temperature = opts.temperature ?? 0.2;
  const maxTokens = opts.maxTokens ?? 4096;

  if (style === 'anthropic') {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
    return {
      url: settings.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: {
        model: settings.model,
        max_tokens: maxTokens,
        temperature,
        ...(system ? { system } : {}),
        messages: messages.filter((m) => m.role !== 'system'),
      },
      extract: (data) => data?.content?.[0]?.text,
    };
  }

  if (style === 'gemini') {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
    const base = settings.baseUrl.replace(/\/$/, '');
    return {
      url: `${base}/models/${settings.model}:generateContent`,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': settings.apiKey,
      },
      body: {
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents: messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
        generationConfig: { temperature, maxOutputTokens: maxTokens },
      },
      extract: (data) => data?.candidates?.[0]?.content?.parts?.[0]?.text,
    };
  }

  // openai 兼容（Agnes / OpenRouter / OpenAI / DeepSeek）
  return {
    url: settings.baseUrl,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: {
      model: settings.model,
      messages,
      temperature,
      max_tokens: maxTokens,
    },
    extract: (data) => data?.choices?.[0]?.message?.content,
  };
}

/** 调用 LLM，带 429/5xx 指数退避重试 */
export async function chat(
  settings: Settings,
  messages: ChatMessage[],
  opts: ChatOptions = {},
): Promise<string> {
  const spec = buildRequest(settings, messages, opts);
  let lastError: Error = new Error('未知错误');
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(spec.url, {
        method: 'POST',
        headers: spec.headers,
        body: JSON.stringify(spec.body),
        signal: opts.signal,
      });

      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`API ${res.status}: ${await res.text().catch(() => '')}`);
        await sleep(BASE_DELAY_MS * 2 ** attempt);
        continue;
      }
      if (!res.ok) {
        throw new Error(`API 请求失败 (${res.status}): ${await res.text().catch(() => '')}`);
      }

      const data = await res.json();
      const content = spec.extract(data);
      if (!content) throw new Error('API 返回内容为空');
      return content;
    } catch (e) {
      if (opts.signal?.aborted) throw e;
      if (e instanceof TypeError) {
        // 网络错误，重试
        lastError = e;
        await sleep(BASE_DELAY_MS * 2 ** attempt);
        continue;
      }
      throw e;
    }
  }
  throw lastError;
}

/** 从 LLM 回复中提取 JSON（容忍 ```json 包裹或前后缀文本） */
export function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  // 找到第一个 { 或 [ 到最后一个 } 或 ]
  const start = candidate.search(/[[{]/);
  const end = Math.max(candidate.lastIndexOf('}'), candidate.lastIndexOf(']'));
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('回复中未找到 JSON');
  }
  return JSON.parse(candidate.slice(start, end + 1)) as T;
}

/** 测试 API 连接 */
export async function testConnection(settings: Settings): Promise<string> {
  return chat(settings, [{ role: 'user', content: '回复"OK"两个字母即可。' }], {
    maxTokens: 16,
  });
}

/** 拉取供应商可用模型列表（各家均提供 /models 接口） */
export async function listModels(settings: Settings): Promise<string[]> {
  const style = getProvider(settings.provider).apiStyle;
  let url: string;
  let headers: Record<string, string>;

  if (style === 'anthropic') {
    url = settings.baseUrl.replace(/\/messages\/?$/, '/models');
    headers = {
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    };
  } else if (style === 'gemini') {
    url = `${settings.baseUrl.replace(/\/$/, '')}/models?pageSize=1000`;
    headers = { 'x-goog-api-key': settings.apiKey };
  } else {
    // openai 兼容：.../chat/completions → .../models
    url = settings.baseUrl.replace(/\/chat\/completions\/?$/, '/models');
    headers = { Authorization: `Bearer ${settings.apiKey}` };
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`获取模型列表失败 (${res.status}): ${await res.text().catch(() => '')}`);
  }
  const data = await res.json();

  let ids: string[];
  if (style === 'gemini') {
    // { models: [{ name: "models/gemini-..." , supportedGenerationMethods: [...] }] }
    ids = (data?.models ?? [])
      .filter((m: any) => m?.supportedGenerationMethods?.includes('generateContent') ?? true)
      .map((m: any) => String(m.name).replace(/^models\//, ''));
  } else {
    // OpenAI / Anthropic 风格均为 { data: [{ id }] }
    ids = (data?.data ?? []).map((m: any) => String(m.id));
  }
  return [...new Set(ids)].sort();
}
