# user_papers/__init__.py
import logging
from flask import Blueprint

logger = logging.getLogger(__name__)

bp = Blueprint("user_papers", __name__)

# 导入子模块以注册路由（不要删）
from . import papers  # noqa: F401
from . import sections  # noqa: F401
from . import attachments  # noqa: F401
