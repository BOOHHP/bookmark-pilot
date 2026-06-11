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

/** 探测单条链接是否失效 */
async function probe(url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), DEAD_CHECK_TIMEOUT);
  try {
    // HEAD 更省流量；部分站点不支持则降级 GET
    let resp = await fetch(url, { method: 'HEAD', signal: ctrl.signal, redirect: 'follow' });
    if (resp.status === 405 || resp.status === 501) {
      resp = await fetch(url, { method: 'GET', signal: ctrl.signal, redirect: 'follow' });
    }
    if (resp.status >= 400) return `HTTP ${resp.status}`;
    return null;
  } catch (e) {
    if ((e as Error).name === 'AbortError') return 'timeout';
    // 网络错误：DNS 不存在 / 连接拒绝等
    return 'unreachable';
  } finally {
    clearTimeout(timer);
  }
}

/** 死链检测：并发探测全部书签，返回失效项 */
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
      const detail = await probe(b.url);
      if (detail) issues.push({ bookmark: b, kind: 'dead', detail });
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
