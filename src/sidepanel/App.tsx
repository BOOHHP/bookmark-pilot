import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CategoryNode,
  ClassifyProgress,
  ClassifyResult,
  FlatBookmark,
} from '../types';
import { classify, classifyIncremental, estimateClassify, loadSavedResult, type ClassifyEstimate } from '../core/classifier';
import {
  applyToBookmarks,
  backupBookmarks,
  backupToHtml,
  dedupeByUrl,
  getApplyRecord,
  getBackup,
  getFlatBookmarks,
  planApply,
  undoApply,
} from '../core/bookmarks';
import { deleteNode, moveBookmark, renameNode } from '../core/treeEdit';
import { loadSettings } from '../core/settings';
import { DEFAULT_SETTINGS, fontCss, type Settings } from '../types';
import { applyColorMode, t } from '../core/i18n';
import { Tree, type TreeEditHandlers } from './Tree';
import { HealthPanel } from './HealthPanel';
import { Onboarding } from './Onboarding';

/** 应用外观设置到根元素 CSS 变量 + 颜色模式 */
function applyAppearance(s: Settings) {
  const root = document.documentElement;
  root.style.setProperty('--accent', s.themeColor);
  root.style.setProperty('--app-font', fontCss(s.fontFamily));
  root.style.setProperty('--app-font-size', `${s.fontSize}px`);
  applyColorMode(s.colorMode);
}

export function App() {
  const [bookmarks, setBookmarks] = useState<FlatBookmark[]>([]);
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [progress, setProgress] = useState<ClassifyProgress>({ phase: 'idle', done: 0, total: 0 });
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applying, setApplying] = useState(false);
  const [hasBackup, setHasBackup] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [view, setView] = useState<'tree' | 'health'>('tree');
  const [notice, setNotice] = useState('');
  const [estimate, setEstimate] = useState<ClassifyEstimate | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [uiSettings, setUiSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const abortRef = useRef<AbortController | null>(null);
  const d = t(uiSettings.language);

  useEffect(() => {
    getFlatBookmarks().then(setBookmarks);
    loadSavedResult().then(setResult);
    getBackup().then((b) => setHasBackup(!!b));
    getApplyRecord().then((r) => setCanUndo(!!r));
    chrome.storage.local
      .get('pendingNewBookmarks')
      .then((data) => setPendingIds(data.pendingNewBookmarks ?? []));
    // 外观 + 语言：初始应用 + 监听设置变更实时生效
    loadSettings().then((s) => {
      setUiSettings(s);
      applyAppearance(s);
      setSettingsLoaded(true);
    });
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes.settings?.newValue) {
        const s = changes.settings.newValue as Settings;
        setUiSettings(s);
        applyAppearance(s);
      }
      if (area === 'local' && changes.pendingNewBookmarks) {
        setPendingIds(changes.pendingNewBookmarks.newValue ?? []);
      }
    };
    chrome.storage.onChanged.addListener(onChanged);
    // 浏览器中删除/修改书签时，同步刷新侧边栏
    const onBmRemoved = (id: string) => {
      getFlatBookmarks().then(setBookmarks);
      // 从分类树和标签中剔除该书签并持久化
      setResult((prev) => {
        if (!prev) return prev;
        const pruneId = (nodes: CategoryNode[]): boolean => {
          let changed = false;
          for (const n of nodes) {
            const i = n.bookmarkIds?.indexOf(id) ?? -1;
            if (i >= 0) {
              n.bookmarkIds!.splice(i, 1);
              changed = true;
            }
            if (n.children && pruneId(n.children)) changed = true;
          }
          return changed;
        };
        const tree: CategoryNode[] = JSON.parse(JSON.stringify(prev.tree));
        if (!pruneId(tree) && !prev.labels[id]) return prev;
        const labels = { ...prev.labels };
        delete labels[id];
        const next = { ...prev, tree, labels };
        chrome.storage.local.set({ classifyResult: next });
        return next;
      });
    };
    const onBmChanged = () => getFlatBookmarks().then(setBookmarks);
    chrome.bookmarks.onRemoved.addListener(onBmRemoved);
    chrome.bookmarks.onChanged.addListener(onBmChanged);
    // 系统深浅色变化时重新应用（system 模式）
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onScheme = () => loadSettings().then((s) => applyColorMode(s.colorMode));
    mq.addEventListener('change', onScheme);
    return () => {
      chrome.storage.onChanged.removeListener(onChanged);
      chrome.bookmarks.onRemoved.removeListener(onBmRemoved);
      chrome.bookmarks.onChanged.removeListener(onBmChanged);
      mq.removeEventListener('change', onScheme);
    };
  }, []);

  const running = progress.phase === 'labeling' || progress.phase === 'building' || progress.phase === 'assigning';

  /** 执行分类；limit 限制条数（试分类） */
  const runClassify = useCallback(async (limit?: number) => {
    setError('');
    setNotice('');
    setEstimate(null);
    const settings = await loadSettings();
    if (!settings.apiKey) {
      setError(d.needApiKey);
      chrome.runtime.openOptionsPage();
      return;
    }
    const all = await getFlatBookmarks();
    setBookmarks(all);
    let unique = dedupeByUrl(all);
    if (limit) unique = unique.slice(0, limit);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const r = await classify(settings, unique, setProgress, ctrl.signal);
      setResult(r);
      if (limit) setNotice(d.trialNotice(unique.length));
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setError(`${d.classifyFailed}: ${(e as Error).message}`);
        setProgress({ phase: 'error', done: 0, total: 0 });
      } else {
        setProgress({ phase: 'idle', done: 0, total: 0 });
      }
    }
  }, [d]);

  /** 点击分类：先出成本预估确认 */
  const startClassify = useCallback(async () => {
    setError('');
    const settings = await loadSettings();
    if (!settings.apiKey) {
      setError(d.needApiKey);
      chrome.runtime.openOptionsPage();
      return;
    }
    const all = await getFlatBookmarks();
    setBookmarks(all);
    setEstimate(await estimateClassify(dedupeByUrl(all)));
  }, [d]);

  const cancelClassify = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const applyPlan = useMemo(() => (result ? planApply(result.tree) : null), [result]);

  const doApply = useCallback(async () => {
    if (!result) return;
    setApplying(true);
    setError('');
    try {
      await backupBookmarks();
      setHasBackup(true);
      await applyToBookmarks(result.tree);
      setCanUndo(true);
      setShowApplyModal(false);
      // 应用后书签 id 不变，但树结构变了，刷新列表
      setBookmarks(await getFlatBookmarks());
    } catch (e) {
      setError(`${d.applyFailed}: ${(e as Error).message}`);
    } finally {
      setApplying(false);
    }
  }, [result]);

  const doUndo = useCallback(async () => {
    if (!confirm(d.undoConfirm)) return;
    setUndoing(true);
    setError('');
    try {
      const n = await undoApply();
      setCanUndo(false);
      setNotice(d.undoDone(n));
      setBookmarks(await getFlatBookmarks());
    } catch (e) {
      setError(`${d.applyFailed}: ${(e as Error).message}`);
    } finally {
      setUndoing(false);
    }
  }, [d]);

  /** 树编辑：更新 state 并持久化 */
  const updateTree = useCallback((mutate: (tree: CategoryNode[]) => CategoryNode[]) => {
    setResult((prev) => {
      if (!prev) return prev;
      const next = { ...prev, tree: mutate(prev.tree) };
      chrome.storage.local.set({ classifyResult: next });
      return next;
    });
  }, []);

  const editHandlers: TreeEditHandlers = useMemo(
    () => ({
      onRename: (path, name) => updateTree((tree) => renameNode(tree, path, name)),
      onDelete: (path) => updateTree((tree) => deleteNode(tree, path)),
      onMoveBookmark: (id, toPath) => updateTree((tree) => moveBookmark(tree, id, toPath)),
      deleteConfirmText: d.deleteFolderConfirm,
    }),
    [updateTree, d],
  );

  /** 增量归类新书签 */
  const classifyPending = useCallback(async () => {
    if (!result || pendingIds.length === 0) return;
    setError('');
    const settings = await loadSettings();
    if (!settings.apiKey) {
      setError(d.needApiKey);
      chrome.runtime.openOptionsPage();
      return;
    }
    const all = await getFlatBookmarks();
    setBookmarks(all);
    const byId = new Map(all.map((b) => [b.id, b]));
    const fresh = pendingIds.map((id) => byId.get(id)).filter((b): b is NonNullable<typeof b> => !!b);
    if (fresh.length === 0) {
      await chrome.storage.local.set({ pendingNewBookmarks: [] });
      chrome.action.setBadgeText({ text: '' });
      return;
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const r = await classifyIncremental(settings, fresh, result, setProgress, ctrl.signal);
      setResult(r);
      await chrome.storage.local.set({ pendingNewBookmarks: [] });
      chrome.action.setBadgeText({ text: '' });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setError(`${d.classifyFailed}: ${(e as Error).message}`);
        setProgress({ phase: 'error', done: 0, total: 0 });
      } else {
        setProgress({ phase: 'idle', done: 0, total: 0 });
      }
    }
  }, [result, pendingIds, d]);

  const dismissPending = useCallback(async () => {
    await chrome.storage.local.set({ pendingNewBookmarks: [] });
    chrome.action.setBadgeText({ text: '' });
  }, []);

  const downloadBackup = useCallback(async () => {
    const backup = await getBackup();
    if (!backup) return;
    const html = backupToHtml(backup);
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookmarks-backup-${new Date(backup.createdAt).toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const bookmarkById = useMemo(() => new Map(bookmarks.map((b) => [b.id, b])), [bookmarks]);

  // 搜索过滤：保留含命中书签的分类
  const filteredTree = useMemo((): CategoryNode[] | null => {
    if (!result) return null;
    if (!search.trim()) return result.tree;
    const q = search.trim().toLowerCase();
    const match = (id: string) => {
      const b = bookmarkById.get(id);
      const l = result.labels[id];
      return (
        b?.title.toLowerCase().includes(q) ||
        b?.url.toLowerCase().includes(q) ||
        l?.summary.toLowerCase().includes(q) ||
        l?.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    };
    const filter = (nodes: CategoryNode[]): CategoryNode[] =>
      nodes
        .map((n) => ({
          ...n,
          children: n.children ? filter(n.children) : undefined,
          bookmarkIds: n.bookmarkIds?.filter(match),
        }))
        .filter((n) => (n.bookmarkIds?.length ?? 0) > 0 || (n.children?.length ?? 0) > 0);
    return filter(result.tree);
  }, [result, search, bookmarkById]);

  return (
    <div className="app">
      {view === 'health' ? (
        <HealthPanel
          d={d}
          bookmarks={bookmarks}
          onBack={() => setView('tree')}
          onBookmarksChanged={() => getFlatBookmarks().then(setBookmarks)}
        />
      ) : settingsLoaded && !uiSettings.apiKey && !result && !running ? (
        <Onboarding
          d={d}
          settings={uiSettings}
          bookmarkCount={bookmarks.length}
          onStart={runClassify}
        />
      ) : (
        <>
          <div className="toolbar">
            <input
              className="search"
              placeholder={d.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {running ? (
              <button className="danger" onClick={cancelClassify}>{d.cancel}</button>
            ) : (
              <button className="primary" onClick={startClassify}>
                {result ? d.reclassify : d.classify}
              </button>
            )}
            {result && !running && (
              <button className="primary" onClick={() => setShowApplyModal(true)}>
                {d.applyToBookmarks}
              </button>
            )}
            <button onClick={() => setView('health')} title={d.healthTitle}>🩺</button>
            <button onClick={() => chrome.runtime.openOptionsPage()}>⚙️</button>
          </div>

          {pendingIds.length > 0 && result && !running && (
            <div className="pending-banner">
              <span>{d.pendingBanner(pendingIds.length)}</span>
              <button className="primary" onClick={classifyPending}>{d.classifyPending}</button>
              <button onClick={dismissPending}>{d.dismissPending}</button>
            </div>
          )}

          {(running || progress.phase === 'done') && (
            <div className="status-bar">
              {progress.phase === 'labeling' && d.phaseLabeling}
              {progress.phase === 'building' && d.phaseBuilding}
              {progress.phase === 'assigning' && d.phaseAssigning}
              {progress.phase === 'done' && d.phaseDone}
              {progress.phase === 'error' && d.phaseError}
              {progress.total > 0 && ` (${progress.done}/${progress.total})`}
              {running && (
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {error && <div className="error-msg">{error}</div>}
          {notice && <div className="status-bar">{notice}</div>}

          {result && !running && !search.trim() && (
            <div className="edit-hint">{d.editHint}</div>
          )}

          <div className="tree">
            {filteredTree ? (
              <Tree
                nodes={filteredTree}
                bookmarkById={bookmarkById}
                labels={result!.labels}
                edit={search.trim() ? undefined : editHandlers}
              />
            ) : (
              <div className="empty">
                {d.emptyLine1(bookmarks.length)}
                <br />
                {d.emptyLine2}
              </div>
            )}
          </div>

          {(hasBackup || canUndo) && (
            <div className="status-bar footer-actions">
              {canUndo && (
                <button className="danger" onClick={doUndo} disabled={undoing}>
                  {undoing ? d.undoing : d.undoApply}
                </button>
              )}
              {hasBackup && (
                <a href="#" onClick={(e) => { e.preventDefault(); downloadBackup(); }}>
                  {d.downloadBackup}
                </a>
              )}
            </div>
          )}

          {showApplyModal && applyPlan && (
            <div className="modal-backdrop" onClick={() => !applying && setShowApplyModal(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h3>{d.applyModalTitle}</h3>
                <div>
                  {d.applyModalDesc}
                  <br />• {d.applyFolders(applyPlan.folderCount)}
                  <br />• {d.applyMoves(applyPlan.moveCount)}
                  <br />
                  <small>{d.applyNote}</small>
                </div>
                <div className="actions">
                  <button onClick={() => setShowApplyModal(false)} disabled={applying}>{d.cancel}</button>
                  <button className="primary" onClick={doApply} disabled={applying}>
                    {applying ? d.applying : d.confirmApply}
                  </button>
                </div>
              </div>
            </div>
          )}

          {estimate && (
            <div className="modal-backdrop" onClick={() => setEstimate(null)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h3>{d.estimateTitle}</h3>
                <div>
                  • {d.estimateTotal(estimate.total)}
                  {estimate.cached > 0 && (
                    <>
                      <br />• {d.estimateCached(estimate.cached)}
                    </>
                  )}
                  <br />• {d.estimateRequests(estimate.requests)}
                  <br />
                  <small>{d.estimateNote}</small>
                </div>
                <div className="actions">
                  <button onClick={() => setEstimate(null)}>{d.cancel}</button>
                  <button className="primary" onClick={() => runClassify()}>{d.startNow}</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
