"""
密码加密工具模块
"""
import hashlib
import hmac
import os
from typing import Tuple

def generate_salt() -> str:
    """生成随机盐值"""
    return os.urandom(32).hex()

def hash_password(password: str, salt: str = None) -> Tuple[str, str]:
    """
    使用SHA256加密密码
    
    Args:
        password: 明文密码
        salt: 可选的盐值，如果不提供则生成新的
    
    Returns:
        Tuple[hashed_password, salt]: 加密后的密码和使用的盐值
    """
    if salt is None:
        salt = generate_salt()
    
    # 使用HMAC-SHA256进行密码哈希
    password_bytes = password.encode('utf-8')
    salt_bytes = salt.encode('utf-8')
    
    hashed = hmac.new(salt_bytes, password_bytes, hashlib.sha256).hexdigest()
    
    return hashed, salt

def verify_password(password: str, hashed_password: str, salt: str) -> bool:
    """
    验证密码
    
    Args:
        password: 待验证的明文密码
        hashed_password: 数据库中存储的加密密码
        salt: 对应的盐值
    
    Returns:
        bool: 密码是否匹配
    """
    computed_hash, _ = hash_password(password, salt)
    return hmac.compare_digest(computed_hash, hashed_password)

def migrate_plain_password(plain_password: str) -> Tuple[str, str]:
    """
    迁移明文密码到加密格式
    
    Args:
        plain_password: 明文密码
    
    Returns:
        Tuple[hashed_password, salt]: 加密后的密码和盐值
    """
    return hash_password(plain_password)