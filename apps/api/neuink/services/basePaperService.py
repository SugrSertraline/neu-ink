"""
BasePaperService 抽象基类
处理论文相关的通用业务逻辑
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Tuple, Generator
from ..models.context import PaperContext, check_paper_permission
from ..config.constants import BusinessCode


class BasePaperService(ABC):
    """BasePaper 业务逻辑服务抽象基类"""

    def __init__(self):
        """初始化 BasePaper 服务"""
        pass

    @abstractmethod
    def get_paper_model(self):
        """获取论文模型实例"""
        pass

    # ------------------------------------------------------------------
    # 基础CRUD操作
    # ------------------------------------------------------------------
    def get_paper(
        self, 
        paper_id: str, 
        context: PaperContext
    ) -> Dict[str, Any]:
        """
        获取论文详情
        
        Args:
            paper_id: 论文ID
            context: 论文上下文
            
        Returns:
            论文数据
        """
        try:
            # 权限检查
            if not check_paper_permission(context, "read"):
                return self._wrap_failure(
                    BusinessCode.PERMISSION_DENIED, 
                    "无权访问此论文"
                )
            
            # 获取论文数据
            paper = self.get_paper_model().find_by_id(paper_id)
            if not paper:
                return self._wrap_failure(
                    BusinessCode.PAPER_NOT_FOUND, 
                    "论文不存在"
                )
            
            # 加载sections数据
            paper = self._load_sections_for_paper(paper)
            
            return self._wrap_success("获取论文成功", paper)
        except Exception as exc:
            return self._wrap_error(f"获取论文失败: {exc}")

    def create_paper(
        self, 
        paper_data: Dict[str, Any], 
        context: PaperContext
    ) -> Dict[str, Any]:
        """
        创建论文
        
        Args:
            paper_data: 论文数据
            context: 论文上下文
            
        Returns:
            创建结果
        """
        try:
            # 权限检查
            if not check_paper_permission(context, "write"):
                return self._wrap_failure(
                    BusinessCode.PERMISSION_DENIED, 
                    "无权创建论文"
                )
            
            # 创建论文
            paper = self.get_paper_model().create(paper_data)
            
            return self._wrap_success("论文创建成功", paper)
        except Exception as exc:
            return self._wrap_error(f"创建论文失败: {exc}")

    def update_paper(
        self, 
        paper_id: str, 
        update_data: Dict[str, Any], 
        context: PaperContext
    ) -> Dict[str, Any]:
        """
        更新论文
        
        Args:
            paper_id: 论文ID
            update_data: 更新数据
            context: 论文上下文
            
        Returns:
            更新结果
        """
        try:
            # 权限检查
            if not check_paper_permission(context, "write"):
                return self._wrap_failure(
                    BusinessCode.PERMISSION_DENIED, 
                    "无权修改此论文"
                )
            
            # 检查论文是否存在
            paper = self.get_paper_model().find_by_id(paper_id)
            if not paper:
                return self._wrap_failure(
                    BusinessCode.PAPER_NOT_FOUND, 
                    "论文不存在"
                )
            
            # 更新论文
            if self.get_paper_model().update(paper_id, update_data):
                updated = self.get_paper_model().find_by_id(paper_id)
                return self._wrap_success("论文更新成功", updated)
            
            return self._wrap_error("论文更新失败")
        except Exception as exc:
            return self._wrap_error(f"更新论文失败: {exc}")

    def delete_paper(
        self, 
        paper_id: str, 
        context: PaperContext
    ) -> Dict[str, Any]:
        """
        删除论文
        
        Args:
            paper_id: 论文ID
            context: 论文上下文
            
        Returns:
            删除结果
        """
        try:
            # 权限检查
            if not check_paper_permission(context, "delete"):
                return self._wrap_failure(
                    BusinessCode.PERMISSION_DENIED, 
                    "无权删除此论文"
                )
            
            # 检查论文是否存在
            paper = self.get_paper_model().find_by_id(paper_id)
            if not paper:
                return self._wrap_failure(
                    BusinessCode.PAPER_NOT_FOUND, 
                    "论文不存在"
                )
            
            # 删除论文
            if self.get_paper_model().delete(paper_id):
                return self._wrap_success("论文删除成功", None)
            
            return self._wrap_error("论文删除失败")
        except Exception as exc:
            return self._wrap_error(f"删除论文失败: {exc}")

    def get_papers(
        self, 
        skip: int, 
        limit: int, 
        sort_by: str, 
        sort_order: int, 
        search: Optional[str], 
        filters: Optional[Dict[str, Any]], 
        context: PaperContext
    ) -> Dict[str, Any]:
        """
        获取论文列表
        
        Args:
            skip: 跳过数量
            limit: 限制数量
            sort_by: 排序字段
            sort_order: 排序方向
            search: 搜索关键词
            filters: 筛选条件
            context: 论文上下文
            
        Returns:
            论文列表和分页信息
        """
        try:
            # 权限检查
            if not check_paper_permission(context, "read"):
                return self._wrap_failure(
                    BusinessCode.PERMISSION_DENIED, 
                    "无权访问论文列表"
                )
            
            # 获取论文列表
            papers, total = self.get_paper_model().find_by_user_or_filters(
                skip=skip,
                limit=limit,
                sort_by=sort_by,
                sort_order=sort_order,
                search=search,
                filters=filters,
                user_id=context.user_id
            )
            
            return self._wrap_success("获取论文列表成功", {
                "papers": papers,
                "pagination": self._build_pagination(total, skip // limit + 1, limit)
            })
        except Exception as exc:
            return self._wrap_error(f"获取论文列表失败: {exc}")

    # ------------------------------------------------------------------
    # 章节操作
    # ------------------------------------------------------------------
    def get_sections(
        self, 
        paper_id: str, 
        context: PaperContext
    ) -> List[Dict[str, Any]]:
        """
        获取论文的章节列表
        
        Args:
            paper_id: 论文ID
            context: 论文上下文
            
        Returns:
            章节列表
        """
        try:
            # 权限检查
            if not check_paper_permission(context, "read"):
                return []
            
            # 获取论文并加载sections
            paper = self.get_paper_model().find_by_id(paper_id)
            if not paper:
                return []
            
            return self._load_sections_for_paper(paper).get("sections", [])
        except Exception as exc:
            return []

    def add_section(
        self, 
        paper_id: str, 
        section_data: Dict[str, Any], 
        context: PaperContext
    ) -> Dict[str, Any]:
        """
        添加章节
        
        Args:
            paper_id: 论文ID
            section_data: 章节数据
            context: 论文上下文
            
        Returns:
            添加结果
        """
        try:
            # 权限检查
            if not check_paper_permission(context, "write"):
                return self._wrap_failure(
                    BusinessCode.PERMISSION_DENIED, 
                    "无权修改此论文"
                )
            
            # 检查论文是否存在
            paper = self.get_paper_model().find_by_id(paper_id)
            if not paper:
                return self._wrap_failure(
                    BusinessCode.PAPER_NOT_FOUND, 
                    "论文不存在"
                )
            
            # 添加章节
            from ..models.section import get_section_model
            section_model = get_section_model()
            section_data["paperId"] = paper_id
            section = section_model.create(section_data)
            
            # 更新论文的sectionIds
            section_ids = paper.get("sectionIds", [])
            section_ids.append(section["id"])
            self.get_paper_model().update_section_ids(paper_id, section_ids)
            
            return self._wrap_success("章节添加成功", section)
        except Exception as exc:
            return self._wrap_error(f"章节添加失败: {exc}")

    def update_section(
        self, 
        paper_id: str, 
        section_id: str, 
        update_data: Dict[str, Any], 
        context: PaperContext
    ) -> Dict[str, Any]:
        """
        更新章节
        
        Args:
            paper_id: 论文ID
            section_id: 章节ID
            update_data: 更新数据
            context: 论文上下文
            
        Returns:
            更新结果
        """
        try:
            # 权限检查
            if not check_paper_permission(context, "write"):
                return self._wrap_failure(
                    BusinessCode.PERMISSION_DENIED, 
                    "无权修改此论文"
                )
            
            # 更新章节
            from ..models.section import get_section_model
            section_model = get_section_model()
            if section_model.update(section_id, update_data):
                return self._wrap_success("章节更新成功", section_model.find_by_id(section_id))
            
            return self._wrap_error("章节更新失败")
        except Exception as exc:
            return self._wrap_error(f"章节更新失败: {exc}")

    def delete_section(
        self, 
        paper_id: str, 
        section_id: str, 
        context: PaperContext
    ) -> Dict[str, Any]:
        """
        删除章节
        
        Args:
            paper_id: 论文ID
            section_id: 章节ID
            context: 论文上下文
            
        Returns:
            删除结果
        """
        try:
            # 权限检查
            if not check_paper_permission(context, "write"):
                return self._wrap_failure(
                    BusinessCode.PERMISSION_DENIED, 
                    "无权修改此论文"
                )
            
            # 删除章节
            from ..models.section import get_section_model
            section_model = get_section_model()
            
            # 获取论文和章节信息
            paper = self.get_paper_model().find_by_id(paper_id)
            if not paper:
                return self._wrap_failure(
                    BusinessCode.PAPER_NOT_FOUND, 
                    "论文不存在"
                )
            
            section = section_model.find_by_id(section_id)
            if not section:
                return self._wrap_failure(
                    BusinessCode.PAPER_NOT_FOUND, 
                    "章节不存在"
                )
            
            # 删除章节
            if section_model.delete(section_id):
                # 从论文的sectionIds中移除
                section_ids = paper.get("sectionIds", [])
                if section_id in section_ids:
                    section_ids.remove(section_id)
                    self.get_paper_model().update_section_ids(paper_id, section_ids)
            
                return self._wrap_success("章节删除成功", None)
            
            return self._wrap_error("章节删除失败")
        except Exception as exc:
            return self._wrap_error(f"章节删除失败: {exc}")

    # ------------------------------------------------------------------
    # 辅助方法
    # ------------------------------------------------------------------
    def _load_sections_for_paper(self, paper: Dict[str, Any]) -> Dict[str, Any]:
        """
        为论文加载sections数据
        """
        from ..models.section import find_sections_by_ids
        
        if "sectionIds" in paper and paper["sectionIds"]:
            sections = find_sections_by_ids(paper["sectionIds"])
            paper["sections"] = sections
        else:
            paper["sections"] = []
        
        return paper

    @staticmethod
    def _build_pagination(total: int, page: int, page_size: int) -> Dict[str, int]:
        """构建分页信息"""
        total_pages = (total + page_size - 1) // page_size if page_size else 0
        return {
            "page": page,
            "pageSize": page_size,
            "total": total,
            "totalPages": total_pages,
        }

    @staticmethod
    def _wrap_success(message: str, data: Any) -> Dict[str, Any]:
        """包装成功响应"""
        return {
            "code": BusinessCode.SUCCESS,
            "message": message,
            "data": data,
        }

    @staticmethod
    def _wrap_failure(code: int, message: str) -> Dict[str, Any]:
        """包装失败响应"""
        return {
            "code": code,
            "message": message,
            "data": None,
        }

    @staticmethod
    def _wrap_error(message: str) -> Dict[str, Any]:
        """包装错误响应"""
        return {
            "code": BusinessCode.INTERNAL_ERROR,
            "message": message,
            "data": None,
        }