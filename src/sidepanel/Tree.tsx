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

interface TreeProps {
  nodes: CategoryNode[];
  bookmarkById: Map<string, FlatBookmark>;
  labels: Record<string, BookmarkLabel>;
}

export function Tree({ nodes, bookmarkById, labels }: TreeProps) {
  return (
    <div>
      {nodes.map((n) => (
        <Folder key={n.name} node={n} bookmarkById={bookmarkById} labels={labels} />
      ))}
    </div>
  );
}

function Folder({
  node,
  bookmarkById,
  labels,
}: {
  node: CategoryNode;
  bookmarkById: Map<string, FlatBookmark>;
  labels: Record<string, BookmarkLabel>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="folder-row" onClick={() => setOpen(!open)}>
        <span>{open ? '📂' : '📁'}</span>
        <span>{node.name}</span>
        <span className="count">{countBookmarks(node)}</span>
      </div>
      {open && (
        <div className="folder-children">
          {node.children?.map((c) => (
            <Folder key={c.name} node={c} bookmarkById={bookmarkById} labels={labels} />
          ))}
          {node.bookmarkIds?.map((id) => {
            const b = bookmarkById.get(id);
            if (!b) return null;
            return (
              <div
                key={id}
                className="bookmark-row"
                title={`${b.url}\n${labels[id]?.summary ?? ''}`}
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
