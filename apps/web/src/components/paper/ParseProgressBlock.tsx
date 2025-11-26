'use client';

import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { userPaperService, adminPaperService } from '@/lib/services/paper';

interface ParsingProgressData {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'pending_confirmation';
  progress: number;
  message: string;
  error?: string;
  paper?: any;
  sessionId?: string;
  blocks?: any[];
  parseId?: string;
  tempBlockId?: string;
  parsedBlocks?: any[];
}

interface ParseProgressBlockProps {
  paperId: string;
  sectionId: string;
  blockId: string;
  sessionId?: string;
  parseId?: string;
  onCompleted: (result: any) => void;
  isPersonalOwner?: boolean;
  userPaperId?: string | null;
  initialProgress?: ParsingProgressData;
  externalProgress?: ParsingProgressData;
  onParsePreview?: (data: {
    type: 'preview' | 'cancel';
    blockId: string;
    parsedBlocks?: any[];
    sessionId?: string;
    parseId?: string;
  }) => void;
}

export default function ParseProgressBlock({
  paperId,
  sectionId,
  blockId,
  sessionId,
  parseId,
  onCompleted,
  isPersonalOwner = false,
  userPaperId = null,
  initialProgress,
  externalProgress,
  onParsePreview,
}: ParseProgressBlockProps) {
  const [progress, setProgress] = useState<ParsingProgressData>(() => {
    if (externalProgress) return externalProgress;
    if (initialProgress) return initialProgress;
    return {
      status: 'pending',
      progress: 0,
      message: '准备开始解析...',
      sessionId,
      parseId,
    };
  });

  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasNotifiedRef = useRef(false);
  const progressRef = useRef<ParsingProgressData>(progress);
  
  // 将blocksCount移到组件顶层,避免违反Hooks规则
  const [blocksCount, setBlocksCount] = useState<number>(0);
  
  // 同步 progress 到 ref
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const clearPolling = () => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  };

  useEffect(() => () => clearPolling(), []);

  // 5s 轮询解析状态
  useEffect(() => {
    // 使用 ref 来避免依赖 progress.status 导致的循环
    const currentStatus = progressRef.current.status;
    
    if (currentStatus === 'completed' || currentStatus === 'failed') {
      clearPolling();
      return;
    }

    let cancelled = false;

    const fetchStatus = async () => {
      if (cancelled) return;
      try {
        const result = isPersonalOwner && userPaperId
          ? await userPaperService.checkBlockParsingStatus(userPaperId, sectionId, blockId)
          : await adminPaperService.checkBlockParsingStatus(paperId, sectionId, blockId);

        if (cancelled) return;

        if (result.bizCode !== 0 || !result.data) {
          const message = result.bizMessage || result.topMessage || '解析状态获取失败';
          setProgress(prev => ({ ...prev, status: 'failed', message, error: message }));
          if (!hasNotifiedRef.current) {
            hasNotifiedRef.current = true;
            onCompleted({
              status: 'failed',
              message,
              error: message,
              blockId,
              sectionId,
              sessionId: sessionId || progressRef.current.sessionId || blockId,
            });
          }
          clearPolling();
          return;
        }

        const data = result.data;
        const normalizedStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'pending_confirmation' =
          data.status === 'processing'
            ? 'processing'
            : data.status === 'completed'
            ? 'completed'
            : data.status === 'failed'
            ? 'failed'
            : data.status === 'pending_confirmation'
            ? 'pending_confirmation'
            : 'pending';

        setProgress(prev => {
          const newProgress = {
            ...prev,
            status: normalizedStatus,
            progress: typeof data.progress === 'number' ? data.progress : prev.progress,
            message: data.message || prev.message,
            error: data.error,
            // 注意：当 addedBlocks 存在时，paper 字段不会返回，避免数据冗余
            paper: data.addedBlocks ? prev.paper : (data.paper ?? prev.paper),
            blocks: data.addedBlocks ?? prev.blocks,
            parsedBlocks: data.parsedBlocks ?? prev.parsedBlocks,
            sessionId: prev.sessionId || sessionId,
            parseId: data.parseId || prev.parseId || parseId, // 确保parseId被更新
          };
          
          // 更新 ref
          progressRef.current = newProgress;
          return newProgress;
        });

        if (normalizedStatus === 'completed' || normalizedStatus === 'pending_confirmation') {
          clearPolling();
          if (!hasNotifiedRef.current) {
            hasNotifiedRef.current = true;
            // 检查是否有已确认的blocks，如果有则不再显示parsing状态
            const hasConfirmedBlocks = data.addedBlocks && data.addedBlocks.length > 0;
            const shouldShowParsingBlock = !hasConfirmedBlocks;
            
            onCompleted({
              status: normalizedStatus,
              progress: 100,
              message: data.message || '解析完成',
              // 注意：当 addedBlocks 存在时，paper 字段不会返回，避免数据冗余
              paper: data.addedBlocks ? undefined : data.paper,
              blocks: data.addedBlocks || [],
              addedBlocks: data.addedBlocks || [],
              sessionId: sessionId || blockId,
              blockId,
              sectionId,
              parseId: data.parseId || parseId,
              tempBlockId: data.tempBlockId,
              // 新增字段，指示是否应继续显示parsing block
              shouldShowParsingBlock,
              parsedBlocks: data.parsedBlocks,
            });
            
            // 不再自动弹出对话框，等待用户点击"管理解析结果"按钮
          }
        } else if (normalizedStatus === 'failed') {
          clearPolling();
          if (!hasNotifiedRef.current) {
            hasNotifiedRef.current = true;
            onCompleted({
              status: 'failed',
              progress: 0,
              message: data.error || data.message || '解析失败',
              error: data.error || data.message,
              sessionId: sessionId || blockId,
              blockId,
              sectionId,
            });
          }
        }
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : '解析状态获取失败';
        setProgress(prev => ({ ...prev, status: 'failed', message, error: message }));
        clearPolling();
        if (!hasNotifiedRef.current) {
          hasNotifiedRef.current = true;
          onCompleted({
            status: 'failed',
            message,
            error: message,
            sessionId: sessionId || progressRef.current.sessionId || blockId,
            blockId,
            sectionId,
          });
        }
      }
    };

    fetchStatus();
    pollingTimerRef.current = setInterval(fetchStatus, 8000);

    return () => {
      cancelled = true;
      clearPolling();
    };
  }, [paperId, sectionId, blockId, isPersonalOwner, userPaperId, sessionId, onCompleted]);

  // 关键：外部进度优先
  useEffect(() => {
    if (externalProgress) {
      setProgress(prev => ({
        ...prev,
        ...externalProgress,
        sessionId: externalProgress.sessionId || prev.sessionId,
      }));
    }
  }, [externalProgress]);

  // 没有 sessionId 且没有初始/外部进度时，直接标记失败
  useEffect(() => {
    if (!sessionId && !externalProgress && !initialProgress) {
      setProgress({
        status: 'failed',
        progress: 0,
        message: '解析已中断，请重新开始',
        error: '缺少会话ID，可能是页面刷新导致',
      });
    }
  }, [sessionId, externalProgress, initialProgress]);

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'pending':
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending_confirmation':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusInfo = () => {
    switch (progress.status) {
      case 'pending':
      case 'processing':
        return {
          icon: <Loader2 className="h-5 w-5 animate-spin text-blue-500" />,
          message: progress.message || '正在解析...',
          color: 'blue',
        };
      case 'completed':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          message: progress.message || '解析完成',
          color: 'green',
        };
      case 'pending_confirmation':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          message: progress.message || '解析完成，请确认',
          color: 'green',
        };
      case 'failed':
        return {
          icon: <XCircle className="h-5 w-5 text-red-500" />,
          message: progress.message || '解析失败',
          color: 'red',
        };
      default:
        return {
          icon: <AlertCircle className="h-5 w-5 text-gray-500" />,
          message: progress.message || '未知状态',
          color: 'gray',
        };
    }
  };

  const statusInfo = getStatusInfo();

  // 移除pending_confirmation状态的特殊UI，统一使用completed状态的UI

  // 如果是完成状态且有parseId,获取解析结果
  useEffect(() => {
    const fetchParseResult = async () => {
      if (progress.status !== 'completed' || !progress.parseId) return;
      if (blocksCount > 0) return; // 已经有数据了
      
      // 如果已经有parsedBlocks数据,直接使用
      if (progress.parsedBlocks && progress.parsedBlocks.length > 0) {
        setBlocksCount(progress.parsedBlocks.length);
        return;
      }
      
      try {
        const service = isPersonalOwner && userPaperId ? userPaperService : adminPaperService;
        const result = await service.getParseResult(
          isPersonalOwner && userPaperId ? userPaperId : paperId,
          progress.parseId!
        );
        
        if (result.bizCode === 0 && result.data) {
          const parseData = result.data as any;
          // 处理blocks字段映射
          const blocks = parseData.parsedBlocks || parseData.blocks || [];
          setBlocksCount(blocks.length);
          
          // 更新progress中的parsedBlocks，但不依赖 parsedBlocks 避免循环
          setProgress(prev => ({
            ...prev,
            parsedBlocks: blocks
          }));
        }
      } catch (error) {
        console.error('获取解析结果失败:', error);
      }
    };
    
    fetchParseResult();
  }, [progress.status, progress.parseId, blocksCount, isPersonalOwner, userPaperId, paperId]); // 移除 progress.parsedBlocks 依赖

  // 如果是完成状态且有parseId，显示解析结果管理器按钮
  if (progress.status === 'completed' && progress.parseId) {
    return (
      <div className="my-4 rounded-lg border-2 border-green-200 bg-green-50 p-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              解析完成
            </h3>
            <p className="text-sm text-green-700 mb-4">
              文本解析已完成，共解析出 {blocksCount} 个段落。请点击下方按钮预览结果并选择要保留的内容。
            </p>
            <div className="flex gap-3">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('点击管理解析结果按钮', {
                    blockId,
                    sessionId: progress.sessionId,
                    parseId: progress.parseId,
                    hasCallback: !!onParsePreview
                  });
                  if (onParsePreview) {
                    // 不传递 parsedBlocks，让父组件打开 ParseResultsManager
                    onParsePreview({
                      type: 'preview',
                      blockId,
                      sessionId: progress.sessionId,
                      parseId: progress.parseId,
                    });
                  } else {
                    console.error('onParsePreview 回调未定义');
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
              >
                管理解析结果
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('点击取消解析按钮', {
                    blockId,
                    parseId: progress.parseId,
                    hasCallback: !!onParsePreview
                  });
                  if (onParsePreview) {
                    onParsePreview({
                      type: 'cancel',
                      blockId,
                      parseId: progress.parseId,
                    });
                  }
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                取消解析
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const containerClass =
    statusInfo.color === 'red'
      ? 'my-4 rounded-lg border border-red-200 bg-red-50 p-4'
      : 'my-4 rounded-lg border border-blue-200 bg-blue-50 p-4';

  return (
    <div className={containerClass}>
      <div className="flex items-center gap-3">
        {statusInfo.icon}
        <div>
          <p className={`font-medium ${
            statusInfo.color === 'blue' ? 'text-blue-600' :
            statusInfo.color === 'green' ? 'text-green-600' :
            statusInfo.color === 'red' ? 'text-red-600' :
            'text-gray-600'
          }`}>
            {statusInfo.message}
          </p>
          {progress.error && <p className="text-xs text-red-500 mt-1">{progress.error}</p>}
        </div>
      </div>
    </div>
  );
}
