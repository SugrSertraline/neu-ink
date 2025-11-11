#!/usr/bin/env python3
"""
测试参考文献解析和重复检测逻辑
"""

import sys
import os

# 添加API路径到系统路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'apps', 'api'))

from neuink.services.paperService import PaperService

def test_reference_parsing():
    """测试参考文献解析功能"""
    
    # 测试数据 - 包含两条不同的参考文献
    test_references = """[1] D. Ballinari, S. Behrendt, "How to gauge investor behavior? a comparison of online investor sentiment measures," Digital Finance, vol. 3, no. 2, 169-204. 2021
[2] H. M. Markowitz, "Foundations of portfolio theory," The journal of finance, vol. 46, no. 2, 1991"""
    
    print("=" * 80)
    print("测试参考文献解析功能")
    print("=" * 80)
    
    # 解析参考文献
    result = PaperService.parse_reference_text(test_references)
    
    print(f"\n解析结果:")
    print(f"成功解析: {result['count']} 条")
    print(f"错误数量: {len(result['errors'])} 条")
    
    print("\n解析的参考文献:")
    for i, ref in enumerate(result['references']):
        print(f"\n参考文献 #{i+1}:")
        print(f"  标题: {ref.get('title', '')}")
        print(f"  年份: {ref.get('year', '')}")
        print(f"  原始文本: {ref.get('originalText', '')}")
        print(f"  是否完整: {not ref.get('is_incomplete', True)}")
    
    if result['errors']:
        print("\n解析错误:")
        for error in result['errors']:
            print(f"  索引 {error.get('index')}: {error.get('message')}")
    
    return result['references']

def test_duplicate_detection(references):
    """测试重复检测功能"""
    
    print("\n" + "=" * 80)
    print("测试重复检测功能")
    print("=" * 80)
    
    # 创建一个PaperService实例
    paper_service = PaperService()
    
    # 模拟现有参考文献列表
    existing_refs = [
        {
            "id": "ref-1",
            "number": 1,
            "title": "How to gauge investor behavior? a comparison of online investor sentiment measures",
            "authors": ["D. Ballinari", "S. Behrendt"],
            "year": 2021
        }
    ]
    
    print("\n现有参考文献:")
    for ref in existing_refs:
        print(f"  - {ref.get('title', '')} ({ref.get('year', '')})")
    
    print("\n新参考文献:")
    for ref in references:
        print(f"  - {ref.get('title', '')} ({ref.get('year', '')})")
    
    # 测试每个新参考文献是否会被识别为重复
    for i, new_ref in enumerate(references):
        # 转换为数据库格式
        db_ref = {
            "id": f"ref-{i+2}",
            "number": i+2,
            "title": new_ref.get('title', ''),
            "authors": new_ref.get('authors', []),
            "year": new_ref.get('year', ''),
            "originalText": new_ref.get('originalText', '')
        }
        
        duplicate_index = paper_service._find_duplicate_reference(db_ref, existing_refs)
        
        if duplicate_index is not None:
            print(f"\n新参考文献 '{db_ref['title']}' 被识别为与现有参考文献重复 (索引: {duplicate_index})")
        else:
            print(f"\n新参考文献 '{db_ref['title']}' 未被识别为重复")

def test_edge_cases():
    """测试边缘情况"""
    
    print("\n" + "=" * 80)
    print("测试边缘情况")
    print("=" * 80)
    
    # 测试没有引号的参考文献
    test_no_quotes = "[1] Simple article title, Journal Name, 2020"
    result = PaperService.parse_reference_text(test_no_quotes)
    print(f"\n没有引号的参考文献解析结果:")
    print(f"  标题: {result['references'][0].get('title', '')}")
    print(f"  原始文本: {result['references'][0].get('originalText', '')}")
    
    # 测试解析失败的参考文献
    test_failed = "[1] ,"
    result = PaperService.parse_reference_text(test_failed)
    print(f"\n解析失败的参考文献:")
    print(f"  标题: {result['references'][0].get('title', '')}")
    print(f"  是否完整: {not result['references'][0].get('is_incomplete', True)}")
    print(f"  错误信息: {result['errors'][0].get('message', '') if result['errors'] else '无'}")

if __name__ == "__main__":
    print("开始测试参考文献解析和重复检测功能...")
    
    # 测试基本解析功能
    references = test_reference_parsing()
    
    # 测试重复检测功能
    test_duplicate_detection(references)
    
    # 测试边缘情况
    test_edge_cases()
    
    print("\n" + "=" * 80)
    print("测试完成")
    print("=" * 80)