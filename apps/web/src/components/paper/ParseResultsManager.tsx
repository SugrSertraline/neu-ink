'use client';

import React, { useState, useEffect } from 'react';
import { BlockContent } from '@/types/paper';
import { BusinessCode } from '@/types/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import BlockRenderer from './BlockRenderer';
import { CheckCircle, XCircle, Loader2, Check, X, Save } from 'lucide-react';
import { userPaperService, adminPaperService } from '@/lib/services/paper';

interface ParseResultsManagerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  parseId: string;
  paperId: string;
  sectionId: string;
  blockId: string;
  tempBlockId?: string;
  userPaperId?: string | null;
  onClose?: () => void;
  onSuccess?: () => void;
  isUserPaper?: boolean;
  onConfirm?: () => void;  // 解析确认后的回调
  onBlocksAdded?: (blocks: BlockContent[]) => void;  // 新增：blocks添加后的回调
}

interface ParseResult {
  parseId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'consumed';
  text: string;
  parsedBlocks: BlockContent[];
  createdAt: string;
  updatedAt: string;
  error?: string;
  tempBlockId?: string;  // 新增：临时block ID
}

export default function ParseResultsManager({
  isOpen,
  onOpenChange,
  parseId,
  paperId,
  sectionId,
  blockId,
  tempBlockId,
  userPaperId,
  onClose,
  onSuccess,
  isUserPaper = false,
  onConfirm,
  onBlocksAdded,
}: ParseResultsManagerProps) {
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取解析结果
  const fetchParseResult = async () => {
    if (!parseId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const service = userPaperId ? userPaperService : adminPaperService;
      const result = await service.getParseResult(paperId, parseId);
      
      if (result.bizCode !== BusinessCode.SUCCESS) {
        throw new Error(result.bizMessage || '获取解析结果失败');
      }
      
      // 处理后端返回的数据结构，将 blocks 字段映射为 parsedBlocks
      const parseData = result.data as any;
      if (parseData.blocks && !parseData.parsedBlocks) {
        parseData.parsedBlocks = parseData.blocks;
      }
      
      setParseResult(parseData);
      
      // 默认选择所有blocks
      if (parseData.parsedBlocks) {
        setSelectedBlockIds(new Set(parseData.parsedBlocks.map((b: BlockContent) => b.id)));
      }
    } catch (err: any) {
      setError(err.message || '获取解析结果失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 轮询解析状态
  const pollParseStatus = async () => {
    if (!parseId) return;
    
    try {
      const service = userPaperId ? userPaperService : adminPaperService;
      
      // 先尝试获取解析结果
      try {
        const result = await service.getParseResult(paperId, parseId);
        
        if (result.bizCode === BusinessCode.SUCCESS && result.data) {
          // 处理后端返回的数据结构，将 blocks 字段映射为 parsedBlocks
          const parseData = result.data as any;
          if (parseData.blocks && !parseData.parsedBlocks) {
            parseData.parsedBlocks = parseData.blocks;
          }
          
          setParseResult(parseData);
          
          // 默认选择所有blocks
          if (parseData.parsedBlocks) {
            setSelectedBlockIds(new Set(parseData.parsedBlocks.map((b: BlockContent) => b.id)));
          }
          
          // 如果解析完成，停止轮询
          if (parseData.status === 'completed') {
            return;
          }
        }
      } catch (err) {
        // 获取解析结果失败，继续尝试通过parsing-status获取状态
      }
      
      // 如果获取解析结果失败，尝试通过parsing-status获取状态
      const tempBlockId = parseResult?.tempBlockId || '';
      if (tempBlockId) {
        try {
          const statusService = userPaperId ? userPaperService : adminPaperService;
          const statusResult = await statusService.checkBlockParsingStatus(paperId, sectionId, tempBlockId);
          
          if (statusResult.bizCode === BusinessCode.SUCCESS && statusResult.data) {
            const status = statusResult.data.status;
            
            // 如果解析完成，重新获取解析结果
            if (status === 'completed') {
              setTimeout(fetchParseResult, 1000);
            }
          }
        } catch (err) {
          console.error('获取解析状态失败:', err);
        }
      }
    } catch (err) {
      console.error('轮询解析状态失败:', err);
    }
  };

  // 确认选中的blocks
  const handleConfirm = async () => {
    if (!parseId || selectedBlockIds.size === 0) return;
    
    try {
      setIsConfirming(true);
      setError(null);
      
      const service = userPaperId ? userPaperService : adminPaperService;
      const result = await service.confirmParseResult(
        userPaperId || paperId,
        parseId,
        {
          selectedBlockIds: Array.from(selectedBlockIds),
          removeOthers: true,
        }
      );
      
      if (result.bizCode !== BusinessCode.SUCCESS) {
        throw new Error(result.bizMessage || '确认解析结果失败');
      }
      
      console.log('[ParseResultsManager] 确认解析结果成功', result.data);
      
      // 获取选中的blocks数据
      const selectedBlocks = parseResult?.parsedBlocks?.filter(block =>
        selectedBlockIds.has(block.id)
      ) || [];
      
      console.log('[ParseResultsManager] 选中的blocks:', selectedBlocks);
      
      // 通知父组件blocks已添加，不再刷新整个页面
      // 只传递blocks数据，不传递完整的paper对象，避免页面刷新
      if (onBlocksAdded && selectedBlocks.length > 0) {
        onBlocksAdded(selectedBlocks);
      }
      
      // 成功确认，关闭对话框
      onOpenChange(false);
      onConfirm?.();
      onClose?.();
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || '确认解析结果失败');
    } finally {
      setIsConfirming(false);
    }
  };

  // 丢弃解析结果
  const handleDiscard = async () => {
    if (!parseId) return;
    
    try {
      setIsDiscarding(true);
      setError(null);
      
      const service = userPaperId ? userPaperService : adminPaperService;
      const result = await service.discardParseResult(paperId, parseId);
      
      if (result.bizCode !== BusinessCode.SUCCESS) {
        throw new Error(result.bizMessage || '丢弃解析结果失败');
      }
      
      // 成功丢弃，关闭对话框
      onOpenChange(false);
      onClose?.();
    } catch (err: any) {
      setError(err.message || '丢弃解析结果失败');
    } finally {
      setIsDiscarding(false);
    }
  };

  // 保存所有blocks
  const handleSaveAll = async () => {
    if (!parseId) return;
    
    try {
      setIsSavingAll(true);
      setError(null);
      
      const service = userPaperId ? userPaperService : adminPaperService;
      const result = await service.saveAllParseResult(
        userPaperId || paperId,
        parseId
      );
      
      if (result.bizCode !== BusinessCode.SUCCESS) {
        throw new Error(result.bizMessage || '保存解析结果失败');
      }
      
      console.log('[ParseResultsManager] 保存所有解析结果成功', result.data);
      
      // 获取所有blocks数据
      const allBlocks = parseResult?.parsedBlocks || [];
      
      console.log('[ParseResultsManager] 所有blocks:', allBlocks);
      
      // 通知父组件blocks已添加，不再刷新整个页面
      // 只传递blocks数据，不传递完整的paper对象，避免页面刷新
      if (onBlocksAdded && allBlocks.length > 0) {
        onBlocksAdded(allBlocks);
      }
      
      // 成功保存，关闭对话框
      onOpenChange(false);
      onConfirm?.();
      onClose?.();
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || '保存解析结果失败');
    } finally {
      setIsSavingAll(false);
    }
  };

  // 切换block选择状态
  const toggleBlock = (blockId: string) => {
    setSelectedBlockIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(blockId)) {
        newSet.delete(blockId);
      } else {
        newSet.add(blockId);
      }
      return newSet;
    });
  };

  // 全选/全不选
  const selectAll = () => {
    if (parseResult?.parsedBlocks) {
      setSelectedBlockIds(new Set(parseResult.parsedBlocks.map(b => b.id)));
    }
  };

  const deselectAll = () => {
    setSelectedBlockIds(new Set());
  };

  // 当对话框打开时，获取解析结果
  useEffect(() => {
    if (isOpen && parseId) {
      fetchParseResult();
    }
  }, [isOpen, parseId]);

  // 轮询解析状态
  useEffect(() => {
    if (isOpen && parseId && parseResult?.status === 'processing') {
      const interval = setInterval(pollParseStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen, parseId, parseResult?.status, sectionId, paperId, userPaperId]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>解析结果管理</DialogTitle>
          <DialogDescription>
            预览和管理解析结果，选择要保留的内容。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>正在获取解析结果...</span>
            </div>
          )}

          {!isLoading && error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {!isLoading && parseResult && (
            <>
              {/* 状态信息 */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">解析状态:</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      parseResult.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      parseResult.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      parseResult.status === 'processing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }`}>
                      {parseResult.status === 'pending' && '等待中'}
                      {parseResult.status === 'processing' && '解析中'}
                      {parseResult.status === 'completed' && '已完成'}
                      {parseResult.status === 'failed' && '失败'}
                      {parseResult.status === 'consumed' && '已消费'}
                    </span>
                  </div>
                   
                  {parseResult.status === 'completed' && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      已选择 {selectedBlockIds.size} / {parseResult.parsedBlocks?.length || 0} 个段落
                    </div>
                  )}
                </div>
               
                {parseResult.error && (
                  <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                    错误信息: {parseResult.error}
                  </div>
                )}
              </div>

              {/* 解析结果预览 */}
              {parseResult.status === 'completed' && (parseResult.parsedBlocks?.length || 0) > 0 && (
                <>
                  {/* 选择控制 */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAll}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      全选
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={deselectAll}
                    >
                      <X className="h-4 w-4 mr-1" />
                      全不选
                    </Button>
                  </div>

                  {/* Blocks预览 */}
                  <div className="space-y-3">
                    {parseResult.parsedBlocks?.map((block, index) => {
                      const isSelected = selectedBlockIds.has(block.id);
                      
                      return (
                        <div
                          key={block.id}
                          className={`relative rounded-lg border-2 p-4 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                          onClick={() => toggleBlock(block.id)}
                        >
                          <div className="absolute top-2 right-2 z-10">
                            {isSelected ? (
                              <CheckCircle className="h-6 w-6 text-blue-600" />
                            ) : (
                              <XCircle className="h-6 w-6 text-gray-300" />
                            )}
                          </div>
                           
                          <div className="absolute top-2 left-2 text-xs font-semibold text-gray-500">
                            #{index + 1}
                          </div>
                           
                          <div className="mt-6">
                            <BlockRenderer
                              block={block}
                              lang="both"
                              isActive={false}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* 错误信息 */}
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* 操作按钮 */}
        <DialogFooter>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDiscard}
              disabled={isDiscarding || isLoading}
            >
              {isDiscarding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              丢弃
            </Button>
             
            {parseResult?.status === 'completed' && (parseResult.parsedBlocks?.length || 0) > 0 && (
              <>
                <Button
                  variant="outline"
                  onClick={handleSaveAll}
                  disabled={isSavingAll || isLoading}
                >
                  {isSavingAll && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  保存全部
                </Button>
                 
                <Button
                  onClick={handleConfirm}
                  disabled={isConfirming || isLoading || selectedBlockIds.size === 0}
                >
                  {isConfirming && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  确认保留 ({selectedBlockIds.size})
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}