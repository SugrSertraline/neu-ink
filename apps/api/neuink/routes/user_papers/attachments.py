# user_papers/attachments.py
import json
import logging
import time
import uuid

from flask import request, g, jsonify

from neuink.services import paperService

from ...services.userPaperService import get_user_paper_service
from ...models.paper import PaperModel
from ...utils.auth import login_required
from ...utils.common import (
    success_response,
    bad_request_response,
    internal_error_response,
)
from ...config.constants import BusinessCode, ResponseCode
from . import bp

logger = logging.getLogger(__name__)


@bp.route("/<entry_id>/attachments", methods=["PUT"])
@login_required
def update_user_paper_attachments(entry_id):
    """
    更新个人论文附件
    """
    try:
        data = request.get_json()
        if not data or "attachments" not in data:
            return bad_request_response("attachments字段不能为空")

        attachments = data.get("attachments")

        if not isinstance(attachments, dict):
            return bad_request_response("attachments必须是对象")

        for attachment_type in ["pdf", "markdown"]:
            if attachment_type in attachments:
                attachment = attachments[attachment_type]
                if not isinstance(attachment, dict):
                    return bad_request_response(f"{attachment_type}附件必须是对象")

                required_fields = ["url", "key", "size", "uploadedAt"]
                for field in required_fields:
                    if field not in attachment:
                        return bad_request_response(f"{attachment_type}附件缺少{field}字段")

        service = get_user_paper_service()
        user_paper_result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"],
        )

        if user_paper_result["code"] != BusinessCode.SUCCESS:
            if user_paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(user_paper_result["message"])
            elif user_paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                return (
                    jsonify(
                        {
                            "code": ResponseCode.FORBIDDEN,
                            "message": user_paper_result["message"],
                            "data": None,
                        }
                    ),
                    ResponseCode.FORBIDDEN,
                )
            else:
                return bad_request_response(user_paper_result["message"])

        user_paper = user_paper_result["data"]

        if not user_paper:
            return bad_request_response("论文数据不存在")

        paper_id = user_paper.get("id")
        if not paper_id:
            return bad_request_response("无效的论文ID")

        from ...services.paperService import get_paper_service

        paper_service_ = get_paper_service()
        result = paper_service_.update_paper_attachments(
            paper_id=paper_id,
            attachments=attachments,
            user_id=g.current_user["user_id"],
            is_admin=False,
        )

        if result["code"] == BusinessCode.SUCCESS:
            updated_paper = result["data"]
            update_result = service.update_user_paper(
                entry_id=entry_id,
                user_id=g.current_user["user_id"],
                update_data={"attachments": updated_paper.get("attachments", {})},
            )

            if update_result["code"] == BusinessCode.SUCCESS:
                return success_response(updated_paper, "附件更新成功")
            else:
                return internal_error_response("更新用户论文库失败")

        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return bad_request_response(result["message"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return bad_request_response(result["message"])
        return internal_error_response(result["message"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<entry_id>/attachments/<attachment_type>", methods=["DELETE"])
@login_required
def delete_user_paper_attachment(entry_id, attachment_type):
    """
    删除个人论文附件（pdf 或 markdown）
    """
    try:
        if attachment_type not in ["pdf", "markdown"]:
            return bad_request_response("附件类型只能是pdf或markdown")

        service = get_user_paper_service()
        user_paper_result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"],
        )

        if user_paper_result["code"] != BusinessCode.SUCCESS:
            if user_paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(user_paper_result["message"])
            elif user_paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                return (
                    jsonify(
                        {
                            "code": ResponseCode.FORBIDDEN,
                            "message": user_paper_result["message"],
                            "data": None,
                        }
                    ),
                    ResponseCode.FORBIDDEN,
                )
            else:
                return bad_request_response(user_paper_result["message"])

        user_paper = user_paper_result["data"]

        if not user_paper:
            return bad_request_response("论文数据不存在")

        paper_id = user_paper.get("id")
        if not paper_id:
            return bad_request_response("无效的论文ID")

        from ...services.paperService import get_paper_service

        paper_service_ = get_paper_service()
        result = paper_service_.delete_paper_attachment(
            paper_id=paper_id,
            attachment_type=attachment_type,
            user_id=g.current_user["user_id"],
            is_admin=False,
        )

        if result["code"] == BusinessCode.SUCCESS:
            updated_paper = result["data"]
            update_result = service.update_user_paper(
                entry_id=entry_id,
                user_id=g.current_user["user_id"],
                update_data={"attachments": updated_paper.get("attachments", {})},
            )

            if update_result["code"] == BusinessCode.SUCCESS:
                return success_response(updated_paper, "附件删除成功")
            else:
                return internal_error_response("更新用户论文库失败")

        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return bad_request_response(result["message"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return bad_request_response(result["message"])
        return internal_error_response(result["message"])

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<entry_id>/upload-pdf", methods=["POST"])
@login_required
def upload_user_paper_pdf(entry_id):
    """
    上传个人论文 PDF 附件并自动解析为 Markdown
    """
    try:
        service = get_user_paper_service()
        user_paper_result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"],
        )

        if user_paper_result["code"] != BusinessCode.SUCCESS:
            if user_paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(user_paper_result["message"])
            elif user_paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                return (
                    jsonify(
                        {
                            "code": ResponseCode.FORBIDDEN,
                            "message": user_paper_result["message"],
                            "data": None,
                        }
                    ),
                    ResponseCode.FORBIDDEN,
                )
            else:
                return bad_request_response(user_paper_result["message"])

        user_paper = user_paper_result["data"]

        if not user_paper:
            return bad_request_response("论文数据不存在")

        paper_id = user_paper.get("id")
        if not paper_id:
            return bad_request_response("无效的论文ID")

        if "file" not in request.files:
            return bad_request_response("没有选择文件")

        file = request.files["file"]

        if file.filename == "":
            return bad_request_response("没有选择文件")

        if file.content_type != "application/pdf":
            return bad_request_response("请选择PDF文件")

        from ...services.qiniuService import get_qiniu_service

        qiniu_service = get_qiniu_service()
        file_data = file.read()

        max_size = 50 * 1024 * 1024
        if len(file_data) > max_size:
            return bad_request_response(f"文件大小超过限制，最大允许 {max_size // (1024*1024)}MB")

        upload_result = qiniu_service.upload_file_data(
            file_data=file_data,
            file_extension=".pdf",
            file_type="unified_paper",
            filename=f"{paper_id}.pdf",
            paper_id=paper_id,
        )

        if upload_result["success"]:
            from ...services.paperService import get_paper_service

            paper_service_ = get_paper_service()

            attachments = user_paper.get("attachments", {})
            attachments["pdf"] = {
                "url": upload_result["url"],
                "key": upload_result["key"],
                "size": upload_result["size"],
                "uploadedAt": upload_result["uploadedAt"],
            }

            result = paper_service_.update_paper_attachments(
                paper_id=paper_id,
                attachments=attachments,
                user_id=g.current_user["user_id"],
                is_admin=False,
            )

            if result["code"] == BusinessCode.SUCCESS:
                updated_paper = result["data"]
                update_result = service.update_user_paper(
                    entry_id=entry_id,
                    user_id=g.current_user["user_id"],
                    update_data={"attachments": updated_paper.get("attachments", {})},
                )

                if update_result["code"] == BusinessCode.SUCCESS:
                    # 自动触发PDF解析为Markdown
                    try:
                        from ...services.mineruService import get_mineru_service
                        from ...models.pdfParseTask import get_pdf_parse_task_model
                        
                        mineru_service = get_mineru_service()
                        task_model = get_pdf_parse_task_model()
                        
                        if mineru_service.is_configured():
                            # 检查是否已有进行中的解析任务
                            existing_tasks = task_model.get_paper_tasks(paper_id, is_admin=False)
                            has_pending_task = any(
                                task["status"] in ["pending", "processing"]
                                for task in existing_tasks
                            )
                            
                            if not has_pending_task:
                                # 创建解析任务
                                task = task_model.create_task(
                                    paper_id=paper_id,
                                    user_id=g.current_user["user_id"],
                                    pdf_url=upload_result["url"],
                                    is_admin=False,
                                    user_paper_id=entry_id,
                                )
                                
                                # 提交MinerU解析任务
                                submit_result = mineru_service.submit_parsing_task(upload_result["url"])
                                
                                if submit_result["success"]:
                                    # 更新任务状态为处理中
                                    task_model.update_task_status(
                                        task_id=task["id"],
                                        status="processing",
                                        progress=10,
                                        message="PDF解析任务已提交，正在处理中...",
                                        mineru_task_id=submit_result["task_id"],
                                    )
                                    
                                    # 启动后台任务监控解析进度
                                    from ...utils.background_tasks import get_task_manager
                                    task_manager = get_task_manager()
                                    current_user_id = g.current_user["user_id"]
                                    
                                    def background_pdf_parsing():
                                        try:
                                            try:
                                                from flask import current_app
                                                app_context = current_app.app_context()
                                            except (RuntimeError, ImportError):
                                                from neuink import create_app
                                                app = create_app()
                                                app_context = app.app_context()
                                            
                                            with app_context:
                                                try:
                                                    from flask import g as flask_g
                                                    flask_g.current_user = {"user_id": current_user_id}
                                                except Exception:
                                                    pass
                                                
                                                max_wait_time = 300
                                                start_time = time.time()
                                                
                                                while time.time() - start_time < max_wait_time:
                                                    status_result = mineru_service.get_parsing_status(submit_result["task_id"])
                                                    
                                                    if not status_result["success"]:
                                                        task_model.update_task_status(
                                                            task_id=task["id"],
                                                            status="failed",
                                                            error=status_result["error"],
                                                        )
                                                        break
                                                    
                                                    status = status_result["status"]
                                                    
                                                    if status == "processing":
                                                        task_model.update_task_status(
                                                            task_id=task["id"],
                                                            status="processing",
                                                            progress=50,
                                                            message="PDF解析中...",
                                                        )
                                                    elif status == "completed":
                                                        full_zip_url = status_result.get("full_zip_url")
                                                        
                                                        if not full_zip_url:
                                                            task_model.update_task_status(
                                                                task_id=task["id"],
                                                                status="failed",
                                                                error="解析完成但未获取到ZIP文件URL",
                                                            )
                                                            break
                                                        
                                                        result = mineru_service.fetch_markdown_content_and_upload(
                                                            result_url=full_zip_url,
                                                            paper_id=paper_id,
                                                            qiniu_service=qiniu_service,
                                                        )
                                                        
                                                        if result["success"]:
                                                            markdown_content = result["markdown_content"]
                                                            attachments_data = result.get("attachments", {})
                                                            
                                                            # 更新所有附件类型
                                                            if attachments_data.get("markdown"):
                                                                attachments["markdown"] = attachments_data["markdown"]
                                                            
                                                            if attachments_data.get("content_list"):
                                                                attachments["content_list"] = attachments_data["content_list"]
                                                            
                                                            if attachments_data.get("model"):
                                                                attachments["model"] = attachments_data["model"]
                                                            
                                                            if attachments_data.get("layout"):
                                                                attachments["layout"] = attachments_data["layout"]
                                                            
                                                            # 更新论文附件
                                                            update_result = paper_service_.update_paper_attachments(
                                                                paper_id=paper_id,
                                                                attachments=attachments,
                                                                user_id=current_user_id,
                                                                is_admin=False,
                                                            )
                                                            
                                                            if update_result["code"] == BusinessCode.SUCCESS:
                                                                updated_paper_data = paper_service_.get_paper_by_id(
                                                                    paper_id=paper_id,
                                                                    user_id=current_user_id,
                                                                    is_admin=False,
                                                                )
                                                                
                                                                if updated_paper_data["code"] == BusinessCode.SUCCESS:
                                                                    service.update_user_paper(
                                                                        entry_id=entry_id,
                                                                        user_id=current_user_id,
                                                                        update_data={
                                                                            "attachments": updated_paper_data["data"].get("attachments", {}),
                                                                            "metadata": updated_paper_data["data"].get("metadata", {}),
                                                                            "abstract": updated_paper_data["data"].get("abstract"),
                                                                            "keywords": updated_paper_data["data"].get("keywords", []),
                                                                            "references": updated_paper_data["data"].get("references", []),
                                                                        },
                                                                    )
                                                                else:
                                                                    service.update_user_paper(
                                                                        entry_id=entry_id,
                                                                        user_id=current_user_id,
                                                                        update_data={"attachments": attachments},
                                                                    )
                                                            
                                                            task_model.update_task_status(
                                                                task_id=task["id"],
                                                                status="completed",
                                                                progress=100,
                                                                message="PDF解析完成并已上传Markdown文件",
                                                                markdown_content=markdown_content,
                                                            )
                                                            
                                                            task_model.update_markdown_attachment(
                                                                task_id=task["id"],
                                                                attachment_info=attachments["markdown"],
                                                            )
                                                        else:
                                                            task_model.update_task_status(
                                                                task_id=task["id"],
                                                                status="failed",
                                                                error=result["error"],
                                                            )
                                                        break
                                                    elif status == "failed":
                                                        task_model.update_task_status(
                                                            task_id=task["id"],
                                                            status="failed",
                                                            error=status_result.get("message", "PDF解析失败"),
                                                        )
                                                        break
                                                    
                                                    time.sleep(5)
                                                else:
                                                    task_model.update_task_status(
                                                        task_id=task["id"],
                                                        status="failed",
                                                        error="PDF解析超时",
                                                    )
                                        
                                        except Exception as e:
                                            logger.error(f"后台PDF解析任务异常: {str(e)}")
                                            task_model.update_task_status(
                                                task_id=task["id"],
                                                status="failed",
                                                error=f"后台任务异常: {str(e)}",
                                            )
                                    
                                    task_manager.submit_task(
                                        task_id=task["id"],
                                        func=background_pdf_parsing,
                                        callback=lambda task_id, result: None,
                                    )
                                    
                                    return success_response(
                                        updated_paper,
                                        "PDF上传成功，正在自动解析为Markdown，请稍后查看解析进度"
                                    )
                                else:
                                    # 提交解析任务失败，但仍返回PDF上传成功
                                    task_model.update_task_status(
                                        task_id=task["id"],
                                        status="failed",
                                        error=submit_result["error"],
                                    )
                                    return success_response(
                                        updated_paper,
                                        "PDF上传成功，但自动解析任务提交失败，您可以稍后手动重试解析"
                                    )
                            else:
                                # 已有进行中的任务，只返回PDF上传成功
                                return success_response(
                                    updated_paper,
                                    "PDF上传成功，检测到已有解析任务在进行中"
                                )
                        else:
                            # MinerU服务未配置，只返回PDF上传成功
                            return success_response(
                                updated_paper,
                                "PDF上传成功，但解析服务未配置，请联系管理员"
                            )
                    except Exception as e:
                        logger.error(f"自动触发PDF解析失败: {str(e)}")
                        # 解析触发失败，但仍返回PDF上传成功
                        return success_response(
                            updated_paper,
                            "PDF上传成功，但自动解析触发失败，您可以稍后手动重试解析"
                        )
                else:
                    return internal_error_response("更新用户论文库失败")
            else:
                return bad_request_response(result["message"])
        else:
            return internal_error_response(f"PDF上传失败: {upload_result['error']}")

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


# Markdown上传功能已移除，现在PDF上传会自动解析为Markdown


# PDF解析Markdown功能已移除，现在PDF上传会自动解析为Markdown


@bp.route("/<entry_id>/pdf-parse-tasks/<task_id>", methods=["GET"])
@login_required
def get_user_paper_pdf_parse_task_status(entry_id, task_id):
    """
    获取PDF解析任务状态
    """
    try:
        from ...models.pdfParseTask import get_pdf_parse_task_model

        task_model = get_pdf_parse_task_model()

        task = task_model.get_task(task_id)
        if not task:
            return bad_request_response("解析任务不存在")

        if task["userPaperId"] != entry_id:
            return bad_request_response("任务不属于该用户论文")

        if task["userId"] != g.current_user["user_id"]:
            return bad_request_response("无权限访问此任务")

        return success_response(task, "获取解析任务状态成功")

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<entry_id>/pdf-parse-tasks", methods=["GET"])
@login_required
def get_user_paper_pdf_parse_tasks(entry_id):
    """
    获取用户论文的所有PDF解析任务
    """
    try:
        service = get_user_paper_service()
        user_paper_result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"],
        )

        if user_paper_result["code"] != BusinessCode.SUCCESS:
            if user_paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(user_paper_result["message"])
            elif user_paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                return (
                    jsonify(
                        {
                            "code": ResponseCode.FORBIDDEN,
                            "message": user_paper_result["message"],
                            "data": None,
                        }
                    ),
                    ResponseCode.FORBIDDEN,
                )
            else:
                return bad_request_response(user_paper_result["message"])

        user_paper = user_paper_result["data"]

        from ...models.pdfParseTask import get_pdf_parse_task_model

        task_model = get_pdf_parse_task_model()

        tasks = task_model.get_paper_tasks(user_paper.get("id"), is_admin=False)

        return success_response({"tasks": tasks}, "获取解析任务列表成功")

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/create-from-pdf", methods=["POST"])
@login_required
def create_user_paper_from_pdf():
    """
    用户通过PDF创建个人论文
    """
    try:
        if "file" not in request.files:
            return bad_request_response("没有选择文件")

        file = request.files["file"]

        if file.filename == "":
            return bad_request_response("没有选择文件")

        if file.content_type != "application/pdf":
            return bad_request_response("请选择PDF文件")

        extra_data = {}
        if request.form.get("extra"):
            try:
                extra_data = json.loads(request.form.get("extra"))
            except json.JSONDecodeError:
                return bad_request_response("extra字段格式错误，应为JSON字符串")

        file_data = file.read()

        max_size = 50 * 1024 * 1024
        if len(file_data) > max_size:
            return bad_request_response(f"文件大小超过限制，最大允许 {max_size // (1024*1024)}MB")

        from ...utils.common import get_current_time

        paper_data = {
            "metadata": {
                "title": "解析中.....",
                "titleZh": "解析中.....",
                "authors": [],
                "year": None,
                "journal": None,
                "abstract": "正在解析PDF文件，请稍候.....",
                "abstractZh": "正在解析PDF文件，请稍候.....",
                "keywords": [],
                "keywordsZh": [],
            },
            "abstract": {
                "en": "正在解析PDF文件，请稍候...",
                "zh": "正在解析PDF文件，请稍候...",
            },
            "keywords": [],
            "sections": [],  # 不再使用sections数据，改为空数组
            "references": [],
            "attachments": {},
            "isPublic": False,
            "parseStatus": "parsing",
            "createdAt": get_current_time(),
            "updatedAt": get_current_time(),
        }

        temp_paper_id = str(uuid.uuid4())

        from ...services.qiniuService import get_qiniu_service

        qiniu_service = get_qiniu_service()

        upload_result = qiniu_service.upload_file_data(
            file_data=file_data,
            file_extension=".pdf",
            file_type="unified_paper",
            filename=f"{temp_paper_id}.pdf",
            paper_id=temp_paper_id,
        )

        if not upload_result["success"]:
            return internal_error_response(f"PDF上传失败: {upload_result['error']}")

        paper_data["attachments"] = {
            "pdf": {
                "url": upload_result["url"],
                "key": upload_result["key"],
                "size": upload_result["size"],
                "uploadedAt": upload_result["uploadedAt"],
            }
        }

        from ...services.userPaperService import get_user_paper_service

        user_paper_service = get_user_paper_service()

        user_paper_result = user_paper_service.add_uploaded_paper(
            user_id=g.current_user["user_id"],
            paper_data=paper_data,
            extra=extra_data,
        )

        if user_paper_result["code"] != BusinessCode.SUCCESS:
            qiniu_service.delete_file(upload_result["key"])
            return bad_request_response(f"添加到个人论文库失败: {user_paper_result['message']}")

        from ...services.mineruService import get_mineru_service
        from ...models.pdfParseTask import get_pdf_parse_task_model

        mineru_service = get_mineru_service()
        task_model = get_pdf_parse_task_model()

        if not mineru_service.is_configured():
            return success_response(
                {
                    "userPaper": user_paper_result["data"],
                    "message": "论文创建成功，但PDF解析服务未配置，请手动上传Markdown文件或联系管理员配置解析服务",
                },
                "论文创建成功",
            )

        task = task_model.create_task(
            paper_id=user_paper_result["data"]["id"],
            user_id=g.current_user["user_id"],
            pdf_url=upload_result["url"],
            is_admin=False,
            user_paper_id=user_paper_result["data"]["id"],
        )

        try:
            submit_result = mineru_service.submit_parsing_task(upload_result["url"])

            if not submit_result["success"]:
                task_model.update_task_status(
                    task_id=task["id"],
                    status="failed",
                    error=submit_result["error"],
                )
                return success_response(
                    {
                        "userPaper": user_paper_result["data"],
                        "taskId": task["id"],
                        "message": f"论文创建成功，但PDF解析任务提交失败: {submit_result['error']}，您可以稍后手动重试解析",
                    },
                    "论文创建成功",
                )

            task_model.update_task_status(
                task_id=task["id"],
                status="processing",
                progress=10,
                message="PDF解析任务已提交，正在处理中.....",
                mineru_task_id=submit_result["task_id"],
            )

            from ...utils.background_tasks import get_task_manager

            task_manager = get_task_manager()
            current_user_id = g.current_user["user_id"]

            def background_pdf_parsing():
                try:
                    try:
                        from flask import current_app

                        app_context = current_app.app_context()
                    except (RuntimeError, ImportError):
                        from neuink import create_app

                        app = create_app()
                        app_context = app.app_context()

                    with app_context:
                        from flask import g as flask_g

                        flask_g.current_user = {"user_id": current_user_id}

                        max_wait_time = 600
                        start_time = time.time()

                        from ...services.qiniuService import get_qiniu_service

                        qiniu_service_ = get_qiniu_service()

                        while time.time() - start_time < max_wait_time:
                            status_result = mineru_service.get_parsing_status(submit_result["task_id"])

                            if not status_result["success"]:
                                task_model.update_task_status(
                                    task_id=task["id"],
                                    status="failed",
                                    error=status_result["error"],
                                )
                                break

                            status = status_result["status"]

                            if status == "processing":
                                task_model.update_task_status(
                                    task_id=task["id"],
                                    status="processing",
                                    progress=50,
                                    message="PDF解析中...",
                                )
                            elif status == "completed":
                                full_zip_url = status_result.get("full_zip_url")

                                if not full_zip_url:
                                    task_model.update_task_status(
                                        task_id=task["id"],
                                        status="failed",
                                        error="解析完成但未获取到ZIP文件URL",
                                    )
                                    break

                                result = mineru_service.fetch_markdown_content_and_upload(
                                    result_url=full_zip_url,
                                    paper_id=user_paper_result["data"]["id"],
                                    qiniu_service=qiniu_service_,
                                )

                                if result["success"]:
                                    markdown_content = result["markdown_content"]
                                    attachments_data = result.get("attachments", {})

                                    user_paper_service_ = get_user_paper_service()
                                    current_user_paper = user_paper_service_.user_paper_model.find_by_id(
                                        user_paper_result["data"]["id"]
                                    )

                                    if current_user_paper:
                                        attachments = current_user_paper.get("attachments", {})
                                        
                                        # 更新所有附件类型
                                        if attachments_data.get("markdown"):
                                            attachments["markdown"] = attachments_data["markdown"]
                                        
                                        if attachments_data.get("content_list"):
                                            attachments["content_list"] = attachments_data["content_list"]
                                        
                                        if attachments_data.get("model"):
                                            attachments["model"] = attachments_data["model"]
                                        
                                        if attachments_data.get("layout"):
                                            attachments["layout"] = attachments_data["layout"]

                                        from ...services.paperService import get_paper_service

                                        paper_service_ = get_paper_service()
                                        paper_service_.update_paper_attachments(
                                            paper_id=user_paper_result["data"]["id"],
                                            attachments=attachments,
                                            user_id=current_user_id,
                                            is_admin=False,
                                        )

                                        try:
                                            parse_result = paperService.parse_paper_from_text(
                                                text=markdown_content
                                            )

                                            if parse_result["code"] == BusinessCode.SUCCESS:
                                                parsed_paper = parse_result["data"]

                                                update_data = {
                                                    "metadata": parsed_paper.get("metadata", {}),
                                                    "abstract": parsed_paper.get("abstract", ""),
                                                    "keywords": parsed_paper.get("keywords", []),
                                                    "sections": [],  # 不再使用sections数据，改为空数组
                                                    "references": parsed_paper.get("references", []),
                                                    "parseStatus": "completed",
                                                }

                                                paperService.update_paper(
                                                    paper_id=user_paper_result["data"]["id"],
                                                    update_data=update_data,
                                                    user_id=current_user_id,
                                                    is_admin=False,
                                                )

                                                updated_paper = paperService.get_paper_by_id(
                                                    paper_id=user_paper_result["data"]["id"],
                                                    user_id=current_user_id,
                                                    is_admin=False,
                                                )

                                                if updated_paper["code"] == BusinessCode.SUCCESS:
                                                    user_paper_service_.update_user_paper(
                                                        entry_id=user_paper_result["data"]["id"],
                                                        user_id=current_user_id,
                                                        update_data={
                                                            "attachments": updated_paper["data"].get(
                                                                "attachments", {}
                                                            ),
                                                            "metadata": updated_paper["data"].get("metadata", {}),
                                                            "abstract": updated_paper["data"].get("abstract"),
                                                            "keywords": updated_paper["data"].get(
                                                                "keywords", []
                                                            ),
                                                            "references": updated_paper["data"].get(
                                                                "references", []
                                                            ),
                                                        },
                                                    )

                                                task_model.update_task_status(
                                                    task_id=task["id"],
                                                    status="completed",
                                                    progress=100,
                                                    message="PDF解析完成并已更新论文内容",
                                                    markdown_content=markdown_content,
                                                )
                                            else:
                                                paperService.update_paper(
                                                    paper_id=user_paper_result["data"]["id"],
                                                    update_data={"parseStatus": "completed"},
                                                    user_id=current_user_id,
                                                    is_admin=False,
                                                )

                                                task_model.update_task_status(
                                                    task_id=task["id"],
                                                    status="completed",
                                                    progress=100,
                                                    message="PDF解析完成但内容解析失败，已上传Markdown文件",
                                                    markdown_content=markdown_content,
                                                )
                                        except Exception as e:
                                            logger.error(f"从Markdown创建论文内容失败: {str(e)}")
                                            user_paper_service_.update_user_paper(
                                                entry_id=user_paper_result["data"]["id"],
                                                user_id=current_user_id,
                                                update_data={"parseStatus": "completed"},
                                            )

                                            task_model.update_task_status(
                                                task_id=task["id"],
                                                status="completed",
                                                progress=100,
                                                message="PDF解析完成但内容解析失败，已上传Markdown文件",
                                                markdown_content=markdown_content,
                                            )
                                    else:
                                        task_model.update_task_status(
                                            task_id=task["id"],
                                            status="failed",
                                            error="上传Markdown文件失败",
                                        )
                                else:
                                    task_model.update_task_status(
                                        task_id=task["id"],
                                        status="failed",
                                        error=result["error"],
                                    )
                                break
                            elif status == "failed":
                                task_model.update_task_status(
                                    task_id=task["id"],
                                    status="failed",
                                    error=status_result.get("message", "PDF解析失败"),
                                )
                                break

                            time.sleep(10)
                        else:
                            task_model.update_task_status(
                                task_id=task["id"],
                                status="failed",
                                error="PDF解析超时",
                            )

                except Exception as e:
                    logger.error(f"后台PDF解析任务异常: {str(e)}")
                    task_model.update_task_status(
                        task_id=task["id"],
                        status="failed",
                        error=f"后台任务异常: {str(e)}",
                    )

            task_manager.submit_task(
                task_id=task["id"],
                func=background_pdf_parsing,
                callback=lambda task_id, result: None,
            )

            return success_response(
                {
                    "userPaper": user_paper_result["data"],
                    "taskId": task["id"],
                    "message": "论文创建成功，PDF解析任务已提交，请稍后查看解析进度",
                },
                "论文创建成功",
            )

        except Exception as e:
            logger.error(f"提交MinerU解析任务异常: {str(e)}")
            task_model.update_task_status(
                task_id=task["id"],
                status="failed",
                error=f"提交解析任务异常: {str(e)}",
            )
            return success_response(
                {
                    "userPaper": user_paper_result["data"],
                    "taskId": task["id"],
                    "message": f"论文创建成功，但PDF解析任务提交失败: {str(e)}，您可以稍后手动重试解析",
                },
                "论文创建成功",
            )

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<entry_id>/content-list", methods=["GET"])
@login_required
def get_user_paper_content_list(entry_id):
    """
    获取个人论文的 content_list.json 内容
    """
    try:
        service = get_user_paper_service()
        user_paper_result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"],
        )

        if user_paper_result["code"] != BusinessCode.SUCCESS:
            if user_paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(user_paper_result["message"])
            elif user_paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                return (
                    jsonify(
                        {
                            "code": ResponseCode.FORBIDDEN,
                            "message": user_paper_result["message"],
                            "data": None,
                        }
                    ),
                    ResponseCode.FORBIDDEN,
                )
            else:
                return bad_request_response(user_paper_result["message"])

        user_paper = user_paper_result["data"]
        attachments = user_paper.get("attachments", {})

        if not attachments.get("content_list") or not attachments["content_list"].get("url"):
            return bad_request_response("论文没有content_list文件")

        content_list_url = attachments["content_list"]["url"]

        from ...services.qiniuService import get_qiniu_service

        qiniu_service = get_qiniu_service()

        try:
            content_list_content = qiniu_service.fetch_file_content(content_list_url)
            if not content_list_content["success"]:
                return bad_request_response(f"获取content_list文件失败: {content_list_content['error']}")

            return success_response(
                {
                    "contentList": content_list_content["content"],
                    "attachment": attachments["content_list"],
                },
                "成功获取content_list文件",
            )

        except Exception as e:
            return internal_error_response(f"获取content_list文件异常: {str(e)}")

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<entry_id>/pdf-content", methods=["GET"])
@login_required
def get_user_paper_pdf_content_proxy(entry_id):
    """
    获取个人论文 PDF 内容（base64）
    """
    try:
        service = get_user_paper_service()
        user_paper_result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"],
        )

        if user_paper_result["code"] != BusinessCode.SUCCESS:
            if user_paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(user_paper_result["message"])
            elif user_paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                return (
                    jsonify(
                        {
                            "code": ResponseCode.FORBIDDEN,
                            "message": user_paper_result["message"],
                            "data": None,
                        }
                    ),
                    ResponseCode.FORBIDDEN,
                )
            else:
                return bad_request_response(user_paper_result["message"])

        user_paper = user_paper_result["data"]
        attachments = user_paper.get("attachments", {})

        if not attachments.get("pdf") or not attachments["pdf"].get("url"):
            return bad_request_response("论文没有PDF文件")

        pdf_url = attachments["pdf"]["url"]

        from ...services.qiniuService import get_qiniu_service

        qiniu_service = get_qiniu_service()

        try:
            logger.info("开始获取用户论文PDF文件内容...")
            logger.info(f"PDF URL: {pdf_url}")

            pdf_content = qiniu_service.fetch_file_content(pdf_url)
            logger.info(f"七牛云返回结果 - success: {pdf_content.get('success')}, size: {pdf_content.get('size', 0)} 字节")

            if not pdf_content["success"]:
                logger.error(f"获取PDF文件失败: {pdf_content['error']}")
                return bad_request_response(f"获取PDF文件失败: {pdf_content['error']}")

            logger.info(f"成功获取PDF内容，大小: {pdf_content.get('size', 0)} 字节")
            return success_response(
                {
                    "pdfContent": pdf_content["content"],
                    "attachment": attachments["pdf"],
                },
                "成功获取PDF文件",
            )

        except Exception as e:
            logger.error(f"获取PDF文件异常: {str(e)}")
            import traceback

            logger.error(f"异常详情: {traceback.format_exc()}")
            return internal_error_response(f"获取PDF文件异常: {str(e)}")

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<entry_id>/markdown-content", methods=["GET"])
@login_required
def get_user_paper_markdown_content_proxy(entry_id):
    """
    获取个人论文Markdown文件内容（以base64格式返回）
    
    返回数据示例:
    {
        "markdownContent": "base64编码的Markdown内容",
        "attachment": {...}   // Markdown附件信息
    }
    """
    try:
        service = get_user_paper_service()
        user_paper_result = service.get_user_paper_detail(
            user_paper_id=entry_id,
            user_id=g.current_user["user_id"]
        )

        if user_paper_result["code"] != BusinessCode.SUCCESS:
            if user_paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(user_paper_result["message"])
            elif user_paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                return (
                    jsonify(
                        {
                            "code": ResponseCode.FORBIDDEN,
                            "message": user_paper_result["message"],
                            "data": None,
                        }
                    ),
                    ResponseCode.FORBIDDEN,
                )
            else:
                return bad_request_response(user_paper_result["message"])

        user_paper = user_paper_result["data"]
        attachments = user_paper.get("attachments", {})

        if not attachments.get("markdown") or not attachments["markdown"].get("url"):
            return bad_request_response("论文没有Markdown文件")

        markdown_url = attachments["markdown"]["url"]

        from ...services.qiniuService import get_qiniu_service

        qiniu_service = get_qiniu_service()

        try:
            logger.info("开始获取用户论文Markdown文件内容...")
            logger.info(f"Markdown URL: {markdown_url}")

            markdown_content = qiniu_service.fetch_file_content(markdown_url)
            logger.info(f"七牛云返回结果 - success: {markdown_content.get('success')}, size: {markdown_content.get('size', 0)} 字节")

            if not markdown_content["success"]:
                logger.error(f"获取Markdown文件失败: {markdown_content['error']}")
                return bad_request_response(f"获取Markdown文件失败: {markdown_content['error']}")

            logger.info(f"成功获取Markdown内容，大小: {markdown_content.get('size', 0)} 字节")
            return success_response(
                {
                    "markdownContent": markdown_content["content"],
                    "attachment": attachments["markdown"],
                },
                "成功获取Markdown文件",
            )

        except Exception as e:
            logger.error(f"获取Markdown文件异常: {str(e)}")
            import traceback

            logger.error(f"异常详情: {traceback.format_exc()}")
            return internal_error_response(f"获取Markdown文件异常: {str(e)}")

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")
