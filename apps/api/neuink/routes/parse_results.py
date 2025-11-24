"""
解析结果管理接口
负责处理文本解析结果的确认、保存和取消操作
"""
import logging
from flask import Blueprint, request, g
from ..services.userPaperService import get_user_paper_service
from ..services.paperService import get_paper_service
from ..services.paperContentService import PaperContentService
from ..models.paper import PaperModel
from ..models.section import get_section_model
from ..models.parseBlocks import get_parse_blocks_model
from ..utils.auth import login_required, admin_required
from ..utils.common import (
    success_response,
    bad_request_response,
    internal_error_response,
)
from ..config.constants import BusinessCode

# 初始化logger
logger = logging.getLogger(__name__)

# 为管理员论文库创建蓝图
bp = Blueprint("parse_results", __name__)

# 为用户论文库创建独立的蓝图
user_bp = Blueprint("user_parse_results", __name__)


@bp.route("/<paper_id>/parse-results/<parse_id>", methods=["GET"])
@login_required
@admin_required
def get_parse_result(paper_id, parse_id):
    """管理员论文库获取解析结果"""
    return _get_parse_result_common(paper_id, parse_id)



@user_bp.route("/<paper_id>/parse-results/<parse_id>", methods=["GET"])
@login_required
def user_get_parse_result(paper_id, parse_id):
    """用户论文库获取解析结果"""
    return _get_parse_result_common(paper_id, parse_id)


def _get_parse_result_common(paper_id, parse_id):
    """
    获取指定解析ID的解析结果
    
    返回数据示例:
    {
        "parseId": "pb_123",
        "status": "completed",
        "text": "原始文本",
        "parsedBlocks": [...],
        "createdAt": "2023-01-01T00:00:00Z",
        "updatedAt": "2023-01-01T00:05:00Z"
    }
    """
    # 统一处理 current_user
    current_user = getattr(g, 'current_user', None)
    if not current_user:
        return bad_request_response("未登录")
    
    # 如果 current_user 是对象：
    user_id = getattr(current_user, "user_id", None)
    # 如果是 dict，就用：
    if user_id is None and hasattr(current_user, 'get'):
        user_id = current_user.get("user_id")
    
    if not user_id:
        return bad_request_response("无法获取用户ID")
    
    logger.info(f"获取解析结果 - paper_id: {paper_id}, parse_id: {parse_id}, user_id: {user_id}")
    try:
        parse_model = get_parse_blocks_model()
        parse_record = parse_model.find_by_id(parse_id)
        
        logger.info(f"查询结果 - parse_record: {parse_record}")
        
        if not parse_record:
            logger.warning(f"解析记录不存在 - parse_id: {parse_id}")
            # 尝试查看数据库中所有的解析记录
            all_records = list(parse_model.db.find(parse_model.collection, {}))
            logger.info(f"数据库中所有解析记录: {[r.get('id', r.get('_id')) for r in all_records]}")
            return bad_request_response("解析记录不存在")
        
        # 验证权限：只有创建者可以查看
        if parse_record.get("userId") != user_id:
            return bad_request_response("无权限访问此解析结果")
        
        return success_response(parse_record, "成功获取解析结果")
    
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<paper_id>/parse-results/<parse_id>/confirm", methods=["POST"])
@login_required
def confirm_parse_result(paper_id, parse_id):
    """管理员论文库确认解析结果"""
    return _confirm_parse_result_common(paper_id, parse_id)


@user_bp.route("/<paper_id>/parse-results/<parse_id>/confirm", methods=["POST"])
@login_required
def user_confirm_parse_result(paper_id, parse_id):
    """用户论文库确认解析结果"""
    return _confirm_parse_result_common(paper_id, parse_id)


def _confirm_parse_result_common(paper_id, parse_id):
    """
    确认解析结果，将选中的blocks插入到section中
    
    请求体示例:
    {
        "selectedBlockIds": ["block_1", "block_2"],  // 选择的block IDs
        "removeOthers": true  // 是否移除未选择的blocks
    }
    """
    # 统一处理 current_user
    current_user = getattr(g, 'current_user', None)
    if not current_user:
        return bad_request_response("未登录")
    
    # 如果 current_user 是对象：
    user_id = getattr(current_user, "user_id", None)
    # 如果是 dict，就用：
    if user_id is None and hasattr(current_user, 'get'):
        user_id = current_user.get("user_id")
    
    if not user_id:
        return bad_request_response("无法获取用户ID")
    
    try:
        data = request.get_json()
        if not data:
            return bad_request_response("请求数据不能为空")
        
        selected_block_ids = data.get("selectedBlockIds", [])
        remove_others = data.get("removeOthers", True)
        
        if not selected_block_ids:
            return bad_request_response("必须选择至少一个block")
        
        # 获取解析记录
        parse_model = get_parse_blocks_model()
        parse_record = parse_model.find_by_id(parse_id)
        
        if not parse_record:
            return bad_request_response("解析记录不存在")
        
        # 验证权限：只有创建者可以确认
        if parse_record.get("userId") != user_id:
            return bad_request_response("无权限操作此解析结果")
        
        # 验证解析状态
        if parse_record.get("status") != "completed":
            return bad_request_response("只能确认已完成的解析结果")
        
        # 获取解析的blocks - 注意：数据库中存储的是"blocks"字段
        all_parsed_blocks = parse_record.get("blocks", [])
        
        # 筛选选中的blocks
        selected_blocks = [
            block for block in all_parsed_blocks 
            if block.get("id") in selected_block_ids
        ]
        
        if not selected_blocks:
            return bad_request_response("选中的blocks不存在")
        
        # 获取section信息
        section_id = parse_record.get("sectionId")
        paper_id = parse_record.get("paperId")
        user_paper_id = parse_record.get("userPaperId")
        insert_index = parse_record.get("insertIndex", 0)
        temp_block_id = parse_record.get("tempBlockId")
        
        # 判断是个人论文还是公共论文
        is_user_paper = bool(user_paper_id)
        
        if is_user_paper:
            # 个人论文库处理
            service = get_user_paper_service()
            user_paper_result = service.get_user_paper_detail(
                user_paper_id=user_paper_id,
                user_id=user_id
            )
            
            if user_paper_result["code"] != BusinessCode.SUCCESS:
                return bad_request_response(user_paper_result["message"])
            
            # 使用用户论文的ID作为paper_id
            paper_id = user_paper_id
        else:
            # 公共论文库处理
            service = get_paper_service()
            paper_result = service.get_admin_paper_detail(
                paper_id=paper_id,
                user_id=user_id
            )
            
            if paper_result["code"] != BusinessCode.SUCCESS:
                return bad_request_response(paper_result["message"])
        
        # 插入选中的blocks到section
        paper_model = PaperModel()
        content_service = PaperContentService(paper_model)
        
        # 获取section信息
        section_model = get_section_model()
        section = section_model.find_by_id(section_id)
        
        if not section:
            return bad_request_response("章节不存在")
        
        current_content = section.get("content", [])
        
        # 先移除临时parsing block
        if temp_block_id:
            # 检查临时block是否存在
            temp_block_exists = any(block.get("id") == temp_block_id for block in current_content)
            if temp_block_exists:
                # 从当前内容中移除临时block
                current_content = [block for block in current_content if block.get("id") != temp_block_id]
                # 重新计算插入位置（考虑临时block已被移除）
                if insert_index >= len(current_content):
                    insert_index = len(current_content)
            else:
                # 临时block不存在，记录日志但继续执行
                logger.info(f"临时block不存在，可能已被移除 - temp_block_id: {temp_block_id}")
                # 确保插入位置有效
                if insert_index >= len(current_content):
                    insert_index = len(current_content)
        
        # 插入选中的blocks
        new_content = current_content.copy()
        new_content[insert_index:insert_index] = selected_blocks
        
        # 更新section
        if not section_model.update_direct(section_id, {"$set": {"content": new_content}}):
            return internal_error_response("更新章节失败")
        
        # 更新解析记录状态为已消费
        parse_model.set_consumed(parse_id)
        
        # 返回更新后的论文数据
        if is_user_paper:
            updated_paper = content_service._get_user_paper_with_sections(paper_id)
        else:
            updated_paper = paper_model.find_paper_with_sections(paper_id)
        
        return success_response({
            "selectedBlocks": selected_blocks,
            "parseId": parse_id
        }, "成功确认解析结果")
    
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<paper_id>/parse-results/<parse_id>/discard", methods=["POST"])
@login_required
def discard_parse_result(paper_id, parse_id):
    """管理员论文库丢弃解析结果"""
    return _discard_parse_result_common(paper_id, parse_id)


@user_bp.route("/<paper_id>/parse-results/<parse_id>/discard", methods=["POST"])
@login_required
def user_discard_parse_result(paper_id, parse_id):
    """用户论文库丢弃解析结果"""
    return _discard_parse_result_common(paper_id, parse_id)


def _discard_parse_result_common(paper_id, parse_id):
    """
    丢弃解析结果，移除临时parsing block
    
    请求体示例: {} (无需额外参数)
    """
    # 统一处理 current_user
    current_user = getattr(g, 'current_user', None)
    if not current_user:
        return bad_request_response("未登录")
    
    # 如果 current_user 是对象：
    user_id = getattr(current_user, "user_id", None)
    # 如果是 dict，就用：
    if user_id is None and hasattr(current_user, 'get'):
        user_id = current_user.get("user_id")
    
    if not user_id:
        return bad_request_response("无法获取用户ID")
    
    try:
        # 获取解析记录
        parse_model = get_parse_blocks_model()
        parse_record = parse_model.find_by_id(parse_id)
        
        if not parse_record:
            return bad_request_response("解析记录不存在")
        
        # 验证权限：只有创建者可以丢弃
        if parse_record.get("userId") != user_id:
            return bad_request_response("无权限操作此解析结果")
        
        # 获取临时block ID
        temp_block_id = parse_record.get("tempBlockId")
        section_id = parse_record.get("sectionId")
        
        # 移除临时parsing block
        if temp_block_id and section_id:
            paper_model = PaperModel()
            content_service = PaperContentService(paper_model)
            
            # 尝试移除临时block，但不因为失败而中断整个操作
            try:
                if not content_service._remove_temp_block(section_id, temp_block_id):
                    logger.info(f"移除临时block失败，可能已被移除 - temp_block_id: {temp_block_id}")
            except Exception as e:
                logger.info(f"移除临时block时发生异常，继续执行 - temp_block_id: {temp_block_id}, error: {e}")
        
        # 更新解析记录状态为已消费
        parse_model.set_consumed(parse_id)
        
        return success_response({
            "parseId": parse_id,
            "message": "已丢弃解析结果"
        }, "成功丢弃解析结果")
    
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<paper_id>/parse-results/<parse_id>/save-all", methods=["POST"])
@login_required
def save_all_parse_result(paper_id, parse_id):
    """管理员论文库保存所有解析结果"""
    return _save_all_parse_result_common(paper_id, parse_id)


@user_bp.route("/<paper_id>/parse-results/<parse_id>/save-all", methods=["POST"])
@login_required
def user_save_all_parse_result(paper_id, parse_id):
    """用户论文库保存所有解析结果"""
    return _save_all_parse_result_common(paper_id, parse_id)


def _save_all_parse_result_common(paper_id, parse_id):
    """
    保存所有解析结果，将所有blocks插入到section中
    
    请求体示例: {} (无需额外参数)
    """
    # 统一处理 current_user
    current_user = getattr(g, 'current_user', None)
    if not current_user:
        return bad_request_response("未登录")
    
    # 如果 current_user 是对象：
    user_id = getattr(current_user, "user_id", None)
    # 如果是 dict，就用：
    if user_id is None and hasattr(current_user, 'get'):
        user_id = current_user.get("user_id")
    
    if not user_id:
        return bad_request_response("无法获取用户ID")
    
    try:
        # 获取解析记录
        parse_model = get_parse_blocks_model()
        parse_record = parse_model.find_by_id(parse_id)
        
        if not parse_record:
            return bad_request_response("解析记录不存在")
        
        # 验证权限：只有创建者可以保存
        if parse_record.get("userId") != user_id:
            return bad_request_response("无权限操作此解析结果")
        
        # 验证解析状态
        if parse_record.get("status") != "completed":
            return bad_request_response("只能保存已完成的解析结果")
        
        # 获取所有解析的blocks - 注意：数据库中存储的是"blocks"字段
        all_parsed_blocks = parse_record.get("blocks", [])
        
        if not all_parsed_blocks:
            return bad_request_response("没有可保存的blocks")
        
        # 获取section信息
        section_id = parse_record.get("sectionId")
        paper_id = parse_record.get("paperId")
        user_paper_id = parse_record.get("userPaperId")
        insert_index = parse_record.get("insertIndex", 0)
        temp_block_id = parse_record.get("tempBlockId")
        
        # 判断是个人论文还是公共论文
        is_user_paper = bool(user_paper_id)
        
        if is_user_paper:
            # 个人论文库处理
            service = get_user_paper_service()
            user_paper_result = service.get_user_paper_detail(
                user_paper_id=user_paper_id,
                user_id=user_id
            )
            
            if user_paper_result["code"] != BusinessCode.SUCCESS:
                return bad_request_response(user_paper_result["message"])
            
            # 使用用户论文的ID作为paper_id
            paper_id = user_paper_id
        else:
            # 公共论文库处理
            service = get_paper_service()
            paper_result = service.get_admin_paper_detail(
                paper_id=paper_id,
                user_id=user_id
            )
            
            if paper_result["code"] != BusinessCode.SUCCESS:
                return bad_request_response(paper_result["message"])
        
        # 插入选中的blocks到section
        paper_model = PaperModel()
        content_service = PaperContentService(paper_model)
        
        # 获取section信息
        section_model = get_section_model()
        section = section_model.find_by_id(section_id)
        
        if not section:
            return bad_request_response("章节不存在")
        
        current_content = section.get("content", [])
        
        # 先移除临时parsing block
        if temp_block_id:
            # 检查临时block是否存在
            temp_block_exists = any(block.get("id") == temp_block_id for block in current_content)
            if temp_block_exists:
                # 从当前内容中移除临时block
                current_content = [block for block in current_content if block.get("id") != temp_block_id]
                # 重新计算插入位置（考虑临时block已被移除）
                if insert_index >= len(current_content):
                    insert_index = len(current_content)
            else:
                # 临时block不存在，记录日志但继续执行
                logger.info(f"临时block不存在，可能已被移除 - temp_block_id: {temp_block_id}")
                # 确保插入位置有效
                if insert_index >= len(current_content):
                    insert_index = len(current_content)
        
        # 插入所有blocks
        new_content = current_content.copy()
        new_content[insert_index:insert_index] = all_parsed_blocks
        
        # 更新section
        if not section_model.update_direct(section_id, {"$set": {"content": new_content}}):
            return internal_error_response("更新章节失败")
        
        # 更新解析记录状态为已消费
        parse_model.set_consumed(parse_id)
        
        # 返回更新后的论文数据
        if is_user_paper:
            updated_paper = content_service._get_user_paper_with_sections(paper_id)
        else:
            updated_paper = paper_model.find_paper_with_sections(paper_id)
        
        return success_response({
            "savedBlocks": all_parsed_blocks,
            "parseId": parse_id
        }, "成功保存所有解析结果")
    
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/user/<user_id>", methods=["GET"])
@login_required
def get_user_parse_results(user_id):
    """
    获取指定用户的所有解析结果
    
    查询参数:
    - status: 可选，按状态过滤 (pending|processing|completed|failed|consumed)
    - paperId: 可选，按论文ID过滤
    - limit: 可选，限制返回数量
    - offset: 可选，偏移量
    
    返回数据示例:
    {
        "results": [...],
        "total": 10
    }
    """
    # 统一处理 current_user
    current_user = getattr(g, 'current_user', None)
    if not current_user:
        return bad_request_response("未登录")
    
    # 如果 current_user 是对象：
    current_user_id = getattr(current_user, "user_id", None)
    # 如果是 dict，就用：
    if current_user_id is None and hasattr(current_user, 'get'):
        current_user_id = current_user.get("user_id")
    
    if not current_user_id:
        return bad_request_response("无法获取用户ID")
    
    try:
        # 验证权限：用户只能查看自己的解析结果
        if user_id != current_user_id:
            return bad_request_response("无权限查看其他用户的解析结果")
        
        status = request.args.get("status")
        paper_id = request.args.get("paperId")
        limit = int(request.args.get("limit", 20))
        offset = int(request.args.get("offset", 0))
        
        parse_model = get_parse_blocks_model()
        # 修复方法名：使用正确的 get_user_parse_records 方法
        results = parse_model.get_user_parse_records(
            user_id=user_id,
            status=status,
            limit=limit
        )
        
        return success_response(results, "成功获取解析结果列表")
    
    except Exception as exc:
        return internal_error_response(f"服务器错误: {exc}")


@bp.route("/<paper_id>/extract-references", methods=["POST"])
@login_required
def extract_references_from_content_list(paper_id):
    """管理员论文库从content_list.json提取参考文献"""
    return _extract_references_common(paper_id, False)


@user_bp.route("/<paper_id>/extract-references", methods=["POST"])
@login_required
def user_extract_references_from_content_list(paper_id):
    """用户论文库从content_list.json提取参考文献"""
    return _extract_references_common(paper_id, True)


def _extract_references_common(paper_id, is_user_paper):
    """
    从content_list.json提取参考文献的通用处理函数
    
    Args:
        paper_id: 论文ID
        is_user_paper: 是否是用户论文
        
    Returns:
        处理结果
    """
    # 统一处理 current_user
    current_user = getattr(g, 'current_user', None)
    if not current_user:
        return bad_request_response("未登录")
    
    # 如果 current_user 是对象：
    user_id = getattr(current_user, "user_id", None)
    # 如果是 dict，就用：
    if user_id is None and hasattr(current_user, 'get'):
        user_id = current_user.get("user_id")
    
    if not user_id:
        return bad_request_response("无法获取用户ID")
    
    try:
        from ..services.paperService import get_paper_service
        from ..services.userPaperService import get_user_paper_service
        
        # 获取论文详情
        if is_user_paper:
            service = get_user_paper_service()
            paper_result = service.get_user_paper_detail(
                user_paper_id=paper_id,
                user_id=user_id
            )
        else:
            service = get_paper_service()
            paper_result = service.get_admin_paper_detail(
                paper_id=paper_id,
                user_id=user_id
            )
        
        if paper_result["code"] != BusinessCode.SUCCESS:
            return bad_request_response(paper_result["message"])
        
        paper = paper_result["data"]
        
        # 检查是否有content_list.json附件
        attachments = paper.get("attachments", {})
        content_list = attachments.get("content_list", {})
        
        if not content_list.get("key"):
            return bad_request_response("论文没有content_list.json附件，请先上传PDF并完成解析")
        
        # 获取content_list.json文件路径
        from ..services.qiniuService import get_qiniu_service
        qiniu_service = get_qiniu_service()
        
        # 构建content_list.json的完整路径
        content_list_url = content_list.get("url", "")
        if content_list_url:
            # 如果是完整URL，直接使用
            content_list_path = content_list_url
        else:
            # 如果是相对路径，需要构建完整路径
            # 假设content_list.json存储在与PDF相同的位置
            pdf_attachment = attachments.get("pdf", {})
            pdf_url = pdf_attachment.get("url", "")
            if pdf_url:
                # 从PDF URL构建content_list.json路径
                # 例如：如果PDF路径是 /uploads/papers/abc123.pdf
                # 则content_list.json路径可能是 /uploads/papers/abc123_content_list.json
                pdf_path = pdf_url.split('?')[0] if '?' in pdf_url else pdf_url
                content_list_path = pdf_path.rsplit('.', 1)[0] + '_content_list.json'
            else:
                return bad_request_response("无法确定content_list.json文件路径")
        
        # 调用参考文献提取服务
        from ..services.referenceExtractorService import get_reference_extractor_service
        reference_extractor = get_reference_extractor_service()
        extract_result = reference_extractor.extract_references_from_content_list(content_list_path)
        
        if not extract_result["success"]:
            return internal_error_response(f"提取参考文献失败: {extract_result.get('error', '未知错误')}")
        
        references = extract_result["references"]
        
        # 将参考文献添加到论文
        if is_user_paper:
            # 用户论文库
            user_paper_service = get_user_paper_service()
            add_result = user_paper_service.add_references_to_paper(
                paper_id=paper_id,
                references=references,
                user_id=user_id
            )
        else:
            # 公共论文库
            paper_service = get_paper_service()
            add_result = paper_service.add_references_to_paper(
                paper_id=paper_id,
                references=references,
                user_id=user_id
            )
        
        if add_result["success"]:
            return success_response({
                "message": f"成功提取并添加 {len(references)} 条参考文献",
                "references": references,
                "extraction_info": extract_result.get("extraction_info", {})
            }, "参考文献提取成功")
        else:
            return internal_error_response(f"添加参考文献失败: {add_result.get('message', '未知错误')}")
    
    except Exception as exc:
        return internal_error_response(f"提取参考文献失败: {exc}")

