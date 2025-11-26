import React from 'react';
import type { PaperEditPermissions } from '@/types/paper/viewer';
import { usePermissionChecker } from '@/hooks/permissions/usePermissionChecker';

interface PermissionGuardProps {
  children: React.ReactNode;
  permissions: PaperEditPermissions;
  require?: keyof PaperEditPermissions;
  requireAny?: (keyof PaperEditPermissions)[];
  requireAll?: (keyof PaperEditPermissions)[];
  fallback?: React.ReactNode;
}

/**
 * 权限守卫组件
 * 根据权限条件渲染内容或回退组件
 */
export function PermissionGuard({
  children,
  permissions,
  require,
  requireAny,
  requireAll,
  fallback
}: PermissionGuardProps) {
  const checker = usePermissionChecker(permissions);
  
  let hasPermission = true;
  
  // 单个权限检查
  if (require) {
    hasPermission = Boolean(permissions[require]);
  }
  
  // 任意权限检查
  if (requireAny && hasPermission) {
    hasPermission = requireAny.some(key => Boolean(permissions[key]));
  }
  
  // 全部权限检查
  if (requireAll && hasPermission) {
    hasPermission = requireAll.every(key => Boolean(permissions[key]));
  }
  
  return hasPermission ? <>{children}</> : <>{fallback}</>;
}

/**
 * 预设权限守卫组件
 */
export function EditPermissionGuard({ 
  children, 
  permissions, 
  fallback 
}: { 
  children: React.ReactNode; 
  permissions: PaperEditPermissions; 
  fallback?: React.ReactNode;
}) {
  return (
    <PermissionGuard
      permissions={permissions}
      require="canEditContent"
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  );
}

export function AdminPermissionGuard({ 
  children, 
  permissions, 
  fallback 
}: { 
  children: React.ReactNode; 
  permissions: PaperEditPermissions; 
  fallback?: React.ReactNode;
}) {
  return (
    <PermissionGuard
      permissions={permissions}
      require="canEditPublicPaper"
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  );
}

export function OwnerPermissionGuard({ 
  children, 
  permissions, 
  fallback 
}: { 
  children: React.ReactNode; 
  permissions: PaperEditPermissions; 
  fallback?: React.ReactNode;
}) {
  return (
    <PermissionGuard
      permissions={permissions}
      require="canEditPersonalPaper"
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  );
}