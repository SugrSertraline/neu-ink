// src/components/paper/TextSelectionToolbar.tsx
'use client';

import type { CSSProperties } from 'react';

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

export default function TextSelectionToolbar({
  onBold,
  onItalic,
  onUnderline,
  onColor,
  onBackgroundColor,
  onClearStyles,
  position,
  onClose
}: ToolbarProps) {
  const style: CSSProperties = {
    position: 'fixed',
    top: position.y,
    left: position.x,
    transform: 'translate(-50%, -100%)',
    zIndex: 9999
  };

  return (
    <div className="flex gap-1 p-2 bg-white border border-gray-300 rounded shadow-md" style={style} onMouseDown={(e) => e.preventDefault()}>
      <button onClick={onBold} className="px-2 py-1 text-sm hover:bg-gray-100 rounded">B</button>
      <button onClick={onItalic} className="px-2 py-1 text-sm hover:bg-gray-100 rounded italic">I</button>
      <button onClick={onUnderline} className="px-2 py-1 text-sm hover:bg-gray-100 rounded underline">U</button>
      <button onClick={() => onColor('#d92d20')} className="px-2 py-1 text-sm hover:bg-gray-100 rounded text-red-600">Text</button>
      <button onClick={() => onBackgroundColor('#fde68a')} className="px-2 py-1 text-sm hover:bg-gray-100 rounded bg-yellow-200">Bg</button>
      <button onClick={onClearStyles} className="px-2 py-1 text-sm hover:bg-gray-100 rounded">Clear</button>
      <button onClick={onClose} className="px-2 py-1 text-sm hover:bg-gray-100 rounded">×</button>
    </div>
  );
}
