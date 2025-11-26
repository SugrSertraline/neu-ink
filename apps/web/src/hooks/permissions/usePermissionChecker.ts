import { useMemo } from 'react';
import type { PaperEditPermissions } from '@/types/paper/viewer';

/**
 * 权限检查工具 Hook
 * @param permissions 权限对象
 * @returns 权限检查工具函数
 */
export function usePermissionChecker(permissions: PaperEditPermissions) {
  return useMemo(() => ({
    canEdit: permissions.canEditContent || permissions.canEditStructure,
    canAddNotes: permissions.canAddNotes,
    canToggleVisibility: permissions.canToggleVisibility,
    canAccessEditor: permissions.canAccessEditor,
    isOwner: permissions.source === 'personal-owner',
    isAdmin: permissions.source === 'public-admin',
    isGuest: permissions.source === 'public-guest',
    
    // 组合权限检查
    canEditAny: permissions.canEditContent || permissions.canEditStructure,
    canManagePaper: permissions.canEditContent || permissions.canEditStructure || permissions.canToggleVisibility,
    hasFullAccess: permissions.source === 'personal-owner' || permissions.source === 'public-admin',
  }), [permissions]);
}