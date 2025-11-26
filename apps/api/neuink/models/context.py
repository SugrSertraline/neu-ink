"""
PaperContext 上下文定义
用于统一处理admin和user论文的上下文信息
"""
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any


@dataclass
class PaperContext:
    """论文上下文信息"""
    user_id: str
    is_admin: bool
    is_user_paper: bool
    paper_type: str  # "admin" | "user"
    paper_id: Optional[str] = None
    user_paper_id: Optional[str] = None
    session_id: Optional[str] = None
    permissions: List[str] = field(default_factory=list)
    
    def __post_init__(self):
        """初始化后处理"""
        if self.paper_type not in ["admin", "user"]:
            raise ValueError("paper_type must be 'admin' or 'user'")
        
        # 根据paper_type设置is_user_paper
        self.is_user_paper = (self.paper_type == "user")
        
        # 设置默认权限
        if not self.permissions:
            self.permissions = self._get_default_permissions()
    
    def _get_default_permissions(self) -> List[str]:
        """获取默认权限"""
        if self.is_admin:
            return ["read", "write", "delete", "admin"]
        elif self.is_user_paper:
            return ["read", "write", "delete"]
        else:
            return ["read"]
    
    def has_permission(self, permission: str) -> bool:
        """检查是否有指定权限"""
        return permission in self.permissions
    
    def can_read(self) -> bool:
        """是否可以读取"""
        return self.has_permission("read")
    
    def can_write(self) -> bool:
        """是否可以写入"""
        return self.has_permission("write")
    
    def can_delete(self) -> bool:
        """是否可以删除"""
        return self.has_permission("delete")
    
    def can_admin(self) -> bool:
        """是否有管理员权限"""
        return self.has_permission("admin")
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "user_id": self.user_id,
            "is_admin": self.is_admin,
            "is_user_paper": self.is_user_paper,
            "paper_type": self.paper_type,
            "paper_id": self.paper_id,
            "user_paper_id": self.user_paper_id,
            "session_id": self.session_id,
            "permissions": self.permissions
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PaperContext":
        """从字典创建上下文"""
        return cls(
            user_id=data["user_id"],
            is_admin=data["is_admin"],
            is_user_paper=data.get("is_user_paper", False),
            paper_type=data["paper_type"],
            paper_id=data.get("paper_id"),
            user_paper_id=data.get("user_paper_id"),
            session_id=data.get("session_id"),
            permissions=data.get("permissions", [])
        )
    
    @classmethod
    def create_admin_context(cls, user_id: str, paper_id: Optional[str] = None) -> "PaperContext":
        """创建管理员论文上下文"""
        return cls(
            user_id=user_id,
            is_admin=True,
            is_user_paper=False,
            paper_type="admin",
            paper_id=paper_id
        )
    
    @classmethod
    def create_user_context(cls, user_id: str, user_paper_id: Optional[str] = None) -> "PaperContext":
        """创建用户论文上下文"""
        return cls(
            user_id=user_id,
            is_admin=False,
            is_user_paper=True,
            paper_type="user",
            user_paper_id=user_paper_id
        )
    
    @classmethod
    def create_public_context(cls, user_id: str, paper_id: Optional[str] = None) -> "PaperContext":
        """创建公开论文上下文"""
        return cls(
            user_id=user_id,
            is_admin=False,
            is_user_paper=False,
            paper_type="admin",
            paper_id=paper_id
        )


def create_paper_context(user_id: str, paper_type: str, **kwargs) -> PaperContext:
    """
    创建论文上下文的工厂函数
    
    Args:
        user_id: 用户ID
        paper_type: 论文类型 ("admin" | "user")
        **kwargs: 其他参数
    
    Returns:
        PaperContext实例
    """
    if paper_type == "admin":
        return PaperContext.create_admin_context(user_id, **kwargs)
    elif paper_type == "user":
        return PaperContext.create_user_context(user_id, **kwargs)
    else:
        raise ValueError("paper_type must be 'admin' or 'user'")


def check_paper_permission(context: PaperContext, operation: str) -> bool:
    """
    检查论文权限
    
    Args:
        context: 论文上下文
        operation: 操作类型 ("read" | "write" | "delete" | "admin")
    
    Returns:
        是否有权限
    """
    return context.has_permission(operation)