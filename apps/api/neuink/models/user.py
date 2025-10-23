"""
用户数据模型 - 只负责数据库操作
"""
from typing import Dict, Any, Optional, List
from neuink.services.db import get_user_col
from neuink.utils.common import generate_id, get_current_time


class UserModel:
    """用户数据访问层"""
    
    def __init__(self):
        self.collection = get_user_col()
    
    def create_user(self, username: str, password: str, nickname: str) -> Dict[str, Any]:
        """创建用户 - 纯数据库操作"""
        current_time = get_current_time()
        user_data = {
            "id": generate_id(),
            "username": username,
            "password": password,
            "nickname": nickname,
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
        检查用户是否为管理员
        
        Args:
            user_id: 用户ID
        
        Returns:
            是否为管理员
        """
        user = self.find_by_id(user_id)
        return user and user.get("username") == ADMIN_USERNAME
    
    def is_admin_by_username(self, username: str) -> bool:
        """
        根据用户名检查是否为管理员
        
        Args:
            username: 用户名
        
        Returns:
            是否为管理员
        """
        return username == ADMIN_USERNAME
    
    def update_password(self, user_id: str, new_password: str) -> bool:
        """
        更新用户密码
        
        Args:
            user_id: 用户ID
            new_password: 新密码
        
        Returns:
            是否更新成功
        """
        return self.update_user(user_id, {"password": new_password})
    
    def search_users(self, keyword: str, skip: int = 0, limit: int = 10) -> List[Dict[str, Any]]:
        """
        搜索用户
        
        Args:
            keyword: 搜索关键词（匹配用户名或昵称）
            skip: 跳过数量
            limit: 限制数量
        
        Returns:
            匹配的用户列表
        """
        query = {
            "$or": [
                {"username": {"$regex": keyword, "$options": "i"}},
                {"nickname": {"$regex": keyword, "$options": "i"}}
            ]
        }
        cursor = self.collection.find(query, {"_id": 0}).skip(skip).limit(limit)
        return list(cursor)
    
    def init_admin_user(self) -> Dict[str, Any]:
        """
        初始化管理员用户（如果不存在）
        
        Returns:
            管理员用户数据
        """
        admin_user = self.find_by_username(ADMIN_USERNAME)
        if not admin_user:
            # 创建默认管理员账号
            admin_user = self.create_user(
                username=ADMIN_USERNAME,
                password="admin123",  # 默认密码，生产环境应该修改
                nickname="系统管理员"
            )
        return admin_user


user_model = None

def get_user_model():
    """获取用户模型实例"""
    global user_model
    if user_model is None:
        user_model = UserModel()
    return user_model