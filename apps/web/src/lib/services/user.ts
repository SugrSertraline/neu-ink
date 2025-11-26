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
   * 注意：后端用户管理路由暂时未启用，此功能暂时不可用
   */
  getUsers(params?: UserListRequest): Promise<UnifiedResult<UserListResponse>> {
    // 临时返回功能不可用提示
    return Promise.resolve({
      topCode: 503,
      topMessage: 'Service Unavailable',
      bizCode: 1999,
      bizMessage: '用户管理功能暂时不可用，请联系管理员启用后端服务',
      data: undefined as any,
      raw: {} as any
    });
    // const queryParams = new URLSearchParams();
    // if (params?.page) queryParams.append('page', params.page.toString());
    // if (params?.limit) queryParams.append('limit', params.limit.toString());
    // if (params?.keyword) queryParams.append('keyword', params.keyword);
    // const url = `/users/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    // return callAndNormalize<UserListResponse>(apiClient.get(url));
  },

  /**
   * 获取单个用户详情
   * 注意：后端用户管理路由暂时未启用，此功能暂时不可用
   */
  getUser(userId: string): Promise<UnifiedResult<User>> {
    // 临时返回功能不可用提示
    return Promise.resolve({
      topCode: 503,
      topMessage: 'Service Unavailable',
      bizCode: 1999,
      bizMessage: '用户管理功能暂时不可用，请联系管理员启用后端服务',
      data: undefined as any,
      raw: {} as any
    });
    
    // 原始代码（后端服务启用后可恢复）
    // return callAndNormalize<User>(apiClient.get(`/users/${userId}`));
  },

  /**
   * 创建新用户
   * 注意：后端用户管理路由暂时未启用，此功能暂时不可用
   */
  createUser(userData: CreateUserDto): Promise<UnifiedResult<User>> {
    // 临时返回功能不可用提示
    return Promise.resolve({
      topCode: 503,
      topMessage: 'Service Unavailable',
      bizCode: 1999,
      bizMessage: '用户管理功能暂时不可用，请联系管理员启用后端服务',
      data: undefined as any,
      raw: {} as any
    });
    
    // 原始代码（后端服务启用后可恢复）
    // return callAndNormalize<User>(apiClient.post('/users/', userData));
  },

  /**
   * 更新用户信息
   * 注意：后端用户管理路由暂时未启用，此功能暂时不可用
   */
  updateUser(userId: string, userData: UpdateUserDto): Promise<UnifiedResult<User>> {
    // 临时返回功能不可用提示
    return Promise.resolve({
      topCode: 503,
      topMessage: 'Service Unavailable',
      bizCode: 1999,
      bizMessage: '用户管理功能暂时不可用，请联系管理员启用后端服务',
      data: undefined as any,
      raw: {} as any
    });
    
    // 原始代码（后端服务启用后可恢复）
    // return callAndNormalize<User>(apiClient.put(`/users/${userId}`, userData));
  },

  /**
   * 删除用户
   * 注意：后端用户管理路由暂时未启用，此功能暂时不可用
   */
  deleteUser(userId: string): Promise<UnifiedResult<null>> {
    // 临时返回功能不可用提示
    return Promise.resolve({
      topCode: 503,
      topMessage: 'Service Unavailable',
      bizCode: 1999,
      bizMessage: '用户管理功能暂时不可用，请联系管理员启用后端服务',
      data: undefined as any,
      raw: {} as any
    });
    
    // 原始代码（后端服务启用后可恢复）
    // return callAndNormalize<null>(apiClient.delete(`/users/${userId}`));
  },

  /**
   * 变更用户角色
   * 注意：后端用户管理路由暂时未启用，此功能暂时不可用
   */
  changeUserRole(userId: string, roleData: ChangeRoleRequest): Promise<UnifiedResult<User>> {
    // 临时返回功能不可用提示
    return Promise.resolve({
      topCode: 503,
      topMessage: 'Service Unavailable',
      bizCode: 1999,
      bizMessage: '用户管理功能暂时不可用，请联系管理员启用后端服务',
      data: undefined as any,
      raw: {} as any
    });
    
    // 原始代码（后端服务启用后可恢复）
    // return callAndNormalize<User>(apiClient.patch(`/users/${userId}/role`, roleData));
  },

  /**
   * 修改密码
   * 注意：后端用户管理路由暂时未启用，此功能暂时不可用
   */
  changePassword(oldPassword: string, newPassword: string): Promise<UnifiedResult<null>> {
    // 临时返回功能不可用提示
    return Promise.resolve({
      topCode: 503,
      topMessage: 'Service Unavailable',
      bizCode: 1999,
      bizMessage: '用户管理功能暂时不可用，请联系管理员启用后端服务',
      data: undefined as any,
      raw: {} as any
    });
    
    // 原始代码（后端服务启用后可恢复）
    // return callAndNormalize<null>(apiClient.put('/users/password', {
    //   oldPassword,
    //   newPassword
    // }));
  },
};

// 便捷导出
export { isSuccess } from '../http';