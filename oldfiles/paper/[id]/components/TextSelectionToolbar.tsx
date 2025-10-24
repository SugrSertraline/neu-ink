// frontend/app/papers/[id]/components/editor/TextSelectionToolbar.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bold, Italic, Underline, Palette, Highlighter, Eraser, X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface TextSelectionToolbarProps {
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onColor: (color: string) => void;
  onBackgroundColor: (color: string) => void;
  onClearStyles: () => void;
  position: { x: number; y: number };
  onClose: () => void;
}

const TEXT_COLORS = [
  { name: '默认', value: '' },
  { name: '红色', value: '#ef4444' },
  { name: '橙色', value: '#f97316' },
  { name: '黄色', value: '#eab308' },
  { name: '绿色', value: '#22c55e' },
  { name: '蓝色', value: '#3b82f6' },
  { name: '紫色', value: '#a855f7' },
  { name: '粉色', value: '#ec4899' },
  { name: '灰色', value: '#6b7280' },
];

const BG_COLORS = [
  { name: '无背景', value: '' },
  { name: '红色背景', value: '#fee2e2' },
  { name: '橙色背景', value: '#ffedd5' },
  { name: '黄色背景', value: '#fef3c7' },
  { name: '绿色背景', value: '#dcfce7' },
  { name: '蓝色背景', value: '#dbeafe' },
  { name: '紫色背景', value: '#f3e8ff' },
  { name: '粉色背景', value: '#fce7f3' },
  { name: '灰色背景', value: '#f3f4f6' },
];

export default function TextSelectionToolbar({
  onBold,
  onItalic,
  onUnderline,
  onColor,
  onBackgroundColor,
  onClearStyles,
  position,
  onClose
}: TextSelectionToolbarProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleStyleAction = (action: () => void) => {
    setIsApplying(true);
    action();
    setTimeout(() => {
      setIsApplying(false);
    }, 200);
  };

  return createPortal(
    <div
      ref={toolbarRef}
      className="fixed z-[9999] bg-white rounded-lg shadow-2xl border border-gray-300 flex items-center gap-1 p-1"
      style={{
        left: `${position.x}px`,
        top: `${position.y - 50}px`,
        transform: 'translateX(-50%)'
      }}
    >
      {/* 加粗按钮 */}
      <button
        type="button"
        onClick={() => handleStyleAction(onBold)}
        disabled={isApplying}
        className={`p-2 hover:bg-gray-100 rounded transition-colors ${
          isApplying ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        title="加粗 (Ctrl+B)"
      >
        <Bold className="w-4 h-4 text-gray-700" />
      </button>

      {/* 斜体按钮 */}
      <button
        type="button"
        onClick={() => handleStyleAction(onItalic)}
        disabled={isApplying}
        className={`p-2 hover:bg-gray-100 rounded transition-colors ${
          isApplying ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        title="斜体 (Ctrl+I)"
      >
        <Italic className="w-4 h-4 text-gray-700" />
      </button>

      {/* 下划线按钮 */}
      <button
        type="button"
        onClick={() => handleStyleAction(onUnderline)}
        disabled={isApplying}
        className={`p-2 hover:bg-gray-100 rounded transition-colors ${
          isApplying ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        title="下划线 (Ctrl+U)"
      >
        <Underline className="w-4 h-4 text-gray-700" />
      </button>

      {/* 分隔线 */}
      <div className="w-px h-6 bg-gray-300" />

      {/* 文字颜色 */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowColorPicker(!showColorPicker);
            setShowBgPicker(false);
          }}
          disabled={isApplying}
          className={`p-2 hover:bg-gray-100 rounded transition-colors ${
            isApplying ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          title="文字颜色"
        >
          <Palette className="w-4 h-4 text-gray-700" />
        </button>

        {showColorPicker && (
          <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-300 p-2 w-48 z-[10000]">
            <div className="text-xs text-gray-500 mb-2 font-medium">文字颜色</div>
            <div className="grid grid-cols-3 gap-1">
              {TEXT_COLORS.map((color) => (
                <button
                  key={color.value || 'default'}
                  type="button"
                  onClick={() => {
                    handleStyleAction(() => onColor(color.value));
                    setShowColorPicker(false);
                  }}
                  disabled={isApplying}
                  className={`h-8 rounded border border-gray-300 hover:ring-2 hover:ring-blue-400 transition-all flex items-center justify-center text-xs font-medium ${
                    isApplying ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  style={{
                    backgroundColor: color.value || '#fff',
                    color: color.value ? '#fff' : '#374151'
                  }}
                  title={color.name}
                >
                  {color.value ? 'A' : '默认'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 背景颜色 */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowBgPicker(!showBgPicker);
            setShowColorPicker(false);
          }}
          disabled={isApplying}
          className={`p-2 hover:bg-gray-100 rounded transition-colors ${
            isApplying ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          title="背景颜色"
        >
          <Highlighter className="w-4 h-4 text-gray-700" />
        </button>

        {showBgPicker && (
          <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-300 p-2 w-48 z-[10000]">
            <div className="text-xs text-gray-500 mb-2 font-medium">背景颜色</div>
            <div className="grid grid-cols-3 gap-1">
              {BG_COLORS.map((color) => (
                <button
                  key={color.value || 'none'}
                  type="button"
                  onClick={() => {
                    handleStyleAction(() => onBackgroundColor(color.value));
                    setShowBgPicker(false);
                  }}
                  disabled={isApplying}
                  className={`h-8 rounded border border-gray-300 hover:ring-2 hover:ring-blue-400 transition-all flex items-center justify-center text-xs font-medium ${
                    isApplying ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  style={{
                    backgroundColor: color.value || '#fff',
                    color: '#374151'
                  }}
                  title={color.name}
                >
                  {color.value ? 'Aa' : '无'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 分隔线 */}
      <div className="w-px h-6 bg-gray-300" />

      {/* 清除样式按钮 */}
      <button
        type="button"
        onClick={() => handleStyleAction(onClearStyles)}
        disabled={isApplying}
        className={`p-2 hover:bg-red-50 rounded transition-colors ${
          isApplying ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        title="清除所有样式"
      >
        <Eraser className="w-4 h-4 text-red-600" />
      </button>

      {/* 分隔线 */}
      <div className="w-px h-6 bg-gray-300" />

      {/* 关闭按钮 */}
      <button
        type="button"
        onClick={onClose}
        className="p-2 hover:bg-gray-100 rounded transition-colors"
        title="关闭"
      >
        <X className="w-4 h-4 text-gray-400" />
      </button>

      {/* 小三角 */}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
        <div className="w-3 h-3 bg-white border-r border-b border-gray-300 transform rotate-45"></div>
      </div>
    </div>,
    document.body
  );
}