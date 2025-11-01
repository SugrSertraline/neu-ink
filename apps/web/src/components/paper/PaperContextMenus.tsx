// apps/web/src/components/paper/PaperContextMenus.tsx
'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { usePaperEditPermissionsContext } from '@/contexts/PaperEditPermissionsContext';

type MenuAction = () => void;

type MenuEntry =
  | {
      kind: 'item';
      label: string;
      onSelect?: MenuAction;
      disabled?: boolean;
    }
  | { kind: 'separator' };

interface ContextMenuWrapperProps {
  children: React.ReactNode;
  entries: MenuEntry[];
}

const ensureHTMLElement = (node: React.ReactNode): React.ReactElement => {
  if (React.isValidElement(node) && typeof node.type !== 'symbol') {
    return node;
  }
  return <span>{node}</span>;
};

const ContextMenuWrapper: React.FC<ContextMenuWrapperProps> = ({
  children,
  entries,
}) => {
  const triggerRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const validEntries = useMemo(
    () =>
      entries.filter((entry) =>
        entry.kind === 'separator' ? true : Boolean(entry.onSelect && !entry.disabled),
      ),
    [entries],
  );

  const closeMenu = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (triggerRef.current?.contains(event.target as Node)) return;
      closeMenu();
    };

    const handleScroll = () => closeMenu();

    window.addEventListener('keydown', handleKey);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('blur', closeMenu);

    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('blur', closeMenu);
    };
  }, [open, closeMenu]);

  const handleContextMenu = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (!validEntries.length) {
        console.log('ContextMenuWrapper - No valid entries, right-click disabled');
        return;
      }
      console.log('ContextMenuWrapper - Right-click enabled with', validEntries.length, 'entries');
      event.preventDefault();
      event.stopPropagation();

      const { clientX, clientY } = event;
      const maxX = window.innerWidth - 12;
      const maxY = window.innerHeight - 12;

      setCoords({
        x: Math.min(clientX, maxX),
        y: Math.min(clientY, maxY),
      });
      setOpen(true);
    },
    [validEntries.length],
  );

  const enhancedChild = useMemo(() => {
    const element = ensureHTMLElement(children);
    return React.cloneElement(element, {
      ref: (node: HTMLElement | null) => {
        triggerRef.current = node ?? null;
        const innerRef = (element as any).ref;
        if (typeof innerRef === 'function') innerRef(node);
        else if (innerRef && typeof innerRef === 'object') innerRef.current = node;
      },
      onContextMenu: handleContextMenu,
    });
  }, [children, handleContextMenu]);

  const menu =
    open && validEntries.length
      ? createPortal(
          <div
            role="menu"
            className="fixed z-[60000] min-w-[12rem] rounded-md border border-gray-200 bg-white/95 p-1 shadow-xl backdrop-blur dark:border-gray-700 dark:bg-slate-900/95"
            style={{ top: coords.y, left: coords.x }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {validEntries.map((entry, index) =>
              entry.kind === 'separator' ? (
                <div
                  key={`separator-${index}`}
                  className="my-1 border-t border-gray-200 dark:border-gray-700"
                />
              ) : (
                <button
                  key={`item-${index}`}
                  type="button"
                  role="menuitem"
                  className="w-full rounded px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none dark:text-gray-200 dark:hover:bg-slate-800"
                  onClick={() => {
                    console.log('Menu item clicked:', entry.label);
                    closeMenu();
                    entry.onSelect?.();
                  }}
                >
                  {entry.label}
                </button>
              ),
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {enhancedChild}
      {menu}
    </>
  );
};

interface SectionContextMenuProps {
  children: React.ReactNode;
  onRename?: MenuAction;
  onAddSubsection?: MenuAction;
  onDelete?: MenuAction;
}

export function SectionContextMenu({
  children,
  onRename,
  onAddSubsection,
  onDelete,
}: SectionContextMenuProps) {
  const { canEditContent } = usePaperEditPermissionsContext();
  if (!canEditContent) return <>{children}</>;

  const entries: MenuEntry[] = [];
  if (onRename) entries.push({ kind: 'item', label: '重命名章节', onSelect: onRename });
  if (onAddSubsection)
    entries.push({ kind: 'item', label: '添加子章节', onSelect: onAddSubsection });
  if (onDelete) {
    if (entries.length) entries.push({ kind: 'separator' });
    entries.push({ kind: 'item', label: '删除章节', onSelect: onDelete });
  }

  return <ContextMenuWrapper entries={entries}>{children}</ContextMenuWrapper>;
}

interface BlockContextMenuProps {
  children: React.ReactNode;
  onEdit?: MenuAction;
  onInsertAbove?: MenuAction;
  onInsertBelow?: MenuAction;
  onMoveUp?: MenuAction;
  onMoveDown?: MenuAction;
  onDuplicate?: MenuAction;
  onAddSubsectionAfter?: MenuAction;
  onDelete?: MenuAction;
}

export function BlockContextMenu({
  children,
  onEdit,
  onInsertAbove,
  onInsertBelow,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onAddSubsectionAfter,
  onDelete,
}: BlockContextMenuProps) {
  const { canEditContent } = usePaperEditPermissionsContext();
  if (!canEditContent) return <>{children}</>;

  const entries: MenuEntry[] = [];

  if (onEdit) entries.push({ kind: 'item', label: '编辑内容', onSelect: onEdit });

  if (onInsertAbove || onInsertBelow) {
    if (entries.length) entries.push({ kind: 'separator' });
    if (onInsertAbove)
      entries.push({ kind: 'item', label: '在上方插入段落', onSelect: onInsertAbove });
    if (onInsertBelow)
      entries.push({ kind: 'item', label: '在下方插入段落', onSelect: onInsertBelow });
  }

  if (onMoveUp || onMoveDown) {
    if (entries.length) entries.push({ kind: 'separator' });
    if (onMoveUp) entries.push({ kind: 'item', label: '上移一行', onSelect: onMoveUp });
    if (onMoveDown) entries.push({ kind: 'item', label: '下移一行', onSelect: onMoveDown });
  }

  if (onDuplicate || onAddSubsectionAfter) {
    if (entries.length) entries.push({ kind: 'separator' });
    if (onDuplicate) entries.push({ kind: 'item', label: '复制块', onSelect: onDuplicate });
    if (onAddSubsectionAfter)
      entries.push({ kind: 'item', label: '在本节下添加子章节', onSelect: onAddSubsectionAfter });
  }

  if (onDelete) {
    if (entries.length) entries.push({ kind: 'separator' });
    entries.push({ kind: 'item', label: '删除块', onSelect: onDelete });
  }

  return <ContextMenuWrapper entries={entries}>{children}</ContextMenuWrapper>;
}
