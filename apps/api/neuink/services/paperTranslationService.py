"""
Paper 翻译服务
处理论文翻译和数据迁移相关的操作
"""
from typing import Dict, Any, Optional, Tuple, List
from ..models.adminPaper import AdminPaperModel
from ..config.constants import BusinessCode
from ..utils.llm_utils import get_llm_utils
from ..utils.common import get_current_time


class PaperTranslationService:
    """Paper 翻译服务类"""

    def __init__(self, paper_model: AdminPaperModel) -> None:
        self.paper_model = paper_model

    # ------------------------------------------------------------------
    # 翻译操作
    # ------------------------------------------------------------------

    def _check_and_translate_paper(self, paper: Dict[str, Any], llm_utils) -> Tuple[Optional[Dict[str, Any]], Dict[str, Any]]:
        """
        检查论文的翻译完整性并进行翻译补全
        """
        translation_result = {
            "isComplete": True,
            "missingFields": [],
            "translatedFields": [],
            "errors": []
        }
        
        # 深拷贝论文数据以避免修改原数据
        updated_paper = paper.copy()
        updated_paper["metadata"] = paper.get("metadata", {}).copy()
        updated_paper["abstract"] = paper.get("abstract", {}).copy() if paper.get("abstract") else {}
        updated_paper["sections"] = [section.copy() for section in paper.get("sections", [])]
        
        # 检查metadata的翻译
        metadata = updated_paper["metadata"]
        
        # 检查标题翻译
        title = metadata.get("title", "")
        title_zh = metadata.get("titleZh", "")
        
        # 检查是否有英文标题但没有中文标题
        if title and (not title_zh or title_zh.strip() == "未命名论文"):
            try:
                translated_text = llm_utils.simple_text_chat(
                    f"将以下英文标题翻译为中文，只返回翻译结果：\n\n{title}",
                    "你是一个专业的学术翻译助手。只返回翻译后的标题字符串，不要添加任何解释、分析或额外内容。"
                )
                if translated_text:
                    metadata["titleZh"] = translated_text.strip()
                    translation_result["translatedFields"].append({
                        "field": "metadata.titleZh",
                        "from": "en",
                        "to": "zh",
                        "original": title,
                        "translated": translated_text.strip()
                    })
            except Exception as e:
                translation_result["errors"].append(f"翻译失败 metadata.titleZh: {str(e)}")
        
        # 检查是否有中文标题但没有英文标题
        elif title_zh and not title:
            try:
                translated_text = llm_utils.simple_text_chat(
                    f"将以下中文标题翻译为英文，只返回翻译结果：\n\n{title_zh}",
                    "你是一个专业的学术翻译助手。只返回翻译后的标题字符串，不要添加任何解释、分析或额外内容。"
                )
                if translated_text:
                    metadata["title"] = translated_text.strip()
                    translation_result["translatedFields"].append({
                        "field": "metadata.title",
                        "from": "zh",
                        "to": "en",
                        "original": title_zh,
                        "translated": translated_text.strip()
                    })
            except Exception as e:
                translation_result["errors"].append(f"翻译失败 metadata.title: {str(e)}")
        
        # 检查作者信息翻译
        if "authors" in metadata and isinstance(metadata["authors"], list):
            for i, author in enumerate(metadata["authors"]):
                if isinstance(author, dict) and "name" in author:
                    author_name_translation = self._check_and_translate_field(
                        author.get("name", {}),
                        f"metadata.authors[{i}].name",
                        llm_utils,
                        translation_result
                    )
                    if author_name_translation:
                        author["name"] = author_name_translation
                    
                    if "affiliation" in author:
                        affiliation_translation = self._check_and_translate_field(
                            author.get("affiliation", {}),
                            f"metadata.authors[{i}].affiliation",
                            llm_utils,
                            translation_result
                        )
                        if affiliation_translation:
                            author["affiliation"] = affiliation_translation
        
        # 检查abstract翻译
        abstract = updated_paper["abstract"]
        if abstract and isinstance(abstract, dict):
            has_en = "en" in abstract and abstract["en"] and str(abstract["en"]).strip()
            has_zh = "zh" in abstract and abstract["zh"] and str(abstract["zh"]).strip()
            
            if has_en and not has_zh:
                existing_text = str(abstract["en"])
                try:
                    translated_text = llm_utils.simple_text_chat(
                        f"将以下英文摘要翻译为中文，只返回翻译结果：\n\n{existing_text}",
                        "你是一个专业的学术翻译助手。只返回翻译后的摘要字符串，不要添加任何解释、分析或额外内容。"
                    )
                    if translated_text:
                        updated_paper["abstract"]["zh"] = translated_text.strip()
                        translation_result["translatedFields"].append({
                            "field": "abstract",
                            "from": "en",
                            "to": "zh",
                            "original": existing_text,
                            "translated": translated_text.strip()
                        })
                except Exception as e:
                    translation_result["errors"].append(f"翻译失败 abstract: {str(e)}")
            
            elif has_zh and not has_en:
                existing_text = str(abstract["zh"])
                try:
                    translated_text = llm_utils.simple_text_chat(
                        f"将以下中文摘要翻译为英文，只返回翻译结果：\n\n{existing_text}",
                        "你是一个专业的学术翻译助手。只返回翻译后的摘要字符串，不要添加任何解释、分析或额外内容。"
                    )
                    if translated_text:
                        updated_paper["abstract"]["en"] = translated_text.strip()
                        translation_result["translatedFields"].append({
                            "field": "abstract",
                            "from": "zh",
                            "to": "en",
                            "original": existing_text,
                            "translated": translated_text.strip()
                        })
                except Exception as e:
                    translation_result["errors"].append(f"翻译失败 abstract: {str(e)}")
                    
            elif has_en and has_zh:
                en_text = str(abstract.get("en", "")).strip()
                zh_text = str(abstract.get("zh", "")).strip()
                
                if not en_text and zh_text:
                    try:
                        translated_text = llm_utils.simple_text_chat(
                            f"将以下中文摘要翻译为英文，只返回翻译结果：\n\n{zh_text}",
                            "你是一个专业的学术翻译助手。只返回翻译后的摘要字符串，不要添加任何解释、分析或额外内容。"
                        )
                        if translated_text:
                            updated_paper["abstract"]["en"] = translated_text.strip()
                    except Exception as e:
                        translation_result["errors"].append(f"补全英文摘要失败: {str(e)}")
                        
                if not zh_text and en_text:
                    try:
                        translated_text = llm_utils.simple_text_chat(
                            f"将以下英文摘要翻译为中文，只返回翻译结果：\n\n{en_text}",
                            "你是一个专业的学术翻译助手。只返回翻译后的摘要字符串，不要添加任何解释、分析或额外内容。"
                        )
                        if translated_text:
                            updated_paper["abstract"]["zh"] = translated_text.strip()
                    except Exception as e:
                        translation_result["errors"].append(f"补全中文摘要失败: {str(e)}")
                        
        elif isinstance(abstract, str):
            updated_paper["abstract"] = {"en": abstract, "zh": ""}
        
        # 检查sections翻译
        for section_idx, section in enumerate(updated_paper["sections"]):
            # 检查section标题翻译
            section_title = section.get("title", "")
            section_title_zh = section.get("titleZh", "")
            
            if section_title and (not section_title_zh or section_title_zh == "未命名章节"):
                try:
                    translated_text = llm_utils.simple_text_chat(
                        f"将以下英文章节标题翻译为中文，只返回翻译结果：\n\n{section_title}",
                        "你是一个专业的学术翻译助手。只返回翻译后的标题字符串，不要添加任何解释、分析或额外内容。"
                    )
                    if translated_text:
                        section["titleZh"] = translated_text.strip()
                        translation_result["translatedFields"].append({
                            "field": f"sections[{section_idx}].titleZh",
                            "from": "en",
                            "to": "zh",
                            "original": section_title,
                            "translated": translated_text.strip()
                        })
                except Exception as e:
                    translation_result["errors"].append(f"翻译失败 sections[{section_idx}].titleZh: {str(e)}")
            
            elif section_title_zh and not section_title:
                try:
                    translated_text = llm_utils.simple_text_chat(
                        f"将以下中文章节标题翻译为英文，只返回翻译结果：\n\n{section_title_zh}",
                        "你是一个专业的学术翻译助手。只返回翻译后的标题字符串，不要添加任何解释、分析或额外内容。"
                    )
                    if translated_text:
                        section["title"] = translated_text.strip()
                        translation_result["translatedFields"].append({
                            "field": f"sections[{section_idx}].title",
                            "from": "zh",
                            "to": "en",
                            "original": section_title_zh,
                            "translated": translated_text.strip()
                        })
                except Exception as e:
                    translation_result["errors"].append(f"翻译失败 sections[{section_idx}].title: {str(e)}")
            
            # 检查section内容翻译
            if "content" in section and isinstance(section["content"], list):
                for block_idx, block in enumerate(section["content"]):
                    if "content" in block and isinstance(block["content"], dict):
                        block_content_translation = self._check_and_translate_field(
                            block.get("content", {}),
                            f"sections[{section_idx}].content[{block_idx}].content",
                            llm_utils,
                            translation_result
                        )
                        if block_content_translation:
                            block["content"] = block_content_translation
                        
                        # 处理特殊类型的block
                        if block.get("type") == "figure" and "alt" in block:
                            figure_alt_translation = self._check_and_translate_field(
                                block.get("alt", {}),
                                f"sections[{section_idx}].content[{block_idx}].alt",
                                llm_utils,
                                translation_result
                            )
                            if figure_alt_translation:
                                block["alt"] = figure_alt_translation
                        
                        # 处理列表项翻译
                        if block.get("type") in ["ordered-list", "unordered-list"] and "items" in block:
                            for item_idx, item in enumerate(block.get("items", [])):
                                if "content" in item:
                                    item_content_translation = self._check_and_translate_field(
                                        item.get("content", {}),
                                        f"sections[{section_idx}].content[{block_idx}].items[{item_idx}].content",
                                        llm_utils,
                                        translation_result
                                    )
                                    if item_content_translation:
                                        item["content"] = item_content_translation
        
        # 更新翻译状态
        current_time = get_current_time()
        updated_paper["translationStatus"] = {
            "isComplete": len(translation_result["missingFields"]) == 0,
            "lastChecked": current_time.isoformat(),
            "missingFields": translation_result["missingFields"],
            "updatedAt": current_time.isoformat()
        }
        
        return updated_paper, translation_result

    def _check_and_translate_field(self, field_data: Any, field_path: str, llm_utils, translation_result: Dict[str, Any]) -> Optional[Any]:
        """
        检查并翻译单个字段
        """
        if not isinstance(field_data, dict):
            return field_data
        
        # 更健壮的字段存在性和内容检查
        has_en = "en" in field_data and field_data["en"] and (
            (isinstance(field_data["en"], str) and field_data["en"].strip()) or
            (isinstance(field_data["en"], list) and field_data["en"])
        )
        has_zh = "zh" in field_data and field_data["zh"] and (
            (isinstance(field_data["zh"], str) and field_data["zh"].strip()) or
            (isinstance(field_data["zh"], list) and field_data["zh"])
        )
        
        # 如果两种语言都存在且不为空，无需翻译
        if has_en and has_zh:
            return field_data
        
        # 记录缺失的翻译
        if not has_en:
            translation_result["missingFields"].append(f"{field_path}.en")
        if not has_zh:
            translation_result["missingFields"].append(f"{field_path}.zh")
        
        # 需要翻译的情况
        source_text = ""
        source_lang = ""
        target_lang = ""
        
        if has_en and (not has_zh or self._is_default_chinese_text(field_data.get("zh", []))):
            source_text = self._extract_text_from_content(field_data.get("en", []))
            source_lang = "en"
            target_lang = "zh"
        elif has_zh and not has_en:
            source_text = self._extract_text_from_content(field_data.get("zh", []))
            source_lang = "zh"
            target_lang = "en"
        elif has_en and has_zh:
            en_text = self._extract_text_from_content(field_data.get("en", []))
            zh_text = self._extract_text_from_content(field_data.get("zh", []))
            if not en_text.strip() and zh_text.strip():
                source_text = zh_text
                source_lang = "zh"
                target_lang = "en"
            elif not zh_text.strip() and en_text.strip():
                source_text = en_text
                source_lang = "en"
                target_lang = "zh"
            else:
                return field_data
        else:
            return field_data
        
        if not source_text.strip():
            return field_data
        
        try:
            # 调用LLM进行翻译
            translated_text = llm_utils.simple_text_chat(
                f"将以下{source_lang}文本翻译为{target_lang}，只返回翻译结果：\n\n{source_text}",
                f"你是一个专业的学术翻译助手。只返回翻译后的文本字符串，不要添加任何解释、分析或额外内容。"
            )
            
            if translated_text:
                # 更新字段数据
                updated_field_data = field_data.copy()
                if source_lang == "en":
                    if "en" not in updated_field_data:
                        updated_field_data["en"] = field_data.get("en", [])
                    if "zh" not in updated_field_data or not updated_field_data["zh"]:
                        updated_field_data["zh"] = self._create_text_content(translated_text)
                else:
                    if "zh" not in updated_field_data:
                        updated_field_data["zh"] = field_data.get("zh", [])
                    if "en" not in updated_field_data or not updated_field_data["en"]:
                        updated_field_data["en"] = self._create_text_content(translated_text)
                
                translation_result["translatedFields"].append({
                    "field": field_path,
                    "from": source_lang,
                    "to": target_lang,
                    "original": source_text,
                    "translated": translated_text
                })
                
                return updated_field_data
        except Exception as e:
            translation_result["errors"].append(f"翻译失败 {field_path}: {str(e)}")
        
        return field_data

    def _is_default_chinese_text(self, zh_content: Any) -> bool:
        """
        检查中文内容是否是默认的占位文本
        """
        if not zh_content:
            return True
            
        if isinstance(zh_content, str):
            return zh_content.strip() == "未命名章节"
        
        if isinstance(zh_content, list):
            for item in zh_content:
                if isinstance(item, dict) and item.get("type") == "text":
                    text = item.get("text", "").strip()
                    if text == "未命名章节":
                        return True
        
        return False

    def _extract_text_from_content(self, content: Any) -> str:
        """
        从content数组中提取纯文本
        """
        if isinstance(content, list):
            text_parts = []
            for item in content:
                if isinstance(item, dict):
                    if item.get("type") == "text" and item.get("text"):
                        text_parts.append(item["text"])
                    elif item.get("type") == "link" and item.get("label"):
                        text_parts.append(item["label"])
                    elif item.get("type") == "link" and item.get("text"):
                        text_parts.append(item["text"])
                elif isinstance(item, str):
                    text_parts.append(item)
            return " ".join(text_parts)
        elif isinstance(content, str):
            return content
        return ""

    def _create_text_content(self, text: str) -> List[Dict[str, Any]]:
        """
        创建标准的text content数组
        """
        text = str(text) if text else ""
        return [{"type": "text", "text": text}] if text else []


    # ------------------------------------------------------------------
    # 数据迁移
    # ------------------------------------------------------------------

    # ------------------------------------------------------------------
    # 辅助方法
    # ------------------------------------------------------------------
    @staticmethod
    def _wrap_success(message: str, data: Any) -> Dict[str, Any]:
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
        return {
            "code": BusinessCode.INTERNAL_ERROR,
            "message": message,
            "data": None,
        }
