'use client';

import { useState } from 'react';
import { uploadImage, uploadPaperImage } from '@/lib/services/upload';
import { toast } from 'sonner';

export default function TestUploadPage() {
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>, usePaperUpload: boolean = false) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    try {
      let result;
      if (usePaperUpload) {
        // 使用测试论文ID
        result = await uploadPaperImage(file, 'test-paper-123');
      } else {
        result = await uploadImage(file);
      }
      
      console.log('上传成功:', result);
      setResults(prev => [...prev, { 
        type: usePaperUpload ? '论文图片' : '普通图片', 
        file: file.name, 
        result,
        timestamp: new Date().toLocaleString()
      }]);
      
      toast.success(`${usePaperUpload ? '论文图片' : '图片'}上传成功`);
    } catch (error) {
      console.error('上传失败:', error);
      toast.error('上传失败', {
        description: error instanceof Error ? error.message : '未知错误'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">图片上传测试</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">普通图片上传</h2>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileSelect(e, false)}
            disabled={uploading}
            className="mb-4"
          />
          <p className="text-sm text-gray-600">
            使用 /api/v1/upload/image 接口
          </p>
        </div>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">论文图片上传</h2>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileSelect(e, true)}
            disabled={uploading}
            className="mb-4"
          />
          <p className="text-sm text-gray-600">
            使用 /api/v1/upload/paper-image 接口
          </p>
        </div>
      </div>
      
      {uploading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2">上传中...</p>
        </div>
      )}
      
      {results.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">上传结果</h2>
          <div className="space-y-4">
            {results.map((item, index) => (
              <div key={index} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">{item.type}</h3>
                  <span className="text-sm text-gray-500">{item.timestamp}</span>
                </div>
                <p className="text-sm mb-2">文件名: {item.file}</p>
                <div className="bg-white p-3 rounded border">
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(item.result, null, 2)}
                  </pre>
                </div>
                {item.result?.url && (
                  <div className="mt-3">
                    <p className="text-sm font-medium mb-1">预览:</p>
                    <img 
                      src={item.result.url} 
                      alt="预览" 
                      className="max-h-48 rounded border"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><text x="50%" y="50%" text-anchor="middle" fill="gray">图片加载失败</text></svg>';
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">调试说明</h2>
        <ul className="text-sm space-y-1">
          <li>• 打开浏览器开发者工具查看控制台日志</li>
          <li>• 检查网络请求和响应</li>
          <li>• 确保后端服务正在运行</li>
          <li>• 确保七牛云配置正确</li>
        </ul>
      </div>
    </div>
  );
}