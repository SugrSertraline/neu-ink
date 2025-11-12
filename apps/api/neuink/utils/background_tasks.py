"""
后台任务管理器
用于管理需要在后台运行的任务，即使前端断开连接也能继续执行
"""

import threading
import time
import queue
from typing import Dict, Any, Optional, Callable
from enum import Enum
import logging

# 配置日志
logger = logging.getLogger(__name__)

class TaskStatus(Enum):
    """任务状态枚举"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class BackgroundTask:
    """后台任务类"""
    
    def __init__(
        self,
        task_id: str,
        func: Callable,
        args: tuple = (),
        kwargs: dict = None,
        callback: Optional[Callable] = None
    ):
        """
        初始化后台任务
        
        Args:
            task_id: 任务唯一标识
            func: 要执行的函数
            args: 函数位置参数
            kwargs: 函数关键字参数
            callback: 完成后的回调函数
        """
        self.task_id = task_id
        self.func = func
        self.args = args
        self.kwargs = kwargs or {}
        self.callback = callback
        self.status = TaskStatus.PENDING
        self.result = None
        self.error = None
        self.progress = 0
        self.message = "任务准备中..."
        self.created_at = time.time()
        self.started_at = None
        self.completed_at = None
        self.thread = None
        
    def start(self):
        """启动任务"""
        if self.status != TaskStatus.PENDING:
            return False
            
        self.status = TaskStatus.RUNNING
        self.started_at = time.time()
        self.thread = threading.Thread(target=self._run)
        self.thread.daemon = True  # 设置为守护线程，主程序退出时自动结束
        self.thread.start()
        return True
    
    def _run(self):
        """执行任务"""
        try:
            logger.info(f"开始执行后台任务: {self.task_id}")
            self.result = self.func(*self.args, **self.kwargs)
            self.status = TaskStatus.COMPLETED
            self.message = "任务完成"
            logger.info(f"后台任务完成: {self.task_id}")
            
            # 执行回调
            if self.callback:
                try:
                    self.callback(self.task_id, self.result)
                except Exception as e:
                    logger.error(f"任务回调执行失败: {self.task_id}, 错误: {e}")
                    
        except Exception as e:
            self.status = TaskStatus.FAILED
            self.error = str(e)
            self.message = f"任务失败: {e}"
            logger.error(f"后台任务失败: {self.task_id}, 错误: {e}")
        finally:
            self.completed_at = time.time()
    
    def cancel(self):
        """取消任务"""
        if self.status == TaskStatus.RUNNING:
            self.status = TaskStatus.CANCELLED
            self.message = "任务已取消"
            logger.info(f"后台任务已取消: {self.task_id}")
            return True
        return False
    
    def update_progress(self, progress: int, message: str = ""):
        """更新任务进度"""
        self.progress = max(0, min(100, progress))
        if message:
            self.message = message
        logger.debug(f"任务进度更新: {self.task_id}, 进度: {self.progress}%, 消息: {self.message}")
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "taskId": self.task_id,
            "status": self.status.value,
            "progress": self.progress,
            "message": self.message,
            "result": self.result,
            "error": self.error,
            "createdAt": self.created_at,
            "startedAt": self.started_at,
            "completedAt": self.completed_at
        }

class BackgroundTaskManager:
    """后台任务管理器"""
    
    def __init__(self):
        self.tasks: Dict[str, BackgroundTask] = {}
        self._lock = threading.Lock()
        
        # 启动清理线程
        self._cleanup_thread = threading.Thread(target=self._cleanup_old_tasks, daemon=True)
        self._cleanup_thread.start()
    
    def submit_task(
        self,
        task_id: str,
        func: Callable,
        args: tuple = (),
        kwargs: dict = None,
        callback: Optional[Callable] = None
    ) -> BackgroundTask:
        """
        提交后台任务
        
        Args:
            task_id: 任务唯一标识
            func: 要执行的函数
            args: 函数位置参数
            kwargs: 函数关键字参数
            callback: 完成后的回调函数
            
        Returns:
            创建的任务对象
        """
        with self._lock:
            if task_id in self.tasks:
                # 如果任务已存在，先取消旧任务
                self.tasks[task_id].cancel()
            
            task = BackgroundTask(task_id, func, args, kwargs, callback)
            self.tasks[task_id] = task
            task.start()
            
            logger.info(f"提交后台任务: {task_id}")
            return task
    
    def get_task(self, task_id: str) -> Optional[BackgroundTask]:
        """获取任务"""
        with self._lock:
            return self.tasks.get(task_id)
    
    def cancel_task(self, task_id: str) -> bool:
        """取消任务"""
        with self._lock:
            task = self.tasks.get(task_id)
            if task:
                return task.cancel()
            return False
    
    def remove_task(self, task_id: str) -> bool:
        """移除任务"""
        with self._lock:
            if task_id in self.tasks:
                task = self.tasks[task_id]
                if task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED]:
                    del self.tasks[task_id]
                    logger.info(f"移除已完成任务: {task_id}")
                    return True
            return False
    
    def get_all_tasks(self) -> Dict[str, Dict[str, Any]]:
        """获取所有任务状态"""
        with self._lock:
            return {task_id: task.to_dict() for task_id, task in self.tasks.items()}
    
    def _cleanup_old_tasks(self):
        """清理旧任务的后台线程"""
        while True:
            try:
                current_time = time.time()
                tasks_to_remove = []
                
                with self._lock:
                    for task_id, task in self.tasks.items():
                        # 清理超过24小时的已完成任务
                        if (task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED] and
                            task.completed_at and current_time - task.completed_at > 24 * 3600):
                            tasks_to_remove.append(task_id)
                    
                    for task_id in tasks_to_remove:
                        del self.tasks[task_id]
                        logger.info(f"自动清理旧任务: {task_id}")
                
                # 每小时检查一次
                time.sleep(3600)
                
            except Exception as e:
                logger.error(f"清理旧任务时出错: {e}")
                time.sleep(300)  # 出错时5分钟后重试

# 全局任务管理器实例
_task_manager: Optional[BackgroundTaskManager] = None

def get_task_manager() -> BackgroundTaskManager:
    """获取全局任务管理器实例"""
    global _task_manager
    if _task_manager is None:
        _task_manager = BackgroundTaskManager()
    return _task_manager