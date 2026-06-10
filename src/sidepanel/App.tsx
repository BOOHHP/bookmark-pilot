import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CategoryNode,
  ClassifyProgress,
  ClassifyResult,
  FlatBookmark,
} from '../types';
import { classify, loadSavedResult } from '../core/classifier';
import {
  applyToBookmarks,
  backupBookmarks,
  backupToHtml,
  dedupeByUrl,
  getBackup,
  getFlatBookmarks,
  planApply,
} from '../core/bookmarks';
import { loadSettings } from '../core/settings';
import { DEFAULT_SETTINGS, fontCss, type Settings } from '../types';
import { applyColorMode, t } from '../core/i18n';
import { Tree } from './Tree';

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
  const [uiSettings, setUiSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const abortRef = useRef<AbortController | null>(null);
  const d = t(uiSettings.language);

  useEffect(() => {
    getFlatBookmarks().then(setBookmarks);
    loadSavedResult().then(setResult);
    getBackup().then((b) => setHasBackup(!!b));
    // 外观 + 语言：初始应用 + 监听设置变更实时生效
    loadSettings().then((s) => {
      setUiSettings(s);
      applyAppearance(s);
    });
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes.settings?.newValue) {
        const s = changes.settings.newValue as Settings;
        setUiSettings(s);
        applyAppearance(s);
      }
    };
    chrome.storage.onChanged.addListener(onChanged);
    // 系统深浅色变化时重新应用（system 模式）
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onScheme = () => loadSettings().then((s) => applyColorMode(s.colorMode));
    mq.addEventListener('change', onScheme);
    return () => {
      chrome.storage.onChanged.removeListener(onChanged);
      mq.removeEventListener('change', onScheme);
    };
  }, []);

  const running = progress.phase === 'labeling' || progress.phase === 'building' || progress.phase === 'assigning';

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
    const unique = dedupeByUrl(all);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const r = await classify(settings, unique, setProgress, ctrl.signal);
      setResult(r);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setError(`${d.classifyFailed}: ${(e as Error).message}`);
        setProgress({ phase: 'error', done: 0, total: 0 });
      } else {
        setProgress({ phase: 'idle', done: 0, total: 0 });
      }
    }
  }, []);

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
      setShowApplyModal(false);
      // 应用后书签 id 不变，但树结构变了，刷新列表
      setBookmarks(await getFlatBookmarks());
    } catch (e) {
      setError(`${d.applyFailed}: ${(e as Error).message}`);
    } finally {
      setApplying(false);
    }
  }, [result]);

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
        l?.summary.toLowerCase().includes(q)
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
        <button onClick={() => chrome.runtime.openOptionsPage()}>⚙️</button>
      </div>

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

      <div className="tree">
        {filteredTree ? (
          <Tree nodes={filteredTree} bookmarkById={bookmarkById} labels={result!.labels} />
        ) : (
          <div className="empty">
            {d.emptyLine1(bookmarks.length)}
            <br />
            {d.emptyLine2}
          </div>
        )}
      </div>

      {hasBackup && (
        <div className="status-bar">
          <a href="#" onClick={(e) => { e.preventDefault(); downloadBackup(); }}>
            {d.downloadBackup}
          </a>
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
    </div>
  );
}
