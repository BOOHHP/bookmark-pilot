// 书签健康检查：重复检测（本地）+ 死链检测（需可选 host 权限）
import type { FlatBookmark, HealthIssue, HealthProgress } from '../types';

const DEAD_CHECK_CONCURRENCY = 8;
const DEAD_CHECK_TIMEOUT = 10_000;

/** 重复检测：同一规范化 URL 出现多次，第一条视为保留项 */
export function findDuplicates(bookmarks: FlatBookmark[]): HealthIssue[] {
  const norm = (u: string) => u.replace(/\/+$/, '').replace(/^http:/, 'https:');
  const seen = new Map<string, FlatBookmark>();
  const issues: HealthIssue[] = [];
  for (const b of bookmarks) {
    const key = norm(b.url);
    const first = seen.get(key);
    if (first) {
      issues.push({ bookmark: b, kind: 'duplicate', detail: first.id });
    } else {
      seen.set(key, b);
    }
  }
  return issues;
}

/** 申请 <all_urls> 可选权限（死链检测需要） */
export async function requestAllUrlsPermission(): Promise<boolean> {
  return chrome.permissions.request({ origins: ['<all_urls>'] });
}

export async function hasAllUrlsPermission(): Promise<boolean> {
  return chrome.permissions.contains({ origins: ['<all_urls>'] });
}

/** 探测结果 */
interface ProbeResult {
  kind: 'ok' | 'dead' | 'suspect';
  detail: string;
}

/** 软 404 / 失效内容关键词（标题或正文命中即疑似） */
const SOFT_DEAD_PATTERNS: RegExp[] = [
  // 中文
  /页面不存在|页面未找到|找不到(该|此|你要的)?页面|页面已删除|内容(不存在|已删除|已下架|已失效)/,
  /商品(不存在|已下架|已失效|已删除)|宝贝(不存在|已下架)|店铺不存在/,
  /(文章|视频|帖子|资源)(不存在|已删除|已下架|已失效)/,
  /(请|需要?)登录后(查看|访问|继续)|登录(后)?才能(查看|访问)/,
  // 英文
  /page not found|404 not found|content (not found|unavailable|removed)/i,
  /(item|product|listing) (no longer available|not available|removed|unavailable)/i,
  /(sign|log) ?in (required|to (view|continue|see))/i,
  /this (page|video|post|account) (isn'?t|is not|is no longer) available/i,
];

/** 登录页 URL 特征 */
const LOGIN_URL_PATTERN = /\/(login|signin|sign-in|passport|auth|account\/login)\b/i;

/** 内容层启发式：200 响应进一步判断是否为软 404 / 登录墙 / 跳首页 */
function inspectContent(originalUrl: string, resp: Response, html: string): ProbeResult {
  // 1) 重定向漂移：原 URL 有深路径，最终却落在首页或登录页
  try {
    const orig = new URL(originalUrl);
    const final = new URL(resp.url);
    const origHasPath = orig.pathname.length > 1 || orig.search.length > 0;
    if (LOGIN_URL_PATTERN.test(final.pathname)) {
      return { kind: 'suspect', detail: 'login-wall' };
    }
    if (origHasPath && final.hostname === orig.hostname && final.pathname === '/' && !final.search) {
      return { kind: 'suspect', detail: 'redirect-home' };
    }
  } catch {
    /* URL 解析失败则跳过该项检查 */
  }

  // 2) 软 404 / 失效关键词：只看 <title> 和正文前 4KB，避免误伤长页面中的普通提及
  const titleMatch = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
  const title = titleMatch?.[1] ?? '';
  const snippet = html.slice(0, 4096);
  for (const p of SOFT_DEAD_PATTERNS) {
    if (p.test(title) || p.test(snippet)) {
      return { kind: 'suspect', detail: 'soft-404' };
    }
  }

  // 3) 正文过短：200 但几乎没有内容，多为占位页
  const text = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, '')
    .trim();
  if (html.length > 0 && text.length < 80) {
    return { kind: 'suspect', detail: 'empty-page' };
  }

  return { kind: 'ok', detail: '' };
}

/** 探测单条链接：协议层 + 内容层两级判定 */
async function probe(url: string): Promise<ProbeResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), DEAD_CHECK_TIMEOUT);
  try {
    // 直接 GET：内容层检查需要正文；redirect: 'follow' 下循环重定向会抛 TypeError
    const resp = await fetch(url, {
      method: 'GET',
      signal: ctrl.signal,
      redirect: 'follow',
      credentials: 'omit',
    });

    // —— 协议层 ——
    if (resp.status === 404 || resp.status === 410) {
      return { kind: 'dead', detail: `HTTP ${resp.status}` };
    }
    if (resp.status === 403 || resp.status === 401) {
      // 多为反爬/需鉴权，站点本身可能正常 → 疑似
      return { kind: 'suspect', detail: `HTTP ${resp.status}` };
    }
    if (resp.status >= 500) {
      // 服务器错误可能是临时的 → 疑似
      return { kind: 'suspect', detail: `HTTP ${resp.status}` };
    }
    if (resp.status >= 400) {
      return { kind: 'dead', detail: `HTTP ${resp.status}` };
    }

    // —— 内容层（仅 HTML 响应）——
    const ct = resp.headers.get('content-type') ?? '';
    if (ct.includes('text/html')) {
      const html = (await resp.text()).slice(0, 65536);
      return inspectContent(url, resp, html);
    }
    return { kind: 'ok', detail: '' };
  } catch (e) {
    if ((e as Error).name === 'AbortError') return { kind: 'suspect', detail: 'timeout' };
    // DNS 不存在 / 连接拒绝 / 重定向循环（fetch 统一抛 TypeError）
    return { kind: 'dead', detail: 'unreachable' };
  } finally {
    clearTimeout(timer);
  }
}

/** 死链检测：并发探测全部书签，返回死链与疑似失效项 */
export async function findDeadLinks(
  bookmarks: FlatBookmark[],
  onProgress: (p: HealthProgress) => void,
  signal: AbortSignal,
): Promise<HealthIssue[]> {
  const issues: HealthIssue[] = [];
  const total = bookmarks.length;
  let done = 0;
  let idx = 0;
  onProgress({ phase: 'checking', done, total });

  const workers = Array.from({ length: DEAD_CHECK_CONCURRENCY }, async () => {
    while (idx < bookmarks.length) {
      if (signal.aborted) throw new DOMException('已取消', 'AbortError');
      const b = bookmarks[idx++];
      const r = await probe(b.url);
      if (r.kind !== 'ok') issues.push({ bookmark: b, kind: r.kind, detail: r.detail });
      done++;
      onProgress({ phase: 'checking', done, total });
    }
  });
  await Promise.all(workers);
  onProgress({ phase: 'done', done, total });
  return issues;
}

/** 批量删除书签 */
export async function removeBookmarks(ids: string[]): Promise<number> {
  let removed = 0;
  for (const id of ids) {
    try {
      await chrome.bookmarks.remove(id);
      removed++;
    } catch {
      // 已被删除则跳过
    }
  }
  return removed;
}
