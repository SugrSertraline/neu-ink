"""
后端类型定义模块
定义 NeuInk 后端 API 的数据类型和响应格式
"""

from typing import Dict, List, Optional, Union, TypedDict, Literal
from datetime import datetime
from enum import Enum


# ==================== API 相关类型 ====================

class User(TypedDict):
    """用户类型 - 对应 shared/types/api.ts 中的 User"""
    id: str
    email: str
    name: str
    avatar: Optional[str]
    isAdmin: bool
    createdAt: datetime
    updatedAt: datetime


class CreateUserRequest(TypedDict):
    """创建用户请求 - 对应 shared/types/api.ts"""
    email: str
    name: str
    password: str


class LoginRequest(TypedDict):
    """登录请求 - 对应 shared/types/api.ts"""
    email: str
    password: str


class LoginResponse(TypedDict):
    """登录响应 - 对应 shared/types/api.ts"""
    user: User
    token: str


# 论文状态枚举
PaperStatus = Literal['pending', 'approved', 'rejected']


class Paper(TypedDict):
    """论文类型 - 对应 shared/types/api.ts"""
    id: str
    title: str
    authors: List[str]
    abstract: str
    content: str
    fileUrl: str
    uploadedBy: str
    status: PaperStatus
    tags: List[str]
    createdAt: datetime
    updatedAt: datetime


class CreatePaperRequest(TypedDict):
    """创建论文请求 - 对应 shared/types/api.ts"""
    title: str
    authors: List[str]
    abstract: str
    content: str
    tags: Optional[List[str]]


class UpdatePaperRequest(TypedDict, total=False):
    """更新论文请求 - 对应 shared/types/api.ts"""
    title: Optional[str]
    authors: Optional[List[str]]
    abstract: Optional[str]
    content: Optional[str]
    tags: Optional[List[str]]
    status: Optional[PaperStatus]


class UserPaper(TypedDict):
    """用户论文关系 - 对应 shared/types/api.ts"""
    id: str
    userId: str
    paperId: str
    readingProgress: int  # 0-100
    isFavorite: bool
    addedAt: datetime
    lastReadAt: Optional[datetime]


class Checklist(TypedDict):
    """清单类型 - 对应 shared/types/api.ts"""
    id: str
    name: str
    description: Optional[str]
    userId: str
    isPublic: bool
    createdAt: datetime
    updatedAt: datetime


class ChecklistPaper(TypedDict):
    """清单论文类型 - 对应 shared/types/api.ts"""
    id: str
    checklistId: str
    paperId: str
    order: int
    addedAt: datetime


class Note(TypedDict):
    """笔记类型 - 对应 shared/types/api.ts"""
    id: str
    userId: str
    paperId: str
    content: str
    blockIndex: Optional[int]
    isPrivate: bool
    createdAt: datetime
    updatedAt: datetime


class CreateNoteRequest(TypedDict):
    """创建笔记请求 - 对应 shared/types/api.ts"""
    paperId: str
    content: str
    blockIndex: Optional[int]
    isPrivate: Optional[bool]


class Comment(TypedDict):
    """评论类型 - 对应 shared/types/api.ts"""
    id: str
    userId: str
    paperId: str
    content: str
    blockIndex: Optional[int]
    parentId: Optional[str]
    tags: List[str]
    createdAt: datetime
    updatedAt: datetime


class CreateCommentRequest(TypedDict):
    """创建评论请求 - 对应 shared/types/api.ts"""
    paperId: str
    content: str
    blockIndex: Optional[int]
    parentId: Optional[str]
    tags: Optional[List[str]]


class ApiResponse(TypedDict):
    """API 响应类型 - 对应 shared/types/api.ts"""
    success: bool
    data: Optional[Union[Dict, List, str, int, bool]]
    message: Optional[str]
    error: Optional[str]


class PaginatedResponse(TypedDict):
    """分页响应类型 - 对应 shared/types/api.ts"""
    items: List[Dict]
    total: int
    page: int
    limit: int
    totalPages: int


class PaginationParams(TypedDict, total=False):
    """分页参数 - 对应 shared/types/api.ts"""
    page: Optional[int]
    limit: Optional[int]


class SearchParams(PaginationParams, total=False):
    """搜索参数 - 对应 shared/types/api.ts"""
    q: Optional[str]
    tags: Optional[List[str]]
    status: Optional[str]
    sortBy: Optional[str]
    sortOrder: Optional[Literal['asc', 'desc']]


# ==================== 通用类型 ====================

Environment = Literal['development', 'staging', 'production']
HttpMethod = Literal['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
ResponseStatus = Literal['success', 'error', 'warning', 'info']


class FileInfo(TypedDict):
    """文件信息 - 对应 shared/types/common.ts"""
    name: str
    size: int
    type: str
    lastModified: int
    url: Optional[str]


class UploadedFile(FileInfo):
    """上传文件 - 对应 shared/types/common.ts"""
    id: str
    uploadedAt: datetime
    uploadedBy: str
    checksum: str
    status: Literal['uploading', 'processing', 'completed', 'failed']


class AppError(TypedDict):
    """应用错误 - 对应 shared/types/common.ts"""
    code: str
    message: str
    details: Optional[Dict]
    timestamp: datetime
    requestId: Optional[str]


# ==================== 数据库相关类型 ====================

class ContentBlock(TypedDict):
    """内容块 - 对应 shared/types/database.ts"""
    id: str
    type: Literal['heading', 'paragraph', 'list', 'code', 'quote', 'image', 'table']
    content: str
    level: Optional[int]  # For headings
    order: int
    metadata: Optional[Dict]


class PaperMetadata(TypedDict):
    """论文元数据 - 对应 shared/types/database.ts"""
    doi: Optional[str]
    arxivId: Optional[str]
    journal: Optional[str]
    publishedDate: Optional[datetime]
    keywords: List[str]
    subjects: List[str]
    citationCount: Optional[int]
    references: List[Dict]


class UserDocument(TypedDict):
    """用户文档 - 对应 shared/types/database.ts"""
    _id: str
    email: str
    name: str
    avatar: Optional[str]
    isAdmin: bool
    passwordHash: str
    refreshTokens: List[str]
    lastLoginAt: Optional[datetime]
    emailVerified: bool
    emailVerificationToken: Optional[str]
    passwordResetToken: Optional[str]
    passwordResetExpires: Optional[datetime]
    createdAt: datetime
    updatedAt: datetime


class PaperDocument(TypedDict):
    """论文文档 - 对应 shared/types/database.ts"""
    _id: str
    title: str
    authors: List[str]
    abstract: str
    content: str
    fileUrl: str
    uploadedBy: str
    status: PaperStatus
    tags: List[str]
    originalFileName: str
    fileSize: int
    mimeType: str
    checksum: str
    parsedContent: Optional[Dict]
    approvedBy: Optional[str]
    approvedAt: Optional[datetime]
    rejectedBy: Optional[str]
    rejectedAt: Optional[datetime]
    rejectionReason: Optional[str]
    createdAt: datetime
    updatedAt: datetime


# ==================== 工具函数 ====================

def create_api_response(
    success: bool = True,
    data: Optional[Union[Dict, List, str, int, bool]] = None,
    message: Optional[str] = None,
    error: Optional[str] = None
) -> ApiResponse:
    """创建标准 API 响应"""
    return ApiResponse(
        success=success,
        data=data,
        message=message,
        error=error
    )


def create_paginated_response(
    items: List[Dict],
    total: int,
    page: int,
    limit: int
) -> PaginatedResponse:
    """创建分页响应"""
    total_pages = (total + limit - 1) // limit  # 向上取整
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        totalPages=total_pages
    )


def mongo_doc_to_api_user(doc: UserDocument) -> User:
    """将 MongoDB 用户文档转换为 API 用户对象"""
    return User(
        id=doc['_id'],
        email=doc['email'],
        name=doc['name'],
        avatar=doc.get('avatar'),
        isAdmin=doc['isAdmin'],
        createdAt=doc['createdAt'],
        updatedAt=doc['updatedAt']
    )


def mongo_doc_to_api_paper(doc: PaperDocument) -> Paper:
    """将 MongoDB 论文文档转换为 API 论文对象"""
    return Paper(
        id=doc['_id'],
        title=doc['title'],
        authors=doc['authors'],
        abstract=doc['abstract'],
        content=doc['content'],
        fileUrl=doc['fileUrl'],
        uploadedBy=doc['uploadedBy'],
        status=doc['status'],
        tags=doc['tags'],
        createdAt=doc['createdAt'],
        updatedAt=doc['updatedAt']
    )


# ==================== 常量映射 ====================

# 从 constants.py 映射到 shared types
PAPER_STATUS_MAPPING = {
    'pending': 'pending',
    'approved': 'approved', 
    'rejected': 'rejected'
}

USER_ROLE_MAPPING = {
    'user': 'user',
    'admin': 'admin',
    'moderator': 'moderator'
}

# 集合名称映射
COLLECTION_NAMES = {
    'USERS': 'users',
    'PAPERS': 'papers',
    'USER_PAPERS': 'user_papers',
    'CHECKLISTS': 'checklists',
    'NOTES': 'notes',
    'COMMENTS': 'comments',
    'SESSIONS': 'sessions',
}