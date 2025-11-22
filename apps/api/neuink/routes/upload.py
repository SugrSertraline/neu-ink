"""
文件上传接口
处理文件上传到七牛云存储的相关接口
"""
import os
import uuid
from werkzeug.utils import secure_filename
from flask import Blueprint, request, g, current_app


from ..services.qiniuService import get_qiniu_service, is_qiniu_configured
from ..utils.auth import login_required
from ..utils.common import (
    success_response,
    bad_request_response,
    internal_error_response,
)
from ..config.constants import BusinessCode, QiniuConfig

bp = Blueprint("upload", __name__)


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


@bp.route("/image", methods=["POST"])
@login_required
def upload_image():
    """
    上传图片到七牛云
    
    请求格式: multipart/form-data
    参数:
        file: 图片文件
        
    返回示例:
        {
            "code": 0,
            "message": "上传成功",
            "data": {
                "url": "https://your-domain.com/papers/images/12345678_abc123.jpg",
                "key": "papers/images/12345678_abc123.jpg",
                "size": 102400,
                "contentType": "image/jpeg",
                "uploadedAt": "2023-12-01T10:00:00.000Z"
            }
        }
    """
    try:
        # 检查七牛云是否已配置
        if not is_qiniu_configured():
            return bad_request_response("七牛云存储未配置，请联系管理员")
        
        # 检查是否有文件上传
        if 'file' not in request.files:
            return bad_request_response("没有选择文件")
        
        file = request.files['file']
        
        # 检查文件名是否为空
        if file.filename == '':
            return bad_request_response("没有选择文件")
        
        # 检查文件类型是否允许
        if not allowed_file(file.filename):
            return bad_request_response("不支持的文件类型，仅支持: png, jpg, jpeg, gif, webp")
        
        # 获取文件扩展名
        filename = secure_filename(file.filename)
        file_extension = os.path.splitext(filename)[1].lower()
        
        # 读取文件数据
        file_data = file.read()
        
        # 获取七牛云服务实例
        qiniu_service = get_qiniu_service()
        
        # 验证文件
        is_valid, error_message = qiniu_service.validate_file(file_data, file_extension)
        if not is_valid:
            return bad_request_response(error_message)
        
        # 上传文件到七牛云，使用图片路径前缀
        upload_result = qiniu_service.upload_file_data(file_data, file_extension, file_type="image")
        
        if upload_result["success"]:
            return success_response(upload_result, "图片上传成功")
        else:
            error_msg = f"图片上传失败: {upload_result['error']}"
            return internal_error_response(error_msg)
             
    except Exception as exc:
        import traceback
        error_msg = f"服务器错误: {exc}"
        return internal_error_response(error_msg)


@bp.route("/pdf", methods=["POST"])
@login_required
def upload_pdf():
    """
    上传PDF文件到七牛云
    
    请求格式: multipart/form-data
    参数:
        file: PDF文件
        
    返回示例:
        {
            "code": 0,
            "message": "上传成功",
            "data": {
                "url": "https://your-domain.com/neuink/pdf/12345678_abc123.pdf",
                "key": "neuink/pdf/12345678_abc123.pdf",
                "size": 1024000,
                "contentType": "application/pdf",
                "uploadedAt": "2023-12-01T10:00:00.000Z"
            }
        }
    """
    try:
        # 检查七牛云是否已配置
        if not is_qiniu_configured():
            return bad_request_response("七牛云存储未配置，请联系管理员")
        
        # 检查是否有文件上传
        if 'file' not in request.files:
            return bad_request_response("没有选择文件")
        
        file = request.files['file']
        
        # 检查文件名是否为空
        if file.filename == '':
            return bad_request_response("没有选择文件")
        
        # 检查文件类型是否允许
        allowed_extensions = {'pdf'}
        if not allowed_file(file.filename, allowed_extensions):
            return bad_request_response(f"不支持的文件类型，仅支持: {', '.join(allowed_extensions)}")
        
        # 获取文件扩展名
        filename = secure_filename(file.filename)
        file_extension = os.path.splitext(filename)[1].lower()
        
        # 读取文件数据
        file_data = file.read()
        
        # 获取七牛云服务实例
        qiniu_service = get_qiniu_service()
        
        # 验证文件
        is_valid, error_message = qiniu_service.validate_file(file_data, file_extension)
        if not is_valid:
            return bad_request_response(error_message)
        
        # 上传文件到七牛云，使用PDF路径前缀
        upload_result = qiniu_service.upload_file_data(file_data, file_extension, file_type="pdf")
        
        if upload_result["success"]:
            return success_response(upload_result, "PDF文件上传成功")
        else:
            return internal_error_response(f"PDF文件上传失败: {upload_result['error']}")
            
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/document", methods=["POST"])
@login_required
def upload_document():
    """
    上传文档到七牛云（除PDF和Markdown外的其他文档类型）
    
    请求格式: multipart/form-data
    参数:
        file: 文档文件
        
    返回示例:
        {
            "code": 0,
            "message": "上传成功",
            "data": {
                "url": "https://your-domain.com/neuink/document/12345678_abc123.docx",
                "key": "neuink/document/12345678_abc123.docx",
                "size": 1024000,
                "contentType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "uploadedAt": "2023-12-01T10:00:00.000Z"
            }
        }
    """
    try:
        # 检查七牛云是否已配置
        if not is_qiniu_configured():
            return bad_request_response("七牛云存储未配置，请联系管理员")
        
        # 检查是否有文件上传
        if 'file' not in request.files:
            return bad_request_response("没有选择文件")
        
        file = request.files['file']
        
        # 检查文件名是否为空
        if file.filename == '':
            return bad_request_response("没有选择文件")
        
        # 检查文件类型是否允许（排除PDF和Markdown，因为它们有专门的接口）
        allowed_extensions = {'doc', 'docx', 'ppt', 'pptx', 'txt'}
        if not allowed_file(file.filename, allowed_extensions):
            return bad_request_response(f"不支持的文件类型，仅支持: {', '.join(allowed_extensions)}")
        
        # 获取文件扩展名
        filename = secure_filename(file.filename)
        file_extension = os.path.splitext(filename)[1].lower()
        
        # 读取文件数据
        file_data = file.read()
        
        # 获取七牛云服务实例
        qiniu_service = get_qiniu_service()
        
        # 验证文件
        is_valid, error_message = qiniu_service.validate_file(file_data, file_extension)
        if not is_valid:
            return bad_request_response(error_message)
        
        # 上传文件到七牛云，使用文档路径前缀
        upload_result = qiniu_service.upload_file_data(file_data, file_extension, file_type="document")
        
        if upload_result["success"]:
            return success_response(upload_result, "文档上传成功")
        else:
            return internal_error_response(f"文档上传失败: {upload_result['error']}")
            
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/markdown", methods=["POST"])
@login_required
def upload_markdown():
    """
    上传Markdown文件到七牛云
    
    请求格式: multipart/form-data
    参数:
        file: Markdown文件
        
    返回示例:
        {
            "code": 0,
            "message": "上传成功",
            "data": {
                "url": "https://your-domain.com/neuink/markdown/12345678_abc123.md",
                "key": "neuink/markdown/12345678_abc123.md",
                "size": 102400,
                "contentType": "text/markdown",
                "uploadedAt": "2023-12-01T10:00:00.000Z"
            }
        }
    """
    try:
        # 检查七牛云是否已配置
        if not is_qiniu_configured():
            return bad_request_response("七牛云存储未配置，请联系管理员")
        
        # 检查是否有文件上传
        if 'file' not in request.files:
            return bad_request_response("没有选择文件")
        
        file = request.files['file']
        
        # 检查文件名是否为空
        if file.filename == '':
            return bad_request_response("没有选择文件")
        
        # 检查文件类型是否允许
        allowed_extensions = {'md', 'markdown'}
        if not allowed_file(file.filename, allowed_extensions):
            return bad_request_response(f"不支持的文件类型，仅支持: {', '.join(allowed_extensions)}")
        
        # 获取文件扩展名
        filename = secure_filename(file.filename)
        file_extension = os.path.splitext(filename)[1].lower()
        
        # 读取文件数据
        file_data = file.read()
        
        # 获取七牛云服务实例
        qiniu_service = get_qiniu_service()
        
        # 验证文件
        is_valid, error_message = qiniu_service.validate_file(file_data, file_extension)
        if not is_valid:
            return bad_request_response(error_message)
        
        # 上传文件到七牛云，使用Markdown路径前缀
        upload_result = qiniu_service.upload_file_data(file_data, file_extension, file_type="markdown")
        
        if upload_result["success"]:
            return success_response(upload_result, "Markdown文件上传成功")
        else:
            return internal_error_response(f"Markdown文件上传失败: {upload_result['error']}")
            
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/paper-image", methods=["POST"])
@login_required
def upload_paper_image():
    """
    上传论文图片到七牛云（专门用于论文中的图片）
    
    请求格式: multipart/form-data
    参数:
        file: 图片文件
        paper_id: 论文ID（可选，用于分类存储）
        
    返回示例:
        {
            "code": 0,
            "message": "上传成功",
            "data": {
                "url": "https://your-domain.com/papers/images/paper_123/12345678_abc123.jpg",
                "key": "papers/images/paper_123/12345678_abc123.jpg",
                "size": 102400,
                "contentType": "image/jpeg",
                "uploadedAt": "2023-12-01T10:00:00.000Z"
            }
        }
    """
    try:
        # 检查七牛云是否已配置
        if not is_qiniu_configured():
            return bad_request_response("七牛云存储未配置，请联系管理员")
        
        # 检查是否有文件上传
        if 'file' not in request.files:
            return bad_request_response("没有选择文件")
        
        file = request.files['file']
        
        # 检查文件名是否为空
        if file.filename == '':
            return bad_request_response("没有选择文件")
        
        # 检查文件类型是否允许
        if not allowed_file(file.filename):
            return bad_request_response("不支持的文件类型，仅支持: png, jpg, jpeg, gif, webp")
        
        # 获取文件扩展名
        filename = secure_filename(file.filename)
        file_extension = os.path.splitext(filename)[1].lower()
        
        # 读取文件数据
        file_data = file.read()
        
        # 获取七牛云服务实例
        qiniu_service = get_qiniu_service()
        
        # 验证文件
        is_valid, error_message = qiniu_service.validate_file(file_data, file_extension)
        if not is_valid:
            return bad_request_response(error_message)
        
        # 获取论文ID（可选）
        paper_id = request.form.get('paper_id', '')
        
        # 构建存储路径前缀
        if paper_id:
            prefix = f"papers/images/{paper_id}/"
        else:
            prefix = "papers/images/"
        
        # 上传文件到七牛云，使用论文图片路径前缀
        if paper_id:
            # 如果有论文ID，使用统一目录结构
            upload_result = qiniu_service.upload_file_data(
                file_data=file_data,
                file_extension=file_extension,
                file_type="unified_paper",
                filename=f"images/{filename}",
                paper_id=paper_id
            )
        else:
            upload_result = qiniu_service.upload_file_data(file_data, file_extension, file_type="paper_image")
        
        if upload_result["success"]:
            return success_response(upload_result, "论文图片上传成功")
        else:
            return internal_error_response(f"论文图片上传失败: {upload_result['error']}")
            
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/token", methods=["GET"])
@login_required
def get_upload_token():
    """
    获取七牛云上传凭证（用于前端直传）
    
    参数:
        key: 文件在七牛云中的存储路径
        expires: 凭证有效期（秒），默认3600
        
    返回示例:
        {
            "code": 0,
            "message": "获取成功",
            "data": {
                "token": "上传凭证字符串",
                "key": "文件存储路径",
                "expires": 3600,
                "domain": "https://your-domain.com"
            }
        }
    """
    try:
        # 检查七牛云是否已配置
        if not is_qiniu_configured():
            return bad_request_response("七牛云存储未配置，请联系管理员")
        
        # 获取参数
        key = request.args.get('key')
        expires = int(request.args.get('expires', 3600))
        
        if not key:
            return bad_request_response("文件路径不能为空")
        
        # 获取七牛云服务实例
        qiniu_service = get_qiniu_service()
        
        # 生成上传凭证
        token = qiniu_service.generate_upload_token(key, expires)
        
        return success_response({
            "token": token,
            "key": key,
            "expires": expires,
            "domain": f"https://{qiniu_service.domain}"
        }, "获取上传凭证成功")
        
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/config", methods=["GET"])
@login_required
def get_upload_config():
    """
    获取上传配置信息
    
    返回示例:
        {
            "code": 0,
            "message": "获取成功",
            "data": {
                "maxFileSize": 10485760,
                "allowedImageTypes": ["png", "jpg", "jpeg", "gif", "webp"],
                "allowedDocumentTypes": ["pdf", "doc", "docx", "ppt", "pptx", "txt", "md"],
                "domain": "https://your-domain.com",
                "isConfigured": true
            }
        }
    """
    try:
        # 检查七牛云是否已配置
        configured = is_qiniu_configured()
        
        config = {
            "isConfigured": configured,
            "maxFileSize": 52428800,  # 50MB (50 * 1024 * 1024)
            "allowedImageTypes": ["png", "jpg", "jpeg", "gif", "webp"],
            "allowedPdfTypes": ["pdf"],
            "allowedDocumentTypes": ["doc", "docx", "ppt", "pptx", "txt"],
            "allowedMarkdownTypes": ["md", "markdown"],
        }
        
        if configured:
            qiniu_service = get_qiniu_service()
            config["domain"] = f"https://{qiniu_service.domain}"
        
        return success_response(config, "获取上传配置成功")
        
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")