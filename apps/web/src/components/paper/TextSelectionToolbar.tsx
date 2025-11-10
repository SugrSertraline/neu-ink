// src/components/paper/TextSelectionToolbar.tsx
'use client';

import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';

interface ToolbarProps {
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onColor: (color: string) => void;
  onBackgroundColor: (color: string) => void;
  onClearStyles: () => void;
  position: { x: number; y: number };
  onClose: () => void;
}

export default function TextSelectionToolbar(props: ToolbarProps) {
  const { position, onBold, onItalic, onUnderline, onColor, onBackgroundColor, onClearStyles, onClose } = props;

  // 视窗内简单防溢出（可选）
  const pad = 8;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 0;

  // 先用传入的右上角做基准，向右下偏移一点，再做边界夹取
  const left = Math.max(pad, Math.min(position.x + pad, vw - 240)); // 240 给个大概宽度缓冲
  const top  = Math.max(pad, Math.min(position.y - pad, vh - 120)); // 120 给个大概高度缓冲

  const style: CSSProperties = {
    position: 'fixed',
    top,
    left,
    zIndex: 2147483647, // 顶层
  };

  const node = (
    <div
      className="flex gap-1 p-2 bg-white border border-gray-300 rounded shadow-lg min-w-fit"
      style={style}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => e.stopPropagation()}
      data-text-selection-toolbar
    >
      <button onClick={(e) => { e.stopPropagation(); onBold(); }} className="px-2 py-1 text-sm hover:bg-gray-100 rounded font-bold">B</button>
      <button onClick={(e) => { e.stopPropagation(); onItalic(); }} className="px-2 py-1 text-sm hover:bg-gray-100 rounded italic">I</button>
      <button onClick={(e) => { e.stopPropagation(); onUnderline(); }} className="px-2 py-1 text-sm hover:bg-gray-100 rounded underline">U</button>
      <button onClick={(e) => { e.stopPropagation(); onColor('#d92d20'); }} className="px-2 py-1 text-sm hover:bg-gray-100 rounded text-red-600">Text</button>
      <button onClick={(e) => { e.stopPropagation(); onBackgroundColor('#fde68a'); }} className="px-2 py-1 text-sm hover:bg-gray-100 rounded bg-yellow-200">Bg</button>
      <button onClick={(e) => { e.stopPropagation(); onClearStyles(); }} className="px-2 py-1 text-sm hover:bg-gray-100 rounded">Clear</button>
      <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="px-2 py-1 text-sm hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700">×</button>
    </div>
  );

  // 关键：挂到 body
  if (typeof document === 'undefined') return null;
  return createPortal(node, document.body);
}
