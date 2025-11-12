'use client';

import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/http';

interface ParsingProgressData {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  error?: string;
  paper?: any;
  sessionId?: string;
}

interface ParseProgressBlockProps {
  paperId: string;
  sectionId: string;
  blockId: string;
  sessionId?: string;
  onCompleted: (result: any) => void;
  isPersonalOwner?: boolean; // 添加用户类型标识
  userPaperId?: string | null; // 添加用户论文ID
}

export default function ParseProgressBlock({
  paperId,
  sectionId,
  blockId,
  sessionId,
  onCompleted,
  isPersonalOwner = false,
  userPaperId = null
}: ParseProgressBlockProps) {
  const [progress, setProgress] = useState<ParsingProgressData>({
    status: 'pending',
    progress: 0,
    message: '准备开始解析...'
  });
  const [isConnected, setIsConnected] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const connectingRef = useRef(false);

  useEffect(() => {
    console.log('ParseProgressBlock useEffect:', { sessionId, paperId, sectionId, blockId });
    
    // 只有在有sessionId时才尝试连接
    if (sessionId) {
      connectToStream();
    }

    return () => {
      disconnectFromStream();
    };
  }, [paperId, sectionId, blockId, sessionId]);

  const connectToStream = () => {
    console.log('connectToStream called:', { paperId, sectionId, sessionId });
    
    if (!paperId || !sectionId) {
      console.error('Missing paperId or sectionId:', { paperId, sectionId });
      return;
    }
    
    if (!sessionId || sessionId === '') {
      console.warn('No sessionId; cannot connect SSE');
      setIsConnected(false);
      setProgress(prev => ({
        ...prev,
        status: 'failed',
        message: '缺少会话ID，无法连接到解析服务',
        progress: 0,
        error: '缺少会话ID'
      }));
      return;
    }
    
    if (eventSourceRef.current || connectingRef.current) {
      console.log('Connection already in progress:', { 
        hasEventSource: !!eventSourceRef.current, 
        isConnecting: connectingRef.current 
      });
      return;
    }
    
    connectingRef.current = true;

    try {
      // 根据用户类型选择不同的API端点
      const apiEndpoint = isPersonalOwner && userPaperId
        ? `/api/v1/user/papers/${userPaperId}/sections/${sectionId}/add-block-from-text-stream`
        : `/api/v1/admin/papers/${paperId}/sections/${sectionId}/add-block-from-text-stream`;
      
      // 构建查询参数
      const params = new URLSearchParams();
      if (sessionId) {
        params.append('sessionId', sessionId);
      }
      
      // 获取token并添加到URL参数中
      const token = apiClient.getToken();
      if (token) {
        params.append('token', token);
      }
      
      // 使用apiClient的getFullURL方法构建完整URL
      const baseUrl = apiClient.getFullURL(apiEndpoint);
      const streamUrl = `${baseUrl}?${params.toString()}`;

      console.log('🔗 连接到流式传输:', streamUrl);

      const eventSource = new EventSource(streamUrl, {
        withCredentials: true
      });

      eventSource.onopen = () => {
        console.log('✅ 流式传输连接已建立');
        setIsConnected(true);
        setProgress(prev => ({
          ...prev,
          message: '已连接到解析服务...',
          progress: Math.max(prev.progress, 5)
        }));
        connectingRef.current = false;
      };
      
      // 添加连接超时处理
      const connectionTimeout = setTimeout(() => {
        if (eventSource.readyState === EventSource.CONNECTING) {
          console.error('⏰ 连接超时');
          eventSource.close();
          eventSourceRef.current = null;
          setIsConnected(false);
          setProgress(prev => ({
            ...prev,
            status: 'failed',
            message: '连接超时，请检查网络连接',
            error: 'EventSource连接超时',
            progress: prev.progress
          }));
          connectingRef.current = false;
        }
      }, 10000); // 10秒超时

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📡 收到数据:', data);

          // 处理后端发送的不同格式
          if (data.type === 'status_update' && data.data) {
            const statusData = data.data as ParsingProgressData;
            setProgress(statusData);

            if (statusData.status === 'completed') {
              console.log('✅ 解析完成');
              onCompleted(statusData);
              // 正常关闭连接
              eventSource.close();
              eventSourceRef.current = null;
              setIsConnected(false);
            } else if (statusData.status === 'failed') {
              console.error('❌ 解析失败:', statusData.message);
              // 关闭连接
              eventSource.close();
              eventSourceRef.current = null;
              setIsConnected(false);
            }
          } else if (data.type === 'progress') {
            // 直接处理进度更新
            setProgress(prev => ({
              ...prev,
              status: 'processing',
              message: data.message || prev.message,
              progress: data.progress || prev.progress
            }));
          } else if (data.type === 'complete') {
            // 处理完成事件
            setProgress({
              status: 'completed',
              progress: 100,
              message: '解析完成',
              paper: data.paper
            });
            onCompleted({
              status: 'completed',
              progress: 100,
              message: '解析完成',
              paper: data.paper,
              blocks: data.blocks || []
            });
            // 正常关闭连接
            eventSource.close();
            eventSourceRef.current = null;
            setIsConnected(false);
          } else if (data.type === 'error') {
            console.error('❌ 流式传输错误:', data.message);
            setProgress(prev => ({
              ...prev,
              status: 'failed',
              message: data.message || '解析失败',
              progress: 0
            }));
            // 关闭连接
            eventSource.close();
            eventSourceRef.current = null;
            setIsConnected(false);
          }
        } catch (error) {
          console.error('解析数据失败:', error);
          // 如果是JSON解析错误，可能是会话正常结束
          if (error instanceof SyntaxError && error.message.includes('JSON')) {
            console.log('🔚 可能是会话正常结束');
            setProgress(prev => ({
              ...prev,
              status: 'completed',
              progress: 100,
              message: '解析完成'
            }));
            onCompleted({
              status: 'completed',
              progress: 100,
              message: '解析完成',
              paper: progress.paper,
              blocks: []
            });
            // 关闭连接
            eventSource.close();
            eventSourceRef.current = null;
            setIsConnected(false);
          }
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ 流式传输连接错误:', error);
        console.error('EventSource状态:', eventSource.readyState);
        setIsConnected(false);
        
        // 清除连接超时定时器
        clearTimeout(connectionTimeout);
        
        // 检查连接状态
        if (eventSource.readyState === EventSource.CLOSED) {
          console.log('🔌 EventSource 已关闭');
          // 如果不是完成状态，可能是意外关闭
          if (progress.status !== 'completed') {
            setProgress(prev => ({
              ...prev,
              status: 'failed',
              message: '连接意外关闭',
              error: 'EventSource连接意外关闭',
              progress: prev.progress
            }));
          }
          return;
        }
        
        // 只有在非完成状态下才显示错误
        if (progress.status !== 'completed') {
          // 获取更详细的错误信息
          let errorMessage = '连接失败';
          let errorDetail = '未知错误';
          
          // 根据readyState判断错误类型
          switch (eventSource.readyState) {
            case EventSource.CONNECTING:
              errorMessage = '连接中，请稍候...';
              errorDetail = 'EventSource正在尝试连接';
              break;
            case EventSource.OPEN:
              errorMessage = '连接中断';
              errorDetail = 'EventSource连接已建立但发生错误';
              break;
            default:
              errorMessage = '服务器连接错误';
              errorDetail = `EventSource错误: ${error?.type || 'unknown'}`;
          }
          
          // 检查网络状态
          if (!navigator.onLine) {
            errorMessage = '网络连接已断开';
            errorDetail = '请检查网络连接后重试';
          }
          
          // 检查HTTP状态码（如果可用）
          try {
            // 尝试发送一个简单的请求来检查服务器状态
            fetch(streamUrl, {
              method: 'HEAD',
              credentials: 'include'
            }).then(response => {
              if (!response.ok) {
                errorMessage = `服务器错误 (${response.status})`;
                errorDetail = `HTTP ${response.status}: ${response.statusText}`;
                setProgress(prev => ({
                  ...prev,
                  status: 'failed',
                  message: errorMessage,
                  error: errorDetail,
                  progress: prev.progress
                }));
              }
            }).catch(() => {
              // 忽略这个错误，因为我们已经有了错误信息
              setProgress(prev => ({
                ...prev,
                status: 'failed',
                message: errorMessage,
                error: errorDetail,
                progress: prev.progress
              }));
            });
          } catch (e) {
            // 忽略这个错误
            setProgress(prev => ({
              ...prev,
              status: 'failed',
              message: errorMessage,
              error: errorDetail,
              progress: prev.progress
            }));
          }
          
          // 如果没有通过fetch更新状态，则在这里更新
          if (eventSource.readyState !== EventSource.CONNECTING) {
            setProgress(prev => ({
              ...prev,
              status: 'failed',
              message: errorMessage,
              error: errorDetail,
              progress: prev.progress
            }));
          }
        }
        
        connectingRef.current = false;
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error('创建流式传输连接失败:', error);
      setIsConnected(false);
      setProgress(prev => ({
        ...prev,
        status: 'failed',
        message: '连接失败: ' + (error as Error).message,
        progress: 0
      }));
      connectingRef.current = false;
    }
  };

  const disconnectFromStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
      connectingRef.current = false;
    }
  };

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'pending':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (progress.status) {
      case 'pending':
        return '等待开始';
      case 'processing':
        return '解析中';
      case 'completed':
        return '解析完成';
      case 'failed':
        return '解析失败';
      default:
        return '未知状态';
    }
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case 'pending':
      case 'processing':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  // 如果状态是失败，使用红色边框
  const containerClass = progress.status === 'failed'
    ? "my-4 rounded-lg border border-red-200 bg-red-50 p-4"
    : "my-4 rounded-lg border border-blue-200 bg-blue-50 p-4";

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <h3 className="text-lg font-semibold text-gray-900">
            文本解析进度
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-1 text-xs text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              已连接
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-red-600">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              未连接
            </div>
          )}
        </div>
      </div>

      {/* 状态显示 */}
      <div className="flex items-center gap-3 mb-4">
        <div>
          <p className={`font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </p>
          <p className="text-sm text-gray-600">
            {progress.message}
          </p>
        </div>
      </div>

      {/* 进度条 */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">进度</span>
          <span className="text-gray-600">{progress.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              progress.status === 'failed'
                ? 'bg-red-500'
                : progress.status === 'completed'
                ? 'bg-green-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${progress.progress}%` }}
          />
        </div>
      </div>

      {/* 错误信息 */}
      {progress.status === 'failed' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
          <p className="text-sm text-red-600">
            <strong>错误详情:</strong> {progress.error || '连接失败，请重试'}
          </p>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-end gap-2 mb-4">
        {progress.status === 'failed' && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setProgress({
                  status: 'pending',
                  progress: 0,
                  message: '重新连接中...',
                  error: undefined
                });
                connectingRef.current = false; // 重置连接状态
                disconnectFromStream();
                setTimeout(() => {
                  connectToStream();
                }, 500); // 延迟重连
              }}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
            >
              重新连接
            </button>
            <button
              onClick={() => {
                // 复制错误信息到剪贴板
                const errorInfo = `错误信息: ${progress.message}\n错误详情: ${progress.error || '无'}\n时间: ${new Date().toLocaleString()}\n会话ID: ${sessionId}\n论文ID: ${paperId}\n章节ID: ${sectionId}`;
                navigator.clipboard.writeText(errorInfo).then(() => {
                  // 显示复制成功的提示
                  const originalText = progress.message;
                  setProgress(prev => ({
                    ...prev,
                    message: '错误信息已复制到剪贴板'
                  }));
                  setTimeout(() => {
                    setProgress(prev => ({
                      ...prev,
                      message: originalText
                    }));
                  }, 2000);
                }).catch(err => {
                  console.error('复制失败:', err);
                });
              }}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100"
            >
              复制错误信息
            </button>
          </div>
        )}
      </div>

      {/* 解析步骤提示 */}
      <div className="text-xs text-gray-500 space-y-1">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${progress.progress >= 10 ? 'bg-green-500' : progress.progress >= 5 ? 'bg-blue-500' : 'bg-gray-300'}`} />
          <span>准备解析</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${progress.progress >= 30 ? 'bg-green-500' : progress.progress >= 10 ? 'bg-blue-500' : 'bg-gray-300'}`} />
          <span>调用AI服务</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${progress.progress >= 80 ? 'bg-green-500' : progress.progress >= 30 ? 'bg-blue-500' : 'bg-gray-300'}`} />
          <span>保存结果</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${progress.progress >= 100 ? 'bg-green-500' : progress.progress >= 80 ? 'bg-blue-500' : 'bg-gray-300'}`} />
          <span>完成</span>
        </div>
      </div>
    </div>
  );
}