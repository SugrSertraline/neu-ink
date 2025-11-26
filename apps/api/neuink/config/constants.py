"""配置常量"""

# JWT 相关常量
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRES_DEFAULT = 36000  # 10小时,单位:秒

# 管理员用户名
ADMIN_USERNAME = "admin"


# 响应状态码
class ResponseCode:
    SUCCESS = 200
    CREATED = 201
    BAD_REQUEST = 400
    UNAUTHORIZED = 401
    FORBIDDEN = 403
    NOT_FOUND = 404
    CONFLICT = 409
    INTERNAL_ERROR = 500


# 业务状态码(用于data内部的code字段)
class BusinessCode:
    SUCCESS = 0                    # 业务成功
    LOGIN_FAILED = 1001           # 登录失败(用户名或密码错误)
    ACCOUNT_DISABLED = 1002       # 账号被禁用
    PASSWORD_EXPIRED = 1003       # 密码已过期
    INVALID_PARAMS = 1004         # 参数错误
    USER_NOT_FOUND = 1005         # 用户不存在
    USER_EXISTS = 1006            # 用户已存在
    PERMISSION_DENIED = 1007      # 权限不足
    TOKEN_INVALID = 1008          # Token无效
    TOKEN_EXPIRED = 1009          # Token已过期
    OLD_PASSWORD_WRONG = 1010     # 旧密码错误
    UNKNOWN_ERROR = 1998          # 未知错误
    INTERNAL_ERROR = 1999         # 服务器内部错误
    
    # 论文相关 2000-2099
    PAPER_NOT_FOUND = 2001
    PAPER_CREATION_FAILED = 2002
    PAPER_UPDATE_FAILED = 2003
    PAPER_DELETE_FAILED = 2004
    INVALID_PAPER_DATA = 2005
    
    # 笔记相关 3000-3099
    NOTE_NOT_FOUND = 3001
    NOTE_CREATION_FAILED = 3002
    NOTE_UPDATE_FAILED = 3003
    NOTE_DELETE_FAILED = 3004


# 响应消息
class ResponseMessage:
    SUCCESS = "操作成功"
    CREATED = "创建成功"
    INVALID_PARAMS = "参数错误"
    UNAUTHORIZED = "未授权访问"
    FORBIDDEN = "权限不足"
    NOT_FOUND = "资源不存在"
    USER_EXISTS = "用户已存在"
    USER_NOT_FOUND = "用户不存在"
    INVALID_CREDENTIALS = "用户名或密码错误"
    TOKEN_INVALID = "Token无效"
    TOKEN_EXPIRED = "Token已过期"
    INTERNAL_ERROR = "服务器内部错误"


# 业务消息
class BusinessMessage:
    SUCCESS = "操作成功"
    LOGIN_FAILED = "用户名或密码错误"
    ACCOUNT_DISABLED = "账号已被禁用"
    PASSWORD_EXPIRED = "密码已过期,请重新设置"
    INVALID_PARAMS = "参数错误"
    USER_NOT_FOUND = "用户不存在"
    USER_EXISTS = "用户已存在"
    PERMISSION_DENIED = "权限不足"
    TOKEN_INVALID = "Token无效"
    TOKEN_EXPIRED = "Token已过期"
    OLD_PASSWORD_WRONG = "旧密码错误"
    INTERNAL_ERROR = "服务器内部错误"


# 用户相关常量
class UserStatus:
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


# 集合名称
class Collections:
    """MongoDB 集合名称"""
    USER = "User"
    ADMIN_PAPER = "AdminPaper"  # 管理员论文集合
    USER_PAPER = "UserPaper"
    NOTE = "Note"
    SECTION = "Section"
    PARSE_BLOCKS = "ParseBlocks"
    PARSING_SESSIONS = "ParsingSessions"


# 论文状态
class PaperStatus:
    PENDING = "pending"
    PARSING = "parsing"
    COMPLETED = "completed"
    FAILED = "failed"


# 论文类型
class ArticleType:
    JOURNAL = "journal"
    CONFERENCE = "conference"
    PREPRINT = "preprint"
    BOOK = "book"
    THESIS = "thesis"


# 阅读状态
class ReadingStatus:
    UNREAD = "unread"
    READING = "reading"
    FINISHED = "finished"


# 优先级
class Priority:
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


# 七牛云配置
class QiniuConfig:
    # 七牛云访问密钥（需要从环境变量获取）
    ACCESS_KEY = None  # 从环境变量 QINIU_ACCESS_KEY 获取
    SECRET_KEY = None  # 从环境变量 QINIU_SECRET_KEY 获取
    
    # 存储空间名称（需要从环境变量获取）
    BUCKET_NAME = None  # 从环境变量 QINIU_BUCKET_NAME 获取
    
    # 访问域名（需要从环境变量获取）
    DOMAIN = None  # 从环境变量 QINIU_DOMAIN 获取
    
    # 上传策略配置
    UPLOAD_POLICY = {
        "mimeLimit": "image/*;application/pdf;text/plain;text/markdown;text/x-markdown;application/octet-stream;application/zip;application/json",  # 限制上传文件类型，添加markdown、zip和json支持
        "fsizeLimit": 52428800,  # 限制文件大小为50MB (50 * 1024 * 1024)
        "detectMime": 0,  # 禁用自动MIME检测，使用指定的MIME类型
    }
    
    # 文件路径前缀配置
    FILE_PREFIXES = {
        "image": "neuink/image/",  # 图片存储路径前缀
        "document": "neuink/document/",  # 文档存储路径前缀
        "pdf": "neuink/pdf/",  # PDF文件存储路径前缀
        "markdown": "neuink/markdown/",  # Markdown文件存储路径前缀
        "paper_image": "neuink/paper_image/",  # 论文图片存储路径前缀
        "content_list": "neuink/content_list/",  # content_list.json文件存储路径前缀
        # 新的统一目录结构（推荐使用）
        "unified_paper": "neuink/{paper_id}/",  # 统一的论文目录结构
    }
    
    # 默认文件路径前缀（向后兼容）
    FILE_PREFIX = "neuink/image/"  # 默认使用图片路径前缀