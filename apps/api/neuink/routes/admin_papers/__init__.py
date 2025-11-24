# neuink/api/admin_papers/__init__.py
import logging
from datetime import datetime

from flask import Blueprint, request

from ...utils.common import bad_request_response

logger = logging.getLogger(__name__)

bp = Blueprint("admin_papers", __name__)

# -------- 这里放公共的小工具函数（原文件顶部那几个） --------

def _serialize_datetime_in_dict(data):
    """
    递归序列化字典中的所有datetime对象为ISO格式字符串
    """
    if isinstance(data, dict):
        return {key: _serialize_datetime_in_dict(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [_serialize_datetime_in_dict(item) for item in data]
    elif isinstance(data, datetime):
        return data.isoformat()
    else:
        return data


def _parse_pagination_args():
    page = int(request.args.get("page", 1))
    page_size = min(int(request.args.get("pageSize", 20)), 100)
    return page, page_size


def _parse_sort_args():
    return request.args.get("sortBy", "createdAt"), request.args.get("sortOrder", "desc")


def _parse_admin_filters():
    """
    管理端筛选项：是否公开、解析状态等。
    可根据业务继续补充。
    """
    filters = {}
    if request.args.get("isPublic") is not None:
        filters["isPublic"] = request.args.get("isPublic").lower() == "true"
    if request.args.get("parseStatus"):
        filters["parseStatus"] = request.args["parseStatus"]
    if request.args.get("year"):
        filters["year"] = request.args.get("year", type=int)
    if request.args.get("articleType"):
        filters["articleType"] = request.args["articleType"]
    if request.args.get("tag"):
        filters["tag"] = request.args["tag"]
    if request.args.get("createdBy"):
        filters["createdBy"] = request.args["createdBy"]
    return filters


# -------- 在这里导入子模块，让它们上的路由自动挂到 bp 上 --------
# ⚠️ 一定要放在文件底部，避免循环引用
from . import papers      # noqa: E402,F401
from . import sections    # noqa: E402,F401
from . import attachments # noqa: E402,F401
