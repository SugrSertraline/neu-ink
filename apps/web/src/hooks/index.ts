// Hooks 层主入口文件
export { useApiCall, type UseApiCallOptions, type UseApiCallReturn } from './base/useApiCall';
export { useQuery, type UseQueryOptions } from './base/useQuery';
export { useMutation, type UseMutationOptions } from './base/useMutation';

// 权限相关 Hooks
export { useViewerCapabilities } from './permissions/useViewerCapabilities';
export { usePaperEditPermissions } from './permissions/usePaperEditPermissions';
export { usePermissionChecker } from './permissions/usePermissionChecker';

// 论文相关 Hooks
export { usePaperData } from './papers/usePaperData';

// 导出所有权限相关
export * from './permissions';