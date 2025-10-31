'use client';

import React, {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type EditorShellProps = PropsWithChildren<{
  left?: React.ReactNode;      // left panel content (navigation)
  right?: React.ReactNode;     // right panel content (preview)

  // initial toggles and sizes
  defaultLeftOpen?: boolean;
  defaultCenterOpen?: boolean;
  defaultRightWidth?: number;
  minRightWidth?: number;
  maxRightWidth?: number;

  // top offset to avoid a sticky/absolute header overlapping
  topOffset?: number;          // px, default 112 (pt-28)

  // persistence
  persistKey?: string;         // default 'editor-shell-layout:v2'

  // notify
  onLayoutChange?: (state: {
    leftOpen: boolean;
    centerOpen: boolean;
    rightWidth: number;
  }) => void;

  // forward the scroll containers out (so your existing search/scroll works)
  centerScrollRef?: React.Ref<HTMLDivElement>;
  rightScrollRef?: React.Ref<HTMLDivElement>;

  className?: string;
}>;

const LEFT_EXPANDED_PX = 256;      // 16rem
const LEFT_COLLAPSED_PX = 48;      // collapsed narrow rail still interactive
const DEFAULT_RIGHT_WIDTH_PX = 560;
const MIN_RIGHT_WIDTH_PX = 360;
const MAX_RIGHT_WIDTH_PX = 860;
const DEFAULT_TOP_OFFSET_PX = 112;
const DEFAULT_PERSIST_KEY = 'editor-shell-layout:v2';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function ActionButton({
  active,
  title,
  onClick,
  children,
  compact = false,
}: {
  active?: boolean;
  title?: string;
  onClick?: () => void;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      aria-pressed={!!active}
      className={[
        'inline-flex items-center justify-center',
        compact ? 'h-8 w-8' : 'h-8 px-3',
        'text-sm rounded-full border transition-colors',
        'bg-white/80 dark:bg-slate-900/80 backdrop-blur',
        'border-slate-200 dark:border-slate-700',
        active ? 'text-blue-600 border-blue-300' : 'text-slate-700 dark:text-slate-200',
        'hover:bg-white dark:hover:bg-slate-900',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export default function EditorShell({
  left,
  children,
  right,
  defaultLeftOpen = true,
  defaultCenterOpen = true,
  defaultRightWidth = DEFAULT_RIGHT_WIDTH_PX,
  minRightWidth = MIN_RIGHT_WIDTH_PX,
  maxRightWidth = MAX_RIGHT_WIDTH_PX,
  topOffset = DEFAULT_TOP_OFFSET_PX,
  persistKey = DEFAULT_PERSIST_KEY,
  onLayoutChange,
  centerScrollRef,
  rightScrollRef,
  className,
}: EditorShellProps) {
  const readPersist = useCallback(() => {
    try {
      const raw = localStorage.getItem(persistKey);
      if (!raw) return null;
      return JSON.parse(raw) as {
        leftOpen?: boolean;
        centerOpen?: boolean;
        rightWidth?: number;
      };
    } catch {
      return null;
    }
  }, [persistKey]);

  const [leftOpen, setLeftOpen] = useState<boolean>(() => {
    const p = typeof window !== 'undefined' ? readPersist() : null;
    return p?.leftOpen ?? defaultLeftOpen;
  });

  const [centerOpen, setCenterOpen] = useState<boolean>(() => {
    const p = typeof window !== 'undefined' ? readPersist() : null;
    return p?.centerOpen ?? defaultCenterOpen;
  });

  const [rightWidth, setRightWidth] = useState<number>(() => {
    const p = typeof window !== 'undefined' ? readPersist() : null;
    return clamp(p?.rightWidth ?? defaultRightWidth, minRightWidth, maxRightWidth);
  });

  const draggingRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      const s = draggingRef.current;
      if (!s) return;
      const delta = e.clientX - s.startX;
      setRightWidth((prev) => clamp(s.startWidth + delta, minRightWidth, maxRightWidth));
    },
    [minRightWidth, maxRightWidth]
  );

  const handleDragEnd = useCallback(() => {
    draggingRef.current = null;
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, [handleDragMove]);

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (!centerOpen) return;
      draggingRef.current = { startX: e.clientX, startWidth: rightWidth };
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    },
    [centerOpen, rightWidth, handleDragMove, handleDragEnd]
  );

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [handleDragMove, handleDragEnd]);

  useEffect(() => {
    const state = { leftOpen, centerOpen, rightWidth };
    try {
      localStorage.setItem(persistKey, JSON.stringify(state));
    } catch {}
    onLayoutChange?.(state);
  }, [leftOpen, centerOpen, rightWidth, persistKey, onLayoutChange]);

  const gridTemplateColumns = useMemo(() => {
    const leftCol = leftOpen ? `${LEFT_EXPANDED_PX}px` : `${LEFT_COLLAPSED_PX}px`;
    const centerCol = centerOpen ? '1fr' : '0px';
    const rightCol = centerOpen ? `${rightWidth}px` : '1fr';
    return `${leftCol} ${centerCol} ${rightCol}`;
  }, [leftOpen, centerOpen, rightWidth]);

  const toggleLeft = useCallback(() => setLeftOpen((v) => !v), []);
  const toggleCenter = useCallback(() => setCenterOpen((v) => !v), []);
  const fullPreview = useCallback(() => {
    setLeftOpen(false);
    setCenterOpen(false);
  }, []);
  const resetLayout = useCallback(() => {
    setLeftOpen(defaultLeftOpen);
    setCenterOpen(defaultCenterOpen);
    setRightWidth(clamp(defaultRightWidth, minRightWidth, maxRightWidth));
  }, [defaultLeftOpen, defaultCenterOpen, defaultRightWidth, minRightWidth, maxRightWidth]);

  return (
    <div className={['relative h-full', className ?? ''].join(' ')} style={{ paddingTop: topOffset }}>
      <div
        className="grid gap-4 h-full transition-all"
        style={{ gridTemplateColumns, transition: 'grid-template-columns 220ms ease' }}
      >
        {/* Left */}
        <aside
          className={[
            'border rounded-lg overflow-hidden',
            'bg-white dark:bg-slate-900',
            'border-slate-200 dark:border-slate-700',
          ].join(' ')}
          aria-label="Editor navigation and controls"
        >
          <div className="h-full flex flex-col">
            {/* Controls */}
            <div
              className={[
                'sticky top-0 z-10 border-b',
                'bg-white/90 dark:bg-slate-900/90 backdrop-blur',
                'border-slate-200 dark:border-slate-700',
              ].join(' ')}
            >
              <div
                className={[
                  'flex items-center gap-2 p-2 transition-all duration-200',
                  leftOpen ? 'justify-start' : 'flex-col items-center',
                ].join(' ')}
              >
                <ActionButton title={leftOpen ? '折叠导航' : '展开导航'} onClick={toggleLeft} compact={!leftOpen} active={!leftOpen}>
                  {leftOpen ? '折叠导航' : '展开'}
                </ActionButton>
                <ActionButton title={centerOpen ? '折叠编辑区' : '展开编辑区'} onClick={toggleCenter} compact={!leftOpen} active={!centerOpen}>
                  {centerOpen ? '隐藏编辑' : '显示编辑'}
                </ActionButton>
                <ActionButton title="全屏预览（隐藏左/中）" onClick={fullPreview} compact={!leftOpen}>
                  全屏预览
                </ActionButton>
                <ActionButton title="重置布局" onClick={resetLayout} compact={!leftOpen}>
                  重置
                </ActionButton>
              </div>
            </div>

            {/* Nav content */}
            <div
              className={[
                'flex-1 overflow-auto transition-opacity duration-200 ease-out',
                leftOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
              ].join(' ')}
            >
              <div className="px-4 py-3">{left ?? <div className="text-sm text-slate-500">Navigation</div>}</div>
            </div>
          </div>
        </aside>

        {/* Center */}
        <main
  className={[
    'border rounded-lg overflow-hidden',
    'bg-white dark:bg-slate-900',
    'border-slate-200 dark:border-slate-700',
    'transition-opacity duration-200',
    centerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
  ].join(' ')}
  aria-hidden={!centerOpen}
>
  <div className="h-full overflow-auto" data-editor-center-scroll>
    {children ?? <div className="p-4 text-slate-500">Editor</div>}
  </div>
</main>


        {/* Right */}
        <aside
          className={[
            'relative border rounded-lg overflow-hidden',
            'bg-white dark:bg-slate-900',
            'border-slate-200 dark:border-slate-700',
          ].join(' ')}
          aria-label="Preview"
        >
          {centerOpen && (
            <div
              onMouseDown={handleDragStart}
              className={['group absolute top-0 left-0 -translate-x-1/2', 'h-full w-3 cursor-col-resize z-10'].join(' ')}
              role="separator"
              aria-orientation="vertical"
              aria-label="调整预览面板宽度"
            >
              <div className={['mx-auto h-full w-px', 'bg-slate-200 dark:bg-slate-700', 'group-hover:bg-blue-400 transition-colors'].join(' ')} />
            </div>
          )}

          <div className="h-full overflow-auto" ref={rightScrollRef as React.Ref<HTMLDivElement> | undefined}>
            {right ?? <div className="p-4 text-slate-500">Preview</div>}
          </div>
        </aside>
      </div>
    </div>
  );
}
