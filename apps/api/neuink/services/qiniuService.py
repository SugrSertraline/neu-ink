"""
七牛云文件上传服务
处理文件上传到七牛云存储的相关功能
"""
import os
import uuid
import time
from datetime import datetime
from typing import Dict, Any, Optional, Tuple
from qiniu import Auth, put_data, put_file, etag, urlsafe_base64_encode
import json

from ..config.constants import QiniuConfig, BusinessCode


class QiniuService:
    """七牛云文件上传服务类"""
    
    def __init__(self):
        """初始化七牛云服务"""
        # 从环境变量获取配置
        self.access_key = os.getenv('QINIU_ACCESS_KEY')
        self.secret_key = os.getenv('QINIU_SECRET_KEY')
        self.bucket_name = os.getenv('QINIU_BUCKET_NAME')
        self.domain = os.getenv('QINIU_DOMAIN')
        
        # 验证配置是否完整
        if not all([self.access_key, self.secret_key, self.bucket_name, self.domain]):
            raise ValueError("七牛云配置不完整，请检查环境变量: QINIU_ACCESS_KEY, QINIU_SECRET_KEY, QINIU_BUCKET_NAME, QINIU_DOMAIN")
        
        # 初始化七牛云认证
        self.auth = Auth(self.access_key, self.secret_key)
    
    def generate_upload_token(self, key: str, expires: int = 3600) -> str:
        """
        生成七牛云上传凭证
        
        Args:
            key: 文件在七牛云中的存储路径
            expires: 凭证有效期（秒），默认1小时
            
        Returns:
            上传凭证字符串
        """
        # 生成上传策略
        policy = QiniuConfig.UPLOAD_POLICY.copy()
        policy['expires'] = expires
        
        # 生成上传凭证
        token = self.auth.upload_token(self.bucket_name, key, expires, policy)
        return token
    
    def generate_file_key(self, file_extension: str, prefix: str = None, file_type: str = None, filename: str = None) -> str:
        """
        生成文件在七牛云中的存储路径
        
        Args:
            file_extension: 文件扩展名（如 .jpg, .png）
            prefix: 文件路径前缀，优先使用此参数
            file_type: 文件类型（image, document, markdown, paper_image），用于获取对应前缀
            filename: 自定义文件名（不包含扩展名），如果提供则使用此文件名
            
        Returns:
            文件存储路径
        """
        # 如果没有直接指定前缀，但指定了文件类型，则使用文件类型对应的前缀
        if prefix is None and file_type is not None:
            prefix = QiniuConfig.FILE_PREFIXES.get(file_type, QiniuConfig.FILE_PREFIX)
        elif prefix is None:
            prefix = QiniuConfig.FILE_PREFIX
        
        # 如果提供了自定义文件名，则使用它；否则生成唯一文件名
        if filename is not None:
            final_filename = f"{filename}{file_extension}"
        else:
            timestamp = int(time.time())
            unique_id = str(uuid.uuid4())[:8]
            final_filename = f"{timestamp}_{unique_id}{file_extension}"
        
        # 组合完整路径
        return f"{prefix}{final_filename}"
    
    def upload_file_data(self, file_data: bytes, file_extension: str, prefix: str = None, file_type: str = None, filename: str = None) -> Dict[str, Any]:
        """
        上传文件数据到七牛云
        
        Args:
            file_data: 文件二进制数据
            file_extension: 文件扩展名（如 .jpg, .png）
            prefix: 文件路径前缀，优先使用此参数
            file_type: 文件类型（image, document, markdown, paper_image），用于获取对应前缀
            filename: 自定义文件名（不包含扩展名），如果提供则使用此文件名
            
        Returns:
            上传结果，包含文件URL等信息
        """
        try:
            # 生成文件存储路径
            key = self.generate_file_key(file_extension, prefix, file_type, filename)
            
            # 获取MIME类型
            mime_type = self._get_content_type(file_extension)
            
            # 生成上传凭证
            token = self.generate_upload_token(key)
            
            # 记录上传前的调试信息
            print(f"[DEBUG] 准备上传到七牛云:")
            print(f"[DEBUG] Bucket: {self.bucket_name}")
            print(f"[DEBUG] Key: {key}")
            print(f"[DEBUG] Token: {token[:50]}..." if len(token) > 50 else f"[DEBUG] Token: {token}")
            print(f"[DEBUG] File size: {len(file_data)} bytes")
            print(f"[DEBUG] MIME type: {mime_type}")
            
            # 上传文件数据，指定MIME类型
            ret, info = put_data(token, key, file_data, mime_type=mime_type)
            
            # 记录上传后的调试信息
            print(f"[DEBUG] 上传结果:")
            print(f"[DEBUG] Status code: {info.status_code}")
            print(f"[DEBUG] Response body: {info.text_body}")
            print(f"[DEBUG] Return data: {ret}")
            
            if info.status_code == 200:
                # 构建文件访问URL
                file_url = f"https://{self.domain}/{key}"
                
                return {
                    "success": True,
                    "key": key,
                    "url": file_url,
                    "hash": ret.get('hash', ''),
                    "size": len(file_data),
                    "contentType": self._get_content_type(file_extension),
                    "uploadedAt": datetime.utcnow().isoformat()
                }
            else:
                return {
                    "success": False,
                    "error": f"上传失败，状态码: {info.status_code}",
                    "errorBody": info.text_body,
                    "debugInfo": {
                        "bucket": self.bucket_name,
                        "key": key,
                        "tokenPreview": token[:50] + "..." if len(token) > 50 else token
                    }
                }
                
        except Exception as e:
            print(f"[DEBUG] 上传异常: {str(e)}")
            import traceback
            print(f"[DEBUG] 异常堆栈: {traceback.format_exc()}")
            return {
                "success": False,
                "error": f"上传异常: {str(e)}",
                "debugInfo": {
                    "bucket": self.bucket_name,
                    "accessKey": self.access_key[:10] + "..." if self.access_key else None,
                    "secretKey": "***" if self.secret_key else None,
                    "domain": self.domain
                }
            }
    
    def upload_file(self, file_path: str, file_extension: str, prefix: str = None) -> Dict[str, Any]:
        """
        上传本地文件到七牛云
        
        Args:
            file_path: 本地文件路径
            file_extension: 文件扩展名（如 .jpg, .png）
            prefix: 文件路径前缀
            
        Returns:
            上传结果，包含文件URL等信息
        """
        try:
            # 生成文件存储路径
            key = self.generate_file_key(file_extension, prefix)
            
            # 生成上传凭证
            token = self.generate_upload_token(key)
            
            # 上传文件
            ret, info = put_file(token, key, file_path)
            
            if info.status_code == 200:
                # 构建文件访问URL
                file_url = f"https://{self.domain}/{key}"
                
                return {
                    "success": True,
                    "key": key,
                    "url": file_url,
                    "hash": ret.get('hash', ''),
                    "size": os.path.getsize(file_path),
                    "contentType": self._get_content_type(file_extension),
                    "uploadedAt": datetime.utcnow().isoformat()
                }
            else:
                return {
                    "success": False,
                    "error": f"上传失败，状态码: {info.status_code}",
                    "errorBody": info.text_body
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"上传异常: {str(e)}"
            }
    
    def delete_file(self, key: str) -> Dict[str, Any]:
        """
        删除七牛云中的文件
        
        Args:
            key: 文件在七牛云中的存储路径
            
        Returns:
            删除结果
        """
        try:
            from qiniu import BucketManager
            
            # 初始化资源管理器
            bucket = BucketManager(self.auth)
            
            # 删除文件
            ret, info = bucket.delete(self.bucket_name, key)
            
            if info.status_code == 200:
                return {
                    "success": True,
                    "message": "文件删除成功"
                }
            else:
                return {
                    "success": False,
                    "error": f"删除失败，状态码: {info.status_code}",
                    "errorBody": info.text_body
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"删除异常: {str(e)}"
            }
    
    def get_file_info(self, key: str) -> Dict[str, Any]:
        """
        获取七牛云中文件的信息
        
        Args:
            key: 文件在七牛云中的存储路径
            
        Returns:
            文件信息
        """
        try:
            from qiniu import BucketManager
            
            # 初始化资源管理器
            bucket = BucketManager(self.auth)
            
            # 获取文件信息
            ret, info = bucket.stat(self.bucket_name, key)
            
            if info.status_code == 200:
                return {
                    "success": True,
                    "hash": ret.get('hash', ''),
                    "size": ret.get('fsize', 0),
                    "contentType": ret.get('mimeType', ''),
                    "putTime": ret.get('putTime', 0)
                }
            else:
                return {
                    "success": False,
                    "error": f"获取文件信息失败，状态码: {info.status_code}",
                    "errorBody": info.text_body
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"获取文件信息异常: {str(e)}"
            }
    
    def _get_content_type(self, file_extension: str) -> str:
        """
        根据文件扩展名获取MIME类型
        
        Args:
            file_extension: 文件扩展名
            
        Returns:
            MIME类型字符串
        """
        content_types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.txt': 'text/plain',
            '.md': 'text/markdown',
        }
        
        return content_types.get(file_extension.lower(), 'application/octet-stream')
    
    def validate_file(self, file_data: bytes, file_extension: str) -> Tuple[bool, str]:
        """
        验证文件是否符合上传要求
        
        Args:
            file_data: 文件二进制数据
            file_extension: 文件扩展名
            
        Returns:
            (是否有效, 错误信息)
        """
        # 检查文件大小
        max_size = QiniuConfig.UPLOAD_POLICY.get('fsizeLimit', 10485760)  # 默认10MB
        if len(file_data) > max_size:
            return False, f"文件大小超过限制，最大允许 {max_size // (1024*1024)}MB"
        
        # 检查文件类型
        mime_limit = QiniuConfig.UPLOAD_POLICY.get('mimeLimit', 'image/*;application/pdf;text/*')
        content_type = self._get_content_type(file_extension)
        
        # 解析允许的MIME类型
        allowed_types = [t.strip() for t in mime_limit.split(';')]
        
        # 检查文件类型是否在允许列表中
        is_allowed = False
        for allowed_type in allowed_types:
            if allowed_type.endswith('/*'):
                # 通配符匹配
                prefix = allowed_type[:-1]
                if content_type.startswith(prefix):
                    is_allowed = True
                    break
            elif allowed_type == content_type:
                # 精确匹配
                is_allowed = True
                break
        
        if not is_allowed:
            return False, f"不支持的文件类型: {content_type}，允许的类型: {mime_limit}"
        
        return True, ""


# 全局实例
_qiniu_service: Optional[QiniuService] = None


def get_qiniu_service() -> QiniuService:
    """获取七牛云服务实例（单例模式）"""
    global _qiniu_service
    if _qiniu_service is None:
        _qiniu_service = QiniuService()
    return _qiniu_service


def is_qiniu_configured() -> bool:
    """检查七牛云是否已配置"""
    required_env_vars = ['QINIU_ACCESS_KEY', 'QINIU_SECRET_KEY', 'QINIU_BUCKET_NAME', 'QINIU_DOMAIN']
    return all(os.getenv(var) for var in required_env_vars)