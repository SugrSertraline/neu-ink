'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Shield,
  User,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { userService, isSuccess } from '@/lib/services/user';
import { cn } from '@/lib/utils';
import type {
  User as UserType,
  UserListResponse,
  CreateUserDto,
  UpdateUserDto,
  Role
} from '@/types/user';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

import dynamic from 'next/dynamic';

const UserFormDialog = dynamic(() => import('@/components/users/UserFormDialog'), {
  loading: () => <div>Loading...</div>,
});

const DeleteUserDialog = dynamic(() => import('@/components/users/DeleteUserDialog'), {
  loading: () => <div>Loading...</div>,
});

export default function UsersPage() {
  const { user: currentUser, isAdmin, requireAuth } = useAuth();
  const [users, setUsers] = useState<UserType[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);

  // 权限检查
  if (!requireAuth()) {
    return null; // 会自动跳转到登录页
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">权限不足</h3>
          <p className="text-gray-500">只有管理员可以访问用户管理页面</p>
        </div>
      </div>
    );
  }

  const fetchUsers = async (page = 1, keyword = '') => {
    setLoading(true);
    try {
      const result = await userService.getUsers({ page, limit: pagination.limit, keyword });
      if (isSuccess(result)) {
        setUsers(result.data.users);
        setPagination(result.data.pagination);
      } else {
        toast.error(result.bizMessage || '获取用户列表失败');
      }
    } catch (error) {
      toast.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(pagination.page, searchKeyword);
  }, [pagination.page]);

  const handleSearch = useCallback(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchUsers(1, searchKeyword);
  }, [searchKeyword]);

  const handleCreateUser = useCallback(async (userData: CreateUserDto) => {
    try {
      const result = await userService.createUser(userData);
      if (isSuccess(result)) {
        toast.success('用户创建成功');
        setIsCreateDialogOpen(false);
        fetchUsers(pagination.page, searchKeyword);
      } else {
        toast.error(result.bizMessage || '创建用户失败');
      }
    } catch (error) {
      toast.error('创建用户失败');
    }
  }, [pagination.page, searchKeyword]);

  const handleUpdateUser = useCallback(async (userData: UpdateUserDto) => {
    if (!selectedUser) return;
    
    try {
      const result = await userService.updateUser(selectedUser.id, userData);
      if (isSuccess(result)) {
        toast.success('用户信息更新成功');
        setIsEditDialogOpen(false);
        setSelectedUser(null);
        fetchUsers(pagination.page, searchKeyword);
      } else {
        toast.error(result.bizMessage || '更新用户信息失败');
      }
    } catch (error) {
      toast.error('更新用户信息失败');
    }
  }, [selectedUser, pagination.page, searchKeyword]);

  const handleDeleteUser = useCallback(async () => {
    if (!selectedUser) return;
    
    try {
      const result = await userService.deleteUser(selectedUser.id);
      if (isSuccess(result)) {
        toast.success('用户删除成功');
        setIsDeleteDialogOpen(false);
        setSelectedUser(null);
        fetchUsers(pagination.page, searchKeyword);
      } else {
        toast.error(result.bizMessage || '删除用户失败');
      }
    } catch (error) {
      toast.error('删除用户失败');
    }
  }, [selectedUser, pagination.page, searchKeyword]);

  const handleChangeRole = useCallback(async (user: UserType, newRole: Role) => {
    try {
      const result = await userService.changeUserRole(user.id, { role: newRole });
      if (isSuccess(result)) {
        toast.success('用户角色更新成功');
        fetchUsers(pagination.page, searchKeyword);
      } else {
        toast.error(result.bizMessage || '更新用户角色失败');
      }
    } catch (error) {
      toast.error('更新用户角色失败');
    }
  }, [pagination.page, searchKeyword]);

  const openEditDialog = useCallback((user: UserType) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  }, []);

  const openDeleteDialog = useCallback((user: UserType) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const getRoleBadgeClass = (role: Role) => {
    return role === 'admin'
      ? 'bg-red-100 text-red-800 border-red-200'
      : 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const getRoleText = (role: Role) => {
    return role === 'admin' ? '管理员' : '普通用户';
  };

  // 处理键盘事件，提升用户体验
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCreateDialogOpen) setIsCreateDialogOpen(false);
        if (isEditDialogOpen) {
          setIsEditDialogOpen(false);
          setSelectedUser(null);
        }
        if (isDeleteDialogOpen) {
          setIsDeleteDialogOpen(false);
          setSelectedUser(null);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isCreateDialogOpen, isEditDialogOpen, isDeleteDialogOpen]);

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-white/55 backdrop-blur-xl border border-white/45 shadow-[0_8px_22px_rgba(40,65,138,0.14)]">
            <Users className="h-6 w-6 text-[#28418A]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">用户管理</h1>
            <p className="text-sm text-slate-500">
              共 {pagination.total} 个用户
              {searchKeyword && ` (搜索: "${searchKeyword}")`}
            </p>
          </div>
        </div>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="flex items-center gap-2 bg-linear-to-r from-[#28418A] to-[#3F66B0] text-white shadow-[0_12px_30px_rgba(40,65,138,0.32)] hover:shadow-[0_14px_32px_rgba(40,65,138,0.38)] hover:scale-[1.01] transition-all duration-250 border-0"
          // data-glow="true"
        >
          <Plus className="h-4 w-4" />
          新增用户
        </Button>
      </div>

      {/* 搜索栏 */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 flex gap-2">
          <div className="relative max-w-md flex-1">
            <Input
              placeholder="搜索用户名或昵称..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="backdrop-blur-xl bg-white/55 border border-white/45 shadow-[0_8px_22px_rgba(40,65,138,0.14)] focus:bg-white/78 focus:border-white/60 focus:shadow-[0_12px_32px_rgba(40,65,138,0.16)] transition-all duration-250"
            />
          </div>
          <Button
            onClick={handleSearch}
            variant="outline"
            className="backdrop-blur-xl bg-white/55 border border-white/45 shadow-[0_8px_22px_rgba(40,65,138,0.14)] hover:bg-white/78 hover:shadow-[0_12px_32px_rgba(40,65,138,0.16)] transition-all duration-250"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Button
          onClick={() => fetchUsers(pagination.page, searchKeyword)}
          variant="outline"
          disabled={loading}
          className="backdrop-blur-xl bg-white/55 border border-white/45 shadow-[0_8px_22px_rgba(40,65,138,0.14)] hover:bg-white/78 hover:shadow-[0_12px_32px_rgba(40,65,138,0.16)] transition-all duration-250"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* 用户列表 */}
      <div className="rounded-2xl border border-white/60 bg-white/72 backdrop-blur-3xl shadow-[0_20px_54px_rgba(15,23,42,0.16)] overflow-hidden" // data-glow="true"
>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/30">
            <thead className="bg-white/55 backdrop-blur-xl">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  用户信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  角色
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  创建时间
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white/40 backdrop-blur-xl divide-y divide-white/20">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <RefreshCw className="h-6 w-6 animate-spin text-[#28418A] mr-2" />
                      <span className="text-slate-700">加载中...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="h-16 w-16 rounded-full flex items-center justify-center bg-white/55 backdrop-blur-xl border border-white/45 shadow-[0_8px_22px_rgba(40,65,138,0.14)] mb-4">
                        <AlertCircle className="h-8 w-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-900 mb-2">暂无用户数据</h3>
                      <p className="text-slate-500 mb-4">
                        {searchKeyword ? '没有找到匹配的用户' : '系统中暂无用户'}
                      </p>
                      <Button
                        onClick={() => setIsCreateDialogOpen(true)}
                        className="mt-2 bg-linear-to-r from-[#28418A] to-[#3F66B0] text-white shadow-[0_12px_30px_rgba(40,65,138,0.32)] hover:shadow-[0_14px_32px_rgba(40,65,138,0.38)] hover:scale-[1.01] transition-all duration-250 border-0"
                        // data-glow="true"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        创建第一个用户
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-white/60 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-white/55 backdrop-blur-xl border border-white/45 flex items-center justify-center shadow-[0_8px_22px_rgba(40,65,138,0.14)]">
                            <User className="h-5 w-5 text-slate-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-slate-900">
                            {user.username}
                          </div>
                          <div className="text-sm text-slate-500">
                            {user.nickname}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Select
                        value={user.role}
                        onValueChange={(value: Role) => handleChangeRole(user, value)}
                        disabled={user.id === currentUser?.id}
                      >
                        <SelectTrigger className={`w-32 backdrop-blur-xl bg-white/55 border border-white/45 shadow-[0_8px_22px_rgba(40,65,138,0.14)] hover:bg-white/78 transition-all duration-250 ${
                          user.role === 'admin'
                            ? 'bg-linear-to-r from-[#28418A]/20 to-[#3F66B0]/20 text-[#28418A]'
                            : 'bg-linear-to-r from-[#3F66B0]/20 to-[#6CAAD6]/20 text-[#3F66B0]'
                        }`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="backdrop-blur-xl bg-white/85 border border-white/45">
                          <SelectItem value="user">普通用户</SelectItem>
                          <SelectItem value="admin">管理员</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {new Date(user.createdAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                          className="backdrop-blur-xl bg-white/55 border border-white/45 shadow-[0_8px_22px_rgba(40,65,138,0.14)] hover:bg-white/78 hover:shadow-[0_12px_32px_rgba(40,65,138,0.16)] transition-all duration-250"
                        >
                          <Edit className="h-4 w-4 text-slate-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(user)}
                          disabled={user.id === currentUser?.id}
                          className="backdrop-blur-xl bg-white/55 border border-white/45 shadow-[0_8px_22px_rgba(40,65,138,0.14)] hover:bg-red-50/60 hover:border-red-200/60 hover:text-red-600 transition-all duration-250"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 分页信息 */}
      {pagination.pages > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-slate-700 bg-white/55 backdrop-blur-xl border border-white/45 rounded-lg px-4 py-2 shadow-[0_8px_22px_rgba(40,65,138,0.14)]">
            显示第 {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} 条，共 {pagination.total} 条
          </div>
          
          {/* 分页 */}
          {pagination.pages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => handlePageChange(pagination.page - 1)}
                    className={cn(
                      'backdrop-blur-xl bg-white/55 border border-white/45 shadow-[0_8px_22px_rgba(40,65,138,0.14)] hover:bg-white/78 hover:shadow-[0_12px_32px_rgba(40,65,138,0.16)] transition-all duration-250',
                      pagination.page <= 1 ? 'pointer-events-none opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    )}
                  />
                </PaginationItem>
                
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => handlePageChange(page)}
                      isActive={page === pagination.page}
                      className={cn(
                        'cursor-pointer backdrop-blur-xl border border-white/45 shadow-[0_8px_22px_rgba(40,65,138,0.14)] hover:bg-white/78 hover:shadow-[0_12px_32px_rgba(40,65,138,0.16)] transition-all duration-250',
                        page === pagination.page
                          ? 'bg-linear-to-r from-[#28418A]/20 to-[#3F66B0]/20 text-[#28418A] border-[#28418A]/30'
                          : 'bg-white/55 text-slate-700'
                      )}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext
                    onClick={() => handlePageChange(pagination.page + 1)}
                    className={cn(
                      'backdrop-blur-xl bg-white/55 border border-white/45 shadow-[0_8px_22px_rgba(40,65,138,0.14)] hover:bg-white/78 hover:shadow-[0_12px_32px_rgba(40,65,138,0.16)] transition-all duration-250',
                      pagination.page >= pagination.pages ? 'pointer-events-none opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    )}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}

      {/* 创建用户对话框 */}
      <UserFormDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={(data) => handleCreateUser(data as CreateUserDto)}
        title="新增用户"
      />

      {/* 编辑用户对话框 */}
      {selectedUser && (
        <UserFormDialog
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setSelectedUser(null);
          }}
          onSubmit={handleUpdateUser}
          title="编辑用户"
          initialData={{
            username: selectedUser.username,
            nickname: selectedUser.nickname,
          }}
        />
      )}

      {/* 删除用户对话框 */}
      {selectedUser && (
        <DeleteUserDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setSelectedUser(null);
          }}
          onConfirm={handleDeleteUser}
          user={selectedUser}
        />
      )}
    </div>
  );
}