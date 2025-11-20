'use client';

import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// 配置 PDF.js worker
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
}

export function PdfTestComponent() {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [error, setError] = useState<string | null>(null);

  // 测试用的PDF URL - 使用一个公开可访问的PDF
  const testPdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    console.log('PDF加载成功，总页数:', numPages);
    setError(null);
  }

  function onDocumentLoadError(error: any) {
    console.error('PDF加载失败:', error);
    setError(`PDF加载失败: ${error?.message || error?.toString() || '未知错误'}`);
  }

  function changePage(offset: number) {
    setPageNumber(prevPageNumber => {
      const newPageNumber = prevPageNumber + offset;
      return Math.min(Math.max(1, newPageNumber), numPages || 1);
    });
  }

  function changeScale(newScale: number) {
    setScale(Math.min(3.0, Math.max(0.5, newScale)));
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>PDF渲染测试组件</CardTitle>
        <p className="text-sm text-gray-600">
          测试PDF.js是否能正常渲染PDF文档
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 控制按钮 */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => changePage(-1)}
              disabled={pageNumber <= 1}
            >
              上一页
            </Button>
            <Button
              onClick={() => changePage(1)}
              disabled={pageNumber >= (numPages || 0)}
            >
              下一页
            </Button>
            <Button onClick={() => changeScale(scale - 0.25)} disabled={scale <= 0.5}>
              缩小
            </Button>
            <Button onClick={() => changeScale(scale + 0.25)} disabled={scale >= 3.0}>
              放大
            </Button>
            <Button onClick={() => setScale(1.0)} disabled={scale === 1.0}>
              重置
            </Button>
          </div>

          {/* 页面信息 */}
          <div className="text-sm text-gray-600">
            页码: {pageNumber} / {numPages || '?'} | 缩放: {Math.round(scale * 100)}%
          </div>

          {/* 错误信息 */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {/* PDF 渲染区域 */}
          <div className="border rounded-lg overflow-auto max-h-[600px] bg-gray-50 p-4">
            <Document
              file={testPdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex justify-center items-center h-32">
                  <div className="text-sm text-gray-500">加载PDF中...</div>
                </div>
              }
              error={
                <div className="flex justify-center items-center h-32">
                  <div className="text-sm text-red-500">PDF加载失败</div>
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                canvasBackground="#ffffff"
                className="shadow-lg mx-auto"
              />
            </Document>
          </div>

          {/* 测试信息 */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>测试PDF URL: {testPdfUrl}</p>
            <p>PDF.js版本: {pdfjs.version}</p>
            <p>Worker URL: {pdfjs.GlobalWorkerOptions.workerSrc}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}