import { useRef, useState } from 'react';
import type { FlatBookmark, HealthIssue, HealthProgress } from '../types';
import {
  findDeadLinks,
  findDuplicates,
  hasAllUrlsPermission,
  removeBookmarks,
  requestAllUrlsPermission,
} from '../core/health';
import type { Dict } from '../core/i18n';

interface HealthPanelProps {
  d: Dict;
  bookmarks: FlatBookmark[];
  onBack: () => void;
  onBookmarksChanged: () => void;
}

export function HealthPanel({ d, bookmarks, onBack, onBookmarksChanged }: HealthPanelProps) {
  const [dups, setDups] = useState<HealthIssue[] | null>(null);
  const [dead, setDead] = useState<HealthIssue[] | null>(null);
  const [progress, setProgress] = useState<HealthProgress>({ phase: 'idle', done: 0, total: 0 });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const checking = progress.phase === 'checking';

  const runDup = () => {
    setMsg('');
    setDups(findDuplicates(bookmarks));
  };

  const runDead = async () => {
    setMsg('');
    const ok = (await hasAllUrlsPermission()) || (await requestAllUrlsPermission());
    if (!ok) {
      setMsg(d.healthPermDenied);
      return;
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      setDead(await findDeadLinks(bookmarks, setProgress, ctrl.signal));
    } catch {
      setProgress({ phase: 'idle', done: 0, total: 0 });
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const issues = [...(dups ?? []), ...(dead ?? [])];

  const selectAll = () => setSelected(new Set(issues.map((i) => i.bookmark.id)));

  const deleteSelected = async () => {
    const n = await removeBookmarks([...selected]);
    setMsg(d.deletedOk(n));
    setDups((prev) => prev?.filter((i) => !selected.has(i.bookmark.id)) ?? null);
    setDead((prev) => prev?.filter((i) => !selected.has(i.bookmark.id)) ?? null);
    setSelected(new Set());
    onBookmarksChanged();
  };

  const renderSection = (title: string, items: HealthIssue[]) => (
    <div className="health-section">
      <div className="health-section-title">{title}</div>
      {items.map((i) => (
        <label key={i.bookmark.id} className="health-row">
          <input
            type="checkbox"
            checked={selected.has(i.bookmark.id)}
            onChange={() => toggle(i.bookmark.id)}
          />
          <span className="bm-title" title={i.bookmark.url}>
            {i.bookmark.title}
          </span>
          <span className="health-detail">{i.kind === 'dead' ? i.detail : '♻️'}</span>
        </label>
      ))}
    </div>
  );

  return (
    <div className="health-panel">
      <div className="toolbar">
        <button onClick={onBack}>{d.backToTree}</button>
        <button onClick={runDup} disabled={checking}>{d.healthCheckDup}</button>
        <button onClick={runDead} disabled={checking}>{d.healthCheckDead}</button>
        {checking && (
          <button className="danger" onClick={() => abortRef.current?.abort()}>{d.cancel}</button>
        )}
      </div>
      <p className="hint">{d.healthDesc}</p>
      <p className="hint">{d.healthPermNote}</p>
      {checking && (
        <div className="status-bar">
          {d.healthChecking(progress.done, progress.total)}
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}
      {msg && <div className="status-bar">{msg}</div>}

      <div className="tree">
        {dups !== null && dups.length === 0 && dead === null && (
          <div className="empty">{d.healthNoIssues}</div>
        )}
        {dups !== null && dups.length > 0 && renderSection(d.healthDupSection(dups.length), dups)}
        {dead !== null &&
          (dead.length > 0 ? (
            renderSection(d.healthDeadSection(dead.length), dead)
          ) : (
            <div className="empty">{d.healthNoIssues}</div>
          ))}
      </div>

      {issues.length > 0 && (
        <div className="toolbar">
          <button onClick={selectAll}>{d.selectAll}</button>
          <button className="danger" disabled={selected.size === 0} onClick={deleteSelected}>
            {d.deleteSelected(selected.size)}
          </button>
        </div>
      )}
    </div>
  );
}
