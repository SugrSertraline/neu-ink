"""
参考文献提取服务
从content_list.json中提取参考文献信息
"""
import json
import logging
import re
from typing import Dict, Any, List, Optional

# 初始化logger
logger = logging.getLogger(__name__)


class ReferenceExtractorService:
    """参考文献提取服务类"""
    
    def __init__(self) -> None:
        """初始化参考文献提取服务"""
        pass
    
    def extract_references_from_content_list(self, content_list_path: str) -> Dict[str, Any]:
        """
        从content_list.json文件中提取参考文献信息
        
        Args:
            content_list_path: content_list.json文件路径
            
        Returns:
            提取结果，包含参考文献列表和处理状态
        """
        try:
            # 读取content_list.json文件
            with open(content_list_path, 'r', encoding='utf-8') as f:
                content_list_data = json.load(f)
            
            logger.info(f"成功读取content_list.json文件，共 {len(content_list_data)} 个内容块")
            
            # 查找所有参考文献类型的块
            reference_blocks = [
                block for block in content_list_data 
                if block.get("type") == "list" and block.get("sub_type") == "ref_text"
            ]
            
            logger.info(f"找到 {len(reference_blocks)} 个参考文献块")
            
            # 提取参考文献条目
            references = []
            for ref_block in reference_blocks:
                list_items = ref_block.get("list_items", [])
                if list_items:
                    # 处理每个参考文献条目
                    for item in list_items:
                        # 提取参考文献信息
                        reference = self._parse_reference_item(item)
                        if reference:
                            references.append(reference)
            
            logger.info(f"成功提取 {len(references)} 条参考文献")
            
            return {
                "success": True,
                "message": f"成功提取 {len(references)} 条参考文献",
                "references": references,
                "total_blocks": len(content_list_data),
                "reference_blocks": len(reference_blocks)
            }
            
        except FileNotFoundError:
            error_msg = f"content_list.json文件不存在: {content_list_path}"
            logger.error(error_msg)
            return {
                "success": False,
                "error": error_msg,
                "references": []
            }
        except json.JSONDecodeError as e:
            error_msg = f"解析content_list.json文件失败: {str(e)}"
            logger.error(error_msg)
            return {
                "success": False,
                "error": error_msg,
                "references": []
            }
        except Exception as e:
            error_msg = f"提取参考文献时发生异常: {str(e)}"
            logger.error(error_msg)
            return {
                "success": False,
                "error": error_msg,
                "references": []
            }
    
    def _parse_reference_item(self, item: str) -> Optional[Dict[str, Any]]:
        """
        解析单个参考文献条目
        
        Args:
            item: 参考文献字符串，如 "[26] Divyansh Kaushik, Eduard Hovy, and Zachary Lipton. 2020. Learning The Difference That Makes A Difference With Counterfactually-Augmented Data. In International Conference on Learning Representations."
            
        Returns:
            解析后的参考文献对象
        """
        try:
            # 使用正则表达式提取参考文献信息
            # 格式: [数字] 作者. 年份. 标题. 期刊/会议. 页码.
            pattern = r'^\[(\d+)\]\s*(.+?)\.\s*(\d{4})\.\s*(.+?)\.?(\d+(?:-\d+)?)\.?$'
            match = re.match(pattern, item.strip())
            
            if not match:
                logger.warning(f"无法解析参考文献格式: {item}")
                return None
            
            ref_id = match.group(1)  # 参考文献ID
            authors_title = match.group(2).strip()  # 作者和标题
            year = match.group(3)  # 年份
            venue = match.group(4).strip()  # 期刊/会议
            pages = match.group(5) if match.group(5) else ""  # 页码
            
            # 尝试分离作者和标题
            authors_and_title = authors_title
            # 简单处理：如果包含常见作者分隔符，尝试分离
            if ", " in authors_title and len(authors_title) > 20:
                # 可能是"作者, 标题"格式
                parts = authors_title.split(", ", 1)
                if len(parts) >= 2:
                    authors = parts[0].strip()
                    title = parts[1].strip()
                else:
                    # 如果分割失败，整体作为标题
                    authors = ""
                    title = authors_title.strip()
            else:
                # 默认整体作为标题，作者信息可能包含在标题中
                authors = ""
                title = authors_title.strip()
            
            return {
                "id": ref_id,
                "authors": authors,
                "title": title,
                "year": year,
                "venue": venue,
                "pages": pages,
                "raw": item.strip()
            }
            
        except Exception as e:
            logger.error(f"解析参考文献条目失败: {item}, 错误: {str(e)}")
            return None
    
    def extract_references_from_json_data(self, content_list_json: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        直接从JSON数据中提取参考文献信息
        
        Args:
            content_list_json: 已解析的content_list.json数据
            
        Returns:
            提取结果，包含参考文献列表
        """
        try:
            # 查找所有参考文献类型的块
            reference_blocks = [
                block for block in content_list_json 
                if block.get("type") == "list" and block.get("sub_type") == "ref_text"
            ]
            
            logger.info(f"找到 {len(reference_blocks)} 个参考文献块")
            
            # 提取参考文献条目
            references = []
            for ref_block in reference_blocks:
                list_items = ref_block.get("list_items", [])
                if list_items:
                    # 处理每个参考文献条目
                    for item in list_items:
                        # 提取参考文献信息
                        reference = self._parse_reference_item(item)
                        if reference:
                            references.append(reference)
            
            logger.info(f"成功提取 {len(references)} 条参考文献")
            
            return {
                "success": True,
                "message": f"成功提取 {len(references)} 条参考文献",
                "references": references
            }
            
        except Exception as e:
            error_msg = f"提取参考文献时发生异常: {str(e)}"
            logger.error(error_msg)
            return {
                "success": False,
                "error": error_msg,
                "references": []
            }


# 全局实例
_reference_extractor_service: Optional[ReferenceExtractorService] = None


def get_reference_extractor_service() -> ReferenceExtractorService:
    """获取参考文献提取服务实例（单例模式）"""
    global _reference_extractor_service
    if _reference_extractor_service is None:
        _reference_extractor_service = ReferenceExtractorService()
    return _reference_extractor_service