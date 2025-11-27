"""
七牛云文件上传服务
处理文件上传到七牛云存储的相关功能
"""
import os
import uuid
import time
from datetime import datetime
from typing import Dict, Any, Optional, Tuple
# 延迟导入 qiniu 模块，避免在模块加载时就出现错误
# from qiniu import Auth, put_data, put_file, etag, urlsafe_base64_encode
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
        
        # 延迟初始化七牛云认证
        self.auth = None
        self._init_auth()
    
    def _init_auth(self):
        """初始化七牛云认证"""
        if self.auth is None:
            try:
                from qiniu import Auth
                self.auth = Auth(self.access_key, self.secret_key)
            except ImportError as e:
                raise ImportError(f"无法导入七牛云模块，请确保已安装 qiniu 库: {str(e)}")
    
    def generate_upload_token(self, key: str, expires: int = 3600, overwrite: bool = True) -> str:
        """
        生成七牛云上传凭证
        
        Args:
            key: 文件在七牛云中的存储路径
            expires: 凭证有效期（秒），默认1小时
            overwrite: 是否覆盖已存在的文件，默认为True
            
        Returns:
            上传凭证字符串
        """
        # 确保认证已初始化
        self._init_auth()
        
        # 生成上传策略
        policy = QiniuConfig.UPLOAD_POLICY.copy()
        policy['expires'] = expires
        
        # 如果需要覆盖已存在的文件，设置scope为bucket:key
        if overwrite:
            policy['scope'] = f"{self.bucket_name}:{key}"
        else:
            policy['scope'] = self.bucket_name
        
        # 生成上传凭证
        token = self.auth.upload_token(self.bucket_name, key, expires, policy)
        return token
    
    def generate_file_key(self, file_extension: str, prefix: str = None, file_type: str = None, filename: str = None, paper_id: str = None) -> str:
        """
        生成文件在七牛云中的存储路径
        
        Args:
            file_extension: 文件扩展名（如 .jpg, .png）
            prefix: 文件路径前缀，优先使用此参数
            file_type: 文件类型（image, document, markdown, paper_image, unified_paper），用于获取对应前缀
            filename: 自定义文件名（不包含扩展名），如果提供则使用此文件名
            paper_id: 论文ID，用于统一目录结构
            
        Returns:
            文件存储路径
        """
        # 处理统一目录结构
        if file_type == "unified_paper" and paper_id:
            # 使用统一目录结构：neuink/{paper_id}/
            base_prefix = QiniuConfig.FILE_PREFIXES["unified_paper"].format(paper_id=paper_id)
            
            # 如果提供了自定义文件名，则使用它；否则生成唯一文件名
            if filename is not None:
                # 处理图片子目录的情况
                if filename.startswith("images/"):
                    # 如果filename已经包含images/前缀，直接使用
                    final_filename = filename
                    # 检查是否需要添加扩展名
                    if not final_filename.endswith(file_extension):
                        final_filename = f"{filename}{file_extension}"
                else:
                    # 检查filename是否已经包含扩展名，避免重复添加
                    if not filename.endswith(file_extension):
                        final_filename = f"{filename}{file_extension}"
                    else:
                        final_filename = filename
            else:
                timestamp = int(time.time())
                unique_id = str(uuid.uuid4())[:8]
                final_filename = f"{timestamp}_{unique_id}{file_extension}"
            
            # 组合完整路径
            return f"{base_prefix}{final_filename}"
        
        # 如果没有直接指定前缀，但指定了文件类型，则使用文件类型对应的前缀
        if prefix is None and file_type is not None:
            prefix = QiniuConfig.FILE_PREFIXES.get(file_type, QiniuConfig.FILE_PREFIX)
        elif prefix is None:
            prefix = QiniuConfig.FILE_PREFIX
        
        # 如果提供了自定义文件名，则使用它；否则生成唯一文件名
        if filename is not None:
            # 检查filename是否已经包含扩展名，避免重复添加
            if not filename.endswith(file_extension):
                final_filename = f"{filename}{file_extension}"
            else:
                final_filename = filename
        else:
            timestamp = int(time.time())
            unique_id = str(uuid.uuid4())[:8]
            final_filename = f"{timestamp}_{unique_id}{file_extension}"
        
        # 组合完整路径
        return f"{prefix}{final_filename}"
    
    def upload_file_data(self, file_data: bytes, file_extension: str, prefix: str = None, file_type: str = None, filename: str = None, paper_id: str = None, overwrite: bool = True) -> Dict[str, Any]:
        """
        上传文件数据到七牛云
        
        Args:
            file_data: 文件二进制数据
            file_extension: 文件扩展名（如 .jpg, .png）
            prefix: 文件路径前缀，优先使用此参数
            file_type: 文件类型（image, document, markdown, paper_image, unified_paper），用于获取对应前缀
            filename: 自定义文件名（不包含扩展名），如果提供则使用此文件名
            paper_id: 论文ID，用于统一目录结构
            overwrite: 是否覆盖已存在的文件，默认为True
            
        Returns:
            上传结果，包含文件URL等信息
        """
        try:
            # 导入七牛云模块
            from qiniu import put_data
            
            # 生成文件存储路径
            key = self.generate_file_key(file_extension, prefix, file_type, filename, paper_id)
            
            # 获取MIME类型
            mime_type = self._get_content_type(file_extension)
            
            # 生成上传凭证，默认允许覆盖已存在的文件
            token = self.generate_upload_token(key, overwrite=overwrite)
            
            # 上传文件数据，指定MIME类型
            ret, info = put_data(token, key, file_data, mime_type=mime_type)
            
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
    
    
    def delete_file(self, key: str) -> Dict[str, Any]:
        """
        删除七牛云中的文件
        
        Args:
            key: 文件在七牛云中的存储路径
            
        Returns:
            删除结果
        """
        try:
            # 确保认证已初始化
            self._init_auth()
            
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
    
    
    def fetch_file_content(self, url: str, max_retries: int = 3) -> Dict[str, Any]:
        """
        从七牛云获取文件内容（直接使用数据库中的URL，带重试机制）
        
        Args:
            url: 文件的完整URL（来自数据库attachments中的url字段）
            max_retries: 最大重试次数，默认3次
           
        Returns:
            文件内容（base64编码）和相关信息
        """
        import requests
        import base64
        import time
       
        # 验证URL格式
        if not url or not isinstance(url, str):
            return {
                "success": False,
                "error": "无效的URL"
            }
        
        # 直接使用数据库中的URL，不进行路径猜测
        download_url = url
        
        # 使用简化的请求头
        headers = {
            'User-Agent': 'NeuInk-PDF-Viewer/1.0',
            'Accept': 'application/pdf,*/*',
        }
       
        # 重试机制
        last_exception = None
        for attempt in range(max_retries):
            try:
                # 发送HTTP请求获取文件，启用SSL证书验证
                response = requests.get(
                    download_url,
                    timeout=60,
                    headers=headers,
                    verify=True  # 启用SSL证书验证
                )
                response.raise_for_status()
               
                # 将文件内容编码为base64
                content_base64 = base64.b64encode(response.content).decode('utf-8')
               
                return {
                    "success": True,
                    "content": content_base64,
                    "size": len(response.content),
                    "contentType": response.headers.get('content-type', 'application/octet-stream')
                }
               
            except requests.exceptions.RequestException as e:
                last_exception = e
                error_msg = f"网络请求失败: {str(e)}"
                # 添加更详细的错误信息
                if hasattr(e, 'response') and e.response is not None:
                    error_msg += f" (状态码: {e.response.status_code})"
                    if hasattr(e.response, 'text'):
                        error_msg += f" (响应: {e.response.text[:200]})"
               
                # 如果不是最后一次尝试，等待一段时间再重试
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt  # 指数退避：1s, 2s, 4s
                    time.sleep(wait_time)
               
            except Exception as e:
                last_exception = e
               
                # 如果不是最后一次尝试，等待一段时间再重试
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt  # 指数退避：1s, 2s, 4s
                    time.sleep(wait_time)
       
        # 所有重试都失败了
        error_msg = f"获取文件内容失败，已重试 {max_retries} 次"
        if last_exception:
            if isinstance(last_exception, requests.exceptions.RequestException):
                error_msg += f"。最后错误: {str(last_exception)}"
                if hasattr(last_exception, 'response') and last_exception.response is not None:
                    error_msg += f" (状态码: {last_exception.response.status_code})"
            else:
                error_msg += f"。最后错误: {str(last_exception)}"
        
        
        return {
            "success": False,
            "error": error_msg
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
            '.json': 'application/json',
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
        try:
            _qiniu_service = QiniuService()
        except ImportError as e:
            raise ImportError(f"无法初始化七牛云服务，请确保已安装 qiniu 库: {str(e)}")
        except ValueError as e:
            raise ValueError(f"七牛云配置错误: {str(e)}")
    return _qiniu_service


def is_qiniu_configured() -> bool:
    """检查七牛云是否已配置"""
    required_env_vars = ['QINIU_ACCESS_KEY', 'QINIU_SECRET_KEY', 'QINIU_BUCKET_NAME', 'QINIU_DOMAIN']
    return all(os.getenv(var) for var in required_env_vars)