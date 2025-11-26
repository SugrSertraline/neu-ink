"""
统一解析服务
合并admin和user的解析逻辑，提供统一的解析接口
"""
from typing import Dict, Any, Optional, List, Tuple, Generator
from abc import ABC, abstractmethod
from ..models.context import PaperContext, check_paper_permission
from ..models.parsingSession import get_parsing_session_model
from ..utils.common import get_current_time, generate_id
from ..utils.background_tasks import get_task_manager
from ..utils.llm_utils import get_llm_utils
from ..config.constants import BusinessCode
import json
import logging

logger = logging.getLogger(__name__)


class BaseParsingService(ABC):
    """解析服务抽象基类"""
    
    def __init__(self):
        self.session_model = get_parsing_session_model()
        self.task_manager = get_task_manager()
        self.llm_utils = get_llm_utils()
    
    @abstractmethod
    def get_paper_model(self):
        """获取论文模型实例"""
        pass
    
    @abstractmethod
    def get_paper_type(self) -> str:
        """获取论文类型"""
        pass
    
    def parse_text_to_blocks(
        self,
        text: str,
        context: PaperContext,
        section_id: str,
        after_block_id: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> Generator[str, None, None]:
        """
        将文本解析为blocks - 支持上下文感知
        
        Args:
            text: 要解析的文本
            context: 论文上下文
            section_id: 章节ID
            after_block_id: 在指定block后插入
            session_id: 会话ID，用于恢复连接
            
        Yields:
            Server-Sent Events格式的流式数据
        """
        try:
            # 减少调试日志频率
            logger.info(f"收到流式请求 - sessionId: {session_id}, section_id: {section_id}, paper_type: {context.paper_type}")
            
            existing_session = None
            progress_block_id = None
            insert_index = None
            should_create_new_task = True
            
            # 检查是否为恢复会话
            if session_id:
                existing_session = self.session_model.get_session(session_id)
                if not existing_session:
                    yield f"data: {json.dumps({'type': 'status_update', 'data': {'status': 'failed', 'progress': 0, 'message': '会话不存在或已过期', 'error': '会话不存在或已过期', 'sessionId': session_id}}, ensure_ascii=False)}\n\n"
                    return
                
                # 验证会话权限
                if existing_session["userId"] != context.user_id:
                    yield f"data: {json.dumps({'type': 'status_update', 'data': {'status': 'failed', 'progress': 0, 'message': '无权限访问此会话', 'error': '无权限访问此会话', 'sessionId': session_id}}, ensure_ascii=False)}\n\n"
                    return
                
                # 如果会话已完成或失败，直接返回结果
                if existing_session["status"] == "completed":
                    yield f"data: {json.dumps({'type': 'complete', 'blocks': existing_session.get("completedBlocks", []), 'message': '会话已完成', 'sessionId': session_id}, ensure_ascii=False)}\n\n"
                    return
                elif existing_session["status"] == "failed":
                    yield f"data: {json.dumps({'type': 'status_update', 'data': {'status': 'failed', 'progress': 0, 'message': existing_session.get("error", "解析失败"), 'error': existing_session.get("error", "解析失败"), 'sessionId': session_id}}, ensure_ascii=False)}\n\n"
                    return
                
                # 检查是否有后台任务正在运行
                task = self.task_manager.get_task(session_id)
                if task and task.status.value in ["pending", "running"]:
                    should_create_new_task = False
                
                # 获取已保存的进度块ID和其他数据
                progress_block_id = existing_session.get("progressBlockId")
                text = existing_session["text"]
                after_block_id = existing_session.get("afterBlockId")
            
            # 获取论文数据
            paper = self.get_paper_model().find_by_id(context.paper_id or context.user_paper_id)
            if not paper:
                yield f"data: {json.dumps({'type': 'status_update', 'data': {'status': 'failed', 'progress': 0, 'message': '论文不存在', 'error': '论文不存在', 'sessionId': session_id}}, ensure_ascii=False)}\n\n"
                return
            
            # 验证section存在
            from ..models.section import get_section_model
            section_model = get_section_model()
            target_section = section_model.find_by_id(section_id)
            
            if not target_section:
                yield f"data: {json.dumps({'type': 'status_update', 'data': {'status': 'failed', 'progress': 0, 'message': '章节不存在', 'error': '章节不存在', 'sessionId': session_id}}, ensure_ascii=False)}\n\n"
                return
            
            # 验证section属于该论文
            if target_section.get("paperId") != (context.paper_id or context.user_paper_id):
                yield f"data: {json.dumps({'type': 'status_update', 'data': {'status': 'failed', 'progress': 0, 'message': '章节不属于该论文', 'error': '章节不属于该论文', 'sessionId': session_id}}, ensure_ascii=False)}\n\n"
                return
            
            # 如果是新会话，创建会话和进度块
            if not existing_session:
                # 生成会话ID
                session_id = generate_id()
                
                # 创建会话
                self.session_model.create_session(
                    session_id=session_id,
                    user_id=context.user_id,
                    paper_id=context.paper_id or context.user_paper_id,
                    section_id=section_id,
                    text=text,
                    after_block_id=after_block_id,
                    is_admin=context.is_admin,
                    user_paper_id=context.user_paper_id
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
                self.session_model.update_progress(
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
                self._current_user_id = context.user_id
                
                # 再次确认任务不存在（双重检查，确保幂等性）
                existing_task = self.task_manager.get_task(session_id)
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
                                g.current_user = {"user_id": context.user_id}
                            except:
                                pass
                            
                            # 获取section上下文
                            section_title = target_section.get("title", "") or target_section.get("titleZh", "")
                            section_context = f"章节: {section_title}"
                            
                            # 获取任务对象以便更新进度
                            task = self.task_manager.get_task(session_id)
                            
                            try:
                                # 旧的流式解析逻辑已废弃，这里不再调用 LLM 流式接口
                                for chunk in []:
                                    if chunk.get("type") == "error":
                                        # 更新会话状态为错误
                                        self.session_model.fail_session(session_id, chunk.get("message", "解析失败"))
                                        
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
                                        self._update_progress_block_in_paper(
                                            context.paper_id or context.user_paper_id,
                                            section_id,
                                            progress_block_id,
                                            progress_block,
                                            context.user_paper_id is not None
                                        )
                                        break
                                    
                                    elif chunk.get("type") == "glm_stream":
                                        # GLM流式数据，记录日志但不做特殊处理
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
                                        self.session_model.update_progress(
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
                                        self._update_progress_block_in_paper(
                                            context.paper_id or context.user_paper_id,
                                            section_id,
                                            progress_block_id,
                                            progress_block,
                                            context.user_paper_id is not None
                                        )
                                    
                                    elif chunk.get("type") == "complete":
                                        # 解析完成，移除progress block并添加解析后的blocks
                                        parsed_blocks = chunk.get("blocks", [])
                                        
                                        # 更新section：移除progress block，添加解析后的blocks
                                        self._complete_parsing_in_paper(
                                            context.paper_id or context.user_paper_id,
                                            section_id,
                                            progress_block_id,
                                            insert_index,
                                            parsed_blocks,
                                            self.session_model,
                                            session_id,
                                            context.user_paper_id is not None
                                        )
                                        break
                            except Exception as e:
                                # 更新会话状态为错误
                                self.session_model.fail_session(session_id, f"流式解析失败: {str(e)}")
                                
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
                                    self._update_progress_block_in_paper(
                                        context.paper_id or context.user_paper_id,
                                        section_id,
                                        progress_block_id,
                                        progress_block,
                                        context.user_paper_id is not None
                                    )
                                except:
                                    pass
                    
                    # 提交后台任务
                    try:
                        self.task_manager.submit_task(
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
                        task = self.task_manager.get_task(session_id)
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
                        self.llm_utils._current_user_id = context.user_id
                        
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
                verify_paper = self.get_paper_model().find_paper_with_sections(paper_id)
                
                if verify_paper:
                    # 使用验证后的最新数据完成会话
                    session_model.complete_session(session_id, parsed_blocks, verify_paper)
                else:
                    # 获取最新数据失败，但仍使用当前数据完成会话
                    session_model.complete_session(session_id, parsed_blocks, verify_paper)
            else:
                # 更新失败，标记会话失败
                session_model.fail_session(session_id, "更新章节数据失败")


class AdminParsingService(BaseParsingService):
    """管理员论文解析服务"""
    
    def get_paper_model(self):
        """获取论文模型实例"""
        from ..models.adminPaper import AdminPaperModel
        return AdminPaperModel()
    
    def get_paper_type(self) -> str:
        """获取论文类型"""
        return "admin"


class UserParsingService(BaseParsingService):
    """用户论文解析服务"""
    
    def get_paper_model(self):
        """获取论文模型实例"""
        from ..models.userPaper import UserPaperModel
        return UserPaperModel()
    
    def get_paper_type(self) -> str:
        """获取论文类型"""
        return "user"


class ParsingServiceFactory:
    """解析服务工厂类"""
    
    @staticmethod
    def get_service(paper_type: str) -> BaseParsingService:
        """根据论文类型获取对应的解析服务"""
        if paper_type == "admin":
            return AdminParsingService()
        elif paper_type == "user":
            return UserParsingService()
        else:
            raise ValueError(f"不支持的论文类型: {paper_type}")


# 全局服务实例
_admin_parsing_service = None
_user_parsing_service = None


def get_admin_parsing_service() -> AdminParsingService:
    """获取管理员解析服务单例"""
    global _admin_parsing_service
    if _admin_parsing_service is None:
        _admin_parsing_service = AdminParsingService()
    return _admin_parsing_service


def get_user_parsing_service() -> UserParsingService:
    """获取用户解析服务单例"""
    global _user_parsing_service
    if _user_parsing_service is None:
        _user_parsing_service = UserParsingService()
    return _user_parsing_service


def get_parsing_service(paper_type: str) -> BaseParsingService:
    """根据论文类型获取解析服务"""
    return ParsingServiceFactory.get_service(paper_type)