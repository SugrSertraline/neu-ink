"""
用户业务逻辑服务
"""
from typing import Dict, Any, Optional, List
from neuink.models.user import get_user_model
from neuink.utils.auth import generate_token
from neuink.utils.common import sanitize_user_data
from neuink.config.constants import BusinessCode, BusinessMessage

ALLOWED_ROLES = {"admin", "user"}

class UserService:
    """用户服务类 - 处理业务逻辑"""
    
    def __init__(self):
        self.user_model = get_user_model()
    
    def login(self, username: str, password: str) -> Dict[str, Any]:
        """用户登录业务逻辑"""
        # 打印接收到的数据
        print("=" * 50)
        print("登录请求")
        print(f"接收到的用户名: '{username}' (长度: {len(username)})")
        print(f"接收到的密码: '{password}' (长度: {len(password)})")
        print("=" * 50)
        
        # 验证用户凭据
        user = self.user_model.verify_credentials(username, password)
        
        print(f"数据库查询结果: {user}")
        
        if not user:
            print("登录失败 - 用户名或密码错误")
            print("提示: 请检查用户名和密码是否与数据库完全一致")
            return {
                "code": BusinessCode.LOGIN_FAILED,
                "message": BusinessMessage.LOGIN_FAILED,
                "data": None
            }
        
        print(f"登录成功 - 用户: {user.get('username')}")
        
        # 生成token（请确保 generate_token 会把 role 写入载荷）
        token = generate_token(user)
        
        return {
            "code": BusinessCode.SUCCESS,
            "message": BusinessMessage.SUCCESS,
            "data": {
                "token": token,
                "user": sanitize_user_data(user)  # 需确保不会剔除 role
            }
        }

    def get_user_by_id(self, user_id: str) -> Dict[str, Any]:
        """获取用户信息"""
        user = self.user_model.find_by_id(user_id)
        if not user:
            raise ValueError("用户不存在")
        return sanitize_user_data(user)
    
    def create_user(self, username: str, password: str, nickname: str, *,
                    role: str = "user", operator_role: str = "user") -> Dict[str, Any]:
        """
        创建用户业务逻辑
        - 默认创建普通用户
        - 仅管理员可创建管理员账号
        """
        # 业务规则验证
        if len(password) < 6:
            raise ValueError("密码长度至少6位")
        if len(username) < 3:
            raise ValueError("用户名长度至少3位")

        # 角色校验
        role = (role or "user").lower()
        if role not in ALLOWED_ROLES:
            raise ValueError("非法角色")
        if role == "admin" and operator_role != "admin":
            raise ValueError("只有管理员可以创建管理员账号")
        
        # 唯一性校验
        existing = self.user_model.find_by_username(username)
        if existing:
            raise ValueError("用户名已存在")

        # 调用Model创建用户
        user = self.user_model.create_user(username, password, nickname, role=role)
        return sanitize_user_data(user)
    
    def update_user(self, user_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """更新用户信息（不允许在此接口修改角色）"""
        # 检查用户是否存在
        user = self.user_model.find_by_id(user_id)
        if not user:
            raise ValueError("用户不存在")

        # 禁止通过该接口修改角色（使用专用变更角色接口）
        if "role" in update_data:
            raise ValueError("禁止在该接口修改角色，请使用变更角色接口")

        # 如果更新用户名，检查唯一性
        if "username" in update_data:
            existing = self.user_model.find_by_username(update_data["username"])
            if existing and existing["id"] != user_id:
                raise ValueError("用户名已存在")
        
        # 执行更新
        success = self.user_model.update_user(user_id, update_data)
        if not success:
            raise Exception("更新失败")
        
        # 返回更新后的用户
        updated_user = self.user_model.find_by_id(user_id)
        return sanitize_user_data(updated_user)
    
    def delete_user(self, user_id: str, operator_id: str) -> bool:
        """
        删除用户业务逻辑
        - 不能删除管理员
        - 不能删除自己
        """
        # 检查用户是否存在
        user = self.user_model.find_by_id(user_id)
        if not user:
            raise ValueError("用户不存在")
        
        # 业务规则：不能删除管理员
        if user.get("role") == "admin":
            raise ValueError("不能删除管理员账号")
        
        # 业务规则：不能删除自己
        if user_id == operator_id:
            raise ValueError("不能删除自己")
        
        return self.user_model.delete_user(user_id)
    
    def change_password(self, user_id: str, old_password: str,
                       new_password: str) -> bool:
        """修改密码业务逻辑"""
        # 获取用户
        user = self.user_model.find_by_id(user_id)
        if not user:
            raise ValueError("用户不存在")
        
        # 验证旧密码 - 支持新旧格式
        if "salt" not in user:
            # 旧格式：直接比较明文
            if user["password"] != old_password:
                raise ValueError("旧密码错误")
        else:
            # 新格式：使用加密验证
            from neuink.utils.password_utils import verify_password
            if not verify_password(old_password, user["password"], user["salt"]):
                raise ValueError("旧密码错误")
        
        # 密码强度验证
        if len(new_password) < 6:
            raise ValueError("新密码长度至少6位")
        
        if old_password == new_password:
            raise ValueError("新密码不能与旧密码相同")
        
        return self.user_model.update_password(user_id, new_password)

    def change_user_role(self, target_user_id: str, new_role: str, *, operator_id: str) -> Dict[str, Any]:
        """
        变更用户角色（仅管理员）
        """
        operator = self.user_model.find_by_id(operator_id)
        if not operator:
            raise ValueError("操作者不存在")
        if operator.get("role") != "admin":
            raise ValueError("只有管理员可以修改角色")

        target = self.user_model.find_by_id(target_user_id)
        if not target:
            raise ValueError("目标用户不存在")

        new_role = (new_role or "").lower()
        if new_role not in ALLOWED_ROLES:
            raise ValueError("非法角色")

        # 如果角色相同，直接返回当前信息
        if target.get("role") == new_role:
            return sanitize_user_data(target)

        ok = self.user_model.set_role(target_user_id, new_role)
        if not ok:
            raise Exception("更新失败")

        updated = self.user_model.find_by_id(target_user_id)
        return sanitize_user_data(updated)
    
    def get_users_paginated(self, page: int, limit: int, 
                           keyword: Optional[str] = None) -> Dict[str, Any]:
        """获取用户列表（分页）"""
        # 参数验证
        page = max(1, page)
        limit = max(1, min(100, limit))
        
        skip = (page - 1) * limit
        
        # 查询数据
        if keyword:
            users = self.user_model.search_users(keyword, skip, limit)
            total = self.user_model.count_users({"$or": [
                {"username": {"$regex": keyword, "$options": "i"}},
                {"nickname": {"$regex": keyword, "$options": "i"}}
            ]})
        else:
            # 你现有的 Model 若已实现 get_all_users，这里保持调用
            users = self.user_model.get_all_users(skip, limit)
            total = self.user_model.count_users()
        
        # 清理数据
        safe_users = [sanitize_user_data(user) for user in users]
        
        return {
            "users": safe_users,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }


# 单例模式
_user_service = None

def get_user_service() -> UserService:
    """获取用户服务实例"""
    global _user_service
    if _user_service is None:
        _user_service = UserService()
    return _user_service
