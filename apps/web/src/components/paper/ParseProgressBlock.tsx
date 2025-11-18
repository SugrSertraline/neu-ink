'use client';

import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { userPaperService, adminPaperService } from '@/lib/services/paper';

interface ParsingProgressData {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  error?: string;
  paper?: any;
  sessionId?: string;
  blocks?: any[];
}

interface ParseProgressBlockProps {
  paperId: string;
  sectionId: string;
  blockId: string;
  sessionId?: string;
  onCompleted: (result: any) => void;
  isPersonalOwner?: boolean;
  userPaperId?: string | null;
  initialProgress?: ParsingProgressData;
  externalProgress?: ParsingProgressData;
}

export default function ParseProgressBlock({
  paperId,
  sectionId,
  blockId,
  sessionId,
  onCompleted,
  isPersonalOwner = false,
  userPaperId = null,
  initialProgress,
  externalProgress,
}: ParseProgressBlockProps) {
  const [progress, setProgress] = useState<ParsingProgressData>(() => {
    if (externalProgress) return externalProgress;
    if (initialProgress) return initialProgress;
    return {
      status: 'pending',
      progress: 0,
      message: '准备开始解析...',
      sessionId,
    };
  });

  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasNotifiedRef = useRef(false);

  const clearPolling = () => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  };

  useEffect(() => () => clearPolling(), []);

  // 5s 轮询解析状态
  useEffect(() => {
    if (progress.status === 'completed' || progress.status === 'failed') {
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
              sessionId: sessionId || progress.sessionId || blockId,
            });
          }
          clearPolling();
          return;
        }

        const data = result.data;
        const normalizedStatus: 'pending' | 'processing' | 'completed' | 'failed' =
          data.status === 'processing'
            ? 'processing'
            : data.status === 'completed'
            ? 'completed'
            : data.status === 'failed'
            ? 'failed'
            : 'pending';

        setProgress(prev => ({
          ...prev,
          status: normalizedStatus,
          progress: typeof data.progress === 'number' ? data.progress : prev.progress,
          message: data.message || prev.message,
          error: data.error,
          // 注意：当 addedBlocks 存在时，paper 字段不会返回，避免数据冗余
          paper: data.addedBlocks ? prev.paper : (data.paper ?? prev.paper),
          blocks: data.addedBlocks ?? prev.blocks,
          sessionId: prev.sessionId || sessionId,
        }));

        if (normalizedStatus === 'completed') {
          clearPolling();
          if (!hasNotifiedRef.current) {
            hasNotifiedRef.current = true;
            onCompleted({
              status: 'completed',
              progress: 100,
              message: data.message || '解析完成',
              // 注意：当 addedBlocks 存在时，paper 字段不会返回，避免数据冗余
              paper: data.addedBlocks ? undefined : data.paper,
              blocks: data.addedBlocks || [],
              addedBlocks: data.addedBlocks || [],
              sessionId: sessionId || blockId,
              blockId,
              sectionId,
            });
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
            sessionId: sessionId || progress.sessionId || blockId,
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
  }, [paperId, sectionId, blockId, isPersonalOwner, userPaperId, progress.status, sessionId, onCompleted]);

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
