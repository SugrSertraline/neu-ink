"""
论文元数据提取服务
负责使用LLM提取论文的元数据信息
"""
import json
import logging
from typing import Dict, Any, Optional
from ..utils.llm_utils import get_llm_utils
from ..utils.llm_prompts import (
    PAPER_METADATA_EXTRACTION_SYSTEM_PROMPT,
    PAPER_METADATA_EXTRACTION_USER_PROMPT_TEMPLATE
)

logger = logging.getLogger(__name__)


class PaperMetadataService:
    """论文元数据提取服务类"""
    
    def __init__(self):
        self.llm_utils = get_llm_utils()
    
    def extract_paper_metadata(self, text: str) -> Dict[str, Any]:
        """
        使用LLM提取论文元数据
        
        Args:
            text: 论文文本
            
        Returns:
            提取的元数据字典，包含 metadata, abstract, keywords
            
        Raises:
            RuntimeError: 如果LLM不可用或解析失败
        """
        logger.info("开始解析论文文本（严格模式：无兜底）")
        logger.info(f"文本长度: {len(text)} 字符")

        # 检查API可用性
        try:
            provider = self.llm_utils._get_provider()
            if not provider.api_key or provider.api_key == "your_glm_api_key_here":
                raise RuntimeError("LLM 不可用：未配置或使用了占位 GLM_API_KEY")
        except Exception as e:
            raise RuntimeError(f"LLM 不可用: {e}")

        # 构建提示词
        user_prompt = f"{PAPER_METADATA_EXTRACTION_USER_PROMPT_TEMPLATE}\n\n{text[:20000]}"  # 限制文本长度
        
        messages = [
            {"role": "system", "content": PAPER_METADATA_EXTRACTION_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ]
        
        # 调用LLM
        try:
            response = self.llm_utils.call_llm(messages, temperature=0.6)
            
            if not response or 'choices' not in response:
                logger.error("LLM 响应格式错误")
                raise RuntimeError("LLM 返回空结果或格式错误")
                
            content = response['choices'][0]['message']['content']
            
            # 尝试解析 JSON
            try:
                # 提取 JSON 部分（可能包含在代码块中）
                if '```json' in content:
                    json_start = content.find('```json') + 7
                    json_end = content.find('```', json_start)
                    content = content[json_start:json_end].strip()
                elif '```' in content:
                    json_start = content.find('```') + 3
                    json_end = content.find('```', json_start)
                    content = content[json_start:json_end].strip()
                
                parsed_data = json.loads(content)
                return parsed_data
                
            except json.JSONDecodeError as e:
                logger.error(f"LLM 返回的内容不是有效的JSON格式: {e}")
                logger.error(f"原始内容: {content}")
                raise RuntimeError(f"JSON 解析失败: {e}")
                
        except Exception as e:
            logger.error(f"提取论文元数据时出错: {e}")
            raise RuntimeError(f"LLM 解析失败: {e}")

    def _translate_text(self, text: str, target_lang: str = "zh") -> Optional[str]:
        """
        使用LLM翻译文本
        
        Args:
            text: 要翻译的文本
            target_lang: 目标语言，默认为中文("zh")
            
        Returns:
            翻译后的文本，如果翻译失败返回None
        """
        if not text or not text.strip():
            return None
            
        try:
            # 检查API可用性
            provider = self.llm_utils._get_provider()
            if not provider.api_key or provider.api_key == "your_glm_api_key_here":
                raise RuntimeError("LLM 不可用：未配置或使用了占位 GLM_API_KEY")
            
            # 构建翻译提示词
            if target_lang == "zh":
                system_prompt = "你是一个专业的学术翻译助手。请将以下英文文本翻译为准确、专业的中文。保持学术术语的准确性和专业性。只返回翻译后的中文文本，不要包含任何解释或额外内容。"
            else:
                system_prompt = "你是一个专业的学术翻译助手。请将以下中文文本翻译为准确、专业的英文。保持学术术语的准确性和专业性。只返回翻译后的英文文本，不要包含任何解释或额外内容。"
            
            user_prompt = f"请翻译以下文本：\n\n{text}"
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
            
            # 调用LLM
            response = self.llm_utils.call_llm(messages, temperature=0.3)
            
            if not response or 'choices' not in response:
                logger.error("翻译LLM响应格式错误")
                return None
                
            content = response['choices'][0]['message']['content'].strip()
            
            # 清理可能的格式标记
            if content.startswith('"') and content.endswith('"'):
                content = content[1:-1]
            if content.startswith("'") and content.endswith("'"):
                content = content[1:-1]
            
            return content if content else None
            
        except Exception as e:
            logger.error(f"翻译文本时出错: {e}")
            return None

    def create_paper_from_text(self, text: str, creator_id: str, is_public: bool = True) -> Dict[str, Any]:
        """
        从文本创建论文，通过大模型解析 metadata、abstract 和 keywords
        """
        try:
            # 检查输入文本
            if not text or not text.strip():
                return self._wrap_error("文本内容不能为空")

            # 使用元数据提取服务解析文本
            parsed_data = self.extract_paper_metadata(text)

            if not parsed_data:
                return self._wrap_error("文本解析失败，无法提取论文元数据。请检查文本格式或尝试使用手动输入。")

            # 验证解析结果
            metadata = parsed_data.get("metadata", {})
            if not metadata.get("title"):
                return self._wrap_error("解析结果中缺少标题信息，请尝试使用手动输入或重新格式化文本。")
            
            # 确保标题使用新的结构（title 和 titleZh）
            if "title" in metadata and isinstance(metadata["title"], dict):
                # 如果是旧格式 {en: "...", zh: "..."}，转换为新格式
                title_obj = metadata["title"]
                if "en" in title_obj:
                    metadata["title"] = title_obj["en"]
                if "zh" in title_obj:
                    metadata["titleZh"] = title_obj["zh"]

            # 构建论文数据，只包含 metadata、abstract 和 keywords
            # 确保 abstract 使用字符串格式
            abstract_data = parsed_data.get("abstract", {})
            if isinstance(abstract_data, dict):
                abstract = {
                    "en": str(abstract_data.get("en", "")),
                    "zh": str(abstract_data.get("zh", ""))
                }
            else:
                # 当摘要不是字典格式时，需要翻译摘要内容
                abstract_text = str(abstract_data)
                try:
                    # 尝试使用LLM翻译摘要
                    translation_result = self._translate_text(abstract_text, target_lang="zh")
                    abstract = {
                        "en": abstract_text,
                        "zh": translation_result if translation_result else abstract_text
                    }
                except Exception as e:
                    logger.error(f"翻译摘要失败: {e}")
                    # 如果翻译失败，使用原文作为中文摘要
                    abstract = {
                        "en": abstract_text,
                        "zh": abstract_text
                    }
            
            paper_data = {
                "isPublic": is_public,
                "metadata": metadata,
                "abstract": abstract,
                "keywords": parsed_data.get("keywords", []),
                "sections": [],  # 空的章节列表（不再使用）
                "references": [],  # 空的参考文献列表
                "attachments": {},  # 空的附件
                "translationStatus": {
                    "isComplete": False,
                    "lastChecked": None,
                    "missingFields": [],
                    "updatedAt": self._get_current_time().isoformat()
                },
                "parseStatus": {
                    "status": "partial",
                    "progress": 30,
                    "message": "已解析基本信息（metadata、abstract、keywords），章节内容待补充",
                },
            }

            # 创建论文
            from ..models.paper import PaperModel
            paper_model = PaperModel()
            paper_data["createdBy"] = creator_id
            
            # 如果paper_data中包含sections，需要先创建sections并更新paper
            sections_data = paper_data.pop("sections", [])
            
            # 创建论文
            paper = paper_model.create(paper_data)
            
            # 如果有sections数据，创建sections并更新paper
            if sections_data:
                from ..models.section import get_section_model
                section_model = get_section_model()
                
                section_ids = []
                for section_data in sections_data:
                    section_data["paperId"] = paper["id"]
                    created_section = section_model.create(section_data)
                    if created_section:
                        section_ids.append(created_section["id"])
                
                # 更新论文的sectionIds
                if section_ids:
                    paper_model.update_section_ids(paper["id"], section_ids)
                
                # 重新获取论文数据，包含sections
                paper = paper_model.find_paper_with_sections(paper["id"])
            
            return self._wrap_success("论文创建成功", paper)
        except Exception as exc:
            return self._wrap_error(f"从文本创建论文失败: {exc}")

    def create_paper_from_metadata(self, metadata: Dict[str, Any], creator_id: str, is_public: bool = False) -> Dict[str, Any]:
        """
        从元数据创建论文，直接提供 metadata、abstract 和 keywords 等信息

        Args:
            metadata: 论文元数据，包含 title, authors, year 等
            creator_id: 创建者ID
            is_public: 是否公开（个人论文设为False）

        Returns:
            创建结果
        """
        try:
            # 验证必填字段
            if not metadata or not metadata.get("title"):
                return self._wrap_error("元数据不完整，标题不能为空")
            
            # 确保标题使用新的结构（title 和 titleZh）
            if "title" in metadata and isinstance(metadata["title"], dict):
                # 如果是旧格式 {en: "...", zh: "..."}，转换为新格式
                title_obj = metadata["title"]
                if "en" in title_obj:
                    metadata["title"] = title_obj["en"]
                if "zh" in title_obj:
                    metadata["titleZh"] = title_obj["zh"]

            # 构建论文数据，确保 abstract 使用字符串格式
            abstract_data = metadata.get("abstract", "")
            if isinstance(abstract_data, dict):
                abstract = {
                    "en": str(abstract_data.get("en", "")),
                    "zh": str(abstract_data.get("zh", ""))
                }
            else:
                # 当摘要不是字典格式时，需要翻译摘要内容
                abstract_text = str(abstract_data)
                try:
                    # 尝试使用LLM翻译摘要
                    translation_result = self._translate_text(abstract_text, target_lang="zh")
                    abstract = {
                        "en": abstract_text,
                        "zh": translation_result if translation_result else abstract_text
                    }
                except Exception as e:
                    logger.error(f"翻译摘要失败: {e}")
                    # 如果翻译失败，使用原文作为中文摘要
                    abstract = {
                        "en": abstract_text,
                        "zh": abstract_text
                    }
            
            paper_data = {
                "isPublic": is_public,
                "metadata": metadata,
                "abstract": abstract,
                "keywords": metadata.get("keywords", []),
                "sections": [],  # 空的章节列表（不再使用）
                "references": [],  # 空的参考文献列表
                "attachments": {},  # 空的附件
                "translationStatus": {
                    "isComplete": False,
                    "lastChecked": None,
                    "missingFields": [],
                    "updatedAt": self._get_current_time().isoformat()
                },
                "parseStatus": {
                    "status": "partial",
                    "progress": 20,
                    "message": "已提供基本元数据，章节内容待补充",
                },
            }

            # 创建论文
            from ..models.paper import PaperModel
            paper_model = PaperModel()
            paper_data["createdBy"] = creator_id
            
            # 如果paper_data中包含sections，需要先创建sections并更新paper
            sections_data = paper_data.pop("sections", [])
            
            # 创建论文
            paper = paper_model.create(paper_data)
            
            # 如果有sections数据，创建sections并更新paper
            if sections_data:
                from ..models.section import get_section_model
                section_model = get_section_model()
                
                section_ids = []
                for section_data in sections_data:
                    section_data["paperId"] = paper["id"]
                    created_section = section_model.create(section_data)
                    if created_section:
                        section_ids.append(created_section["id"])
                
                # 更新论文的sectionIds
                if section_ids:
                    paper_model.update_section_ids(paper["id"], section_ids)
                
                # 重新获取论文数据，包含sections
                paper = paper_model.find_paper_with_sections(paper["id"])
            
            return self._wrap_success("论文创建成功", paper)
        except Exception as exc:
            return self._wrap_error(f"从元数据创建论文失败: {exc}")

    def _get_current_time(self):
        """获取当前时间"""
        try:
            from ..utils.common import get_current_time
            return get_current_time()
        except ImportError:
            from datetime import datetime
            return datetime.now()

    @staticmethod
    def _wrap_success(message: str, data: Any) -> Dict[str, Any]:
        from ..config.constants import BusinessCode
        return {
            "code": BusinessCode.SUCCESS,
            "message": message,
            "data": data,
        }

    @staticmethod
    def _wrap_failure(code: int, message: str) -> Dict[str, Any]:
        return {
            "code": code,
            "message": message,
            "data": None,
        }

    @staticmethod
    def _wrap_error(message: str) -> Dict[str, Any]:
        from ..config.constants import BusinessCode
        return {
            "code": BusinessCode.INTERNAL_ERROR,
            "message": message,
            "data": None,
        }


# 全局实例
_metadata_service: Optional[PaperMetadataService] = None


def get_paper_metadata_service() -> PaperMetadataService:
    """获取 PaperMetadataService 全局实例"""
    global _metadata_service
    if _metadata_service is None:
        _metadata_service = PaperMetadataService()
    return _metadata_service