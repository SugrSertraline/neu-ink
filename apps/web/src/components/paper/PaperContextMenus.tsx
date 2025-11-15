// apps/web/src/components/paper/PaperContextMenus.tsx
'use client';

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { usePaperEditPermissionsContext } from '@/contexts/PaperEditPermissionsContext';
import type { BlockContent } from '@/types/paper';

type MenuAction = () => void | Promise<void>;

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
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}

const Submenu: React.FC<SubmenuProps> = ({
  submenu,
  parentLabel,
  onClose,
  onPointerEnter,
  onPointerLeave,
}) => {
  const submenuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    const node = submenuRef.current;
    if (!node) return;
    const parentElement = node.parentElement;
    if (!parentElement) return;

    const parentRect = parentElement.getBoundingClientRect();
    const rect = node.getBoundingClientRect();
    const margin = 4;

    let left = parentRect.width - 4; // 默认靠右展开
    let top = -4;

    let viewportLeft = parentRect.left + left;
    let viewportTop = parentRect.top + top;

    if (viewportLeft + rect.width > window.innerWidth - margin) {
      left = -rect.width + 4; // 改到左侧
      viewportLeft = parentRect.left + left;
    }
    if (viewportLeft < margin) {
      left += margin - viewportLeft;
      viewportLeft = margin;
    }

    if (viewportTop + rect.height > window.innerHeight - margin) {
      top -= rect.height - parentRect.height + 8; // 往上挪
      viewportTop = parentRect.top + top;
    }
    if (viewportTop < margin) {
      top += margin - viewportTop;
    }

    setPosition({ top, left });
  }, [submenu]);

  return (
    <div
      ref={submenuRef}
      className="absolute min-w-48 rounded-md border border-gray-200 bg-white/95 p-1 shadow-xl backdrop-blur dark:border-gray-700 dark:bg-slate-900/95"
      style={{ top: position.top, left: position.left }}
      onMouseEnter={onPointerEnter}
      onMouseLeave={onPointerLeave}
      role="menu"
      aria-label={`${parentLabel} submenu`}
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
            onClick={async () => {
              onClose();
              await submenuItem.onSelect?.();
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
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  
  const submenuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validEntries = useMemo(() => {
    const filtered = entries.filter(entry =>
      entry.kind === 'separator'
        ? true
        : (Boolean(entry.onSelect) || Boolean(entry.submenu)) && !entry.disabled,
    );
    
    return filtered;
  }, [entries]);

  const clearSubmenuCloseTimer = useCallback(() => {
    if (submenuCloseTimer.current !== null) {
      window.clearTimeout(submenuCloseTimer.current);
      submenuCloseTimer.current = null;
    }
  }, []);

  const scheduleSubmenuClose = useCallback(() => {
    clearSubmenuCloseTimer();
    submenuCloseTimer.current = setTimeout(() => {
      setOpenSubmenu(null);
      submenuCloseTimer.current = null;
    }, 160);
  }, [clearSubmenuCloseTimer]);

  const closeMenu = useCallback(() => {
    clearSubmenuCloseTimer();
    setOpen(false);
    setOpenSubmenu(null);
  }, [clearSubmenuCloseTimer]);

  useEffect(() => {
    return () => clearSubmenuCloseTimer();
  }, [clearSubmenuCloseTimer]);

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

  useLayoutEffect(() => {
    if (!open || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const margin = 4;
    let nextX = coords.x;
    let nextY = coords.y;

    if (nextX + rect.width > window.innerWidth - margin) {
      nextX = Math.max(margin, coords.x - rect.width);
    }
    if (nextX < margin) {
      nextX = margin;
    }

    if (nextY + rect.height > window.innerHeight - margin) {
      nextY = Math.max(margin, coords.y - rect.height);
    }
    if (nextY < margin) {
      nextY = margin;
    }

    if (nextX !== coords.x || nextY !== coords.y) {
      setCoords({ x: nextX, y: nextY });
    }
  }, [open, coords]);

  const handleContextMenu = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (!validEntries.length) {
        return;
      }

      const target = event.target as HTMLElement;

      const isValidTarget = () => {
        // 优先检查 metadata 区域，这样即使点击其中的按钮等元素也能触发菜单
        if (target.closest('[data-metadata-region]')) return true;
        if (target.closest('h1, h2, h3, h4, h5, h6')) return true;
        if (target.closest('[data-block-id]')) return true;
        if (target.closest('[data-reference-id]')) return true;
        if (target.closest('[data-reference-region]')) return true;
        if (target.closest('[data-references]')) return true; // 添加对 data-references 属性的检查
        
        // 检查是否在参考文献区域内
        const referencesSection = target.closest('section[data-references="true"]');
        if (referencesSection) return true;
        
        // 对于这些交互元素，不应该触发右键菜单
        if (target.closest('button, input, textarea, select, a')) return false;
        if (target.closest('[contenteditable="true"]')) return false;
        if (target.closest('img, figure, pre, code')) return true;
        return false;
      };

      const isOnlyAddSection =
        validEntries.length === 1 &&
        validEntries[0].kind === 'item' &&
        validEntries[0].label === '添加新章节';

      if (!isValidTarget() && !isOnlyAddSection) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      setCoords({ x: event.clientX + 2, y: event.clientY + 2 });
      setOpen(true);
    },
    [validEntries],
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
            ref={menuRef}
            role="menu"
            className="fixed z-60000 min-w-48 rounded-md border border-gray-200 bg-white/95 p-1 shadow-xl backdrop-blur dark:border-gray-700 dark:bg-slate-900/95"
            style={{ top: coords.y, left: coords.x }}
            onMouseDown={e => e.stopPropagation()}
            onMouseEnter={clearSubmenuCloseTimer}
            onMouseLeave={scheduleSubmenuClose}
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
                        clearSubmenuCloseTimer();
                        setOpenSubmenu(entry.label);
                      } else {
                        setOpenSubmenu(null);
                      }
                    }}
                    onClick={async () => {
                      if (entry.submenu) {
                        clearSubmenuCloseTimer();
                        setOpenSubmenu(
                          openSubmenu === entry.label ? null : entry.label,
                        );
                      } else {
                        closeMenu();
                        await entry.onSelect?.();
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
                      onClose={() => {
                        clearSubmenuCloseTimer();
                        closeMenu();
                      }}
                      onPointerEnter={clearSubmenuCloseTimer}
                      onPointerLeave={scheduleSubmenuClose}
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

// SectionContextMenu, RootSectionContextMenu, BlockContextMenu, MetadataContextMenu,
// ReferenceContextMenu, RootReferenceContextMenu remain unchanged below.
interface SectionContextMenuProps {
  children: React.ReactNode;
  onRename?: MenuAction;
  onAddSectionBefore?: MenuAction;
  onAddSectionAfter?: MenuAction;
  onAddBlock?: (type: BlockContent['type']) => void;
  onStartTextParse?: MenuAction;
  onMoveUp?: MenuAction;
  onMoveDown?: MenuAction;
  onDelete?: MenuAction;
}

export function SectionContextMenu({
  children,
  onRename,
  onAddSectionBefore,
  onAddSectionAfter,
  onAddBlock,
  onStartTextParse,
  onMoveUp,
  onMoveDown,
  onDelete,
}: SectionContextMenuProps) {
  const { canEditContent } = usePaperEditPermissionsContext();
  if (!canEditContent) return <>{children}</>;

  const entries: MenuEntry[] = [];

  if (onRename) {
    entries.push({ kind: 'item', label: '重命名章节', onSelect: onRename });
  }

  if (onAddSectionBefore || onAddSectionAfter) {
    if (entries.length) entries.push({ kind: 'separator' });
    if (onAddSectionBefore) {
      entries.push({
        kind: 'item',
        label: '在上方添加章节',
        onSelect: onAddSectionBefore,
      });
    }
    if (onAddSectionAfter) {
      entries.push({
        kind: 'item',
        label: '在下方添加章节',
        onSelect: onAddSectionAfter,
      });
    }
  }

  if (onAddBlock || onStartTextParse) {
    if (entries.length) entries.push({ kind: 'separator' });

    if (onAddBlock) {
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

      const addBlockSubmenu: MenuEntry[] = blockTypes.map(blockType => ({
        kind: 'item' as const,
        label: `${blockType.icon} ${blockType.label}`,
        onSelect: () => onAddBlock(blockType.type),
      }));

      entries.push({
        kind: 'item',
        label: '添加块',
        submenu: addBlockSubmenu,
      });
    }

    if (onStartTextParse) {
      entries.push({
        kind: 'item',
        label: '📝 通过文本解析添加',
        onSelect: onStartTextParse,
      });
    }
  }

  if (onMoveUp || onMoveDown) {
    if (entries.length) entries.push({ kind: 'separator' });
    if (onMoveUp) {
      entries.push({
        kind: 'item',
        label: '上移章节',
        onSelect: onMoveUp,
      });
    }
    if (onMoveDown) {
      entries.push({
        kind: 'item',
        label: '下移章节',
        onSelect: onMoveDown,
      });
    }
  }

  if (onDelete) {
    if (entries.length) entries.push({ kind: 'separator' });
    entries.push({ kind: 'item', label: '删除章节', onSelect: onDelete });
  }

  if (!entries.length) return <>{children}</>;

  return <ContextMenuWrapper entries={entries}>{children}</ContextMenuWrapper>;
}

interface RootSectionContextMenuProps {
  children: React.ReactNode;
  onAddSection?: MenuAction;
}

export function RootSectionContextMenu({
  children,
  onAddSection,
}: RootSectionContextMenuProps) {
  const { canEditContent } = usePaperEditPermissionsContext();

  const entries = useMemo(() => {
    const list: MenuEntry[] = [];
    if (onAddSection) {
      list.push({ kind: 'item', label: '添加新章节', onSelect: onAddSection });
    }
    return list;
  }, [onAddSection]);

  if (!canEditContent || !entries.length) {
    return <>{children}</>;
  }

  return <ContextMenuWrapper entries={entries}>{children}</ContextMenuWrapper>;
}

interface BlockContextMenuProps {
  children: React.ReactNode;
  sectionId: string;
  sectionTitle: string;
  onEdit?: MenuAction;
  onInsertAbove?: MenuAction;
  onInsertBelow?: MenuAction;
  onMoveUp?: MenuAction;
  onMoveDown?: MenuAction;
  onDuplicate?: MenuAction;
  onDelete?: MenuAction;
  onAddComponentAfter?: (type: BlockContent['type']) => void;
  onStartTextParse?: MenuAction;
  onAddSectionBelow?: MenuAction;
}

export function BlockContextMenu({
  children,
  sectionId,
  sectionTitle,
  onEdit,
  onInsertAbove,
  onInsertBelow,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onAddComponentAfter,
  onStartTextParse,
  onAddSectionBelow,
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

  if (onAddSectionBelow) {
    if (entries.length) entries.push({ kind: 'separator' });
    entries.push({ kind: 'item', label: '在下方插入章节', onSelect: onAddSectionBelow });
  }

  if (onAddComponentAfter || onStartTextParse) {
    if (entries.length) entries.push({ kind: 'separator' });
    if (onAddComponentAfter) {
      entries.push({
        kind: 'item',
        label: '添加组件',
        submenu: addComponentSubmenu,
      });
    }
    if (onStartTextParse) {
      entries.push({
        kind: 'item',
        label: '📝 通过文本解析添加',
        onSelect: onStartTextParse,
      });
    }
  }

  if (onMoveUp || onMoveDown) {
    if (entries.length) entries.push({ kind: 'separator' });
    if (onMoveUp) entries.push({ kind: 'item', label: '上移一行', onSelect: onMoveUp });
    if (onMoveDown) entries.push({ kind: 'item', label: '下移一行', onSelect: onMoveDown });
  }

  if (onDuplicate) {
    if (entries.length) entries.push({ kind: 'separator' });
    entries.push({ kind: 'item', label: '复制块', onSelect: onDuplicate });
  }

  if (onDelete) {
    if (entries.length) entries.push({ kind: 'separator' });
    entries.push({ kind: 'item', label: '删除块', onSelect: onDelete });
  }

  return (
    <ContextMenuWrapper entries={entries}>{children}</ContextMenuWrapper>
  );
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

interface ReferenceContextMenuProps {
  children: React.ReactNode;
  onEdit?: MenuAction;
  onDuplicate?: MenuAction;
  onInsertBelow?: MenuAction;
  onMoveUp?: MenuAction;
  onMoveDown?: MenuAction;
  onDelete?: MenuAction;
  onCopyCitation?: MenuAction;
  onCopyDoi?: MenuAction;
  onCopyUrl?: MenuAction;
  onOpenLink?: MenuAction;
  onParseReferences?: MenuAction;
}

export function ReferenceContextMenu({
  children,
  onEdit,
  onDuplicate,
  onInsertBelow,
  onMoveUp,
  onMoveDown,
  onDelete,
  onCopyCitation,
  onCopyDoi,
  onCopyUrl,
  onOpenLink,
  onParseReferences,
}: ReferenceContextMenuProps) {
  const { canEditContent } = usePaperEditPermissionsContext();
  if (!canEditContent) return <>{children}</>;

  const entries: MenuEntry[] = [];

  if (onEdit) {
    entries.push({ kind: 'item', label: '编辑参考文献', onSelect: onEdit });
  }
  if (onInsertBelow) {
    if (entries.length) entries.push({ kind: 'separator' });
    entries.push({ kind: 'item', label: '在下方插入参考文献', onSelect: onInsertBelow });
  }
  if (onParseReferences) {
    if (entries.length) entries.push({ kind: 'separator' });
    entries.push({ kind: 'item', label: '批量解析参考文献', onSelect: onParseReferences });
  }
  if (onMoveUp || onMoveDown) {
    if (entries.length) entries.push({ kind: 'separator' });
    if (onMoveUp) {
      entries.push({ kind: 'item', label: '上移此条参考文献', onSelect: onMoveUp });
    }
    if (onMoveDown) {
      entries.push({ kind: 'item', label: '下移此条参考文献', onSelect: onMoveDown });
    }
  }
  if (onCopyCitation || onCopyDoi || onCopyUrl) {
    if (entries.length) entries.push({ kind: 'separator' });
    if (onCopyCitation) {
      entries.push({ kind: 'item', label: '复制引用文本', onSelect: onCopyCitation });
    }
    if (onCopyDoi) {
      entries.push({ kind: 'item', label: '复制 DOI', onSelect: onCopyDoi });
    }
    if (onCopyUrl) {
      entries.push({ kind: 'item', label: '复制链接地址', onSelect: onCopyUrl });
    }
  }
  if (onOpenLink) {
    if (entries.length) entries.push({ kind: 'separator' });
    entries.push({ kind: 'item', label: '在新标签页打开链接', onSelect: onOpenLink });
  }
  if (onDelete) {
    if (entries.length) entries.push({ kind: 'separator' });
    entries.push({ kind: 'item', label: '删除参考文献', onSelect: onDelete });
  }

  if (!entries.length) return <>{children}</>;

  return <ContextMenuWrapper entries={entries}>{children}</ContextMenuWrapper>;
}

interface RootReferenceContextMenuProps {
  children: React.ReactNode;
  onAddReference?: MenuAction;
  onParseReferences?: MenuAction;
}

export function RootReferenceContextMenu({
  children,
  onAddReference,
  onParseReferences,
}: RootReferenceContextMenuProps) {
  const { canEditContent } = usePaperEditPermissionsContext();
  
  const entries: MenuEntry[] = [];
  
  if (canEditContent && onAddReference) {
    entries.push({ kind: 'item', label: '添加参考文献', onSelect: onAddReference });
  }
  
  if (canEditContent && onParseReferences) {
    entries.push({ kind: 'item', label: '批量解析参考文献', onSelect: onParseReferences });
  }

  if (!entries.length) return <>{children}</>;

  return (
    <ContextMenuWrapper entries={entries}>
      {children}
    </ContextMenuWrapper>
  );
}

interface AbstractAndKeywordsContextMenuProps {
  children: React.ReactNode;
  onEdit?: MenuAction;
}

export function AbstractAndKeywordsContextMenu({
  children,
  onEdit,
}: AbstractAndKeywordsContextMenuProps) {
  const { canEditContent } = usePaperEditPermissionsContext();

  const entries = useMemo(() => {
    const list: MenuEntry[] = [];
    if (onEdit) {
      list.push({ kind: 'item', label: '编辑摘要和关键词', onSelect: onEdit });
    }
    return list;
  }, [onEdit]);

  if (!canEditContent || !entries.length) {
    return <>{children}</>;
  }

  return <ContextMenuWrapper entries={entries}>{children}</ContextMenuWrapper>;
}
