"""
BaseNoteService 抽象基类
定义笔记服务的通用接口和方法
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Tuple
from ..models.context import PaperContext, check_paper_permission


class BaseNoteService(ABC):
    """笔记服务抽象基类"""
    
    def __init__(self):
        # 不在基类初始化中设置模型，让子类自己处理
        pass
    
    @abstractmethod
    def _get_note_model(self):
        """获取笔记模型实例"""
        pass
    
    @abstractmethod
    def _get_paper_model(self):
        """获取论文模型实例"""
        pass
    
    @abstractmethod
    def get_paper_type(self) -> str:
        """获取论文类型"""
        pass
    
    def create_note(
        self,
        context: PaperContext,
        block_id: str,
        content: List[Dict[str, Any]],
        plain_text: Optional[str] = None,
        note_id: Optional[str] = None,
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """创建笔记 - 支持上下文感知"""
        try:
            # 1. 检查权限
            if not check_paper_permission(context.paper_id or context.user_paper_id, context, "write"):
                return False, "无权在此论文添加笔记", None
            
            # 2. 验证 block 是否存在
            paper = self._get_paper_by_context(context)
            if not paper:
                return False, "论文不存在", None
                
            if not self._block_exists_in_paper(paper, block_id):
                return False, f"论文中不存在 blockId: {block_id}", None

            # 3. 创建笔记
            note_data = {
                "id": note_id or self._generate_id(),
                "userId": context.user_id,
                "userPaperId": context.user_paper_id,
                "blockId": block_id,
                "content": content,
            }
            if plain_text is not None:
                note_data["plainText"] = plain_text
            
            note = self._get_note_model().create(note_data)
            serialized_note = self._serialize_note(note)
            return True, "笔记创建成功", serialized_note
            
        except Exception as exc:
            return False, f"创建笔记失败: {str(exc)}", None
    
    def get_notes_by_paper(
        self,
        context: PaperContext,
        page: int = 1,
        page_size: int = 100,
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """获取某篇论文的所有笔记 - 支持上下文感知"""
        try:
            # 权限检查
            if not check_paper_permission(context.paper_id or context.user_paper_id, context, "read"):
                return False, "无权访问此论文的笔记", None
                
            paper = self._get_paper_by_context(context)
            if not paper:
                return False, "论文不存在", None

            skip = self._calc_skip(page, page_size)
            notes, total = self._get_note_model().find_by_user_paper(
                user_paper_id=context.user_paper_id,
                skip=skip,
                limit=page_size,
            )

            return True, "获取笔记列表成功", {
                "notes": self._serialize_notes(notes),
                "pagination": self._build_pagination(total, page, page_size),
            }
            
        except Exception as exc:
            return False, f"获取笔记列表失败: {str(exc)}", None
    
    def update_note(
        self,
        note_id: str,
        context: PaperContext,
        update_data: Dict[str, Any],
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """更新笔记内容 - 支持上下文感知"""
        try:
            note = self._get_note_model().find_by_id(note_id)
            
            if not note:
                return False, "笔记不存在", None
            
            # 权限检查
            if note["userId"] != context.user_id:
                return False, "无权修改此笔记", None

            # 允许修改 content 与 plainText
            allowed_fields = {"content", "plainText"}
            filtered_data = {
                k: v for k, v in update_data.items() if k in allowed_fields
            }

            if not filtered_data:
                return False, "没有可更新的字段", None

            # 更新
            updated = self._get_note_model().update(note_id, filtered_data)
            if updated:
                return True, "笔记更新成功", self._serialize_note(updated)
            else:
                return True, "笔记更新成功", {"id": note_id, "message": "笔记已更新但无法获取详细信息"}
                
        except Exception as exc:
            return False, f"更新笔记失败: {str(exc)}", None
    
    def delete_note(
        self,
        note_id: str,
        context: PaperContext,
    ) -> Tuple[bool, str]:
        """删除笔记 - 支持上下文感知"""
        try:
            note = self._get_note_model().find_by_id(note_id)
            
            if not note:
                return False, f"笔记不存在，ID: {note_id}"
            
            # 权限检查
            if note["userId"] != context.user_id:
                return False, "无权删除此笔记"

            # 删除
            if self._get_note_model().delete(note_id):
                return True, "笔记删除成功"
            
            return False, "笔记删除失败"
            
        except Exception as exc:
            return False, f"删除笔记失败: {str(exc)}"
    
    # 辅助方法
    def _get_paper_by_context(self, context: PaperContext) -> Optional[Dict[str, Any]]:
        """根据上下文获取论文"""
        if context.user_paper_id:
            return self._get_paper_model().find_by_id(context.user_paper_id)
        elif context.paper_id:
            return self._get_paper_model().find_by_id(context.paper_id)
        return None
    
    def _block_exists_in_paper(self, paper: Dict[str, Any], block_id: str) -> bool:
        """检查 block 是否存在于论文中"""
        def check_section(section: Dict[str, Any]) -> bool:
            # 检查当前 section 的所有 blocks
            for block in section.get("content", []):
                if block.get("id") == block_id:
                    return True
            return False
        
        # 优先检查直接加载的 sections 数组
        sections = paper.get("sections", [])
        
        # 检查所有 sections
        for section in sections:
            if check_section(section):
                return True
        
        return False
    
    @staticmethod
    def _calc_skip(page: int, page_size: int) -> int:
        return max(page - 1, 0) * page_size
    
    @staticmethod
    def _build_pagination(total: int, page: int, page_size: int) -> Dict[str, int]:
        total_pages = (total + page_size - 1) // page_size if page_size else 0
        return {
            "page": page,
            "pageSize": page_size,
            "total": total,
            "totalPages": total_pages,
        }
    
    @staticmethod
    def _generate_id():
        """生成ID"""
        from ..utils.common import generate_id
        return generate_id()
    
    @staticmethod
    def _normalize_value(value: Any) -> Any:
        """将 ObjectId、datetime 等类型转换为可 JSON 序列化的值"""
        from bson import ObjectId
        
        if isinstance(value, ObjectId):
            return str(value)
        
        if isinstance(value, list):
            return [BaseNoteService._normalize_value(item) for item in value]
        
        if isinstance(value, dict):
            return {
                key: BaseNoteService._normalize_value(val)
                for key, val in value.items()
            }
        
        # 处理 datetime 对象，确保返回 UTC 时间的 ISO 格式
        if hasattr(value, "isoformat"):
            try:
                # 确保时间是 UTC 格式
                iso_str = value.isoformat()
                # 如果没有时区信息，添加 Z 后缀表示 UTC
                if not iso_str.endswith('Z') and '+' not in iso_str[-6:]:
                    return iso_str + 'Z'
                return iso_str
            except TypeError:
                pass
        
        return value
    
    def _serialize_note(self, note: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """序列化笔记数据"""
        if not note:
            return None
        
        # 优先保留前端传入的 id 字段，确保不被 MongoDB 的 _id 覆盖
        serialized = {}
        
        # 首先处理 id 字段，确保使用前端传入的 UUID
        if "id" in note:
            serialized["id"] = str(note["id"])
        elif "_id" in note:
            # 只有在没有前端 id 时才使用 MongoDB 的 _id
            serialized["id"] = self._normalize_value(note["_id"])
        
        # 处理其他字段，排除 _id
        for key, val in note.items():
            if key == "_id":
                continue  # 跳过 MongoDB 的 _id 字段
            if key == "id" and key in serialized:
                continue  # 已经处理过 id 字段
            serialized[key] = self._normalize_value(val)
        
        return serialized
    
    def _serialize_notes(self, notes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """序列化笔记列表"""
        return [self._serialize_note(note) for note in notes]