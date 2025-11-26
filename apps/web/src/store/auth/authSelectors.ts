import type { AuthState } from './authTypes';
import { createSelector } from '../base/storeUtils';

/**
 * 基础选择器
 */
export const selectUser = createSelector((state: AuthState) => state.user);
export const selectToken = createSelector((state: AuthState) => state.token);
export const selectIsLoading = createSelector((state: AuthState) => state.isLoading);
export const selectError = createSelector((state: AuthState) => state.error);
export const selectIsAuthenticated = createSelector((state: AuthState) => state.isAuthenticated);

/**
 * 计算选择器
 */
export const selectUserId = createSelector((state: AuthState) => state.user?.id);
export const selectUsername = createSelector((state: AuthState) => state.user?.username);
export const selectNickname = createSelector((state: AuthState) => state.user?.nickname);
export const selectUserRole = createSelector((state: AuthState) => state.user?.role);

/**
 * 权限选择器
 */
export const selectIsAdmin = createSelector((state: AuthState) => state.user?.username === 'admin');
export const selectIsRegularUser = createSelector((state: AuthState) => 
  state.user?.role === 'user' && state.user?.username !== 'admin'
);

/**
 * 状态组合选择器
 */
export const selectAuthStatus = createSelector((state: AuthState) => ({
  isAuthenticated: state.isAuthenticated,
  isLoading: state.isLoading,
  hasError: !!state.error,
  error: state.error,
}));

export const selectUserInfo = createSelector((state: AuthState) => ({
  id: state.user?.id,
  username: state.user?.username,
  nickname: state.user?.nickname,
  role: state.user?.role,
  isAdmin: state.user?.username === 'admin',
}));

/**
 * 条件选择器
 */
export const selectCanAccessAdmin = createSelector(
  (state: AuthState) => state.isAuthenticated && state.user?.username === 'admin'
);

export const selectCanAccessUserFeatures = createSelector(
  (state: AuthState) => state.isAuthenticated
);