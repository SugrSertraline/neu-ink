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
import type { BlockContent } from '@/types/paper';

type MenuAction = () => void;

type MenuEntry =
  | {
      kind: 'item';
      label: string;
      onSelect?: MenuAction;
      disabled?: boolean;
      submenu?: MenuEntry[];
    }
  | { kind: 'separator' };

interface ContextMenuWrapperProps {
  children: React.ReactNode;
  entries: MenuEntry[];
}

interface SubmenuProps {
  submenu: MenuEntry[];
  parentLabel: string;
  onClose: () => void;
}

const Submenu: React.FC<SubmenuProps> = ({ submenu, parentLabel, onClose }) => {
  const submenuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (submenuRef.current) {
      const parentElement = submenuRef.current.parentElement;
      if (parentElement) {
        const parentRect = parentElement.getBoundingClientRect();
        let left = parentRect.width - 4;
        let top = -4;

        if (parentRect.right + left > window.innerWidth - 20) {
          left = -parentRect.width + 4;
        }

        setPosition({ top, left });
      }
    }
  }, []);

  return (
    <div
      ref={submenuRef}
      className="absolute min-w-48 rounded-md border border-gray-200 bg-white/95 p-1 shadow-xl backdrop-blur dark:border-gray-700 dark:bg-slate-900/95"
      style={{ top: position.top, left: position.left }}
      onMouseEnter={() => {
        // keep submenu open
      }}
      onMouseLeave={() => {
        setTimeout(() => {
          onClose();
        }, 100);
      }}
    >
      {submenu.map((submenuItem, subIndex) =>
        submenuItem.kind === 'separator' ? (
          <div
            key={`submenu-separator-${subIndex}`}
            className="my-1 border-t border-gray-200 dark:border-gray-700"
          />
        ) : (
          <button
            key={`submenu-item-${subIndex}`}
            type="button"
            role="menuitem"
            className="w-full rounded px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none dark:text-gray-200 dark:hover:bg-slate-800"
            onClick={() => {
              onClose();
              submenuItem.onSelect?.();
            }}
          >
            {submenuItem.label}
          </button>
        ),
      )}
    </div>
  );
};

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
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  const validEntries = useMemo(() => {
    const filtered = entries.filter(entry =>
      entry.kind === 'separator'
        ? true
        : (Boolean(entry.onSelect) || Boolean(entry.submenu)) && !entry.disabled,
    );
    return filtered;
  }, [entries]);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setOpenSubmenu(null);
  }, []);

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
        return;
      }
      event.preventDefault();
      event.stopPropagation();

      const { clientX, clientY } = event;

      const menuWidth = 200;
      const menuItemHeight = 30;
      const menuPadding = 1;
      const estimatedMenuHeight =
        validEntries.length * menuItemHeight + menuPadding;

      const spaceToRight = window.innerWidth - clientX;
      const spaceToLeft = clientX;
      const spaceBelow = window.innerHeight - clientY;
      const spaceAbove = clientY;

      let x = clientX + 5;
      let y = clientY + 5;

      if (x + menuWidth > window.innerWidth && spaceToLeft > menuWidth) {
        x = clientX - menuWidth - 5;
      } else if (x + menuWidth > window.innerWidth) {
        x = Math.max(12, window.innerWidth - menuWidth - 12);
      }

      if (y + estimatedMenuHeight > window.innerHeight && spaceAbove > estimatedMenuHeight) {
        y = clientY - estimatedMenuHeight;
      } else if (y + estimatedMenuHeight > window.innerHeight) {
        y = Math.max(12, window.innerHeight - estimatedMenuHeight - 12);
      }

      x = Math.max(12, Math.min(x, window.innerWidth - menuWidth - 12));
      y = Math.max(12, Math.min(y, window.innerHeight - estimatedMenuHeight - 12));

      setCoords({ x, y });
      setOpen(true);
    },
    [validEntries.length],
  );

  const enhancedChild = useMemo(() => {
    const element = ensureHTMLElement(children);
    const elementProps: Record<string, unknown> = {
      onContextMenu: handleContextMenu,
    };

    if (
      typeof element.type === 'string' ||
      (element.type as any).$$typeof === Symbol.for('react.forward_ref')
    ) {
      elementProps.ref = (node: HTMLElement | null) => {
        triggerRef.current = node ?? null;
        const innerRef = (element as any).ref;
        if (typeof innerRef === 'function') innerRef(node);
        else if (innerRef && typeof innerRef === 'object') innerRef.current = node;
      };
    }

    return React.cloneElement(element, elementProps);
  }, [children, handleContextMenu]);

  const menu =
    open && validEntries.length
      ? createPortal(
          <div
            role="menu"
            className="fixed z-60000 min-w-48 rounded-md border border-gray-200 bg-white/95 p-1 shadow-xl backdrop-blur dark:border-gray-700 dark:bg-slate-900/95"
            style={{ top: coords.y, left: coords.x }}
            onMouseDown={e => e.stopPropagation()}
            onMouseLeave={() => {
              setOpenSubmenu(null);
            }}
          >
            {validEntries.map((entry, index) =>
              entry.kind === 'separator' ? (
                <div
                  key={`separator-${index}`}
                  className="my-1 border-t border-gray-200 dark:border-gray-700"
                />
              ) : (
                <div key={`item-${index}`} className="relative">
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center justify-between rounded px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none dark:text-gray-200 dark:hover:bg-slate-800"
                    onMouseEnter={() => {
                      if (entry.submenu) {
                        setOpenSubmenu(entry.label);
                      }
                    }}
                    onClick={() => {
                      if (entry.submenu) {
                        setOpenSubmenu(
                          openSubmenu === entry.label ? null : entry.label,
                        );
                      } else {
                        closeMenu();
                        entry.onSelect?.();
                      }
                    }}
                  >
                    {entry.label}
                    {entry.submenu && (
                      <svg
                        className="ml-2 h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    )}
                  </button>
                  {entry.submenu && openSubmenu === entry.label && (
                    <Submenu
                      submenu={entry.submenu}
                      parentLabel={entry.label}
                      onClose={() => setOpenSubmenu(null)}
                    />
                  )}
                </div>
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
  onAddComponentAfter?: (type: BlockContent['type']) => void;
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
  onAddComponentAfter,
}: BlockContextMenuProps) {
  const { canEditContent } = usePaperEditPermissionsContext();
  if (!canEditContent) return <>{children}</>;

  const blockTypes: { type: BlockContent['type']; label: string; icon: string }[] = [
    { type: 'paragraph', label: '段落', icon: '📝' },
    { type: 'heading', label: '标题', icon: '📌' },
    { type: 'math', label: '数学公式', icon: '∑' },
    { type: 'figure', label: '图片', icon: '🖼️' },
    { type: 'table', label: '表格', icon: '📊' },
    { type: 'code', label: '代码块', icon: '💻' },
    { type: 'ordered-list', label: '有序列表', icon: '🔢' },
    { type: 'unordered-list', label: '无序列表', icon: '•' },
    { type: 'quote', label: '引用', icon: '💬' },
    { type: 'divider', label: '分隔线', icon: '—' },
  ];

  const addComponentSubmenu: MenuEntry[] = blockTypes.map(blockType => ({
    kind: 'item' as const,
    label: `${blockType.icon} ${blockType.label}`,
    onSelect: () => onAddComponentAfter?.(blockType.type),
  }));

  const entries: MenuEntry[] = [];

  if (onEdit) entries.push({ kind: 'item', label: '编辑内容', onSelect: onEdit });

  if (onInsertAbove || onInsertBelow) {
    if (entries.length) entries.push({ kind: 'separator' });
    if (onInsertAbove)
      entries.push({ kind: 'item', label: '在上方插入段落', onSelect: onInsertAbove });
    if (onInsertBelow)
      entries.push({ kind: 'item', label: '在下方插入段落', onSelect: onInsertBelow });
  }

  if (onAddComponentAfter) {
    if (entries.length) entries.push({ kind: 'separator' });
    entries.push({
      kind: 'item',
      label: '添加组件',
      submenu: addComponentSubmenu,
    });
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

interface MetadataContextMenuProps {
  children: React.ReactNode;
  onEdit?: MenuAction;
  extraEntries?: MenuEntry[];
}

export function MetadataContextMenu({
  children,
  onEdit,
  extraEntries,
}: MetadataContextMenuProps) {
  const { canEditContent } = usePaperEditPermissionsContext();

  const entries = useMemo(() => {
    const list: MenuEntry[] = [];
    if (onEdit) {
      list.push({ kind: 'item', label: '编辑元数据', onSelect: onEdit });
    }
    if (extraEntries?.length) {
      if (list.length) list.push({ kind: 'separator' });
      list.push(...extraEntries);
    }
    return list;
  }, [onEdit, extraEntries]);

  if (!canEditContent || !entries.length) {
    return <>{children}</>;
  }

  return <ContextMenuWrapper entries={entries}>{children}</ContextMenuWrapper>;
}
