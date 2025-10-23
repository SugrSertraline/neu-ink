"""
Paper 业务逻辑服务
处理论文相关的业务逻辑
"""
from typing import Dict, Any, List, Optional

from ..models.paper import PaperModel
from ..config.constants import BusinessCode


class PaperService:
    """Paper 业务逻辑服务类"""

    def __init__(self):
        """初始化 Paper 服务"""
        self.paper_model = PaperModel()

    def create_paper(self, paper_data: Dict[str, Any], creator_id: str) -> Dict[str, Any]:
        """
        创建论文
        
        Args:
            paper_data: 论文数据
            creator_id: 创建者ID
            
        Returns:
            业务响应
        """
        try:
            # 设置创建者
            paper_data["createdBy"] = creator_id
            
            # 创建论文
            paper = self.paper_model.create(paper_data)
            
            return {
                "code": BusinessCode.SUCCESS,
                "message": "论文创建成功",
                "data": paper
            }
        except Exception as e:
            return {
                "code": BusinessCode.UNKNOWN_ERROR,
                "message": f"创建论文失败: {str(e)}",
                "data": None
            }

    def get_paper_by_id(self, paper_id: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        """
        获取论文详情
        
        Args:
            paper_id: 论文ID
            user_id: 当前用户ID（用于权限检查）
            
        Returns:
            业务响应
        """
        paper = self.paper_model.find_by_id(paper_id)
        
        if not paper:
            return {
                "code": BusinessCode.PAPER_NOT_FOUND,
                "message": "论文不存在",
                "data": None
            }
        
        # 权限检查：私有论文只能创建者查看
        if not paper["isPublic"] and user_id and paper["createdBy"] != user_id:
            return {
                "code": BusinessCode.PERMISSION_DENIED,
                "message": "无权访问此论文",
                "data": None
            }
        
        return {
            "code": BusinessCode.SUCCESS,
            "message": "获取论文成功",
            "data": paper
        }

    def get_papers(
        self,
        is_public: Optional[bool] = None,
        user_id: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "createdAt",
        sort_order: str = "desc"
    ) -> Dict[str, Any]:
        """
        获取论文列表
        
        Args:
            is_public: 是否公开
            user_id: 用户ID（用于筛选私有论文）
            page: 页码
            page_size: 每页数量
            sort_by: 排序字段
            sort_order: 排序顺序（asc/desc）
            
        Returns:
            业务响应
        """
        try:
            skip = (page - 1) * page_size
            sort_direction = -1 if sort_order == "desc" else 1
            
            papers, total = self.paper_model.find_all(
                is_public=is_public,
                created_by=user_id if not is_public else None,
                skip=skip,
                limit=page_size,
                sort_by=sort_by,
                sort_order=sort_direction
            )
            
            total_pages = (total + page_size - 1) // page_size
            
            return {
                "code": BusinessCode.SUCCESS,
                "message": "获取论文列表成功",
                "data": {
                    "papers": papers,
                    "pagination": {
                        "page": page,
                        "pageSize": page_size,
                        "total": total,
                        "totalPages": total_pages
                    }
                }
            }
        except Exception as e:
            return {
                "code": BusinessCode.UNKNOWN_ERROR,
                "message": f"获取论文列表失败: {str(e)}",
                "data": None
            }

    def search_papers(
        self,
        keyword: str,
        is_public: Optional[bool] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        搜索论文
        
        Args:
            keyword: 搜索关键词
            is_public: 是否公开
            page: 页码
            page_size: 每页数量
            
        Returns:
            业务响应
        """
        try:
            skip = (page - 1) * page_size
            
            papers, total = self.paper_model.search(
                keyword=keyword,
                is_public=is_public,
                skip=skip,
                limit=page_size
            )
            
            total_pages = (total + page_size - 1) // page_size
            
            return {
                "code": BusinessCode.SUCCESS,
                "message": "搜索成功",
                "data": {
                    "papers": papers,
                    "pagination": {
                        "page": page,
                        "pageSize": page_size,
                        "total": total,
                        "totalPages": total_pages
                    }
                }
            }
        except Exception as e:
            return {
                "code": BusinessCode.UNKNOWN_ERROR,
                "message": f"搜索失败: {str(e)}",
                "data": None
            }

    def update_paper(
        self,
        paper_id: str,
        update_data: Dict[str, Any],
        user_id: str,
        is_admin: bool = False
    ) -> Dict[str, Any]:
        """
        更新论文
        
        Args:
            paper_id: 论文ID
            update_data: 更新数据
            user_id: 当前用户ID
            is_admin: 是否管理员
            
        Returns:
            业务响应
        """
        # 检查论文是否存在
        paper = self.paper_model.find_by_id(paper_id)
        if not paper:
            return {
                "code": BusinessCode.PAPER_NOT_FOUND,
                "message": "论文不存在",
                "data": None
            }
        
        # 权限检查
        if not is_admin and paper["createdBy"] != user_id:
            return {
                "code": BusinessCode.PERMISSION_DENIED,
                "message": "无权修改此论文",
                "data": None
            }
        
        # 不允许修改某些字段
        protected_fields = ["id", "createdBy", "createdAt"]
        for field in protected_fields:
            if field in update_data:
                del update_data[field]
        
        # 更新论文
        success = self.paper_model.update(paper_id, update_data)
        
        if success:
            updated_paper = self.paper_model.find_by_id(paper_id)
            return {
                "code": BusinessCode.SUCCESS,
                "message": "论文更新成功",
                "data": updated_paper
            }
        else:
            return {
                "code": BusinessCode.UNKNOWN_ERROR,
                "message": "论文更新失败",
                "data": None
            }

    def delete_paper(
        self,
        paper_id: str,
        user_id: str,
        is_admin: bool = False
    ) -> Dict[str, Any]:
        """
        删除论文
        
        Args:
            paper_id: 论文ID
            user_id: 当前用户ID
            is_admin: 是否管理员
            
        Returns:
            业务响应
        """
        # 检查论文是否存在
        paper = self.paper_model.find_by_id(paper_id)
        if not paper:
            return {
                "code": BusinessCode.PAPER_NOT_FOUND,
                "message": "论文不存在",
                "data": None
            }
        
        # 权限检查：只有管理员或创建者可以删除
        if not is_admin and paper["createdBy"] != user_id:
            return {
                "code": BusinessCode.PERMISSION_DENIED,
                "message": "无权删除此论文",
                "data": None
            }
        
        # 删除论文
        success = self.paper_model.delete(paper_id)
        
        if success:
            return {
                "code": BusinessCode.SUCCESS,
                "message": "论文删除成功",
                "data": None
            }
        else:
            return {
                "code": BusinessCode.UNKNOWN_ERROR,
                "message": "论文删除失败",
                "data": None
            }

    def get_statistics(self) -> Dict[str, Any]:
        """
        获取论文统计信息
        
        Returns:
            业务响应
        """
        try:
            stats = self.paper_model.get_statistics()
            return {
                "code": BusinessCode.SUCCESS,
                "message": "获取统计信息成功",
                "data": stats
            }
        except Exception as e:
            return {
                "code": BusinessCode.UNKNOWN_ERROR,
                "message": f"获取统计信息失败: {str(e)}",
                "data": None
            }


# 全局服务实例
_paper_service = None


def get_paper_service() -> PaperService:
    """获取 Paper 服务实例（单例模式）"""
    global _paper_service
    if _paper_service is None:
        _paper_service = PaperService()
    return _paper_service
