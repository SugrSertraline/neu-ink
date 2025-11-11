'use client';

import { useState } from 'react';
import BlockEditor from '@/components/paper/editor/BlockEditor';
import type { FigureBlock } from '@/types/paper';

export default function TestBlockEditorPage() {
  // 创建一个测试用的图片块
  const [figureBlock, setFigureBlock] = useState<FigureBlock>({
    id: 'test-figure-1',
    type: 'figure',
    src: '',
    alt: '',
    width: '',
    height: '',
    caption: {
      en: [],
      zh: []
    },
    description: {
      en: [],
      zh: []
    }
  });

  const handleBlockChange = (updatedBlock: FigureBlock) => {
    console.log('[DEBUG] BlockEditor onChange 被调用:', updatedBlock);
    setFigureBlock(updatedBlock);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">BlockEditor 图片上传测试</h1>
      
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">测试说明</h2>
        <ul className="text-sm space-y-1">
          <li>• 点击下方图片块进入编辑模式</li>
          <li>• 上传图片后观察URL是否正确更新</li>
          <li>• 打开浏览器开发者工具查看控制台日志</li>
          <li>• 检查图片预览是否正常显示</li>
        </ul>
      </div>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">当前Block状态</h2>
        <pre className="text-xs bg-white p-3 rounded border overflow-auto">
          {JSON.stringify(figureBlock, null, 2)}
        </pre>
      </div>
      
      <div className="border-2 border-gray-300 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">图片块编辑器</h2>
        <BlockEditor
          block={figureBlock}
          onChange={(updatedBlock) => handleBlockChange(updatedBlock as FigureBlock)}
          canMoveUp={false}
          canMoveDown={false}
        />
      </div>
      
      <div className="mt-6 p-4 bg-amber-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">调试提示</h2>
        <div className="text-sm space-y-2">
          <p>如果图片上传成功但没有显示，请检查：</p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>控制台是否有错误信息</li>
            <li>网络请求是否成功</li>
            <li>图片URL是否有效</li>
            <li>是否有CORS问题</li>
          </ul>
        </div>
      </div>
    </div>
  );
}