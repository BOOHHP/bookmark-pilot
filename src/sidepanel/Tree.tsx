import { useState } from 'react';
import type { BookmarkLabel, CategoryNode, FlatBookmark } from '../types';

function faviconUrl(pageUrl: string): string {
  const url = new URL(chrome.runtime.getURL('/_favicon/'));
  url.searchParams.set('pageUrl', pageUrl);
  url.searchParams.set('size', '16');
  return url.toString();
}

function countBookmarks(node: CategoryNode): number {
  let n = node.bookmarkIds?.length ?? 0;
  for (const c of node.children ?? []) n += countBookmarks(c);
  return n;
}

export interface TreeEditHandlers {
  onRename: (path: number[], newName: string) => void;
  onDelete: (path: number[]) => void;
  onMoveBookmark: (bookmarkId: string, toPath: number[]) => void;
  deleteConfirmText: (name: string) => string;
}

interface TreeProps {
  nodes: CategoryNode[];
  bookmarkById: Map<string, FlatBookmark>;
  labels: Record<string, BookmarkLabel>;
  /** 提供则启用编辑模式（重命名/删除/拖拽） */
  edit?: TreeEditHandlers;
}

export function Tree({ nodes, bookmarkById, labels, edit }: TreeProps) {
  return (
    <div>
      {nodes.map((n, i) => (
        <Folder
          key={`${n.name}-${i}`}
          node={n}
          path={[i]}
          bookmarkById={bookmarkById}
          labels={labels}
          edit={edit}
        />
      ))}
    </div>
  );
}

function Folder({
  node,
  path,
  bookmarkById,
  labels,
  edit,
}: {
  node: CategoryNode;
  path: number[];
  bookmarkById: Map<string, FlatBookmark>;
  labels: Record<string, BookmarkLabel>;
  edit?: TreeEditHandlers;
}) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(node.name);
  const [dragOver, setDragOver] = useState(false);

  const commitRename = () => {
    setRenaming(false);
    if (nameDraft.trim() && nameDraft.trim() !== node.name) {
      edit?.onRename(path, nameDraft);
    } else {
      setNameDraft(node.name);
    }
  };

  return (
    <div>
      <div
        className={`folder-row ${dragOver ? 'drag-over' : ''}`}
        onClick={() => !renaming && setOpen(!open)}
        onDragOver={(e) => {
          if (!edit) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (!edit) return;
          e.preventDefault();
          setDragOver(false);
          const id = e.dataTransfer.getData('text/bookmark-id');
          if (id) edit.onMoveBookmark(id, path);
        }}
      >
        <span>{open ? '📂' : '📁'}</span>
        {renaming ? (
          <input
            className="rename-input"
            value={nameDraft}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') {
                setNameDraft(node.name);
                setRenaming(false);
              }
            }}
          />
        ) : (
          <span
            onDoubleClick={(e) => {
              if (!edit) return;
              e.stopPropagation();
              setNameDraft(node.name);
              setRenaming(true);
            }}
          >
            {node.name}
          </span>
        )}
        <span className="count">{countBookmarks(node)}</span>
        {edit && !renaming && (
          <span className="folder-actions" onClick={(e) => e.stopPropagation()}>
            <button
              className="icon-btn"
              title="✏️"
              onClick={() => {
                setNameDraft(node.name);
                setRenaming(true);
              }}
            >
              ✏️
            </button>
            <button
              className="icon-btn"
              title="🗑️"
              onClick={() => {
                if (confirm(edit.deleteConfirmText(node.name))) edit.onDelete(path);
              }}
            >
              🗑️
            </button>
          </span>
        )}
      </div>
      {open && (
        <div className="folder-children">
          {node.children?.map((c, i) => (
            <Folder
              key={`${c.name}-${i}`}
              node={c}
              path={[...path, i]}
              bookmarkById={bookmarkById}
              labels={labels}
              edit={edit}
            />
          ))}
          {node.bookmarkIds?.map((id) => {
            const b = bookmarkById.get(id);
            if (!b) return null;
            return (
              <div
                key={id}
                className="bookmark-row"
                title={`${b.url}\n${labels[id]?.summary ?? ''}`}
                draggable={!!edit}
                onDragStart={(e) => e.dataTransfer.setData('text/bookmark-id', id)}
                onClick={() => chrome.tabs.create({ url: b.url })}
              >
                <img src={faviconUrl(b.url)} alt="" />
                <span className="bm-title">{b.title}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
