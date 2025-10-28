from typing import Dict, Any, Optional, List
from neuink.services.db import get_user_col
from neuink.utils.common import generate_id, get_current_time
from neuink.config.constants import ADMIN_USERNAME

ROLE_ADMIN = "admin"
ROLE_USER = "user"

class UserModel:
    """用户数据访问层"""

    def __init__(self):
        self.collection = get_user_col()
        # 可选：确保索引（幂等）
        try:
            self.collection.create_index("id", unique=True)
            self.collection.create_index("username", unique=True)
            self.collection.create_index("role")
        except Exception:
            # 索引已存在等情况忽略
            pass

    def create_user(self, username: str, password: str, nickname: str, *,
                    role: str = ROLE_USER) -> Dict[str, Any]:
        """创建用户 - 纯数据库操作"""
        # 若你仍保留 ADMIN_USERNAME 的特殊账号，这里兜底：这个用户名强制 admin
        if username == ADMIN_USERNAME:
            role = ROLE_ADMIN

        current_time = get_current_time()
        user_data = {
            "id": generate_id(),
            "username": username,
            "password": password,
            "nickname": nickname,
            "role": role,  # <-- 新增字段
            "createdAt": current_time,
            "updatedAt": current_time
        }

        result = self.collection.insert_one(user_data)
        if result.inserted_id:
            return {k: v for k, v in user_data.items() if k != '_id'}
        raise Exception("用户创建失败")

    def find_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """根据ID查找"""
        return self.collection.find_one({"id": user_id}, {"_id": 0})

    def find_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """根据用户名查找"""
        return self.collection.find_one({"username": username}, {"_id": 0})

    def verify_credentials(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """验证凭据 - 数据库查询操作"""
        # 注意：生产环境不应打印明文密码，这里仅保持现状
        print("正在数据库中查询:")
        print(f"   用户名: '{username}'")
        print(f"   密码: '{password}'")

        result = self.collection.find_one(
            {"username": username, "password": password},
            {"_id": 0}
        )

        print(f"查询结果: {result is not None}")
        if result:
            print(f"找到用户: {result.get('username')}")
        return result

    def update_user(self, user_id: str, update_data: Dict[str, Any]) -> bool:
        """更新用户"""
        update_data["updatedAt"] = get_current_time()
        result = self.collection.update_one(
            {"id": user_id},
            {"$set": update_data}
        )
        return result.modified_count > 0

    def delete_user(self, user_id: str) -> bool:
        """删除用户"""
        result = self.collection.delete_one({"id": user_id})
        return result.deleted_count > 0

    def count_users(self, query: Dict = None) -> int:
        """统计用户数"""
        return self.collection.count_documents(query or {})

    def is_admin(self, user_id: str) -> bool:
        """
        检查用户是否为管理员（基于 role 字段）
        """
        user = self.find_by_id(user_id)
        return bool(user) and user.get("role") == ROLE_ADMIN

    def is_admin_by_username(self, username: str) -> bool:
        """
        兼容旧逻辑：通过用户名判断是否为管理员（不再用字符串对比常量）
        """
        user = self.find_by_username(username)
        return bool(user) and user.get("role") == ROLE_ADMIN

    def update_password(self, user_id: str, new_password: str) -> bool:
        """更新用户密码"""
        return self.update_user(user_id, {"password": new_password})

    def search_users(self, keyword: str, skip: int = 0, limit: int = 10) -> List[Dict[str, Any]]:
        """
        搜索用户（用户名/昵称，忽略大小写），包含 role
        """
        query = {
            "$or": [
                {"username": {"$regex": keyword, "$options": "i"}},
                {"nickname": {"$regex": keyword, "$options": "i"}}
            ]
        }
        cursor = self.collection.find(query, {"_id": 0}).skip(skip).limit(limit)
        return list(cursor)

    def set_role(self, user_id: str, role: str) -> bool:
        """
        设置用户角色（仅数据库操作，权限由上层 service 控制）
        """
        if role not in (ROLE_ADMIN, ROLE_USER):
            raise ValueError("非法角色")
        return self.update_user(user_id, {"role": role})

    def init_admin_user(self) -> Dict[str, Any]:
        """
        初始化管理员用户（如果不存在），确保 role=admin
        """
        admin_user = self.find_by_username(ADMIN_USERNAME)
        if not admin_user:
            admin_user = self.create_user(
                username=ADMIN_USERNAME,
                password="admin123",  # 默认密码，生产需修改
                nickname="系统管理员",
                role=ROLE_ADMIN               # <-- 关键：写入 admin
            )
        else:
            # 如果存在但无 role 或 role 错误，修正为 admin
            if admin_user.get("role") != ROLE_ADMIN:
                self.set_role(admin_user["id"], ROLE_ADMIN)
                admin_user = self.find_by_username(ADMIN_USERNAME)
        return admin_user

user_model = None

def get_user_model():
    """获取用户模型实例"""
    global user_model
    if user_model is None:
        user_model = UserModel()
    return user_model
