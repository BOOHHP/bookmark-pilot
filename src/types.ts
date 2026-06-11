// 共享类型定义

/** 拍平后的书签项 */
export interface FlatBookmark {
  id: string;
  title: string;
  url: string;
  /** 原文件夹路径，如 "书签栏/开发/前端" */
  folderPath: string;
}

/** LLM 打标结果（阶段一 Map） */
export interface BookmarkLabel {
  id: string;
  summary: string;
  tags: string[];
}

/** 金字塔分类树节点（阶段二 Reduce 输出） */
export interface CategoryNode {
  name: string;
  children?: CategoryNode[];
  /** 叶子节点挂载的书签 id 列表 */
  bookmarkIds?: string[];
}

/** 完整分类结果 */
export interface ClassifyResult {
  tree: CategoryNode[];
  labels: Record<string, BookmarkLabel>;
  /** 生成时间戳 */
  createdAt: number;
}

/** 分类任务进度 */
export interface ClassifyProgress {
  phase: 'idle' | 'labeling' | 'building' | 'assigning' | 'done' | 'error';
  done: number;
  total: number;
  message?: string;
}

/** API 协议风格 */
export type ApiStyle = 'openai' | 'anthropic' | 'gemini';

/** 模型供应商预设 */
export interface Provider {
  id: string;
  label: string;
  apiStyle: ApiStyle;
  baseUrl: string;
  defaultModel: string;
  /** 常用模型建议（可手填覆盖） */
  models: string[];
  /** 获取 API Key 的页面 */
  keyUrl: string;
  /** 官网 */
  homeUrl: string;
}

export const PROVIDERS: Provider[] = [
  {
    id: 'agnes',
    label: 'Agnes AI',
    apiStyle: 'openai',
    baseUrl: 'https://apihub.agnes-ai.com/v1/chat/completions',
    defaultModel: 'agnes-2.0-flash',
    models: ['agnes-2.0-flash', 'agnes-1.5-flash'],
    keyUrl: 'https://platform.agnes-ai.com/settings/apiKeys',
    homeUrl: 'https://agnes-ai.com',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    apiStyle: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'openai/gpt-4o-mini',
    models: ['openai/gpt-4o-mini', 'anthropic/claude-3.5-haiku', 'google/gemini-2.0-flash-001', 'deepseek/deepseek-chat'],
    keyUrl: 'https://openrouter.ai/settings/keys',
    homeUrl: 'https://openrouter.ai',
  },
  {
    id: 'openai',
    label: 'OpenAI (Codex)',
    apiStyle: 'openai',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini'],
    keyUrl: 'https://platform.openai.com/api-keys',
    homeUrl: 'https://platform.openai.com',
  },
  {
    id: 'claude',
    label: 'Claude (Anthropic)',
    apiStyle: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-3-5-haiku-latest',
    models: ['claude-3-5-haiku-latest', 'claude-sonnet-4-20250514'],
    keyUrl: 'https://console.anthropic.com/settings/keys',
    homeUrl: 'https://www.anthropic.com',
  },
  {
    id: 'gemini',
    label: 'Gemini (Google)',
    apiStyle: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    keyUrl: 'https://aistudio.google.com/apikey',
    homeUrl: 'https://ai.google.dev',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    apiStyle: 'openai',
    baseUrl: 'https://api.deepseek.com/v1/chat/completions',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    keyUrl: 'https://platform.deepseek.com/api_keys',
    homeUrl: 'https://www.deepseek.com',
  },
];

export function getProvider(id: string): Provider {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}

/** 插件设置 */
export interface Settings {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  /** 外观：字体 */
  fontFamily: string;
  /** 外观：字号 px */
  fontSize: number;
  /** 外观：主题强调色 */
  themeColor: string;
  /** 外观：界面语言 */
  language: 'auto' | 'zh' | 'en';
  /** 外观：颜色模式 */
  colorMode: 'system' | 'light' | 'dark';
}

export const DEFAULT_SETTINGS: Settings = {
  provider: 'agnes',
  apiKey: '',
  baseUrl: 'https://apihub.agnes-ai.com/v1/chat/completions',
  model: 'agnes-2.0-flash',
  fontFamily: 'system',
  fontSize: 14,
  themeColor: '#7c9a72',
  language: 'auto',
  colorMode: 'system',
};

/** 可选字体列表（value → CSS font-family） */
export const FONT_OPTIONS: { value: string; label: string; css: string }[] = [
  { value: 'system', label: '系统默认', css: "-apple-system, 'Segoe UI', 'Microsoft YaHei', sans-serif" },
  { value: 'yahei', label: '微软雅黑', css: "'Microsoft YaHei', sans-serif" },
  { value: 'songti', label: '宋体', css: "SimSun, serif" },
  { value: 'kaiti', label: '楷体', css: "KaiTi, serif" },
  { value: 'mono', label: '等宽字体', css: "Consolas, 'Cascadia Mono', monospace" },
];

export function fontCss(value: string): string {
  return FONT_OPTIONS.find((f) => f.value === value)?.css ?? FONT_OPTIONS[0].css;
}

/** 书签树备份（应用前自动保存） */
export interface BookmarkBackup {
  createdAt: number;
  tree: chrome.bookmarks.BookmarkTreeNode[];
}

/** 应用操作记录（用于一键撤销） */
export interface ApplyRecord {
  createdAt: number;
  /** 应用时创建的根文件夹 id（撤销时整体删除） */
  rootFolderId: string;
  /** 每条被移动书签的原位置 */
  moves: { id: string; oldParentId: string; oldIndex: number }[];
}

/** 健康检查问题项 */
export interface HealthIssue {
  bookmark: FlatBookmark;
  kind: 'duplicate' | 'dead';
  /** 重复项：与哪条书签重复（保留项的 id）；死链：HTTP 状态或错误信息 */
  detail: string;
}

/** 健康检查进度 */
export interface HealthProgress {
  phase: 'idle' | 'checking' | 'done';
  done: number;
  total: number;
}
