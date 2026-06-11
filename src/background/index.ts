// Service Worker：点击工具栏图标打开侧边栏 + 监听新书签 + 代理死链探测
import { fetchPageMeta, probeUrl } from '../core/probe';

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
});

// 死链探测在 SW 中执行：SW 无 DOM，不会触发被测站点的 preload/CSP 噪音
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'probeUrl' && typeof msg.url === 'string') {
    probeUrl(msg.url).then(sendResponse);
    return true; // 异步响应
  }
  if (msg?.type === 'fetchMeta' && typeof msg.url === 'string') {
    fetchPageMeta(msg.url).then(sendResponse);
    return true;
  }
});

const PENDING_KEY = 'pendingNewBookmarks';

async function getPending(): Promise<string[]> {
  const data = await chrome.storage.local.get(PENDING_KEY);
  return data[PENDING_KEY] ?? [];
}

async function setPending(ids: string[]): Promise<void> {
  await chrome.storage.local.set({ [PENDING_KEY]: ids });
  await chrome.action.setBadgeText({ text: ids.length ? String(ids.length) : '' });
  if (ids.length) await chrome.action.setBadgeBackgroundColor({ color: '#7c9a72' });
}

// 新书签 → 加入待归类列表（仅 http/https，且已有分类结果时才提示）
chrome.bookmarks.onCreated.addListener(async (id, node) => {
  if (!node.url || !/^https?:/.test(node.url)) return;
  const { classifyResult } = await chrome.storage.local.get('classifyResult');
  if (!classifyResult) return;
  const pending = await getPending();
  if (!pending.includes(id)) {
    pending.push(id);
    await setPending(pending);
  }
});

// 书签被删除 → 从待归类列表移除
chrome.bookmarks.onRemoved.addListener(async (id) => {
  const pending = await getPending();
  const next = pending.filter((p) => p !== id);
  if (next.length !== pending.length) await setPending(next);
});

// 启动时同步角标
getPending().then((ids) =>
  chrome.action.setBadgeText({ text: ids.length ? String(ids.length) : '' }),
);

export {};
