"""
PDF解析任务模型
管理通过MinerU API解析PDF的任务状态和结果
"""
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List

from ..utils.db import get_db


class PdfParseTaskModel:
    """PDF解析任务模型类"""
    
    def __init__(self):
        """初始化模型"""
        self.db = get_db()
        from ..config.constants import Collections
        self.collection_name = Collections.PDF_PARSE_TASKS
    
    def create_task(self, paper_id: str, user_id: str, pdf_url: str, is_admin: bool = False, user_paper_id: Optional[str] = None) -> Dict[str, Any]:
        """
        创建PDF解析任务
        
        Args:
            paper_id: 论文ID
            user_id: 用户ID
            pdf_url: PDF文件URL
            is_admin: 是否是管理员操作
            user_paper_id: 个人论文ID（仅个人论文需要）
            
        Returns:
            创建的任务记录
        """
        task_id = f"pdf_parse_{uuid.uuid4().hex[:12]}"
        current_time = datetime.utcnow()
        
        task = {
            "_id": task_id,  # Mongo 主键
            "paperId": paper_id,
            "userId": user_id,
            "userPaperId": user_paper_id,
            "pdfUrl": pdf_url,
            "isAdmin": is_admin,
            "status": "pending",  # pending, processing, completed, failed
            "progress": 0,
            "message": "准备开始解析...",
            "mineruTaskId": None,  # MinerU API返回的任务ID
            # 移除以下字段以避免在数据库中存储大文件内容:
            # "markdownContent": None,  # 解析生成的Markdown内容 - 不再存储在数据库中
            # "markdownAttachment": None,  # 上传后的Markdown附件信息 - 不再存储在数据库中
            "error": None,
            "createdAt": current_time,
            "updatedAt": current_time,
            "completedAt": None
        }
        
        # 插入数据库
        self.db[self.collection_name].insert_one(task)
        
        # 关键：对外暴露 id 字段，并移除 MongoDB 的 _id 字段
        task["id"] = task_id
        task.pop("_id", None)
        
        return task
    
    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """
        获取PDF解析任务
        
        Args:
            task_id: 任务ID
            
        Returns:
            任务记录或None
        """
        task = self.db[self.collection_name].find_one({"_id": task_id})
        if task:
            # 增加 id 字段，并移除 MongoDB 的 _id 字段
            task["id"] = task["_id"]
            task.pop("_id", None)
            return task
        return None
    
    def update_task_status(self, task_id: str, status: str, progress: int = None, message: str = None, mineru_task_id: str = None, error: str = None) -> bool:
        """
        更新任务状态
        
        Args:
            task_id: 任务ID
            status: 新状态
            progress: 进度百分比
            message: 状态消息
            mineru_task_id: MinerU任务ID
            error: 错误信息
            
        Returns:
            是否更新成功
        """
        update_data = {
            "status": status,
            "updatedAt": datetime.utcnow()
        }
        
        if progress is not None:
            update_data["progress"] = progress
        
        if message is not None:
            update_data["message"] = message
        
        if mineru_task_id is not None:
            update_data["mineruTaskId"] = mineru_task_id
        
        # 移除markdown_content参数，不再存储Markdown内容到数据库中
        
        if error is not None:
            update_data["error"] = error
        
        # 如果任务完成或失败，记录完成时间
        if status in ["completed", "failed"]:
            update_data["completedAt"] = datetime.utcnow()
        
        result = self.db[self.collection_name].update_one(
            {"_id": task_id},
            {"$set": update_data}
        )
        
        return result.modified_count > 0
    
    # 移除update_markdown_attachment方法，因为不再存储markdownAttachment信息到数据库中
    # Markdown附件信息直接存储在paper的attachments字段中
    
    def get_user_tasks(self, user_id: str, status: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """
        获取用户的PDF解析任务列表
        
        Args:
            user_id: 用户ID
            status: 状态过滤
            limit: 返回数量限制
            
        Returns:
            任务列表
        """
        query = {"userId": user_id}
        if status:
            query["status"] = status
        
        tasks = list(
            self.db[self.collection_name]
            .find(query)
            .sort("createdAt", -1)
            .limit(limit)
        )
        
        # 增加 id 字段，并移除MongoDB的_id字段
        for task in tasks:
            task["id"] = task["_id"]
            task.pop("_id", None)
        
        return tasks
    
    def get_paper_tasks(self, paper_id: str, is_admin: bool = False) -> List[Dict[str, Any]]:
        """
        获取指定论文的PDF解析任务
        
        Args:
            paper_id: 论文ID
            is_admin: 是否是管理员操作
            
        Returns:
            任务列表
        """
        query = {
            "paperId": paper_id,
            "isAdmin": is_admin
        }
        
        tasks = list(
            self.db[self.collection_name]
            .find(query)
            .sort("createdAt", -1)
            .limit(10)  # 最多返回10个任务
        )
        
        # 增加 id 字段，并移除MongoDB的_id字段
        for task in tasks:
            task["id"] = task["_id"]
            task.pop("_id", None)
        
        return tasks
    
    def delete_task(self, task_id: str) -> bool:
        """
        删除PDF解析任务
        
        Args:
            task_id: 任务ID
            
        Returns:
            是否删除成功
        """
        result = self.db[self.collection_name].delete_one({"_id": task_id})
        return result.deleted_count > 0
    
    def cleanup_old_tasks(self, days: int = 7) -> int:
        """
        清理旧的PDF解析任务
        
        Args:
            days: 保留天数
            
        Returns:
            删除的任务数量
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        result = self.db[self.collection_name].delete_many({
            "createdAt": {"$lt": cutoff_date},
            "status": {"$in": ["completed", "failed"]}
        })
        
        return result.deleted_count


# 全局实例
_pdf_parse_task_model: Optional[PdfParseTaskModel] = None


def get_pdf_parse_task_model() -> PdfParseTaskModel:
    """获取PDF解析任务模型实例（单例模式）"""
    global _pdf_parse_task_model
    if _pdf_parse_task_model is None:
        _pdf_parse_task_model = PdfParseTaskModel()
    return _pdf_parse_task_model