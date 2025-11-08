// lib/services/user.ts
import { callAndNormalize, isSuccess } from '../http';
import { apiClient } from '../http';
import type { UnifiedResult } from '@/types/api';
import type { 
  User, 
  CreateUserDto, 
  UpdateUserDto, 
  UserListResponse, 
  UserListRequest,
  ChangeRoleRequest 
} from '@/types/user';

// 用户管理服务：全部返回统一结果体，调用方只关心 isSuccess / data
export const userService = {
  /**
   * 获取用户列表（分页）
   */
  getUsers(params?: UserListRequest): Promise<UnifiedResult<UserListResponse>> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.keyword) queryParams.append('keyword', params.keyword);
    
    const url = `/users/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return callAndNormalize<UserListResponse>(apiClient.get(url));
  },

  /**
   * 获取单个用户详情
   */
  getUser(userId: string): Promise<UnifiedResult<User>> {
    return callAndNormalize<User>(apiClient.get(`/users/${userId}`));
  },

  /**
   * 创建新用户
   */
  createUser(userData: CreateUserDto): Promise<UnifiedResult<User>> {
    return callAndNormalize<User>(apiClient.post('/users/', userData));
  },

  /**
   * 更新用户信息
   */
  updateUser(userId: string, userData: UpdateUserDto): Promise<UnifiedResult<User>> {
    return callAndNormalize<User>(apiClient.put(`/users/${userId}`, userData));
  },

  /**
   * 删除用户
   */
  deleteUser(userId: string): Promise<UnifiedResult<null>> {
    return callAndNormalize<null>(apiClient.delete(`/users/${userId}`));
  },

  /**
   * 变更用户角色
   */
  changeUserRole(userId: string, roleData: ChangeRoleRequest): Promise<UnifiedResult<User>> {
    return callAndNormalize<User>(apiClient.patch(`/users/${userId}/role`, roleData));
  },

  /**
   * 修改密码
   */
  changePassword(oldPassword: string, newPassword: string): Promise<UnifiedResult<null>> {
    return callAndNormalize<null>(apiClient.put('/users/password', {
      oldPassword,
      newPassword
    }));
  },
};

// 便捷导出
export { isSuccess } from '../http';