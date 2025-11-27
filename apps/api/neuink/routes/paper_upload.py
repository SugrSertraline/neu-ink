# neuink/api/routes/paper_upload.py
import logging
from flask import request, g, Blueprint
from neuink.services.paperService import get_paper_service
from neuink.services.userPaperService import get_user_paper_service
from neuink.utils.auth import login_required
from neuink.utils.common import (
    success_response,
    bad_request_response,
    internal_error_response,
)
from neuink.config.constants import BusinessCode

logger = logging.getLogger(__name__)

# 创建蓝图
bp = Blueprint("paper_upload", __name__)


@bp.route("/user/<user_paper_id>/upload-pdf", methods=["POST"])
@login_required
def upload_user_paper_pdf(user_paper_id):
    """
    用户论文PDF上传接口
    """
    try:
        logger.info(f"用户论文PDF上传 - user_paper_id: {user_paper_id}, user_id: {g.current_user['user_id']}")
        
        # 验证文件是否存在
        if 'file' not in request.files:
            return bad_request_response("没有上传文件")
        
        file = request.files['file']
        if file.filename == '':
            return bad_request_response("没有选择文件")
        
        # 验证文件类型
        if not file.filename.lower().endswith('.pdf'):
            return bad_request_response("只支持PDF文件")
        
        # 获取用户论文详情
        service = get_user_paper_service()
        result = service.get_user_paper_detail(
            user_paper_id=user_paper_id,
            user_id=g.current_user["user_id"]
        )
        
        if result["code"] != BusinessCode.SUCCESS:
            return bad_request_response(result["message"])
        
        user_paper = result["data"]
        
        # 获取七牛云服务实例
        try:
            from ..services.qiniuService import get_qiniu_service
            qiniu_service = get_qiniu_service()
        except ImportError as e:
            return internal_error_response(f"七牛云服务不可用: {str(e)}")
        
        # 读取文件数据
        file_data = file.read()
        
        # 上传PDF到七牛云
        pdf_result = qiniu_service.upload_file_data(
            file_data=file_data,
            file_extension=".pdf",
            file_type="unified_paper",
            filename=f"{user_paper_id}.pdf",
            paper_id=user_paper_id,
            overwrite=True
        )
        
        if not pdf_result["success"]:
            return internal_error_response(f"PDF上传失败: {pdf_result['error']}")
        
        # 更新论文附件
        current_attachments = user_paper.get("attachments", {})
        updated_attachments = current_attachments.copy()
        updated_attachments["pdf"] = {
            "url": pdf_result["url"],
            "key": pdf_result["key"],
            "size": pdf_result["size"],
            "uploadedAt": pdf_result["uploadedAt"]
        }
        
        # 更新用户论文附件
        update_result = service.update_user_paper(
            entry_id=user_paper_id,
            user_id=g.current_user["user_id"],
            update_data={"attachments": updated_attachments}
        )
        
        if update_result["code"] != BusinessCode.SUCCESS:
            return internal_error_response(f"更新论文附件失败: {update_result['message']}")
        
        # 创建PDF解析任务
        from ..models.pdfParseTask import get_pdf_parse_task_model
        from ..services.mineruService import get_mineru_service
        
        task_model = get_pdf_parse_task_model()
        mineru_service = get_mineru_service()
        
        # 创建解析任务
        task = task_model.create_task(
            paper_id=user_paper_id,
            user_id=g.current_user["user_id"],
            pdf_url=pdf_result["url"],
            is_admin=False,
            user_paper_id=user_paper_id
        )
        
        # 提交MinerU解析任务
        mineru_result = mineru_service.submit_parsing_task(pdf_result["url"])
        
        if mineru_result["success"]:
            # 更新任务状态
            task_model.update_task_status(
                task_id=task["id"],
                status="processing",
                message="PDF解析已提交，正在处理中...",
                mineru_task_id=mineru_result["task_id"]
            )
            
            return success_response({
                "taskId": task["id"],
                "status": "processing",
                "message": "PDF上传成功，解析已开始",
                "pdfAttachment": updated_attachments["pdf"]
            }, "PDF上传成功")
        else:
            # 如果MinerU提交失败，更新任务状态为失败
            task_model.update_task_status(
                task_id=task["id"],
                status="failed",
                message=f"提交解析任务失败: {mineru_result['error']}",
                error=mineru_result["error"]
            )
            
            return success_response({
                "taskId": task["id"],
                "status": "failed",
                "message": f"PDF上传成功，但解析失败: {mineru_result['error']}",
                "pdfAttachment": updated_attachments["pdf"]
            }, "PDF上传成功，但解析失败")
    
    except Exception as exc:
        logger.error(f"用户论文PDF上传异常 - user_paper_id: {user_paper_id}, error: {str(exc)}", exc_info=True)
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/admin/<paper_id>/upload-pdf", methods=["POST"])
@login_required
def upload_admin_paper_pdf(paper_id):
    """
    管理员论文PDF上传接口
    """
    try:
        logger.info(f"管理员论文PDF上传 - paper_id: {paper_id}, user_id: {g.current_user['user_id']}")
        
        # 验证文件是否存在
        if 'file' not in request.files:
            return bad_request_response("没有上传文件")
        
        file = request.files['file']
        if file.filename == '':
            return bad_request_response("没有选择文件")
        
        # 验证文件类型
        if not file.filename.lower().endswith('.pdf'):
            return bad_request_response("只支持PDF文件")
        
        # 获取管理员论文详情
        service = get_paper_service()
        result = service.get_admin_paper_detail(
            paper_id=paper_id,
            user_id=g.current_user["user_id"]
        )
        
        if result["code"] != BusinessCode.SUCCESS:
            return bad_request_response(result["message"])
        
        paper = result["data"]
        
        # 获取七牛云服务实例
        try:
            from ..services.qiniuService import get_qiniu_service
            qiniu_service = get_qiniu_service()
        except ImportError as e:
            return internal_error_response(f"七牛云服务不可用: {str(e)}")
        
        # 读取文件数据
        file_data = file.read()
        
        # 上传PDF到七牛云
        pdf_result = qiniu_service.upload_file_data(
            file_data=file_data,
            file_extension=".pdf",
            file_type="unified_paper",
            filename=f"{paper_id}.pdf",
            paper_id=paper_id,
            overwrite=True
        )
        
        if not pdf_result["success"]:
            return internal_error_response(f"PDF上传失败: {pdf_result['error']}")
        
        # 更新论文附件
        current_attachments = paper.get("attachments", {})
        updated_attachments = current_attachments.copy()
        updated_attachments["pdf"] = {
            "url": pdf_result["url"],
            "key": pdf_result["key"],
            "size": pdf_result["size"],
            "uploadedAt": pdf_result["uploadedAt"]
        }
        
        # 更新管理员论文附件
        update_result = service.update_paper_attachments(
            paper_id=paper_id,
            attachments=updated_attachments,
            user_id=g.current_user["user_id"],
            is_admin=True
        )
        
        if update_result["code"] != BusinessCode.SUCCESS:
            return internal_error_response(f"更新论文附件失败: {update_result['message']}")
        
        # 创建PDF解析任务
        from ..models.pdfParseTask import get_pdf_parse_task_model
        from ..services.mineruService import get_mineru_service
        
        task_model = get_pdf_parse_task_model()
        mineru_service = get_mineru_service()
        
        # 创建解析任务
        task = task_model.create_task(
            paper_id=paper_id,
            user_id=g.current_user["user_id"],
            pdf_url=pdf_result["url"],
            is_admin=True
        )
        
        # 提交MinerU解析任务
        mineru_result = mineru_service.submit_parsing_task(pdf_result["url"])
        
        if mineru_result["success"]:
            # 更新任务状态
            task_model.update_task_status(
                task_id=task["id"],
                status="processing",
                message="PDF解析已提交，正在处理中...",
                mineru_task_id=mineru_result["task_id"]
            )
            
            return success_response({
                "taskId": task["id"],
                "status": "processing",
                "message": "PDF上传成功，解析已开始",
                "pdfAttachment": updated_attachments["pdf"]
            }, "PDF上传成功")
        else:
            # 如果MinerU提交失败，更新任务状态为失败
            task_model.update_task_status(
                task_id=task["id"],
                status="failed",
                message=f"提交解析任务失败: {mineru_result['error']}",
                error=mineru_result["error"]
            )
            
            return success_response({
                "taskId": task["id"],
                "status": "failed",
                "message": f"PDF上传成功，但解析失败: {mineru_result['error']}",
                "pdfAttachment": updated_attachments["pdf"]
            }, "PDF上传成功，但解析失败")
    
    except Exception as exc:
        logger.error(f"管理员论文PDF上传异常 - paper_id: {paper_id}, error: {str(exc)}", exc_info=True)
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/user/<user_paper_id>/pdf-parse-status", methods=["GET"])
@login_required
def get_user_paper_pdf_parse_status(user_paper_id):
    """
    获取用户论文PDF解析状态
    """
    try:
        logger.info(f"获取用户论文PDF解析状态 - user_paper_id: {user_paper_id}, user_id: {g.current_user['user_id']}")
        
        # 验证用户论文是否存在
        service = get_user_paper_service()
        result = service.get_user_paper_detail(
            user_paper_id=user_paper_id,
            user_id=g.current_user["user_id"]
        )
        
        if result["code"] != BusinessCode.SUCCESS:
            return bad_request_response(result["message"])
        
        # 获取PDF解析任务
        from ..models.pdfParseTask import get_pdf_parse_task_model
        from ..services.mineruService import get_mineru_service
        
        task_model = get_pdf_parse_task_model()
        mineru_service = get_mineru_service()
        
        # 获取最新的解析任务
        tasks = task_model.get_paper_tasks(
            paper_id=user_paper_id,
            is_admin=False
        )
        
        if not tasks:
            return success_response({
                "hasTask": False,
                "message": "没有找到PDF解析任务"
            }, "没有找到PDF解析任务")
        
        # 获取最新的任务
        latest_task = tasks[0]
        
        # 如果任务状态是processing，查询MinerU状态
        if latest_task["status"] == "processing" and latest_task.get("mineruTaskId"):
            mineru_status = mineru_service.get_parsing_status(latest_task["mineruTaskId"])
            
            if mineru_status["success"]:
                # 更新任务状态
                task_model.update_task_status(
                    task_id=latest_task["id"],
                    status=mineru_status["status"],
                    progress=mineru_status.get("progress", 0),
                    message=mineru_status.get("message", "")
                )
                
                latest_task["status"] = mineru_status["status"]
                latest_task["progress"] = mineru_status.get("progress", 0)
                latest_task["message"] = mineru_status.get("message", "")
                
                # 如果MinerU解析完成，启动后台任务处理结果
                if mineru_status["status"] == "completed" and mineru_status.get("full_zip_url"):
                    from ..utils.background_tasks import get_task_manager
                    
                    task_manager = get_task_manager()
                    
                    # 定义后台处理任务
                    def process_mineru_result():
                        try:
                            # 获取七牛云服务实例
                            from ..services.qiniuService import get_qiniu_service
                            qiniu_service = get_qiniu_service()
                            
                            # 下载并处理MinerU结果
                            result = mineru_service.fetch_markdown_content_and_upload(
                                result_url=mineru_status["full_zip_url"],
                                paper_id=user_paper_id,
                                qiniu_service=qiniu_service
                            )
                            
                            if result["success"]:
                                # 检查result中是否有attachments键
                                if "attachments" not in result:
                                    logger.error(f"MinerU结果中缺少attachments键: {result}")
                                    # 更新任务状态为失败
                                    task_model.update_task_status(
                                        task_id=latest_task["id"],
                                        status="failed",
                                        message="MinerU结果格式错误：缺少attachments键"
                                    )
                                    return
                                
                                # 更新论文附件
                                new_attachments = result.get("attachments")
                                if new_attachments is None:
                                    logger.error(f"MinerU结果中attachments为None: {result}")
                                    # 更新任务状态为失败
                                    task_model.update_task_status(
                                        task_id=latest_task["id"],
                                        status="failed",
                                        message="MinerU结果格式错误：attachments为None"
                                    )
                                    return
                                
                                # 从任务记录中获取用户ID
                                task_record = task_model.get_task(latest_task["id"])
                                if not task_record:
                                    logger.error(f"无法找到任务记录: {latest_task['id']}")
                                    task_model.update_task_status(
                                        task_id=latest_task["id"],
                                        status="failed",
                                        message="无法找到任务记录"
                                    )
                                    return
                                
                                user_id = task_record.get("userId")
                                if not user_id:
                                    logger.error(f"任务记录中缺少用户ID: {latest_task['id']}")
                                    task_model.update_task_status(
                                        task_id=latest_task["id"],
                                        status="failed",
                                        message="任务记录中缺少用户ID"
                                    )
                                    return
                                
                                # 获取当前论文附件
                                paper_result = service.get_user_paper_detail(
                                    user_paper_id=user_paper_id,
                                    user_id=user_id
                                )
                                
                                if paper_result["code"] == BusinessCode.SUCCESS:
                                    paper = paper_result["data"]
                                    current_attachments = paper.get("attachments", {})
                                    
                                    # 合并附件信息 - 确保正确更新每个附件类型
                                    for attachment_type, attachment_data in new_attachments.items():
                                        if attachment_data:  # 只更新非空的附件
                                            current_attachments[attachment_type] = attachment_data
                                    
                                    # 更新论文附件
                                    service.update_user_paper(
                                        entry_id=user_paper_id,
                                        user_id=user_id,
                                        update_data={"attachments": current_attachments}
                                    )
                                    
                                    # 更新任务状态为完成
                                    task_model.update_task_status(
                                        task_id=latest_task["id"],
                                        status="completed",
                                        progress=100,
                                        message="PDF解析完成，结果已上传"
                                    )
                                else:
                                    # 更新任务状态为失败
                                    task_model.update_task_status(
                                        task_id=latest_task["id"],
                                        status="failed",
                                        message="更新论文附件失败"
                                    )
                            else:
                                # 更新任务状态为失败
                                task_model.update_task_status(
                                    task_id=latest_task["id"],
                                    status="failed",
                                    message=f"处理解析结果失败: {result['error']}",
                                    error=result["error"]
                                )
                        except Exception as e:
                            logger.error(f"处理MinerU结果异常: {str(e)}", exc_info=True)
                            # 更新任务状态为失败
                            task_model.update_task_status(
                                task_id=latest_task["id"],
                                status="failed",
                                message=f"处理解析结果异常: {str(e)}",
                                error=str(e)
                            )
                    
                    # 提交后台任务
                    task_manager.submit_task(
                        task_id=f"process_mineru_{latest_task['id']}",
                        func=process_mineru_result,
                        callback=lambda task_id, result: None
                    )
        
        return success_response({
            "hasTask": True,
            "task": latest_task
        }, "获取PDF解析状态成功")
    
    except Exception as exc:
        logger.error(f"获取用户论文PDF解析状态异常 - user_paper_id: {user_paper_id}, error: {str(exc)}", exc_info=True)
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/admin/<paper_id>/pdf-parse-status", methods=["GET"])
@login_required
def get_admin_paper_pdf_parse_status(paper_id):
    """
    获取管理员论文PDF解析状态
    """
    try:
        logger.info(f"获取管理员论文PDF解析状态 - paper_id: {paper_id}, user_id: {g.current_user['user_id']}")
        
        # 验证管理员论文是否存在
        service = get_paper_service()
        result = service.get_admin_paper_detail(
            paper_id=paper_id,
            user_id=g.current_user["user_id"]
        )
        
        if result["code"] != BusinessCode.SUCCESS:
            return bad_request_response(result["message"])
        
        # 获取PDF解析任务
        from ..models.pdfParseTask import get_pdf_parse_task_model
        from ..services.mineruService import get_mineru_service
        
        task_model = get_pdf_parse_task_model()
        mineru_service = get_mineru_service()
        
        # 获取最新的解析任务
        tasks = task_model.get_paper_tasks(
            paper_id=paper_id,
            is_admin=True
        )
        
        if not tasks:
            return success_response({
                "hasTask": False,
                "message": "没有找到PDF解析任务"
            }, "没有找到PDF解析任务")
        
        # 获取最新的任务
        latest_task = tasks[0]
        
        # 如果任务状态是processing，查询MinerU状态
        if latest_task["status"] == "processing" and latest_task.get("mineruTaskId"):
            mineru_status = mineru_service.get_parsing_status(latest_task["mineruTaskId"])
            
            if mineru_status["success"]:
                # 更新任务状态
                task_model.update_task_status(
                    task_id=latest_task["id"],
                    status=mineru_status["status"],
                    progress=mineru_status.get("progress", 0),
                    message=mineru_status.get("message", "")
                )
                
                latest_task["status"] = mineru_status["status"]
                latest_task["progress"] = mineru_status.get("progress", 0)
                latest_task["message"] = mineru_status.get("message", "")
                
                # 如果MinerU解析完成，启动后台任务处理结果
                if mineru_status["status"] == "completed" and mineru_status.get("full_zip_url"):
                    from ..utils.background_tasks import get_task_manager
                    
                    task_manager = get_task_manager()
                    
                    # 定义后台处理任务
                    def process_mineru_result():
                        try:
                            # 获取七牛云服务实例
                            from ..services.qiniuService import get_qiniu_service
                            qiniu_service = get_qiniu_service()
                            
                            # 下载并处理MinerU结果
                            result = mineru_service.fetch_markdown_content_and_upload(
                                result_url=mineru_status["full_zip_url"],
                                paper_id=paper_id,
                                qiniu_service=qiniu_service
                            )
                            
                            if result["success"]:
                                # 检查result中是否有attachments键
                                if "attachments" not in result:
                                    logger.error(f"MinerU结果中缺少attachments键: {result}")
                                    # 更新任务状态为失败
                                    task_model.update_task_status(
                                        task_id=latest_task["id"],
                                        status="failed",
                                        message="MinerU结果格式错误：缺少attachments键"
                                    )
                                    return
                                
                                # 更新论文附件
                                new_attachments = result.get("attachments")
                                if new_attachments is None:
                                    logger.error(f"MinerU结果中attachments为None: {result}")
                                    # 更新任务状态为失败
                                    task_model.update_task_status(
                                        task_id=latest_task["id"],
                                        status="failed",
                                        message="MinerU结果格式错误：attachments为None"
                                    )
                                    return
                                
                                # 从任务记录中获取用户ID
                                task_record = task_model.get_task(latest_task["id"])
                                if not task_record:
                                    logger.error(f"无法找到任务记录: {latest_task['id']}")
                                    task_model.update_task_status(
                                        task_id=latest_task["id"],
                                        status="failed",
                                        message="无法找到任务记录"
                                    )
                                    return
                                
                                user_id = task_record.get("userId")
                                if not user_id:
                                    logger.error(f"任务记录中缺少用户ID: {latest_task['id']}")
                                    task_model.update_task_status(
                                        task_id=latest_task["id"],
                                        status="failed",
                                        message="任务记录中缺少用户ID"
                                    )
                                    return
                                
                                # 获取当前论文附件
                                paper_result = service.get_admin_paper_detail(
                                    paper_id=paper_id,
                                    user_id=user_id
                                )
                                
                                if paper_result["code"] == BusinessCode.SUCCESS:
                                    paper = paper_result["data"]
                                    current_attachments = paper.get("attachments", {})
                                    
                                    # 合并附件信息 - 确保正确更新每个附件类型
                                    for attachment_type, attachment_data in new_attachments.items():
                                        if attachment_data:  # 只更新非空的附件
                                            current_attachments[attachment_type] = attachment_data
                                    
                                    # 更新论文附件
                                    service.update_paper_attachments(
                                        paper_id=paper_id,
                                        attachments=current_attachments,
                                        user_id=user_id,
                                        is_admin=True
                                    )
                                    
                                    # 更新任务状态为完成
                                    task_model.update_task_status(
                                        task_id=latest_task["id"],
                                        status="completed",
                                        progress=100,
                                        message="PDF解析完成，结果已上传"
                                    )
                                else:
                                    # 更新任务状态为失败
                                    task_model.update_task_status(
                                        task_id=latest_task["id"],
                                        status="failed",
                                        message="更新论文附件失败"
                                    )
                            else:
                                # 更新任务状态为失败
                                task_model.update_task_status(
                                    task_id=latest_task["id"],
                                    status="failed",
                                    message=f"处理解析结果失败: {result['error']}",
                                    error=result["error"]
                                )
                        except Exception as e:
                            logger.error(f"处理MinerU结果异常: {str(e)}", exc_info=True)
                            # 更新任务状态为失败
                            task_model.update_task_status(
                                task_id=latest_task["id"],
                                status="failed",
                                message=f"处理解析结果异常: {str(e)}",
                                error=str(e)
                            )
                    
                    # 提交后台任务
                    task_manager.submit_task(
                        task_id=f"process_mineru_{latest_task['id']}",
                        func=process_mineru_result,
                        callback=lambda task_id, result: None
                    )
        
        return success_response({
            "hasTask": True,
            "task": latest_task
        }, "获取PDF解析状态成功")
    
    except Exception as exc:
        logger.error(f"获取管理员论文PDF解析状态异常 - paper_id: {paper_id}, error: {str(exc)}", exc_info=True)
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/user/<user_paper_id>/pdf-parse-tasks", methods=["GET"])
@login_required
def get_user_paper_pdf_parse_tasks(user_paper_id):
    """
    获取用户论文PDF解析任务列表
    """
    try:
        logger.info(f"获取用户论文PDF解析任务列表 - user_paper_id: {user_paper_id}, user_id: {g.current_user['user_id']}")
        
        # 验证用户论文是否存在
        service = get_user_paper_service()
        result = service.get_user_paper_detail(
            user_paper_id=user_paper_id,
            user_id=g.current_user["user_id"]
        )
        
        if result["code"] != BusinessCode.SUCCESS:
            return bad_request_response(result["message"])
        
        # 获取PDF解析任务
        from ..models.pdfParseTask import get_pdf_parse_task_model
        task_model = get_pdf_parse_task_model()
        
        tasks = task_model.get_paper_tasks(
            paper_id=user_paper_id,
            is_admin=False
        )
        
        return success_response({
            "tasks": tasks
        }, "获取PDF解析任务列表成功")
    
    except Exception as exc:
        logger.error(f"获取用户论文PDF解析任务列表异常 - user_paper_id: {user_paper_id}, error: {str(exc)}", exc_info=True)
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/admin/<paper_id>/pdf-parse-tasks", methods=["GET"])
@login_required
def get_admin_paper_pdf_parse_tasks(paper_id):
    """
    获取管理员论文PDF解析任务列表
    """
    try:
        logger.info(f"获取管理员论文PDF解析任务列表 - paper_id: {paper_id}, user_id: {g.current_user['user_id']}")
        
        # 验证管理员论文是否存在
        service = get_paper_service()
        result = service.get_admin_paper_detail(
            paper_id=paper_id,
            user_id=g.current_user["user_id"]
        )
        
        if result["code"] != BusinessCode.SUCCESS:
            return bad_request_response(result["message"])
        
        # 获取PDF解析任务
        from ..models.pdfParseTask import get_pdf_parse_task_model
        task_model = get_pdf_parse_task_model()
        
        tasks = task_model.get_paper_tasks(
            paper_id=paper_id,
            is_admin=True
        )
        
        return success_response({
            "tasks": tasks
        }, "获取PDF解析任务列表成功")
    
    except Exception as exc:
        logger.error(f"获取管理员论文PDF解析任务列表异常 - paper_id: {paper_id}, error: {str(exc)}", exc_info=True)
        return internal_error_response(f"服务器错误: {exc}")


def allowed_file(filename, allowed_extensions=None):
    """
    检查文件扩展名是否允许
    
    Args:
        filename: 文件名
        allowed_extensions: 允许的扩展名列表，默认为图片格式
        
    Returns:
        是否允许上传
    """
    if allowed_extensions is None:
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf'}
    
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions