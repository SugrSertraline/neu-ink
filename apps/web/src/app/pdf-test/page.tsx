'use client';

import { PdfTestComponent } from '@/components/paper/PdfTestComponent';

export default function PdfTestPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          PDF渲染测试页面
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          此页面用于测试PDF.js的渲染功能，帮助诊断PDF预览问题
        </p>
      </div>
      
      <PdfTestComponent />
      
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">使用说明</h2>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
          <li>此页面使用公开的PDF文件进行测试</li>
          <li>如果PDF能正常显示，说明PDF.js配置正确</li>
          <li>如果PDF无法显示，请检查浏览器控制台的错误信息</li>
          <li>常见的PDF渲染问题包括：CORS错误、Worker加载失败、文件格式不支持</li>
        </ul>
      </div>
    </div>
  );
}