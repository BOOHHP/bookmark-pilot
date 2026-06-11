// 两阶段 Map-Reduce 分类编排
import type {
  BookmarkLabel,
  CategoryNode,
  ClassifyProgress,
  ClassifyResult,
  FlatBookmark,
  Settings,
} from '../types';
import { chat, extractJson } from './llm';
import { hashUrl, loadCache, saveCache } from './cache';

const BATCH_SIZE = 40;
const CONCURRENCY = 2;
const ASSIGN_BATCH_SIZE = 60;

type ProgressFn = (p: ClassifyProgress) => void;

/** 阶段一：批量打标（带缓存） */
async function labelBookmarks(
  settings: Settings,
  bookmarks: FlatBookmark[],
  onProgress: ProgressFn,
  signal: AbortSignal,
): Promise<Record<string, BookmarkLabel>> {
  const cache = await loadCache();
  const labels: Record<string, BookmarkLabel> = {};
  const pending: FlatBookmark[] = [];

  for (const b of bookmarks) {
    const cached = cache[hashUrl(b.url)];
    if (cached) {
      labels[b.id] = { id: b.id, ...cached };
    } else {
      pending.push(b);
    }
  }

  const total = bookmarks.length;
  let done = total - pending.length;
  onProgress({ phase: 'labeling', done, total });

  const batches: FlatBookmark[][] = [];
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    batches.push(pending.slice(i, i + BATCH_SIZE));
  }

  const runBatch = async (batch: FlatBookmark[]) => {
    const list = batch
      .map((b) => {
        let host = '';
        try {
          host = new URL(b.url).hostname;
        } catch {
          /* ignore */
        }
        return `- id:${b.id} | 标题:${b.title.slice(0, 80)} | 域名:${host} | 原文件夹:${b.folderPath || '无'}`;
      })
      .join('\n');

    const content = await chat(
      settings,
      [
        {
          role: 'system',
          content:
            '你是书签分析助手。根据书签的标题、域名和原文件夹，推断每个网页的用途。' +
            '只输出 JSON 数组，不要任何其他文字。每项格式：' +
            '{"id":"原id","summary":"一句话用途(15字内)","tags":["标签1","标签2"]}。' +
            'tags 用 1-3 个中文通用领域词（如：前端开发、设计资源、新闻资讯、学习教程、工具、娱乐）。',
        },
        { role: 'user', content: `分析以下书签：\n${list}` },
      ],
      { signal, maxTokens: 8192 },
    );

    const parsed = extractJson<BookmarkLabel[]>(content);
    const byId = new Map(batch.map((b) => [b.id, b]));
    for (const item of parsed) {
      const bm = byId.get(String(item.id));
      if (!bm) continue;
      const label: BookmarkLabel = {
        id: bm.id,
        summary: String(item.summary ?? '').slice(0, 50),
        tags: Array.isArray(item.tags) ? item.tags.map(String).slice(0, 3) : [],
      };
      labels[bm.id] = label;
      cache[hashUrl(bm.url)] = { summary: label.summary, tags: label.tags };
    }
    // 未被 LLM 返回的书签给兜底标签
    for (const bm of batch) {
      if (!labels[bm.id]) {
        labels[bm.id] = { id: bm.id, summary: bm.title.slice(0, 30), tags: ['未分类'] };
      }
    }
    done += batch.length;
    await saveCache(cache);
    onProgress({ phase: 'labeling', done, total });
  };

  // 简单并发池
  let idx = 0;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (idx < batches.length) {
      if (signal.aborted) throw new DOMException('已取消', 'AbortError');
      const batch = batches[idx++];
      await runBatch(batch);
    }
  });
  await Promise.all(workers);
  return labels;
}

/** 阶段二 a：根据全部标签汇总生成金字塔分类树（不含书签分配） */
async function buildTree(
  settings: Settings,
  labels: Record<string, BookmarkLabel>,
  signal: AbortSignal,
): Promise<CategoryNode[]> {
  // 统计 tag 频次作为输入，控制 token
  const tagCount = new Map<string, number>();
  for (const l of Object.values(labels)) {
    for (const t of l.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
  }
  const tagSummary = [...tagCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([t, c]) => `${t}(${c})`)
    .join(', ');

  const content = await chat(
    settings,
    [
      {
        role: 'system',
        content:
          '你是信息架构专家。根据标签及其出现次数，设计一个金字塔式书签分类树。' +
          '要求：顶层大类不超过 8 个；最多 2 层（大类→子类）；子类每层不超过 10 个；' +
          '数量少的标签合并进相近大类或"其他"。' +
          '只输出 JSON 数组，格式：[{"name":"大类名","children":[{"name":"子类名"}]}]，' +
          '没有子类的大类可省略 children。不要其他文字。',
      },
      { role: 'user', content: `标签统计：${tagSummary}` },
    ],
    { signal },
  );
  return extractJson<CategoryNode[]>(content);
}

/** 收集树的全部叶子路径 */
function leafPaths(tree: CategoryNode[]): string[] {
  const paths: string[] = [];
  const walk = (nodes: CategoryNode[], prefix: string[]) => {
    for (const n of nodes) {
      const p = [...prefix, n.name];
      if (n.children?.length) walk(n.children, p);
      else paths.push(p.join('/'));
    }
  };
  walk(tree, []);
  return paths;
}

/** 阶段二 b：把每个书签映射到叶子分类 */
async function assignBookmarks(
  settings: Settings,
  tree: CategoryNode[],
  bookmarks: FlatBookmark[],
  labels: Record<string, BookmarkLabel>,
  onProgress: ProgressFn,
  signal: AbortSignal,
): Promise<void> {
  const paths = leafPaths(tree);
  const pathList = paths.map((p, i) => `${i}. ${p}`).join('\n');

  // 建立 path → node 索引
  const nodeByPath = new Map<string, CategoryNode>();
  const walk = (nodes: CategoryNode[], prefix: string[]) => {
    for (const n of nodes) {
      const p = [...prefix, n.name];
      if (n.children?.length) walk(n.children, p);
      else nodeByPath.set(p.join('/'), n);
    }
  };
  walk(tree, []);

  // 确保兜底分类存在
  const FALLBACK = '其他';
  if (!nodeByPath.has(FALLBACK) && ![...nodeByPath.keys()].some((p) => p.startsWith(FALLBACK))) {
    const fallbackNode: CategoryNode = { name: FALLBACK };
    tree.push(fallbackNode);
    nodeByPath.set(FALLBACK, fallbackNode);
    paths.push(FALLBACK);
  }

  const total = bookmarks.length;
  let done = 0;
  onProgress({ phase: 'assigning', done, total });

  for (let i = 0; i < bookmarks.length; i += ASSIGN_BATCH_SIZE) {
    if (signal.aborted) throw new DOMException('已取消', 'AbortError');
    const batch = bookmarks.slice(i, i + ASSIGN_BATCH_SIZE);
    const list = batch
      .map((b) => {
        const l = labels[b.id];
        return `- id:${b.id} | ${b.title.slice(0, 60)} | ${l?.summary ?? ''} | 标签:${l?.tags.join(',') ?? ''}`;
      })
      .join('\n');

    const content = await chat(
      settings,
      [
        {
          role: 'system',
          content:
            `以下是分类目录（编号. 路径）：\n${pathList}\n\n` +
            '把每个书签分配到最合适的分类编号。只输出 JSON 数组：' +
            '[{"id":"书签id","cat":分类编号}]。不要其他文字。',
        },
        { role: 'user', content: list },
      ],
      { signal, maxTokens: 8192 },
    );

    let assignments: { id: string; cat: number }[] = [];
    try {
      assignments = extractJson(content);
    } catch {
      /* 整批解析失败则全部兜底 */
    }
    const assignedIds = new Set<string>();
    for (const a of assignments) {
      const path = paths[a.cat];
      const node = path ? nodeByPath.get(path) : undefined;
      const target = node ?? nodeByPath.get(FALLBACK)!;
      const idStr = String(a.id);
      if (batch.some((b) => b.id === idStr)) {
        (target.bookmarkIds ??= []).push(idStr);
        assignedIds.add(idStr);
      }
    }
    for (const b of batch) {
      if (!assignedIds.has(b.id)) {
        (nodeByPath.get(FALLBACK)!.bookmarkIds ??= []).push(b.id);
      }
    }
    done += batch.length;
    onProgress({ phase: 'assigning', done, total });
  }

  // 清理空分类
  const prune = (nodes: CategoryNode[]): CategoryNode[] =>
    nodes.filter((n) => {
      if (n.children) n.children = prune(n.children);
      return (n.bookmarkIds?.length ?? 0) > 0 || (n.children?.length ?? 0) > 0;
    });
  const pruned = prune(tree);
  tree.length = 0;
  tree.push(...pruned);
}

/** 主入口：跑完整分类流程 */
export async function classify(
  settings: Settings,
  bookmarks: FlatBookmark[],
  onProgress: ProgressFn,
  signal: AbortSignal,
): Promise<ClassifyResult> {
  const labels = await labelBookmarks(settings, bookmarks, onProgress, signal);

  onProgress({ phase: 'building', done: 0, total: 1 });
  const tree = await buildTree(settings, labels, signal);

  await assignBookmarks(settings, tree, bookmarks, labels, onProgress, signal);

  const result: ClassifyResult = { tree, labels, createdAt: Date.now() };
  await chrome.storage.local.set({ classifyResult: result });
  onProgress({ phase: 'done', done: bookmarks.length, total: bookmarks.length });
  return result;
}

export async function loadSavedResult(): Promise<ClassifyResult | null> {
  const data = await chrome.storage.local.get('classifyResult');
  return data.classifyResult ?? null;
}

/**
 * 增量归类：把若干新书签打标后归入现有分类树（不重建树）。
 * 返回更新后的 ClassifyResult（已持久化）。
 */
export async function classifyIncremental(
  settings: Settings,
  newBookmarks: FlatBookmark[],
  existing: ClassifyResult,
  onProgress: ProgressFn,
  signal: AbortSignal,
): Promise<ClassifyResult> {
  const labels = await labelBookmarks(settings, newBookmarks, onProgress, signal);
  const tree: CategoryNode[] = JSON.parse(JSON.stringify(existing.tree));
  await assignBookmarks(settings, tree, newBookmarks, labels, onProgress, signal);
  const result: ClassifyResult = {
    tree,
    labels: { ...existing.labels, ...labels },
    createdAt: Date.now(),
  };
  await chrome.storage.local.set({ classifyResult: result });
  onProgress({ phase: 'done', done: newBookmarks.length, total: newBookmarks.length });
  return result;
}
