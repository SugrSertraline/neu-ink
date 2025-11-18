"""
Paper 业务逻辑服务 - 主服务类
处理论文的基础CRUD操作和查询功能
"""
import time
import logging
import json
from typing import Dict, Any, Optional, List, Tuple, Generator
from ..models.paper import PaperModel
from ..config.constants import BusinessCode
from ..utils.llm_utils import get_llm_utils
from ..utils.common import get_current_time, generate_id
from ..utils.background_tasks import get_task_manager
from ..models.parsingSession import get_parsing_session_model
from .paperContentService import PaperContentService
from .paperTranslationService import PaperTranslationService
from .paperMetadataService import get_paper_metadata_service

# 初始化logger
logger = logging.getLogger(__name__)


class PaperService:
    """Paper 业务逻辑服务类 - 主服务"""

    def __init__(self) -> None:
        self.paper_model = PaperModel()
        self.content_service = PaperContentService(self.paper_model)
        self.translation_service = PaperTranslationService(self.paper_model)

    # ------------------------------------------------------------------
    # 公共论文库
    # ------------------------------------------------------------------
    def get_public_papers(
        self,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "createdAt",
        sort_order: str = "desc",
        search: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            skip = self._calc_skip(page, page_size)
            sort_direction = self._parse_sort_order(sort_order)
            filters = filters or {}

            papers, total = self.paper_model.find_public_papers(
                skip=skip,
                limit=page_size,
                sort_by=sort_by,
                sort_order=sort_direction,
                search=search,
                filters=filters,
                user_id=user_id,
            )

            payload = [self._build_public_summary(paper) for paper in papers]
            return self._wrap_success(
                "获取公开论文成功",
                {
                    "papers": payload,
                    "pagination": self._build_pagination(total, page, page_size),
                },
            )
        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"获取公开论文失败: {exc}")

    def get_public_paper_detail(self, paper_id: str) -> Dict[str, Any]:
        try:
            paper = self.paper_model.find_public_paper_by_id(paper_id)
            if not paper:
                return self._wrap_failure(
                    BusinessCode.PAPER_NOT_FOUND, "论文不存在或不可访问"
                )
            
            # 获取sections数据
            paper = self._load_sections_for_paper(paper)
            
            # 自动检查并补全翻译 - 已禁用
            # paper = self._auto_check_and_complete_translation(paper)
            
            return self._wrap_success("获取论文成功", paper)
        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"获取论文失败: {exc}")

    def get_public_paper_content(self, paper_id: str) -> Dict[str, Any]:
        detail = self.get_public_paper_detail(paper_id)
        if detail["code"] != BusinessCode.SUCCESS or not detail["data"]:
            return detail

        paper = detail["data"]
        content = {
            "metadata": paper.get("metadata", {}),
            "abstract": paper.get("abstract"),
            "keywords": paper.get("keywords", []),
            "sections": paper.get("sections", []),
            "references": paper.get("references", []),
            "attachments": paper.get("attachments", {}),
        }
        return self._wrap_success("获取论文内容成功", content)

    # ------------------------------------------------------------------
    # 管理端接口
    # ------------------------------------------------------------------
    def get_admin_papers(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "createdAt",
        sort_order: str = "desc",
        search: Optional[str] = None,
        filters: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        try:
            skip = self._calc_skip(page, page_size)
            sort_direction = self._parse_sort_order(sort_order)

            papers, total = self.paper_model.find_admin_papers(
                user_id=user_id,
                skip=skip,
                limit=page_size,
                sort_by=sort_by,
                sort_order=sort_direction,
                search=search,
                filters=filters or {},
            )

            return self._wrap_success(
                "获取论文列表成功",
                {
                    "papers": papers,
                    "pagination": self._build_pagination(total, page, page_size),
                },
            )
        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"获取论文列表失败: {exc}")

    def get_admin_paper_detail(self, paper_id: str, user_id: str) -> Dict[str, Any]:
        paper = self.paper_model.find_admin_paper_by_id(paper_id)
        if not paper:
            return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")
        
        # 获取sections数据
        paper = self._load_sections_for_paper(paper)
        
        # 自动检查并补全翻译 - 已禁用
        # paper = self._auto_check_and_complete_translation(paper)
        
        return self._wrap_success("获取论文成功", paper)

    def create_paper(self, paper_data: Dict[str, Any], creator_id: str) -> Dict[str, Any]:
        try:
            paper_data["createdBy"] = creator_id
            
            # 如果paper_data中包含sections，需要先创建sections并更新paper
            sections_data = paper_data.pop("sections", [])
            
            # 创建论文
            paper = self.paper_model.create(paper_data)
            
            # 如果有sections数据，创建sections并更新paper
            if sections_data:
                from ..models.section import get_section_model
                section_model = get_section_model()
                
                section_ids = []
                for section_data in sections_data:
                    section_data["paperId"] = paper["id"]
                    created_section = section_model.create(section_data)
                    if created_section:
                        section_ids.append(created_section["id"])
                
                # 更新论文的sectionIds
                if section_ids:
                    self.paper_model.update_section_ids(paper["id"], section_ids)
                
                # 重新获取论文数据，包含sections
                paper = self._load_sections_for_paper(paper)
            
            return self._wrap_success("论文创建成功", paper)
        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"创建论文失败: {exc}")

    def create_paper_from_text(self, text: str, creator_id: str, is_public: bool = True) -> Dict[str, Any]:
        """
        从文本创建论文，通过大模型解析 metadata、abstract 和 keywords
        """
        try:
            # 使用元数据提取服务创建论文
            metadata_service = get_paper_metadata_service()
            return metadata_service.create_paper_from_text(text, creator_id, is_public)
        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"从文本创建论文失败: {exc}")

    def create_paper_from_metadata(self, metadata: Dict[str, Any], creator_id: str, is_public: bool = False) -> Dict[str, Any]:
        """
        从元数据创建论文，直接提供 metadata、abstract 和 keywords 等信息

        Args:
            metadata: 论文元数据，包含 title, authors, year 等
            creator_id: 创建者ID
            is_public: 是否公开（个人论文设为False）

        Returns:
            创建结果
        """
        try:
            # 使用元数据提取服务创建论文
            metadata_service = get_paper_metadata_service()
            return metadata_service.create_paper_from_metadata(metadata, creator_id, is_public)
        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"从元数据创建论文失败: {exc}")

    def _auto_check_and_complete_translation(self, paper: Dict[str, Any]) -> Dict[str, Any]:
        """
        自动检查并补全论文的翻译
        此方法在用户查看论文时自动调用，对用户透明
        """
        return self.translation_service.auto_check_and_complete_translation(paper)

    def get_paper_by_id(
        self,
        paper_id: str,
        user_id: Optional[str] = None,
        is_admin: bool = False,
    ) -> Dict[str, Any]:
        paper = self.paper_model.find_by_id(paper_id)
        if not paper:
            return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

        if not paper["isPublic"] and not is_admin and user_id and paper["createdBy"] != user_id:
            return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权访问此论文")

        # 获取sections数据
        paper = self._load_sections_for_paper(paper)

        # 自动检查并补全翻译 - 已禁用
        # paper = self._auto_check_and_complete_translation(paper)

        return self._wrap_success("获取论文成功", paper)

    def update_paper(
        self,
        paper_id: str,
        update_data: Dict[str, Any],
        user_id: str,
        is_admin: bool = False,
    ) -> Dict[str, Any]:
        paper = self.paper_model.find_by_id(paper_id)
        if not paper:
            return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

        # 管理员只能修改公开的论文
        if is_admin and not paper["isPublic"]:
            return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "管理员只能修改公开的论文")
        
        if not is_admin and paper["createdBy"] != user_id:
            return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权修改此论文")

        for field in ["id", "createdBy", "createdAt"]:
            update_data.pop(field, None)

        if self.paper_model.update(paper_id, update_data):
            updated = self.paper_model.find_by_id(paper_id)
            return self._wrap_success("论文更新成功", updated)

        return self._wrap_error("论文更新失败")

    def delete_paper(
        self,
        paper_id: str,
        user_id: str,
        is_admin: bool = False,
    ) -> Dict[str, Any]:
        paper = self.paper_model.find_by_id(paper_id)
        if not paper:
            return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

        # 管理员只能删除公开的论文
        if is_admin and not paper["isPublic"]:
            return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "管理员只能删除公开的论文")
        
        if not is_admin and paper["createdBy"] != user_id:
            return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权删除此论文")

        # 删除所有相关的sections
        from ..models.section import get_section_model
        section_model = get_section_model()
        section_model.delete_by_paper_id(paper_id)

        # 删除论文
        if self.paper_model.delete(paper_id):
            return self._wrap_success("论文删除成功", None)

        return self._wrap_error("论文删除失败")

    def update_paper_visibility(
        self,
        paper_id: str,
        is_public: bool,
        user_id: str,
    ) -> Dict[str, Any]:
        """
        管理员修改论文的可见状态
        """
        try:
            # 检查论文是否存在
            paper = self.paper_model.find_by_id(paper_id)
            if not paper:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")
            
            # 管理员只能修改公开论文的可见状态
            # 如果论文当前是私有的，管理员无权将其设为公开或修改其状态
            if not paper.get("isPublic", False):
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "管理员只能修改公开论文的可见状态")
            
            # 记录修改前的状态
            previous_visibility = paper.get("isPublic", False)
            
            # 如果状态没有变化，直接返回
            if previous_visibility == is_public:
                return self._wrap_success("论文可见状态未变化", {
                    "paperId": paper_id,
                    "previousVisibility": previous_visibility,
                    "currentVisibility": is_public,
                    "changed": False
                })
            
            # 更新论文可见状态
            update_data = {"isPublic": is_public}
            if self.paper_model.update(paper_id, update_data):
                return self._wrap_success("论文可见状态更新成功", {
                    "paperId": paper_id,
                    "previousVisibility": previous_visibility,
                    "currentVisibility": is_public,
                    "changed": True
                })
            else:
                return self._wrap_error("更新论文可见状态失败")
                
        except Exception as exc:
            return self._wrap_error(f"更新论文可见状态失败: {exc}")

    # ------------------------------------------------------------------
    # 内容操作代理方法
    # ------------------------------------------------------------------
    def add_section(self, *args, **kwargs):
        """添加章节"""
        return self.content_service.add_section(*args, **kwargs)

    def update_section(self, *args, **kwargs):
        """更新章节"""
        return self.content_service.update_section(*args, **kwargs)

    def delete_section(self, *args, **kwargs):
        """删除章节"""
        return self.content_service.delete_section(*args, **kwargs)

    def add_blocks_to_section(self, *args, **kwargs):
        """添加blocks到章节"""
        return self.content_service.add_blocks_to_section(*args, **kwargs)

    def update_block(self, *args, **kwargs):
        """更新block"""
        return self.content_service.update_block(*args, **kwargs)

    def delete_block(self, *args, **kwargs):
        """删除block"""
        return self.content_service.delete_block(*args, **kwargs)

    def add_block_directly(self, *args, **kwargs):
        """直接添加block"""
        return self.content_service.add_block_directly(*args, **kwargs)

    def add_block_from_text(self, *args, **kwargs):
        """从文本添加block"""
        return self.content_service.add_block_from_text(*args, **kwargs)

    def parse_references(self, paper_id: str, text: str) -> Dict[str, Any]:
        """解析参考文献"""
        try:
            # 使用参考文献服务解析文本
            from .paperReferenceService import get_paper_reference_service
            reference_service = get_paper_reference_service()
            parsed_references = reference_service.parse_reference_text(text)
            
            if not parsed_references:
                return self._wrap_error("参考文献解析失败，请检查文本格式")

            # 添加到论文
            result = reference_service.add_references_to_paper(paper_id, parsed_references)
            if result["success"]:
                return {
                    "success": True,
                    "message": f"成功解析并添加 {len(parsed_references)} 条参考文献",
                    "data": {
                        "references": parsed_references,
                        "paper": result["data"]
                    }
                }
            else:
                return result

        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"解析参考文献失败: {exc}")

    def add_references_to_paper(self, paper_id: str, references: List[Dict[str, Any]]) -> Dict[str, Any]:
        """添加参考文献到论文"""
        try:
            # 使用参考文献服务添加到论文
            from .paperReferenceService import get_paper_reference_service
            reference_service = get_paper_reference_service()
            result = reference_service.add_references_to_paper(paper_id, references)
            
            if result["success"]:
                return {
                    "success": True,
                    "message": f"成功添加 {len(references)} 条参考文献",
                    "data": result["data"]
                }
            else:
                return result

        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"添加参考文献失败: {exc}")

    # ------------------------------------------------------------------
    # 流式传输方法
    # ------------------------------------------------------------------
    def add_block_from_text_stream(
        self,
        paper_id: str,
        section_id: str,
        text: str,
        user_id: str,
        is_admin: bool = False,
        after_block_id: Optional[str] = None,
        session_id: Optional[str] = None,
        user_paper_id: Optional[str] = None,
        is_user_paper: bool = False
    ) -> Generator[str, None, None]:
        """
        通用的流式添加block方法，支持管理员和个人论文
        
        Args:
            paper_id: 论文ID
            section_id: 章节ID
            text: 要解析的文本
            user_id: 用户ID
            is_admin: 是否是管理员
            after_block_id: 在指定block后插入
            session_id: 会话ID，用于恢复连接
            user_paper_id: 个人论文ID（仅个人论文需要）
            
        Yields:
            Server-Sent Events格式的流式数据
        """
        try:
            # 减少调试日志频率
            logger.info(f"收到流式请求 - sessionId: {session_id}, paper_id: {paper_id}, section_id: {section_id}, is_admin: {is_admin}")
            
            session_model = get_parsing_session_model()
            task_manager = get_task_manager()
            existing_session = None
            progress_block_id = None
            insert_index = None
            should_create_new_task = True
            
            # 检查是否为恢复会话
            if session_id:
                existing_session = session_model.get_session(session_id)
                if not existing_session:
                    yield f"data: {json.dumps({'type': 'status_update', 'data': {'status': 'failed', 'progress': 0, 'message': '会话不存在或已过期', 'error': '会话不存在或已过期', 'sessionId': session_id}}, ensure_ascii=False)}\n\n"
                    return
                
                # 验证会话权限
                if existing_session["userId"] != user_id:
                    yield f"data: {json.dumps({'type': 'status_update', 'data': {'status': 'failed', 'progress': 0, 'message': '无权限访问此会话', 'error': '无权限访问此会话', 'sessionId': session_id}}, ensure_ascii=False)}\n\n"
                    return
                
                if existing_session["paperId"] != paper_id or existing_session["sectionId"] != section_id:
                    yield f"data: {json.dumps({'type': 'status_update', 'data': {'status': 'failed', 'progress': 0, 'message': '会话参数不匹配', 'error': '会话参数不匹配', 'sessionId': session_id}}, ensure_ascii=False)}\n\n"
                    return
                
                # 如果会话已完成或失败，直接返回结果
                if existing_session["status"] == "completed":
                    yield f"data: {json.dumps({'type': 'complete', 'blocks': existing_session.get("completedBlocks", []), 'paper': existing_session.get("paperData"), 'message': '会话已完成', 'sessionId': session_id}, ensure_ascii=False)}\n\n"
                    return
                elif existing_session["status"] == "failed":
                    yield f"data: {json.dumps({'type': 'status_update', 'data': {'status': 'failed', 'progress': 0, 'message': existing_session.get("error", "解析失败"), 'error': existing_session.get("error", "解析失败"), 'sessionId': session_id}}, ensure_ascii=False)}\n\n"
                    return
                
                # 检查是否有后台任务正在运行
                task = task_manager.get_task(session_id)
                if task and task.status.value in ["pending", "running"]:
                    should_create_new_task = False
                
                # 获取已保存的进度块ID和其他数据
                progress_block_id = existing_session.get("progressBlockId")
                text = existing_session["text"]
                after_block_id = existing_session.get("afterBlockId")
            
            # 获取论文数据
            paper = self.paper_model.find_by_id(paper_id)
            if not paper:
                yield f"data: {json.dumps({'type': 'status_update', 'data': {'status': 'failed', 'progress': 0, 'message': '论文不存在', 'error': '论文不存在', 'sessionId': session_id}}, ensure_ascii=False)}\n\n"
                return
            
            # 管理员只能操作公开的论文
            if is_admin and not paper.get("isPublic", False):
                yield f"data: {json.dumps({'type': 'status_update', 'data': {'status': 'failed', 'progress': 0, 'message': '管理员只能操作公开的论文', 'error': '管理员只能操作公开的论文', 'sessionId': session_id}}, ensure_ascii=False)}\n\n"
                return
            
            # 验证section存在
            from ..models.section import get_section_model
            section_model = get_section_model()
            target_section = section_model.find_by_id(section_id)
            
            if not target_section:
                yield f"data: {json.dumps({'type': 'status_update', 'data': {'status': 'failed', 'progress': 0, 'message': '章节不存在', 'error': '章节不存在', 'sessionId': session_id}}, ensure_ascii=False)}\n\n"
                return
            
            # 验证section属于该论文
            if target_section.get("paperId") != paper_id:
                yield f"data: {json.dumps({'type': 'status_update', 'data': {'status': 'failed', 'progress': 0, 'message': '章节不属于该论文', 'error': '章节不属于该论文', 'sessionId': session_id}}, ensure_ascii=False)}\n\n"
                return
            
            # 如果是新会话，创建会话和进度块
            if not existing_session:
                # 生成会话ID
                session_id = generate_id()
                
                # 创建会话
                session_model.create_session(
                    session_id=session_id,
                    user_id=user_id,
                    paper_id=paper_id,
                    section_id=section_id,
                    text=text,
                    after_block_id=after_block_id,
                    is_admin=is_admin,
                    user_paper_id=user_paper_id
                )
                
                # 创建进度块ID
                progress_block_id = generate_id()
                
                # 确保section有content字段
                if "content" not in target_section:
                    target_section["content"] = []
                
                # 确定插入位置
                insert_index = len(target_section["content"])  # 默认在末尾
                if after_block_id:
                    for i, block in enumerate(target_section["content"]):
                        if block.get("id") == after_block_id:
                            insert_index = i + 1  # 插入到指定block后面
                            break
                
                # 创建progress block
                progress_block = {
                    "id": progress_block_id,
                    "type": "loading",
                    "status": "pending",
                    "message": "准备解析文本...",
                    "progress": 0,
                    "originalText": text,
                    "sessionId": session_id,
                    "createdAt": get_current_time().isoformat()
                }
                
                # 插入progress block
                target_section["content"].insert(insert_index, progress_block)
                
                # 更新section
                if not section_model.update_direct(section_id, {"$set": {"content": target_section["content"]}}):
                    yield f"data: {json.dumps({'type': 'status_update', 'data': {'status': 'failed', 'progress': 0, 'message': '添加进度块失败', 'error': '添加进度块失败', 'sessionId': session_id}}, ensure_ascii=False)}\n\n"
                    return
                
                # 更新会话状态，记录进度块ID
                session_model.update_progress(
                    session_id=session_id,
                    status="processing",
                    progress=0,
                    message="准备解析文本...",
                    progress_block_id=progress_block_id
                )
                
                should_create_new_task = True
            
            # 只有在需要时才提交后台任务
            if should_create_new_task:
                # 保存用户ID到实例变量，供后台任务使用
                self._current_user_id = user_id
                
                # 再次确认任务不存在（双重检查，确保幂等性）
                existing_task = task_manager.get_task(session_id)
                if existing_task and existing_task.status.value in ["pending", "running"]:
                    pass
                else:
                    # 定义后台解析任务
                    def background_parsing_task():
                        """后台解析任务"""
                        # 创建应用上下文，避免"Working outside of application context"错误
                        try:
                            from flask import current_app
                            app_context = current_app.app_context()
                        except (RuntimeError, ImportError):
                            # 如果无法获取应用上下文（例如在非请求环境中），创建一个新的应用实例
                            from neuink import create_app
                            app = create_app()
                            app_context = app.app_context()
                        
                        with app_context:
                            # 设置用户ID到应用上下文中，避免g.current_user访问错误
                            try:
                                from flask import g
                                g.current_user = {"user_id": user_id}
                            except:
                                pass
                            try:
                                llm_utils = get_llm_utils()
                                # 保存用户ID到LLM工具实例
                                llm_utils._current_user_id = user_id
                                
                                # 获取section上下文
                                section_title = target_section.get("title", "") or target_section.get("titleZh", "")
                                section_context = f"章节: {section_title}"
                                
                                # 获取任务对象以便更新进度
                                task = task_manager.get_task(session_id)
                                
                                # 旧的流式解析逻辑已废弃，这里不再调用 LLM 流式接口
                                for chunk in []:
                                    if chunk.get("type") == "error":
                                        # 更新会话状态为错误
                                        session_model.fail_session(session_id, chunk.get("message", "解析失败"))
                                        
                                        # 更新progress block为错误状态
                                        progress_block = {
                                            "id": progress_block_id,
                                            "type": "loading",
                                            "status": "failed",
                                            "message": chunk.get("message", "解析失败"),
                                            "progress": 0,
                                            "sessionId": session_id
                                        }
                                        
                                        # 更新论文中的progress block
                                        self._update_progress_block_in_paper(paper_id, section_id, progress_block_id, progress_block, is_user_paper)
                                        break
                                    
                                    elif chunk.get("type") == "glm_stream":
                                        # GLM流式数据，记录日志但不做特殊处理
                                        # 这些数据会在前端的流式响应中处理
                                        glm_chunk_count = getattr(task, 'glm_chunk_count', 0) + 1 if task else 1
                                        if task:
                                            task.glm_chunk_count = glm_chunk_count
                                        
                                        # 每50个chunk记录一次日志，减少日志频率
                                        if glm_chunk_count % 50 == 1:
                                            logger.info(f"🔄 GLM流式数据 - sessionId: {session_id}, content: {chunk.get('content', '')[:50]}...")
                                        continue
                                    
                                    elif chunk.get("type") == "progress":
                                        # 控制进度日志频率，每10%才记录一次
                                        current_progress = chunk.get('progress', 0)
                                        if not hasattr(task, 'last_progress_log'):
                                            task.last_progress_log = 0
                                        
                                        if current_progress - task.last_progress_log >= 10 or current_progress >= 90:
                                            logger.info(f"解析进度更新 - sessionId: {session_id}, progress: {current_progress}%")
                                            task.last_progress_log = current_progress
                                        
                                        # 更新会话进度
                                        session_model.update_progress(
                                            session_id=session_id,
                                            status="processing",
                                            progress=current_progress,
                                            message=chunk.get("message", "处理中...")
                                        )
                                        
                                        # 更新任务进度
                                        if task:
                                            task.update_progress(current_progress, chunk.get("message", "处理中..."))
                                        
                                        # 更新progress block
                                        progress_block = {
                                            "id": progress_block_id,
                                            "type": "loading",
                                            "status": chunk.get("stage", "processing"),
                                            "message": chunk.get("message", "处理中..."),
                                            "progress": current_progress,
                                            "sessionId": session_id
                                        }
                                        
                                        # 更新论文中的progress block
                                        self._update_progress_block_in_paper(paper_id, section_id, progress_block_id, progress_block, is_user_paper)
                                    
                                    elif chunk.get("type") == "complete":
                                        # 解析完成，移除progress block并添加解析后的blocks
                                        parsed_blocks = chunk.get("blocks", [])
                                        
                                        # 更新section：移除progress block，添加解析后的blocks
                                        self._complete_parsing_in_paper(
                                            paper_id, section_id, progress_block_id,
                                            insert_index, parsed_blocks, session_model, session_id, is_user_paper
                                        )
                                        break
                                
                            except Exception as e:
                                # 更新会话状态为错误
                                session_model.fail_session(session_id, f"流式解析失败: {str(e)}")
                                
                                # 更新progress block为错误状态
                                progress_block = {
                                    "id": progress_block_id,
                                    "type": "loading",
                                    "status": "failed",
                                    "message": f"流式解析失败: {str(e)}",
                                    "progress": 0,
                                    "sessionId": session_id
                                }
                                
                                # 更新论文中的progress block
                                try:
                                    self._update_progress_block_in_paper(paper_id, section_id, progress_block_id, progress_block, is_user_paper)
                                except:
                                    pass
                    
                    # 提交后台任务
                    try:
                        task_manager.submit_task(
                            task_id=session_id,
                            func=background_parsing_task,
                            callback=lambda task_id, result: None
                        )
                    except Exception as e:
                        yield f"data: {json.dumps({'type': 'status_update', 'data': {'status': 'failed', 'progress': 0, 'message': f'提交后台任务失败: {str(e)}', 'error': f'提交后台任务失败: {str(e)}', 'sessionId': session_id}}, ensure_ascii=False)}\n\n"
                        return
            
            # 使用Server-Sent Events (SSE)进行流式响应
            def generate():
                # 创建应用上下文，避免"Working outside of application context"错误
                from flask import current_app
                with current_app.app_context():
                    try:
                        # 立即发送连接确认消息
                        yield f"data: {json.dumps({'type': 'status_update', 'data': {'status': 'connected', 'progress': 0, 'message': '连接已建立，准备开始解析...', 'sessionId': session_id}}, ensure_ascii=False)}\n\n"
                        
                        # 获取任务对象
                        task = task_manager.get_task(session_id)
                        if not task:
                            yield f"data: {json.dumps({'type': 'status_update', 'data': {'status': 'failed', 'progress': 0, 'message': '任务不存在', 'error': '任务不存在', 'sessionId': session_id}}, ensure_ascii=False)}\n\n"
                            return
                        
                        # 获取section上下文
                        section_title = target_section.get("title", "") or target_section.get("titleZh", "")
                        section_context = f"章节: {section_title}"
                        
                        # 直接从LLM获取流式数据，同时传递到前端
                        last_progress_log = 0  # 用于控制进度日志频率
                        glm_chunk_count = 0  # 用于控制GLM流式数据日志频率
                        
                        # 获取LLM工具实例（兼容保留，但不再调用流式方法）
                        llm_utils = get_llm_utils()
                        llm_utils._current_user_id = user_id
                        
                        # 旧的流式解析逻辑已废弃，这里不再调用 LLM 流式接口
                        for chunk in []:
                            if chunk.get("type") == "glm_stream":
                                glm_chunk_count += 1
                                
                                # 每50个chunk记录一次日志，减少日志频率
                                if glm_chunk_count % 50 == 1:
                                    logger.info(f"🔄 GLM流式数据 - sessionId: {session_id}, content: {chunk.get('content', '')[:50]}...")
                                
                                # 直接传递GLM的流式数据到前端，确保格式正确
                                glm_data = {
                                    "type": "glm_stream",
                                    "content": chunk.get("content", ""),
                                    "model": chunk.get("model", ""),
                                    "usage": chunk.get("usage", {}),
                                    "sessionId": session_id
                                }
                                yield f"data: {json.dumps(glm_data, ensure_ascii=False)}\n\n"
                            elif chunk.get("type") == "progress":
                                # 控制进度日志频率，每10%才记录一次
                                current_progress = chunk.get('progress', 0)
                                if current_progress - last_progress_log >= 10 or current_progress >= 90:
                                    logger.info(f"解析进度更新 - sessionId: {session_id}, progress: {current_progress}%")
                                    last_progress_log = current_progress
                                
                                # 同时也发送进度更新
                                yield f"data: {json.dumps({'type': 'status_update', 'data': {'status': 'processing', 'progress': current_progress, 'message': chunk.get('message', '处理中...'), 'sessionId': session_id}}, ensure_ascii=False)}\n\n"
                            elif chunk.get("type") == "complete":
                                # 解析完成
                                completed_blocks = chunk.get("blocks", [])
                                logger.info(f"解析完成 - sessionId: {session_id}, blocks数量: {len(completed_blocks)}")
                                yield f"data: {json.dumps({'type': 'complete', 'blocks': completed_blocks, 'message': '解析完成', 'sessionId': session_id}, ensure_ascii=False)}\n\n"
                                # 发送结束事件
                                yield "event: end\ndata: {}\n\n"
                                # 发送[DONE]标记，确保前端能正确识别结束
                                yield "data: [DONE]\n\n"
                                break
                            elif chunk.get("type") == "stream_end":
                                # 处理LLM工具类发送的结束信号
                                logger.info(f"收到流式结束信号 - sessionId: {session_id}")
                                # 发送结束事件
                                yield "event: end\ndata: {}\n\n"
                                # 发送[DONE]标记，确保前端能正确识别结束
                                yield "data: [DONE]\n\n"
                                break
                            elif chunk.get("type") == "error":
                                # 错误处理
                                logger.error(f"解析错误 - sessionId: {session_id}, error: {chunk.get('message', '解析失败')}")
                                yield f"data: {json.dumps({'type': 'status_update', 'data': {'status': 'failed', 'progress': 0, 'message': chunk.get('message', '解析失败'), 'error': chunk.get('message', '解析失败'), 'sessionId': session_id}}, ensure_ascii=False)}\n\n"
                                # 发送结束事件
                                yield "event: end\ndata: {}\n\n"
                                # 发送[DONE]标记，确保前端能正确识别结束
                                yield "data: [DONE]\n\n"
                                break
                        
                        return
                    
                    except Exception as e:
                        logger.error(f"流式响应异常: {str(e)}")
                        yield f"data: {json.dumps({'type': 'status_update', 'data': {'status': 'failed', 'progress': 0, 'message': f'流式响应失败: {str(e)}', 'error': f'流式响应失败: {str(e)}', 'sessionId': session_id}}, ensure_ascii=False)}\n\n"
                        # 发送结束事件
                        yield "event: end\ndata: {}\n\n"
                        # 发送[DONE]标记，确保前端能正确识别结束
                        yield "data: [DONE]\n\n"
            
            # 返回生成器
            for chunk in generate():
                yield chunk
        
        except Exception as exc:
            yield f"data: {json.dumps({'type': 'status_update', 'data': {'status': 'failed', 'progress': 0, 'message': f'服务器错误: {exc}', 'error': f'服务器错误: {exc}', 'sessionId': session_id}}, ensure_ascii=False)}\n\n"

    def _update_progress_block_in_paper(self, paper_id: str, section_id: str, progress_block_id: str, progress_block: Dict[str, Any], is_user_paper: bool = False):
        """更新论文中进度块的辅助函数"""
        # 创建应用上下文，避免"Working outside of application context"错误
        try:
            from flask import current_app
            app_context = current_app.app_context()
        except (RuntimeError, ImportError):
            # 如果无法获取应用上下文（例如在非请求环境中），创建一个新的应用实例
            from neuink import create_app
            app = create_app()
            app_context = app.app_context()
        
        with app_context:
            # 设置用户ID到应用上下文中，避免g.current_user访问错误
            try:
                from flask import g
                # 尝试从外部获取user_id，如果无法获取则使用默认值
                if hasattr(self, '_current_user_id'):
                    g.current_user = {"user_id": self._current_user_id}
            except:
                pass
            from ..models.section import get_section_model
            section_model = get_section_model()
            
            section = section_model.find_by_id(section_id)
            if not section:
                return
            
            # 验证section属于该论文
            if section.get("paperId") != paper_id:
                return
            
            content = section.get("content", [])
            for i, block in enumerate(content):
                if block.get("id") == progress_block_id:
                    content[i] = progress_block
                    break
            
            section_model.update_direct(section_id, {"$set": {"content": content}})

    def _complete_parsing_in_paper(self, paper_id: str, section_id: str, progress_block_id: str, insert_index: int, parsed_blocks: List[Dict[str, Any]], session_model, session_id: str, is_user_paper: bool = False):
        """完成论文解析的辅助函数"""
        # 创建应用上下文，避免"Working outside of application context"错误
        try:
            from flask import current_app
            app_context = current_app.app_context()
        except (RuntimeError, ImportError):
            # 如果无法获取应用上下文（例如在非请求环境中），创建一个新的应用实例
            from neuink import create_app
            app = create_app()
            app_context = app.app_context()
        
        with app_context:
            # 设置用户ID到应用上下文中，避免g.current_user访问错误
            try:
                from flask import g
                # 尝试从外部获取user_id，如果无法获取则使用默认值
                if hasattr(self, '_current_user_id'):
                    g.current_user = {"user_id": self._current_user_id}
            except:
                pass
            from ..models.section import get_section_model
            section_model = get_section_model()
            
            # 更新section：移除progress block，添加解析后的blocks
            section = section_model.find_by_id(section_id)
            if not section:
                return
            
            # 验证section属于该论文
            if section.get("paperId") != paper_id:
                return
            
            content = section.get("content", [])
            # 移除progress block
            content = [block for block in content if block.get("id") != progress_block_id]
            # 添加解析后的blocks
            content[insert_index:insert_index] = parsed_blocks
            
            # 更新section
            updated_section = section_model.update_direct(section_id, {"$set": {"content": content}})
            
            # 验证更新是否成功
            if updated_section:
                # 确认更新成功，获取最新的论文数据
                verify_paper = self.paper_model.find_paper_with_sections(paper_id)
                
                if verify_paper:
                    # 使用验证后的最新数据完成会话
                    session_model.complete_session(session_id, parsed_blocks, verify_paper)
                else:
                    # 获取最新数据失败，但仍使用当前数据完成会话
                    session_model.complete_session(session_id, parsed_blocks, verify_paper)
            else:
                # 更新失败，标记会话失败
                session_model.fail_session(session_id, "更新章节数据失败")

    # ------------------------------------------------------------------
    # 翻译操作代理方法
    # ------------------------------------------------------------------
    def check_and_complete_translation(self, *args, **kwargs):
        """检查并补全翻译"""
        return self.translation_service.check_and_complete_translation(*args, **kwargs)

    def get_translation_status(self, *args, **kwargs):
        """获取翻译状态"""
        return self.translation_service.get_translation_status(*args, **kwargs)

    def migrate_paper_translation_status(self, *args, **kwargs):
        """迁移翻译状态"""
        return self.translation_service.migrate_paper_translation_status(*args, **kwargs)

    def migrate_abstract_format(self, *args, **kwargs):
        """迁移摘要格式"""
        return self.translation_service.migrate_abstract_format(*args, **kwargs)

    def migrate_title_format(self, *args, **kwargs):
        """迁移标题格式"""
        return self.translation_service.migrate_title_format(*args, **kwargs)

    # ------------------------------------------------------------------
    # 统计 & 个人论文库
    # ------------------------------------------------------------------
    def get_statistics(self) -> Dict[str, Any]:
        try:
            stats = self.paper_model.get_statistics()
            return self._wrap_success("获取统计信息成功", stats)
        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"获取统计信息失败: {exc}")

    def get_user_papers(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "createdAt",
        sort_order: str = "desc",
        search: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            skip = self._calc_skip(page, page_size)
            sort_direction = self._parse_sort_order(sort_order)

            if search:
                public_papers, public_total = self.paper_model.search(
                    keyword=search,
                    is_public=True,
                    skip=skip,
                    limit=page_size,
                )
                user_papers, user_total = [], 0
            else:
                public_papers, public_total = self.paper_model.find_all(
                    is_public=True,
                    skip=skip,
                    limit=page_size,
                    sort_by=sort_by,
                    sort_order=sort_direction,
                )
                user_papers, user_total = [], 0

            combined, total = self._merge_public_and_user_papers(
                public_papers,
                user_papers,
                public_total,
                user_total,
            )
            return self._wrap_success(
                "获取用户论文列表成功",
                {
                    "papers": combined,
                    "pagination": self._build_pagination(total, page, page_size),
                },
            )
        except Exception as exc:  # pylint: disable=broad-except
            return self._wrap_error(f"获取用户论文列表失败: {exc}")

    # ------------------------------------------------------------------
    # 辅助方法
    # ------------------------------------------------------------------
    @staticmethod
    def _calc_skip(page: int, page_size: int) -> int:
        return max(page - 1, 0) * page_size

    @staticmethod
    def _parse_sort_order(sort_order: str) -> int:
        return -1 if sort_order.lower() == "desc" else 1

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
    def _merge_public_and_user_papers(
        public_papers: List[Dict[str, Any]],
        user_papers: List[Dict[str, Any]],
        public_total: int,
        user_total: int,
    ) -> Tuple[List[Dict[str, Any]], int]:
        merged = public_papers.copy()
        seen_ids = {paper.get("id") for paper in public_papers}

        for paper in user_papers:
            if paper.get("id") not in seen_ids:
                merged.append(paper)
                seen_ids.add(paper.get("id"))

        return merged, public_total + user_total

    @staticmethod
    def _build_public_summary(paper: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": paper.get("id"),
            "isPublic": paper.get("isPublic", True),
            "metadata": paper.get("metadata", {}),
            "createdAt": paper.get("createdAt"),
            "updatedAt": paper.get("updatedAt"),
        }

    @staticmethod
    def _wrap_success(message: str, data: Any) -> Dict[str, Any]:
        return {
            "code": BusinessCode.SUCCESS,
            "message": message,
            "data": data,
        }

    @staticmethod
    def _wrap_failure(code: int, message: str) -> Dict[str, Any]:
        return {
            "code": code,
            "message": message,
            "data": None,
        }

    @staticmethod
    def _wrap_error(message: str) -> Dict[str, Any]:
        return {
            "code": BusinessCode.INTERNAL_ERROR,
            "message": message,
            "data": None,
        }


    def _load_sections_for_paper(self, paper: Dict[str, Any]) -> Dict[str, Any]:
        """
        为论文加载sections数据
        这个方法确保向后兼容，使上层接口不需要改变
        """
        if "sections" in paper:
            # 如果已经有sections数据，直接返回
            return paper
            
        # 从Section集合获取数据
        from ..models.section import get_section_model
        section_model = get_section_model()
        sections = section_model.find_by_paper_id(paper["id"])
        
        # 将sections数据添加到paper中
        paper["sections"] = sections
        return paper


_paper_service: Optional[PaperService] = None


def get_paper_service() -> PaperService:
    global _paper_service
    if _paper_service is None:
        _paper_service = PaperService()
    return _paper_service
