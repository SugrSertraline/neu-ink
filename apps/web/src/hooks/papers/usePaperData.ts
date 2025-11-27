// 论文数据管理 Hook
import { useQuery } from '../base/useQuery';
import { useMutation } from '../base/useMutation';
import { adminPaperService } from '@/lib/services/papers';
import type { Paper } from '@/types/paper';
import type { CreatePaperFromTextRequest, CreatePaperFromMetadataRequest } from '@/types/paper';

export function usePaperData(paperId: string) {
  // 获取论文数据
  const {
    data: paper,
    loading: paperLoading,
    error: paperError,
    refetch: refetchPaper
  } = useQuery(
    ['paper', paperId],
    () => adminPaperService.getAdminPaperDetail(paperId),
    { enabled: !!paperId }
  );

  // 创建论文（从文本）
  const {
    execute: createPaperFromText,
    loading: createFromTextLoading,
    error: createFromTextError
  } = useMutation(
    (paperData: CreatePaperFromTextRequest) => adminPaperService.createPaperFromText(paperData),
    {
      onSuccessMessage: '论文创建成功',
      onErrorMessage: '论文创建失败'
    }
  );

  // 创建论文（从元数据）
  const {
    execute: createPaperFromMetadata,
    loading: createFromMetadataLoading,
    error: createFromMetadataError
  } = useMutation(
    (paperData: CreatePaperFromMetadataRequest) => adminPaperService.createPaper(paperData as any),
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
    (paperData: Partial<Paper> & { id: string }) => adminPaperService.updateAdminPaperMetadata(paperData.id, paperData),
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
    (id: string) => adminPaperService.deletePaper(id),
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
    createPaperFromText,
    createFromTextLoading,
    createFromTextError,
    createPaperFromMetadata,
    createFromMetadataLoading,
    createFromMetadataError,
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