#!/usr/bin/env python3
"""
密码哈希生成工具
用于为现有用户生成SHA256哈希密码，以便手动更新数据库
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from neuink.utils.password_utils import hash_password

def generate_password_hash():
    """交互式生成密码哈希"""
    print("=" * 60)
    print("NeuInk 密码哈希生成工具")
    print("=" * 60)
    print()
    
    while True:
        password = input("请输入要哈希的密码（输入 'quit' 退出）: ").strip()
        
        if password.lower() == 'quit':
            break
            
        if not password:
            print("密码不能为空！")
            continue
            
        # 生成哈希
        hashed_password, salt = hash_password(password)
        
        print("\n" + "=" * 40)
        print("哈希结果：")
        print("=" * 40)
        print(f"原始密码: {password}")
        print(f"哈希密码: {hashed_password}")
        print(f"盐值: {salt}")
        print()
        
        # 生成MongoDB更新语句
        print("MongoDB更新语句：")
        print("-" * 40)
        username = input("请输入用户名（用于生成更新语句）: ").strip()
        if username:
            print('db.users.updateOne({{"username": "' + username + '"}, {"$set": {"password": "' + hashed_password + '", "salt": "' + salt + '"}})')
        else:
            print('db.users.updateOne({{"username": "your_username"}, {"$set": {"password": "' + hashed_password + '", "salt": "' + salt + '"}})')
        
        print("\n" + "=" * 60)
        print()

def batch_generate():
    """批量生成预设用户的密码哈希"""
    print("=" * 60)
    print("批量生成常用用户密码哈希")
    print("=" * 60)
    
    # 预设的用户名和密码
    preset_users = [
        ("admin", "admin123"),
        ("user", "user123"),
        ("test", "test123"),
    ]
    
    print("预设用户密码对：")
    for username, password in preset_users:
        print(f"  {username}: {password}")
    
    print("\n生成的哈希值：")
    print("-" * 60)
    
    for username, password in preset_users:
        hashed_password, salt = hash_password(password)
        print(f"用户名: {username}")
        print(f"密码: {password}")
        print(f"哈希: {hashed_password}")
        print(f"盐值: {salt}")
        print('MongoDB更新: db.users.updateOne({{"username": "' + username + '"}, {"$set": {"password": "' + hashed_password + '", "salt": "' + salt + '"}})')
        print("-" * 60)

def main():
    """主函数"""
    print("NeuInk 密码哈希生成工具")
    print("请选择操作模式：")
    print("1. 交互式生成单个密码哈希")
    print("2. 批量生成预设用户密码哈希")
    print("3. 退出")
    
    while True:
        choice = input("\n请输入选择 (1/2/3): ").strip()
        
        if choice == '1':
            generate_password_hash()
        elif choice == '2':
            batch_generate()
        elif choice == '3':
            print("再见！")
            break
        else:
            print("无效选择，请重新输入！")

if __name__ == "__main__":
    main()