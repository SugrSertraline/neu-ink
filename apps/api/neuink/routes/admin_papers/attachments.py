# neuink/api/admin_papers/attachments.py
import time
import json
import base64
import logging
import traceback

from flask import request, g, jsonify

from . import bp
from ...utils.auth import login_required, admin_required
from ...utils.common import (
    success_response,
    bad_request_response,
    internal_error_response,
    ResponseCode,
)
from ...config.constants import BusinessCode
from ...services.paperService import get_paper_service
from ...services.qiniuService import get_qiniu_service
from ...services.mineruService import get_mineru_service
from ...models.pdfParseTask import get_pdf_parse_task_model
from ...utils.background_tasks import get_task_manager

logger = logging.getLogger(__name__)


@bp.route("/<paper_id>/attachments", methods=["PUT"])
@login_required
@admin_required
def update_paper_attachments(paper_id):
    """
    管理员更新论文附件
    
    请求体示例:
    {
        "attachments": {
            "pdf": {
                "url": "https://your-domain.com/neuink/pdf/12345678_abc123.pdf",
                "key": "neuink/pdf/12345678_abc123.pdf",
                "size": 1024000,
                "uploadedAt": "2023-12-01T10:00:00.000Z"
            },
            "markdown": {
                "url": "https://your-domain.com/neuink/markdown/12345678_abc123.md",
                "key": "neuink/markdown/12345678_abc123.md",
                "size": 102400,
                "uploadedAt": "2023-12-01T10:00:00.000Z"
            }
        }
    }
    """
    try:
        data = request.get_json()
        if not data or "attachments" not in data:
            return bad_request_response("attachments字段不能为空")

        attachments = data.get("attachments")

        # 验证attachments结构
        if not isinstance(attachments, dict):
            return bad_request_response("attachments必须是对象")

        # 验证PDF和Markdown附件结构
        for attachment_type in ["pdf", "markdown"]:
            if attachment_type in attachments:
                attachment = attachments[attachment_type]
                if not isinstance(attachment, dict):
                    return bad_request_response(f"{attachment_type}附件必须是对象")

                required_fields = ["url", "key", "size", "uploadedAt"]
                for field in required_fields:
                    if field not in attachment:
                        return bad_request_response(f"{attachment_type}附件缺少{field}字段")

        service = get_paper_service()
        result = service.update_paper_attachments(
            paper_id=paper_id,
            attachments=attachments,
            user_id=g.current_user["user_id"],
            is_admin=True
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return success_response(result["data"], result["message"], result["code"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return success_response(result["data"], result["message"], result["code"])
        return internal_error_response(result["message"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<paper_id>/attachments/<attachment_type>", methods=["DELETE"])
@login_required
@admin_required
def delete_paper_attachment(paper_id, attachment_type):
    """
    管理员删除论文附件
    
    参数:
    attachment_type: 附件类型 (pdf 或 markdown)
    """
    try:
        if attachment_type not in ["pdf", "markdown"]:
            return bad_request_response("附件类型只能是pdf或markdown")

        service = get_paper_service()
        result = service.delete_paper_attachment(
            paper_id=paper_id,
            attachment_type=attachment_type,
            user_id=g.current_user["user_id"],
            is_admin=True
        )

        if result["code"] == BusinessCode.SUCCESS:
            return success_response(result["data"], result["message"])
        if result["code"] == BusinessCode.PAPER_NOT_FOUND:
            return success_response(result["data"], result["message"], result["code"])
        if result["code"] == BusinessCode.PERMISSION_DENIED:
            return success_response(result["data"], result["message"], result["code"])
        return internal_error_response(result["message"])
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<paper_id>/upload-pdf", methods=["POST"])
@login_required
@admin_required
def upload_admin_paper_pdf(paper_id):
    """
    管理员上传论文PDF附件并自动解析为Markdown
    
    请求格式: multipart/form-data
    参数:
        file: PDF文件
    """
    try:
        # 首先获取论文详情，确保管理员有权限
        service = get_paper_service()
        paper_result = service.get_admin_paper_detail(
            paper_id=paper_id,
            user_id=g.current_user["user_id"]
        )

        if paper_result["code"] != BusinessCode.SUCCESS:
            if paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(paper_result["message"])
            elif paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                return jsonify({
                    "code": ResponseCode.FORBIDDEN,
                    "message": paper_result["message"],
                    "data": None
                }), ResponseCode.FORBIDDEN
            else:
                return bad_request_response(paper_result["message"])

        paper_data = paper_result["data"]

        # 检查是否有文件上传
        if 'file' not in request.files:
            return bad_request_response("没有选择文件")

        file = request.files['file']

        # 检查文件名是否为空
        if file.filename == '':
            return bad_request_response("没有选择文件")

        # 检查文件类型
        if file.content_type != 'application/pdf':
            return bad_request_response("请选择PDF文件")

        # 读取文件数据
        file_data = file.read()

        # 检查文件大小（50MB限制）
        max_size = 50 * 1024 * 1024  # 50MB
        if len(file_data) > max_size:
            return bad_request_response(f"文件大小超过限制，最大允许 {max_size // (1024*1024)}MB")

        # 导入上传服务
        qiniu_service = get_qiniu_service()

        # 上传文件到七牛云，使用统一目录结构
        upload_result = qiniu_service.upload_file_data(
            file_data=file_data,
            file_extension=".pdf",
            file_type="unified_paper",
            filename=f"{paper_id}.pdf",
            paper_id=paper_id
        )

        if upload_result["success"]:
            # 使用paperService更新附件
            paper_service = get_paper_service()

            # 构建附件数据
            attachments = paper_data.get("attachments", {})
            attachments["pdf"] = {
                "url": upload_result["url"],
                "key": upload_result["key"],
                "size": upload_result["size"],
                "uploadedAt": upload_result["uploadedAt"]
            }

            # 更新论文附件
            result = paper_service.update_paper_attachments(
                paper_id=paper_id,
                attachments=attachments,
                user_id=g.current_user["user_id"],
                is_admin=True
            )

            if result["code"] == BusinessCode.SUCCESS:
                # 自动触发PDF解析为Markdown
                try:
                    mineru_service = get_mineru_service()
                    task_model = get_pdf_parse_task_model()
                    
                    if mineru_service.is_configured():
                        # 检查是否已有进行中的解析任务
                        existing_tasks = task_model.get_paper_tasks(paper_id, is_admin=True)
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
                                is_admin=True
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
                                                        
                                                        # 获取论文详情并更新附件
                                                        paper_result = paper_service.get_admin_paper_detail(
                                                            paper_id=paper_id,
                                                            user_id=current_user_id
                                                        )
                                                        
                                                        if paper_result["code"] == BusinessCode.SUCCESS:
                                                            paper_data = paper_result["data"]
                                                            attachments = paper_data.get("attachments", {})
                                                            
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
                                                            update_result = paper_service.update_paper_attachments(
                                                                paper_id=paper_id,
                                                                attachments=attachments,
                                                                user_id=current_user_id,
                                                                is_admin=True
                                                            )
                                                            
                                                            if update_result["code"] == BusinessCode.SUCCESS:
                                                                # 更新任务状态为完成
                                                                task_model.update_task_status(
                                                                    task_id=task["id"],
                                                                    status="completed",
                                                                    progress=100,
                                                                    message="PDF解析完成并已上传Markdown文件",
                                                                    markdown_content=markdown_content
                                                                )
                                                                
                                                                # 更新附件信息
                                                                if attachments.get("markdown"):
                                                                    task_model.update_markdown_attachment(
                                                                        task_id=task["id"],
                                                                        attachment_info=attachments["markdown"]
                                                                    )
                                                            else:
                                                                # 更新任务状态为失败
                                                                task_model.update_task_status(
                                                                    task_id=task["id"],
                                                                    status="failed",
                                                                    error="上传Markdown文件后更新论文附件失败"
                                                                )
                                                    else:
                                                        task_model.update_task_status(
                                                            task_id=task["id"],
                                                            status="failed",
                                                            error=result["error"]
                                                        )
                                                    break
                                                elif status == "failed":
                                                    task_model.update_task_status(
                                                        task_id=task["id"],
                                                        status="failed",
                                                        error=status_result.get("message", "PDF解析失败")
                                                    )
                                                    break
                                                
                                                time.sleep(5)
                                            else:
                                                task_model.update_task_status(
                                                    task_id=task["id"],
                                                    status="failed",
                                                    error="PDF解析超时"
                                                )
                                    
                                    except Exception as e:
                                        logger.error(f"后台PDF解析任务异常: {str(e)}")
                                        task_model.update_task_status(
                                            task_id=task["id"],
                                            status="failed",
                                            error=f"后台任务异常: {str(e)}"
                                        )
                                
                                task_manager.submit_task(
                                    task_id=task["id"],
                                    func=background_pdf_parsing,
                                    callback=lambda task_id, result: None
                                )
                                
                                return success_response(
                                    result["data"],
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
                                    result["data"],
                                    "PDF上传成功，但自动解析任务提交失败，您可以稍后手动重试解析"
                                )
                        else:
                            # 已有进行中的任务，只返回PDF上传成功
                            return success_response(
                                result["data"],
                                "PDF上传成功，检测到已有解析任务在进行中"
                            )
                    else:
                        # MinerU服务未配置，只返回PDF上传成功
                        return success_response(
                            result["data"],
                            "PDF上传成功，但解析服务未配置，请联系管理员"
                        )
                except Exception as e:
                    logger.error(f"自动触发PDF解析失败: {str(e)}")
                    # 解析触发失败，但仍返回PDF上传成功
                    return success_response(
                        result["data"],
                        "PDF上传成功，但自动解析触发失败，您可以稍后手动重试解析"
                    )
            else:
                return bad_request_response(result["message"])
        else:
            return internal_error_response(f"PDF上传失败: {upload_result['error']}")

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")



@bp.route("/create-from-pdf", methods=["POST"])
@login_required
@admin_required
def create_paper_from_pdf():
    """
    管理员通过PDF创建公共论文
    
    请求格式: multipart/form-data
    参数:
        file: PDF文件
        extra: JSON字符串，包含额外的论文信息
    """
    try:
        # 检查是否有文件上传
        if 'file' not in request.files:
            return bad_request_response("没有选择文件")

        file = request.files['file']

        # 检查文件名是否为空
        if file.filename == '':
            return bad_request_response("没有选择文件")

        # 检查文件类型
        if file.content_type != 'application/pdf':
            return bad_request_response("请选择PDF文件")

        # 获取额外信息
        extra_data = {}
        if request.form.get('extra'):
            try:
                extra_data = json.loads(request.form.get('extra'))
            except json.JSONDecodeError:
                return bad_request_response("extra字段格式错误，应为JSON字符串")

        # 读取文件数据
        file_data = file.read()

        # 检查文件大小（50MB限制）
        max_size = 50 * 1024 * 1024  # 50MB
        if len(file_data) > max_size:
            return bad_request_response(f"文件大小超过限制，最大允许 {max_size // (1024*1024)}MB")

        # 首先创建一个基础论文，状态为"解析中"
        paper_service = get_paper_service()

        # 创建基础论文数据
        paper_data = {
            "metadata": {
                "title": "解析中...",
                "titleZh": "解析中...",
                "authors": [],
                "year": None,
                "journal": None,
                "abstract": "正在解析PDF文件，请稍候...",
                "abstractZh": "正在解析PDF文件，请稍候...",
                "keywords": [],
                "keywordsZh": []
            },
            "isPublic": True,
            "parseStatus": "parsing",  # 设置解析状态
            "attachments": {}
        }

        # 创建论文
        create_result = paper_service.create_paper(paper_data, g.current_user["user_id"])

        if create_result["code"] != BusinessCode.SUCCESS:
            return bad_request_response(f"创建论文失败: {create_result['message']}")

        paper = create_result["data"]
        paper_id = paper["id"]

        # 导入上传服务
        qiniu_service = get_qiniu_service()

        # 上传PDF文件到七牛云
        upload_result = qiniu_service.upload_file_data(
            file_data=file_data,
            file_extension=".pdf",
            file_type="unified_paper",
            filename=f"{paper_id}.pdf",
            paper_id=paper_id
        )

        if not upload_result["success"]:
            # 如果上传失败，删除已创建的论文
            paper_service.delete_paper(paper_id, g.current_user["user_id"], is_admin=True)
            return internal_error_response(f"PDF上传失败: {upload_result['error']}")

        # 更新论文附件信息
        attachments = {
            "pdf": {
                "url": upload_result["url"],
                "key": upload_result["key"],
                "size": upload_result["size"],
                "uploadedAt": upload_result["uploadedAt"]
            }
        }

        update_result = paper_service.update_paper_attachments(
            paper_id=paper_id,
            attachments=attachments,
            user_id=g.current_user["user_id"],
            is_admin=True
        )

        if update_result["code"] != BusinessCode.SUCCESS:
            # 如果更新失败，删除已创建的论文和上传的文件
            paper_service.delete_paper(paper_id, g.current_user["user_id"], is_admin=True)
            qiniu_service.delete_file(upload_result["key"])
            return bad_request_response(f"更新论文附件失败: {update_result['message']}")

        # 提交PDF解析任务
        mineru_service = get_mineru_service()
        task_model = get_pdf_parse_task_model()

        # 检查MinerU服务是否配置
        if not mineru_service.is_configured():
            # 如果没有配置解析服务，论文创建成功但需要手动解析
            return success_response({
                "paper": update_result["data"],
                "message": "论文创建成功，但PDF解析服务未配置，请手动上传Markdown文件或联系管理员配置解析服务"
            }, "论文创建成功")

        # 创建解析任务
        task = task_model.create_task(
            paper_id=paper_id,
            user_id=g.current_user["user_id"],
            pdf_url=upload_result["url"],
            is_admin=True
        )

        # 提交MinerU解析任务
        try:
            submit_result = mineru_service.submit_parsing_task(upload_result["url"])

            if not submit_result["success"]:
                # 更新任务状态为失败
                task_model.update_task_status(
                    task_id=task["id"],
                    status="failed",
                    error=submit_result["error"]
                )
                # 论文创建成功，但解析失败
                return success_response({
                    "paper": update_result["data"],
                    "taskId": task["id"],
                    "message": f"论文创建成功，但PDF解析任务提交失败: {submit_result['error']}，您可以稍后手动重试解析"
                }, "论文创建成功")

            # 更新任务状态为处理中
            task_model.update_task_status(
                task_id=task["id"],
                status="processing",
                progress=10,
                message="PDF解析任务已提交，正在处理中...",
                mineru_task_id=submit_result["task_id"]
            )

            # 启动后台任务监控解析进度
            task_manager = get_task_manager()

            # 在定义后台函数之前获取用户ID和任务ID
            current_user_id = g.current_user["user_id"]
            task_id_for_bg = task["id"]
            paper_id_for_bg = paper_id

            def background_pdf_parsing():
                """后台PDF解析任务"""
                try:
                    # 创建应用上下文
                    try:
                        from flask import current_app
                        app_context = current_app.app_context()
                    except (RuntimeError, ImportError):
                        from neuink import create_app
                        app = create_app()
                        app_context = app.app_context()

                    with app_context:
                        # 设置用户ID到应用上下文中
                        from flask import g as flask_g
                        flask_g.current_user = {"user_id": current_user_id}

                        # 轮询解析状态
                        max_wait_time = 600  # 10分钟
                        start_time = time.time()

                        # 从任务模型重新获取任务信息，确保使用正确的任务ID
                        task_model_bg = get_pdf_parse_task_model()
                        task_info = task_model_bg.get_task(task_id_for_bg)

                        if not task_info:
                            logger.error(f"后台任务找不到任务信息: {task_id_for_bg}")
                            return

                        mineru_task_id = task_info.get("mineruTaskId")
                        if not mineru_task_id:
                            logger.error(f"任务没有MinerU任务ID: {task_id_for_bg}")
                            return

                        while time.time() - start_time < max_wait_time:
                            status_result = mineru_service.get_parsing_status(mineru_task_id)

                            if not status_result["success"]:
                                task_model_bg.update_task_status(
                                    task_id=task_id_for_bg,
                                    status="failed",
                                    error=status_result["error"]
                                )
                                break

                            status = status_result["status"]

                            if status == "processing":
                                task_model_bg.update_task_status(
                                    task_id=task_id_for_bg,
                                    status="processing",
                                    progress=50,
                                    message="PDF解析中..."
                                )
                            elif status == "completed":
                                # 获取ZIP文件URL
                                full_zip_url = status_result.get("full_zip_url")

                                if not full_zip_url:
                                    task_model.update_task_status(
                                        task_id=task["id"],
                                        status="failed",
                                        error="解析完成但未获取到ZIP文件URL"
                                    )
                                    break

                                # 获取Markdown内容并上传
                                result = mineru_service.fetch_markdown_content_and_upload(
                                    result_url=full_zip_url,
                                    paper_id=paper_id_for_bg,
                                    qiniu_service=qiniu_service
                                )

                                if result["success"]:
                                    markdown_content = result["markdown_content"]
                                    attachments_data = result.get("attachments", {})

                                    if attachments_data:
                                        # 获取论文详情并更新附件
                                        paper_service = get_paper_service()
                                        paper_result = paper_service.get_admin_paper_detail(
                                            paper_id=paper_id_for_bg,
                                            user_id=current_user_id
                                        )

                                        if paper_result["code"] == BusinessCode.SUCCESS:
                                            paper_data = paper_result["data"]
                                            attachments = paper_data.get("attachments", {})

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
                                            paper_service.update_paper_attachments(
                                                paper_id=paper_id_for_bg,
                                                attachments=attachments,
                                                user_id=current_user_id,
                                                is_admin=True
                                            )

                                        # 使用Markdown内容创建论文内容
                                        try:
                                            # ✅ 改成：只解析，不创建paper
                                            parse_result = paper_service.parse_paper_from_text(
                                                text=markdown_content
                                            )

                                            if parse_result["code"] == BusinessCode.SUCCESS:
                                                # 获取解析后的论文数据
                                                parsed_paper = parse_result["data"]

                                                # 更新原论文的元数据和内容
                                                update_data = {
                                                    "metadata": parsed_paper.get("metadata", {}),
                                                    "abstract": parsed_paper.get("abstract", ""),
                                                    "keywords": parsed_paper.get("keywords", []),
                                                    "sections": [],  # 不再使用sections数据，改为空数组
                                                    "references": parsed_paper.get("references", []),
                                                    "parseStatus": "completed"
                                                }

                                                paper_service.update_paper(
                                                    paper_id=paper_id_for_bg,
                                                    update_data=update_data,
                                                    user_id=current_user_id,
                                                    is_admin=True
                                                )

                                                # 更新任务状态为完成
                                                task_model.update_task_status(
                                                    task_id=task["id"],
                                                    status="completed",
                                                    progress=100,
                                                    message="PDF解析完成并已更新论文内容",
                                                    markdown_content=markdown_content
                                                )
                                            else:
                                                # 如果解析失败，只更新附件信息
                                                paper_service.update_paper(
                                                    paper_id=paper_id_for_bg,
                                                    update_data={"parseStatus": "completed"},
                                                    user_id=current_user_id,
                                                    is_admin=True
                                                )

                                                task_model.update_task_status(
                                                    task_id=task["id"],
                                                    status="completed",
                                                    progress=100,
                                                    message="PDF解析完成但内容解析失败，已上传Markdown文件",
                                                    markdown_content=markdown_content
                                                )
                                        except Exception as e:
                                            logger.error(f"从Markdown创建论文内容失败: {str(e)}")
                                            # 即使解析失败，也标记为完成
                                            paper_service.update_paper(
                                                paper_id=paper_id_for_bg,
                                                update_data={"parseStatus": "completed"},
                                                user_id=current_user_id,
                                                is_admin=True
                                            )

                                            task_model.update_task_status(
                                                task_id=task["id"],
                                                status="completed",
                                                progress=100,
                                                message="PDF解析完成但内容解析失败，已上传Markdown文件",
                                                markdown_content=markdown_content
                                            )
                                    else:
                                        task_model.update_task_status(
                                            task_id=task["id"],
                                            status="failed",
                                            error="上传Markdown文件失败"
                                        )
                                else:
                                    task_model_bg.update_task_status(
                                        task_id=task_id_for_bg,
                                        status="failed",
                                        error=result["error"]
                                    )
                                break
                            elif status == "failed":
                                task_model_bg.update_task_status(
                                    task_id=task_id_for_bg,
                                    status="failed",
                                    error=status_result.get("message", "PDF解析失败")
                                )
                                break

                            # 等待一段时间再查询
                            time.sleep(10)
                        else:
                            # 超时
                            task_model_bg.update_task_status(
                                task_id=task_id_for_bg,
                                status="failed",
                                error="PDF解析超时"
                            )

                except Exception as e:
                    logger.error(f"后台PDF解析任务异常: {str(e)}")
                    task_model_bg = get_pdf_parse_task_model()
                    task_model_bg.update_task_status(
                        task_id=task_id_for_bg,
                        status="failed",
                        error=f"后台任务异常: {str(e)}"
                    )

            # 提交后台任务
            task_manager.submit_task(
                task_id=task["id"],
                func=background_pdf_parsing,
                callback=lambda task_id, result: None
            )

            return success_response({
                "paper": update_result["data"],
                "taskId": task["id"],
                "message": "论文创建成功，PDF解析任务已提交，请稍后查看解析进度"
            }, "论文创建成功")

        except Exception as e:
            logger.error(f"提交MinerU解析任务异常: {str(e)}")
            # 更新任务状态为失败
            task_model.update_task_status(
                task_id=task["id"],
                status="failed",
                error=f"提交解析任务异常: {str(e)}"
            )
            # 论文创建成功，但解析失败
            return success_response({
                "paper": update_result["data"],
                "taskId": task["id"],
                "message": f"论文创建成功，但PDF解析任务提交失败: {str(e)}，您可以稍后手动重试解析"
            }, "论文创建成功")

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<paper_id>/content-list", methods=["GET"])
@login_required
@admin_required
def get_admin_paper_content_list(paper_id):
    """
    管理员获取论文的content_list.json文件内容
    
    返回数据示例:
    {
        "contentList": {...},  // content_list.json的内容
        "attachment": {...}   // 附件信息
    }
    """
    try:
        # 首先获取论文详情，确保管理员有权限
        service = get_paper_service()
        paper_result = service.get_admin_paper_detail(
            paper_id=paper_id,
            user_id=g.current_user["user_id"]
        )

        if paper_result["code"] != BusinessCode.SUCCESS:
            if paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(paper_result["message"])
            elif paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                return jsonify({
                    "code": ResponseCode.FORBIDDEN,
                    "message": paper_result["message"],
                    "data": None
                }), ResponseCode.FORBIDDEN
            else:
                return bad_request_response(paper_result["message"])

        paper_data = paper_result["data"]
        attachments = paper_data.get("attachments", {})

        # 检查是否有content_list文件
        if not attachments.get("content_list") or not attachments["content_list"].get("url"):
            return bad_request_response("论文没有content_list文件")

        content_list_url = attachments["content_list"]["url"]

        # 从七牛云获取content_list.json内容
        qiniu_service = get_qiniu_service()

        try:
            # 直接使用数据库中的URL获取content_list.json内容
            logger.info(f"开始获取content_list文件，URL: {content_list_url}")
            content_list_result = qiniu_service.fetch_file_content(content_list_url)

            if not content_list_result["success"]:
                logger.error(f"获取content_list文件失败: {content_list_result['error']}")
                return bad_request_response(f"获取content_list文件失败: {content_list_result['error']}")

            # 解码base64内容
            try:
                content_list_json = json.loads(base64.b64decode(content_list_result["content"]).decode('utf-8'))
            except Exception as decode_error:
                logger.error(f"解析content_list.json失败: {str(decode_error)}")
                return bad_request_response(f"解析content_list.json失败: {str(decode_error)}")

            return success_response({
                "contentList": content_list_json,
                "attachment": attachments["content_list"]
            }, "成功获取content_list文件")

        except Exception as e:
            logger.error(f"获取content_list文件异常: {str(e)}")
            logger.error(f"异常详情: {traceback.format_exc()}")
            return internal_error_response(f"获取content_list文件异常: {str(e)}")

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<paper_id>/pdf-content", methods=["GET"])
@login_required
@admin_required
def get_admin_paper_pdf_content_proxy(paper_id):
    """
    管理员获取论文PDF文件内容（以base64格式返回）
    
    返回数据示例:
    {
        "pdfContent": "base64编码的PDF内容",
        "attachment": {...}   // PDF附件信息
    }
    """
    try:
        # 首先获取论文详情，确保管理员有权限
        service = get_paper_service()
        paper_result = service.get_admin_paper_detail(
            paper_id=paper_id,
            user_id=g.current_user["user_id"]
        )

        if paper_result["code"] != BusinessCode.SUCCESS:
            if paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(paper_result["message"])
            elif paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                return jsonify({
                    "code": ResponseCode.FORBIDDEN,
                    "message": paper_result["message"],
                    "data": None
                }), ResponseCode.FORBIDDEN
            else:
                return bad_request_response(paper_result["message"])

        paper_data = paper_result["data"]
        attachments = paper_data.get("attachments", {})

        # 检查是否有PDF文件
        if not attachments.get("pdf") or not attachments["pdf"].get("url"):
            return bad_request_response("论文没有PDF文件")

        pdf_url = attachments["pdf"]["url"]

        # 添加调试日志
        logger.info(f"管理员获取PDF内容 - paper_id: {paper_id}")
        logger.info(f"PDF URL: {pdf_url}")

        # 从七牛云获取PDF文件内容
        qiniu_service = get_qiniu_service()

        try:
            logger.info(f"开始获取管理员论文PDF文件内容...")
            logger.info(f"PDF URL: {pdf_url}")

            # 直接使用数据库中的URL获取PDF文件内容
            pdf_content = qiniu_service.fetch_file_content(pdf_url)
            logger.info(f"七牛云返回结果 - success: {pdf_content.get('success')}, size: {pdf_content.get('size', 0)} 字节")

            if not pdf_content["success"]:
                logger.error(f"获取PDF文件失败: {pdf_content['error']}")
                return bad_request_response(f"获取PDF文件失败: {pdf_content['error']}")

            logger.info(f"成功获取PDF内容，大小: {pdf_content.get('size', 0)} 字节")
            return success_response({
                "pdfContent": pdf_content["content"],
                "attachment": attachments["pdf"]
            }, "成功获取PDF文件")

        except Exception as e:
            logger.error(f"获取PDF文件异常: {str(e)}")
            logger.error(f"异常详情: {traceback.format_exc()}")
            return internal_error_response(f"获取PDF文件异常: {str(e)}")

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<paper_id>/markdown-content", methods=["GET"])
@login_required
@admin_required
def get_admin_paper_markdown_content_proxy(paper_id):
    """
    管理员获取论文Markdown文件内容（以base64格式返回）
    
    返回数据示例:
    {
        "markdownContent": "base64编码的Markdown内容",
        "attachment": {...}   // Markdown附件信息
    }
    """
    try:
        # 首先获取论文详情，确保管理员有权限
        service = get_paper_service()
        paper_result = service.get_admin_paper_detail(
            paper_id=paper_id,
            user_id=g.current_user["user_id"]
        )

        if paper_result["code"] != BusinessCode.SUCCESS:
            if paper_result["code"] == BusinessCode.PAPER_NOT_FOUND:
                return bad_request_response(paper_result["message"])
            elif paper_result["code"] == BusinessCode.PERMISSION_DENIED:
                return jsonify({
                    "code": ResponseCode.FORBIDDEN,
                    "message": paper_result["message"],
                    "data": None
                }), ResponseCode.FORBIDDEN
            else:
                return bad_request_response(paper_result["message"])

        paper_data = paper_result["data"]
        attachments = paper_data.get("attachments", {})

        # 检查是否有Markdown文件
        if not attachments.get("markdown") or not attachments["markdown"].get("url"):
            return bad_request_response("论文没有Markdown文件")

        markdown_url = attachments["markdown"]["url"]

        # 添加调试日志
        logger.info(f"管理员获取Markdown内容 - paper_id: {paper_id}")
        logger.info(f"Markdown URL: {markdown_url}")

        # 从七牛云获取Markdown文件内容
        qiniu_service = get_qiniu_service()

        try:
            logger.info(f"开始获取管理员论文Markdown文件内容...")
            logger.info(f"Markdown URL: {markdown_url}")

            # 直接使用数据库中的URL获取Markdown文件内容
            markdown_content = qiniu_service.fetch_file_content(markdown_url)
            logger.info(f"七牛云返回结果 - success: {markdown_content.get('success')}, size: {markdown_content.get('size', 0)} 字节")

            if not markdown_content["success"]:
                logger.error(f"获取Markdown文件失败: {markdown_content['error']}")
                return bad_request_response(f"获取Markdown文件失败: {markdown_content['error']}")

            logger.info(f"成功获取Markdown内容，大小: {markdown_content.get('size', 0)} 字节")
            return success_response({
                "markdownContent": markdown_content["content"],
                "attachment": attachments["markdown"]
            }, "成功获取Markdown文件")

        except Exception as e:
            logger.error(f"获取Markdown文件异常: {str(e)}")
            logger.error(f"异常详情: {traceback.format_exc()}")
            return internal_error_response(f"获取Markdown文件异常: {str(e)}")

    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")
