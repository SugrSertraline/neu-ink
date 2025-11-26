// 论文数据管理 Hook
import { useQuery } from '../base/useQuery';
import { useMutation } from '../base/useMutation';
import { paperService } from '@/services';
import type { Paper, CreatePaperRequest, UpdatePaperRequest } from '@/services';

export function usePaperData(paperId: string) {
  // 获取论文数据
  const {
    data: paper,
    loading: paperLoading,
    error: paperError,
    refetch: refetchPaper
  } = useQuery(
    ['paper', paperId],
    () => paperService.getPaper(paperId),
    { enabled: !!paperId }
  );

  // 创建论文
  const {
    execute: createPaper,
    loading: createLoading,
    error: createError
  } = useMutation(
    (paperData: CreatePaperRequest) => paperService.createPaper(paperData),
    {
      onSuccessMessage: '论文创建成功',
      onErrorMessage: '论文创建失败'
    }
  );

  // 更新论文
  const {
    execute: updatePaper,
    loading: updateLoading,
    error: updateError
  } = useMutation(
    (paperData: UpdatePaperRequest) => paperService.updatePaper(paperData.id, paperData),
    {
      onSuccessMessage: '论文更新成功',
      onErrorMessage: '论文更新失败'
    }
  );

  // 删除论文
  const {
    execute: deletePaper,
    loading: deleteLoading,
    error: deleteError
  } = useMutation(
    (id: string) => paperService.deletePaper(id),
    {
      onSuccessMessage: '论文删除成功',
      onErrorMessage: '论文删除失败'
    }
  );

  return {
    // 数据
    paper,
    paperLoading,
    paperError,
    
    // 操作
    createPaper,
    createLoading,
    createError,
    updatePaper,
    updateLoading,
    updateError,
    deletePaper,
    deleteLoading,
    deleteError,
    
    // 工具
    refetchPaper
  };
}