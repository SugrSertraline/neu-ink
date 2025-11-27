#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库连接测试脚本
用于测试 NeuInk 后端是否能正常连接到 MongoDB 数据库
"""

import os
import sys
from pathlib import Path

# 添加项目路径到 Python 路径
sys.path.insert(0, str(Path(__file__).parent))

# 加载环境变量
from dotenv import load_dotenv
load_dotenv()

def test_db_connection():
    """测试数据库连接"""
    print("=" * 50)
    print("NeuInk 数据库连接测试")
    print("=" * 50)
    
    # 显示数据库配置
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
    db_name = os.getenv("DB_NAME", "NeuInk")
    
    print(f"数据库 URI: {mongo_uri}")
    print(f"数据库名称: {db_name}")
    print("-" * 50)
    
    try:
        # 导入数据库服务
        from neuink.services.db import get_client, get_db, ping
        
        print("正在尝试连接数据库...")
        
        # 测试基本连接
        print("1. 测试基本连接 (ping)...")
        result = ping()
        print(f"   Ping 结果: {result}")
        print("   ✓ 基本连接成功!")
        
        # 获取数据库客户端
        print("\n2. 获取数据库客户端...")
        client = get_client()
        print(f"   客户端信息: {client}")
        print("   ✓ 客户端获取成功!")
        
        # 获取数据库
        print("\n3. 获取数据库...")
        db = get_db()
        print(f"   数据库对象: {db}")
        print("   ✓ 数据库获取成功!")
        
        # 列出所有集合
        print("\n4. 列出所有集合...")
        collections = db.list_collection_names()
        print(f"   集合数量: {len(collections)}")
        if collections:
            print("   集合列表:")
            for collection in collections:
                print(f"     - {collection}")
        else:
            print("   数据库中暂无集合")
        print("   ✓ 集合列表获取成功!")
        
        # 测试基本操作
        print("\n5. 测试基本数据库操作...")
        test_collection = db["connection_test"]
        
        # 插入测试文档
        test_doc = {"test": True, "timestamp": "now"}
        insert_result = test_collection.insert_one(test_doc)
        print(f"   插入文档 ID: {insert_result.inserted_id}")
        
        # 查询测试文档
        found_doc = test_collection.find_one({"_id": insert_result.inserted_id})
        print(f"   查询结果: {found_doc}")
        
        # 删除测试文档
        delete_result = test_collection.delete_one({"_id": insert_result.inserted_id})
        print(f"   删除结果: {delete_result.deleted_count} 个文档被删除")
        
        print("   ✓ 基本操作测试成功!")
        
        print("\n" + "=" * 50)
        print("✅ 数据库连接测试完全成功!")
        print("✅ 后端可以正常连接到 MongoDB 数据库!")
        print("=" * 50)
        
        return True
        
    except Exception as e:
        print(f"\n❌ 数据库连接失败: {str(e)}")
        print(f"错误类型: {type(e).__name__}")
        
        # 提供一些常见的故障排除建议
        print("\n可能的解决方案:")
        print("1. 检查 MongoDB 服务是否正在运行")
        print("2. 验证数据库 URI 配置是否正确")
        print("3. 检查网络连接是否正常")
        print("4. 确认数据库用户权限是否足够")
        
        print("\n" + "=" * 50)
        print("❌ 数据库连接测试失败!")
        print("=" * 50)
        
        return False

if __name__ == "__main__":
    test_db_connection()