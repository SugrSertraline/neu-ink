"""
Paper 内容操作服务
处理论文内容相关的操作（章节、块、参考文献）
"""
import time
import uuid
import re
<<<<<<< HEAD
=======
import json
>>>>>>> origin/main
import logging
from typing import Dict, Any, Optional, List, Tuple
from ..models.paper import PaperModel
from ..models.section import get_section_model
from ..config.constants import BusinessCode
from ..utils.llm_utils import get_llm_utils
<<<<<<< HEAD
from ..utils.common import get_current_time

# 初始化logger
logger = logging.getLogger(__name__)

=======
from ..utils.common import get_current_time, generate_id
from ..utils.llm_prompts import (
    TEXT_TO_BLOCKS_SYSTEM_PROMPT,
    TEXT_TO_BLOCKS_USER_PROMPT_TEMPLATE
)

# 初始化logger
logger = logging.getLogger(__name__)
_PARSED_BLOCKS_CACHE: Dict[str, Dict[str, Any]] = {}

def remember_parsed_blocks(temp_block_id: str, section_id: str, parsed_block_ids: List[str]) -> None:
    """将解析结果记录到内存缓存"""
    _PARSED_BLOCKS_CACHE[temp_block_id] = {
        "sectionId": section_id,
        "parsedBlockIds": parsed_block_ids,
        "ts": time.time(),
    }

def get_parsed_blocks_from_cache(temp_block_id: str) -> Optional[Dict[str, Any]]:
    """从内存缓存中获取解析结果"""
    return _PARSED_BLOCKS_CACHE.get(temp_block_id)
>>>>>>> origin/main

class PaperContentService:
    """Paper 内容操作服务类"""

    def __init__(self, paper_model: PaperModel) -> None:
        self.paper_model = paper_model
        self.section_model = get_section_model()

    # ------------------------------------------------------------------
<<<<<<< HEAD
=======
    # LLM 文本解析为 blocks 的内部工具
    # ------------------------------------------------------------------
    def _parse_text_to_blocks_with_llm(
        self,
        text: str,
        section_context: str = "",
    ) -> List[Dict[str, Any]]:
        """
        使用大模型将原始文本解析为 blocks，并在服务层完成结构校验和补全。
        """
        llm_utils = get_llm_utils()

        # 构建提示词 - 强调要求生成中英文内容
        user_prompt = f"""{TEXT_TO_BLOCKS_USER_PROMPT_TEMPLATE}

章节上下文: {section_context or '无'}

待解析文本:
{text[:40000]}

重要提醒：请务必为每个block同时生成中文(zh)和英文(en)内容！如果原文是英文，请翻译为中文；如果原文是中文，请翻译为英文。不要让zh字段为空数组！"""

        messages = [
            {"role": "system", "content": TEXT_TO_BLOCKS_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

        # 1. 调用大模型
        response = llm_utils.call_llm(messages, temperature=0.1, max_tokens=50000)
        if not response or "choices" not in response or not response["choices"]:
            raise Exception("LLM解析失败：未返回有效内容")

        raw_content = response["choices"][0]["message"]["content"]

        # 2. 清理响应，只保留 JSON 部分
        cleaned = llm_utils._clean_json_response(raw_content)  # type: ignore[attr-defined]

        try:
            blocks = json.loads(cleaned)
        except json.JSONDecodeError as exc:
            # 保存原始内容便于排查
            try:
                llm_utils._save_error_log(cleaned, exc)  # type: ignore[attr-defined]
            except Exception:
                pass
            raise Exception(f"文本解析失败，无法解析JSON: {exc}") from exc

        if not isinstance(blocks, list):
            raise Exception("文本解析失败：返回结果不是数组")

        # 3. 结构校验与补全
        validated_blocks: List[Dict[str, Any]] = []

        for idx, block in enumerate(blocks):
            try:
                if not isinstance(block, dict) or "type" not in block:
                    logger.warning("跳过无效block %s: 缺少type字段", idx)
                    continue

                # 补充必要元数据
                if "id" not in block:
                    block["id"] = generate_id()
                if "createdAt" not in block:
                    block["createdAt"] = get_current_time().isoformat()

                # 统一处理 content 结构
                if "content" in block and isinstance(block["content"], dict):
                    content = block["content"]
                    # 确保 en / zh 存在且为列表
                    if "en" not in content:
                        content["en"] = []
                    if "zh" not in content:
                        # 默认复制英文内容，避免前端崩溃
                        content["zh"] = list(content.get("en", []))

                    # 修复 inline-math：如果使用 content 字段，迁移到 latex
                    for lang in ("en", "zh"):
                        nodes = content.get(lang)
                        if isinstance(nodes, list):
                            for node in nodes:
                                if (
                                    isinstance(node, dict)
                                    and node.get("type") == "inline-math"
                                    and "latex" not in node
                                    and "content" in node
                                ):
                                    node["latex"] = node.pop("content")

                # 列表项的 content 补全
                if block["type"] in ("ordered-list", "unordered-list"):
                    items = block.get("items")
                    if isinstance(items, list):
                        for item in items:
                            if isinstance(item, dict) and isinstance(item.get("content"), dict):
                                ic = item["content"]
                                if "en" not in ic:
                                    ic["en"] = []
                                if "zh" not in ic:
                                    ic["zh"] = list(ic.get("en", []))

                # 数学公式块：去除 \tag 并标准化空格
                if block["type"] == "math" and isinstance(block.get("latex"), str):
                    latex = block["latex"]
                    latex = re.sub(r"\\tag\\{[^}]*\\}", "", latex)
                    latex = re.sub(r"\\s+", " ", latex).strip()
                    block["latex"] = latex

                validated_blocks.append(block)
                logger.info("验证block %s: type=%s", idx, block["type"])

            except Exception as exc:  # pylint: disable=broad-except
                logger.error("验证block %s 失败: %s", idx, exc)
                continue

        logger.info("最终生成 %d 个有效blocks", len(validated_blocks))
        return validated_blocks

    # ------------------------------------------------------------------
>>>>>>> origin/main
    # Section 操作
    # ------------------------------------------------------------------
    def add_section(
        self,
        paper_id: str,
        section_data: Dict[str, Any],
        user_id: str,
        is_admin: bool = False,
        parent_section_id: Optional[str] = None,
        position: Optional[int] = None,
<<<<<<< HEAD
    ) -> Dict[str, Any]:
        """
        向论文添加新章节
        """
        try:
            # 检查论文是否存在及权限
            paper = self.paper_model.find_by_id(paper_id)
            if not paper:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

            if not is_admin and paper["createdBy"] != user_id:
=======
        is_user_paper: bool = False,
    ) -> Dict[str, Any]:
        """
        向论文添加新章节
        
        修改说明：
        1. 优先使用前端提供的section ID，如果没有则生成一个
        2. position参数直接使用前端计算的值，不再进行转换
        """
        try:
            # 检查论文是否存在及权限
            # 对于个人论文库，需要特殊处理
            if is_user_paper:
                # 个人论文库中的论文，直接通过section验证权限
                paper = {"id": paper_id}  # 创建一个虚拟的paper对象用于后续验证
            else:
                # 公共论文库中的论文，正常查找
                paper = self.paper_model.find_by_id(paper_id)
                if not paper:
                    return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

            # 管理员只能操作公开的论文
            if is_admin and not is_user_paper and not paper.get("isPublic", False):
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "管理员只能操作公开的论文")

            # 修改权限检查逻辑：如果是个人论文库中的操作，允许用户修改
            # 只有在非个人论文库操作且非管理员的情况下，才检查创建者
            if not is_user_paper and not is_admin and paper.get("createdBy") != user_id:
>>>>>>> origin/main
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权修改此论文")

            # 获取当前sections
            sections = self.section_model.find_by_paper_id(paper_id)
            
            # 确保新章节有必要的字段
            title_data = section_data.get("title", {})
            title_zh_data = section_data.get("titleZh", "")
            
<<<<<<< HEAD
            if isinstance(title_data, dict) and "en" in title_data:
                new_section = {
                    "id": section_data.get("id"),
=======
            # 优先使用前端提供的ID，如果没有则生成一个
            section_id = section_data.get("id")
            if not section_id:
                # 使用UUID生成唯一ID，避免冲突
                section_id = str(uuid.uuid4())
            
            if isinstance(title_data, dict) and "en" in title_data:
                new_section = {
                    "id": section_id,
>>>>>>> origin/main
                    "title": title_data.get("en", "Untitled Section"),
                    "titleZh": title_data.get("zh", title_zh_data or "未命名章节"),
                    "content": section_data.get("content", [])
                }
            else:
                new_section = {
<<<<<<< HEAD
                    "id": section_data.get("id"),
=======
                    "id": section_id,
>>>>>>> origin/main
                    "title": title_data if title_data else "Untitled Section",
                    "titleZh": title_zh_data if title_zh_data else "未命名章节",
                    "content": section_data.get("content", [])
                }
            
<<<<<<< HEAD
            # 如果没有提供ID，生成一个
            if not new_section["id"]:
                new_section["id"] = f"section_{len(sections) + 1}_{int(time.time())}"
            
            # 确定插入位置
            if position is None:
                position = -1
                
            # 添加到根级章节
            if position == -1:
                sections.append(new_section)
            elif 0 <= position < len(sections):
                sections.insert(position, new_section)
            else:
                sections.append(new_section)
=======
            # 确定插入位置，直接使用前端提供的值
            if position is None:
                position = -1
>>>>>>> origin/main
            
            # 创建新section
            created_section = self.section_model.create({
                "id": new_section["id"],
                "paperId": paper_id,
                "title": new_section["title"],
                "titleZh": new_section["titleZh"],
                "content": new_section["content"]
            })
            
<<<<<<< HEAD
            if created_section:
                # 更新论文的sectionIds
                if self.paper_model.add_section_id(paper_id, new_section["id"]):
                    return self._wrap_success(
                        "成功添加章节",
                        {
                            "addedSection": created_section,
                            "addedSectionId": created_section["id"],
                            "parentSectionId": parent_section_id,
                            "position": position
                        }
                    )
                else:
                    # 如果添加sectionId失败，删除已创建的section
                    self.section_model.delete(created_section["id"])
                    return self._wrap_error("更新论文失败")
            else:
                return self._wrap_error("创建章节失败")
=======
            if not created_section:
                return self._wrap_error("创建章节失败")
            
            # 更新论文的sectionIds，考虑插入位置
            if is_user_paper:
                # 对于个人论文库，需要特殊处理sectionIds的更新
                success = self._add_section_id_to_user_paper(paper_id, created_section["id"], position)
            else:
                success = self.paper_model.add_section_id_at_position(paper_id, created_section["id"], position)
            
            if success:
                # 获取更新后的论文数据
                if is_user_paper:
                    # 对于个人论文库，需要特殊处理
                    updated_paper = self._get_user_paper_with_sections(paper_id)
                else:
                    updated_paper = self.paper_model.find_paper_with_sections(paper_id)
                
                return self._wrap_success(
                    "成功添加章节",
                    {
                        "addedSection": created_section,
                        "addedSectionId": created_section["id"],
                        "parentSectionId": parent_section_id,
                        "position": position,
                        "paper": updated_paper  # 添加完整的论文数据
                    }
                )
            else:
                # 如果添加sectionId失败，删除已创建的section
                self.section_model.delete(created_section["id"])
                return self._wrap_error("更新论文失败")
>>>>>>> origin/main

        except Exception as exc:
            return self._wrap_error(f"添加章节失败: {exc}")

    def update_section(
        self,
        paper_id: str,
        section_id: str,
        update_data: Dict[str, Any],
        user_id: str,
        is_admin: bool = False,
<<<<<<< HEAD
=======
        is_user_paper: bool = False,
>>>>>>> origin/main
    ) -> Dict[str, Any]:
        """
        更新指定章节
        """
        try:
            # 检查论文是否存在及权限
<<<<<<< HEAD
            paper = self.paper_model.find_by_id(paper_id)
            if not paper:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

            if not is_admin and paper["createdBy"] != user_id:
=======
            # 对于个人论文库，需要特殊处理
            if is_user_paper:
                # 个人论文库中的论文，直接通过section验证权限
                paper = {"id": paper_id}  # 创建一个虚拟的paper对象用于后续验证
            else:
                # 公共论文库中的论文，正常查找
                paper = self.paper_model.find_by_id(paper_id)
                if not paper:
                    return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

            # 管理员只能操作公开的论文
            if is_admin and not is_user_paper and not paper.get("isPublic", False):
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "管理员只能操作公开的论文")

            # 修改权限检查逻辑：如果是个人论文库中的操作，允许用户修改
            # 只有在非个人论文库操作且非管理员的情况下，才检查创建者
            if not is_user_paper and not is_admin and paper.get("createdBy") != user_id:
>>>>>>> origin/main
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权修改此论文")

            # 查找section
            target_section = self.section_model.find_by_id(section_id)
            
            if target_section is None:
                logger.error(f"未找到匹配的section - 请求的section_id: {section_id}")
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "指定的section不存在")
            
            # 验证section属于该论文
            if target_section.get("paperId") != paper_id:
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权修改此章节")

            # 更新section数据
            section_update_data = {}
            for key, value in update_data.items():
                if key == "title":
                    if isinstance(value, dict) and "en" in value:
                        section_update_data["title"] = value.get("en", "")
                        zh_value = value.get("zh", "")
                        # 修复：只要zh_value不为空就设置，不要排除特定值
                        if zh_value and zh_value.strip():
                            section_update_data["titleZh"] = zh_value
                    else:
                        section_update_data["title"] = value
                elif key == "titleZh":
                    section_update_data["titleZh"] = value
                elif key == "content":
                    section_update_data[key] = value

            # 更新section
            if self.section_model.update(section_id, section_update_data):
                updated_section = self.section_model.find_by_id(section_id)
<<<<<<< HEAD
=======
                # 获取更新后的论文数据
                if is_user_paper:
                    # 对于个人论文库，需要特殊处理
                    updated_paper = self._get_user_paper_with_sections(paper_id)
                else:
                    updated_paper = self.paper_model.find_paper_with_sections(paper_id)
                
>>>>>>> origin/main
                return self._wrap_success(
                    "章节更新成功",
                    {
                        "updatedSection": updated_section,
<<<<<<< HEAD
                        "sectionId": section_id
=======
                        "sectionId": section_id,
                        "paper": updated_paper  # 添加完整的论文数据
>>>>>>> origin/main
                    }
                )
            else:
                return self._wrap_error("更新章节失败")

        except Exception as exc:
            return self._wrap_error(f"更新章节失败: {exc}")

    def delete_section(
        self,
        paper_id: str,
        section_id: str,
        user_id: str,
        is_admin: bool = False,
<<<<<<< HEAD
=======
        is_user_paper: bool = False,
>>>>>>> origin/main
    ) -> Dict[str, Any]:
        """
        删除指定章节
        """
        try:
            # 检查论文是否存在及权限
<<<<<<< HEAD
            paper = self.paper_model.find_by_id(paper_id)
            if not paper:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

            if not is_admin and paper["createdBy"] != user_id:
=======
            # 对于个人论文库，需要特殊处理
            if is_user_paper:
                # 个人论文库中的论文，直接通过section验证权限
                paper = {"id": paper_id}  # 创建一个虚拟的paper对象用于后续验证
            else:
                # 公共论文库中的论文，正常查找
                paper = self.paper_model.find_by_id(paper_id)
                if not paper:
                    return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

            # 管理员只能操作公开的论文
            if is_admin and not is_user_paper and not paper.get("isPublic", False):
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "管理员只能操作公开的论文")

            # 修改权限检查逻辑：如果是个人论文库中的操作，允许用户修改
            # 只有在非个人论文库操作且非管理员的情况下，才检查创建者
            if not is_user_paper and not is_admin and paper.get("createdBy") != user_id:
>>>>>>> origin/main
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权修改此论文")

            # 查找section
            target_section = self.section_model.find_by_id(section_id)
            
            if target_section is None:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "指定的section不存在")
            
            # 验证section属于该论文
            if target_section.get("paperId") != paper_id:
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权修改此章节")

            # 删除section
            if self.section_model.delete(section_id):
                # 从论文中移除sectionId引用
<<<<<<< HEAD
                if self.paper_model.remove_section_id(paper_id, section_id):
                    return self._wrap_success("章节删除成功", {
                        "deletedSectionId": section_id
=======
                if is_user_paper:
                    # 对于个人论文库，需要特殊处理sectionIds的更新
                    success = self._remove_section_id_from_user_paper(paper_id, section_id)
                else:
                    success = self.paper_model.remove_section_id(paper_id, section_id)
                
                if success:
                    # 获取更新后的论文数据
                    if is_user_paper:
                        # 对于个人论文库，需要特殊处理
                        updated_paper = self._get_user_paper_with_sections(paper_id)
                    else:
                        updated_paper = self.paper_model.find_paper_with_sections(paper_id)
                    
                    return self._wrap_success("章节删除成功", {
                        "deletedSectionId": section_id,
                        "paper": updated_paper  # 添加完整的论文数据，保持一致性
>>>>>>> origin/main
                    })
                else:
                    return self._wrap_error("更新论文失败")
            else:
                return self._wrap_error("删除章节失败")

        except Exception as exc:
            return self._wrap_error(f"删除章节失败: {exc}")

    # ------------------------------------------------------------------
    # Block 操作
    # ------------------------------------------------------------------
    def add_blocks_to_section(
        self,
        paper_id: str,
        section_id: str,
        text: str,
        user_id: str,
        is_admin: bool = False,
        after_block_id: Optional[str] = None,
<<<<<<< HEAD
=======
        is_user_paper: bool = False,
>>>>>>> origin/main
    ) -> Dict[str, Any]:
        """
        使用大模型解析文本并将生成的blocks添加到指定section中
        """
        try:
            # 检查论文是否存在及权限
<<<<<<< HEAD
            paper = self.paper_model.find_by_id(paper_id)
            if not paper:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

            if not is_admin and paper["createdBy"] != user_id:
=======
            # 对于个人论文库，需要特殊处理
            if is_user_paper:
                # 个人论文库中的论文，直接通过section验证权限
                paper = {"id": paper_id}  # 创建一个虚拟的paper对象用于后续验证
            else:
                # 公共论文库中的论文，正常查找
                paper = self.paper_model.find_by_id(paper_id)
                if not paper:
                    return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

            # 管理员只能操作公开的论文
            if is_admin and not is_user_paper and not paper.get("isPublic", False):
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "管理员只能操作公开的论文")

            # 修改权限检查逻辑：如果是个人论文库中的操作，允许用户修改
            # 只有在非个人论文库操作且非管理员的情况下，才检查创建者
            if not is_user_paper and not is_admin and paper.get("createdBy") != user_id:
>>>>>>> origin/main
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权修改此论文")

            # 检查输入文本
            if not text or not text.strip():
                return self._wrap_error("文本内容不能为空")

            # 查找目标section
            target_section = self.section_model.find_by_id(section_id)
            
            if target_section is None:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "指定的section不存在")
            
            # 验证section属于该论文
            if target_section.get("paperId") != paper_id:
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权修改此章节")

            # 获取section上下文信息
            section_context = f"Section标题: {target_section.get('title', '未知')}"
            if target_section.get('content'):
                section_context += f", Section内容: {target_section['content'][:200]}..."

            # 使用LLM解析文本为blocks
<<<<<<< HEAD
            llm_utils = get_llm_utils()
            try:
                new_blocks = llm_utils.parse_text_to_blocks(text, section_context)
=======
            try:
                new_blocks = self._parse_text_to_blocks_with_llm(text, section_context)
>>>>>>> origin/main
            except Exception as llm_exc:
                raise Exception(f"LLM文本解析失败: {llm_exc}")

            if not new_blocks:
                return self._wrap_error("文本解析失败，无法生成有效的blocks")

            # 将新blocks添加到section中
            if "content" not in target_section:
                target_section["content"] = []
            
            # 根据after_block_id确定插入位置
            current_blocks = target_section["content"]
            insert_index = len(current_blocks)
            
            if after_block_id:
                for i, block in enumerate(current_blocks):
                    if block.get("id") == after_block_id:
                        insert_index = i + 1
                        break
            
            # 使用MongoDB原子更新操作
            if insert_index == len(current_blocks):
                # 在末尾添加，使用$push
                update_operation = {
                    "$push": {
                        "content": {
                            "$each": new_blocks
                        }
                    }
                }
            else:
                # 在中间插入，使用$push配合$position，避免替换整个数组
                update_operation = {
                    "$push": {
                        "content": {
                            "$each": new_blocks,
                            "$position": insert_index
                        }
                    }
                }
            
            # 执行原子更新 - 使用update_direct处理MongoDB操作符
            if self.section_model.update_direct(section_id, update_operation):
<<<<<<< HEAD
=======
                # 获取更新后的论文数据
                if is_user_paper:
                    # 对于个人论文库，需要特殊处理
                    updated_paper = self._get_user_paper_with_sections(paper_id)
                else:
                    updated_paper = self.paper_model.find_paper_with_sections(paper_id)
                
>>>>>>> origin/main
                return self._wrap_success(
                    f"成功向section添加了{len(new_blocks)}个blocks",
                    {
                        "addedBlocks": new_blocks,
<<<<<<< HEAD
                        "sectionId": section_id
=======
                        "sectionId": section_id,
                        "paper": updated_paper  # 添加完整的论文数据
>>>>>>> origin/main
                    }
                )
            else:
                return self._wrap_error("更新章节失败")

        except Exception as exc:
            return self._wrap_error(f"添加blocks到section失败: {exc}")

    def update_block(
        self,
        paper_id: str,
        section_id: str,
        block_id: str,
        update_data: Dict[str, Any],
        user_id: str,
        is_admin: bool = False,
<<<<<<< HEAD
=======
        is_user_paper: bool = False,
>>>>>>> origin/main
    ) -> Dict[str, Any]:
        """
        更新指定block
        """
        try:
            # 检查论文是否存在及权限
<<<<<<< HEAD
            paper = self.paper_model.find_by_id(paper_id)
            if not paper:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

            if not is_admin and paper["createdBy"] != user_id:
=======
            # 对于个人论文库，需要特殊处理
            if is_user_paper:
                # 个人论文库中的论文，直接通过section验证权限
                paper = {"id": paper_id}  # 创建一个虚拟的paper对象用于后续验证
            else:
                # 公共论文库中的论文，正常查找
                paper = self.paper_model.find_by_id(paper_id)
                if not paper:
                    return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

            # 管理员只能操作公开的论文
            if is_admin and not is_user_paper and not paper.get("isPublic", False):
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "管理员只能操作公开的论文")

            # 修改权限检查逻辑：如果是个人论文库中的操作，允许用户修改
            # 只有在非个人论文库操作且非管理员的情况下，才检查创建者
            if not is_user_paper and not is_admin and paper.get("createdBy") != user_id:
>>>>>>> origin/main
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权修改此论文")

            # 查找目标section
            target_section = self.section_model.find_by_id(section_id)
            
            if target_section is None:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "指定的section不存在")
            
            # 验证section属于该论文
            if target_section.get("paperId") != paper_id:
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权修改此章节")

            # 查找并更新block
            blocks = target_section.get("content", [])
            target_block_index = -1
            
            for i, block in enumerate(blocks):
                if block.get("id") == block_id:
                    target_block_index = i
                    break
            
            if target_block_index == -1:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "指定的block不存在")

            # 更新block数据
            target_block = blocks[target_block_index]
            for key, value in update_data.items():
                if key in ["content", "type", "metadata", "src", "alt", "width", "height", "caption", "description", "uploadedFilename"]:
                    target_block[key] = value

            blocks[target_block_index] = target_block
            target_section["content"] = blocks
<<<<<<< HEAD
            sections[section_index] = target_section
=======
>>>>>>> origin/main

            # 更新section
            target_section["content"] = blocks
            if self.section_model.update(section_id, {"content": blocks}):
<<<<<<< HEAD
=======
                # 获取更新后的论文数据
                if is_user_paper:
                    # 对于个人论文库，需要特殊处理
                    updated_paper = self._get_user_paper_with_sections(paper_id)
                else:
                    updated_paper = self.paper_model.find_paper_with_sections(paper_id)
                
>>>>>>> origin/main
                return self._wrap_success(
                    "block更新成功",
                    {
                        "updatedBlock": target_block,
                        "blockId": target_block["id"],
<<<<<<< HEAD
                        "sectionId": section_id
=======
                        "sectionId": section_id,
                        "paper": updated_paper  # 添加完整的论文数据
>>>>>>> origin/main
                    }
                )
            else:
                return self._wrap_error("更新章节失败")

        except Exception as exc:
            return self._wrap_error(f"更新block失败: {exc}")

    def delete_block(
        self,
        paper_id: str,
        section_id: str,
        block_id: str,
        user_id: str,
        is_admin: bool = False,
<<<<<<< HEAD
=======
        is_user_paper: bool = False,
>>>>>>> origin/main
    ) -> Dict[str, Any]:
        """
        删除指定block
        """
        try:
            # 检查论文是否存在及权限
<<<<<<< HEAD
            paper = self.paper_model.find_by_id(paper_id)
            if not paper:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

            if not is_admin and paper["createdBy"] != user_id:
=======
            # 对于个人论文库，需要特殊处理
            if is_user_paper:
                # 个人论文库中的论文，直接通过section验证权限
                paper = {"id": paper_id}  # 创建一个虚拟的paper对象用于后续验证
            else:
                # 公共论文库中的论文，正常查找
                paper = self.paper_model.find_by_id(paper_id)
                if not paper:
                    return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

            # 管理员只能操作公开的论文
            if is_admin and not is_user_paper and not paper.get("isPublic", False):
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "管理员只能操作公开的论文")

            # 修改权限检查逻辑：如果是个人论文库中的操作，允许用户修改
            # 只有在非个人论文库操作且非管理员的情况下，才检查创建者
            if not is_user_paper and not is_admin and paper.get("createdBy") != user_id:
>>>>>>> origin/main
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权修改此论文")

            # 查找目标section
            target_section = self.section_model.find_by_id(section_id)
            
            if target_section is None:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "指定的section不存在")
            
            # 验证section属于该论文
            if target_section.get("paperId") != paper_id:
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权修改此章节")

            # 查找并删除block
            blocks = target_section.get("content", [])
            target_block_index = -1
            
            for i, block in enumerate(blocks):
                if block.get("id") == block_id:
                    target_block_index = i
                    break
            
            if target_block_index == -1:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "指定的block不存在")

            # 删除block
            blocks.pop(target_block_index)
            target_section["content"] = blocks
<<<<<<< HEAD
            sections[section_index] = target_section
=======
>>>>>>> origin/main

            # 更新section
            target_section["content"] = blocks
            if self.section_model.update(section_id, {"content": blocks}):
<<<<<<< HEAD
                return self._wrap_success("block删除成功", {
                    "deletedBlockId": block_id,
                    "sectionId": section_id
=======
                # 获取更新后的论文数据
                if is_user_paper:
                    # 对于个人论文库，需要特殊处理
                    updated_paper = self._get_user_paper_with_sections(paper_id)
                else:
                    updated_paper = self.paper_model.find_paper_with_sections(paper_id)
                
                return self._wrap_success("block删除成功", {
                    "deletedBlockId": block_id,
                    "sectionId": section_id,
                    "paper": updated_paper  # 添加完整的论文数据
>>>>>>> origin/main
                })
            else:
                return self._wrap_error("更新章节失败")

        except Exception as exc:
            return self._wrap_error(f"删除block失败: {exc}")

    def add_block_directly(
        self,
        paper_id: str,
        section_id: str,
        block_data: Dict[str, Any],
        user_id: str,
        is_admin: bool = False,
        after_block_id: Optional[str] = None,
<<<<<<< HEAD
=======
        is_user_paper: bool = False,
>>>>>>> origin/main
    ) -> Dict[str, Any]:
        """
        直接向指定section添加一个block，不通过LLM解析
        """
        try:
            # 检查论文是否存在及权限
<<<<<<< HEAD
            paper = self.paper_model.find_by_id(paper_id)
            if not paper:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

            if not is_admin and paper["createdBy"] != user_id:
=======
            # 对于个人论文库，需要特殊处理
            if is_user_paper:
                # 个人论文库中的论文，直接通过section验证权限
                paper = {"id": paper_id}  # 创建一个虚拟的paper对象用于后续验证
            else:
                # 公共论文库中的论文，正常查找
                paper = self.paper_model.find_by_id(paper_id)
                if not paper:
                    return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

            # 管理员只能操作公开的论文
            if is_admin and not is_user_paper and not paper.get("isPublic", False):
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "管理员只能操作公开的论文")

            # 修改权限检查逻辑：如果是个人论文库中的操作，允许用户修改
            # 只有在非个人论文库操作且非管理员的情况下，才检查创建者
            if not is_user_paper and not is_admin and paper.get("createdBy") != user_id:
>>>>>>> origin/main
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权修改此论文")

            # 验证block数据
            if not block_data or not block_data.get("type"):
                return self._wrap_error("block数据不完整，缺少type字段")

            # 查找目标section
            target_section = self.section_model.find_by_id(section_id)
            
            if target_section is None:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "指定的section不存在")
            
            # 验证section属于该论文
            if target_section.get("paperId") != paper_id:
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权修改此章节")

            # 确保section有content字段
            if "content" not in target_section:
                target_section["content"] = []
            
            # 根据after_block_id确定插入位置
            current_blocks = target_section["content"]
            insert_index = len(current_blocks)
            
            if after_block_id:
                for i, block in enumerate(current_blocks):
                    if block.get("id") == after_block_id:
                        insert_index = i + 1
                        break
            
            # 创建新block
            frontend_id = block_data.get("id")
            if frontend_id and isinstance(frontend_id, str):
                new_block_id = frontend_id
            else:
<<<<<<< HEAD
                new_block_id = f"block_{int(time.time())}_{uuid.uuid4().hex[:8]}"
=======
                new_block_id = str(uuid.uuid4())
>>>>>>> origin/main
            
            new_block = {
                "id": new_block_id,
                "type": block_data.get("type"),
                "content": block_data.get("content", {}),
                "metadata": block_data.get("metadata", {}),
            }
            
            # 处理常见的可选字段
            optional_fields = ["align", "start", "level", "author", "language", "showLineNumbers", "width", "height"]
            for field in optional_fields:
                if field in block_data:
                    new_block[field] = block_data[field]
            
            # 根据不同类型设置默认值
            if block_data.get("type") == "math" and "latex" in block_data:
                new_block["latex"] = block_data["latex"]
            elif block_data.get("type") == "code" and "code" in block_data:
                new_block["code"] = block_data["code"]
                new_block["language"] = block_data.get("language", "python")
            elif block_data.get("type") == "figure" and "url" in block_data:
                new_block["url"] = block_data["url"]
                new_block["alt"] = block_data.get("alt", "")
            elif block_data.get("type") == "table":
                new_block["headers"] = block_data.get("headers", ["Column 1", "Column 2"])
                new_block["rows"] = block_data.get("rows", [[]])
            elif block_data.get("type") in ["ordered-list", "unordered-list"]:
                new_block["items"] = block_data.get("items", [
                    {
                        "content": {
                            "en": [{"type": "text", "content": "First item"}],
                            "zh": [{"type": "text", "content": "第一项"}]
                        }
                    },
                    {
                        "content": {
                            "en": [{"type": "text", "content": "Second item"}],
                            "zh": [{"type": "text", "content": "第二项"}]
                        }
                    }
                ])
                if block_data.get("type") == "ordered-list":
                    new_block["start"] = block_data.get("start", 1)
            elif block_data.get("type") == "quote":
                new_block["author"] = block_data.get("author", "Author")
            elif block_data.get("type") == "heading":
                new_block["level"] = block_data.get("level", 2)
            
            # 特别处理图片类字段
            if block_data.get("type") == "figure":
                image_fields = ["src", "uploadedFilename", "caption", "description"]
                for field in image_fields:
                    if field in block_data:
                        new_block[field] = block_data[field]
            
            # 使用MongoDB原子更新操作
            if insert_index == len(current_blocks):
                # 在末尾添加，使用$push
                update_operation = {
                    "$push": {
                        "content": new_block
                    }
                }
            else:
                # 在中间插入，使用$push配合$position，避免替换整个数组
                update_operation = {
                    "$push": {
                        "content": {
                            "$each": [new_block],
                            "$position": insert_index
                        }
                    }
                }
            
            # 执行原子更新 - 使用update_direct处理MongoDB操作符
            if self.section_model.update_direct(section_id, update_operation):
<<<<<<< HEAD
=======
                # 获取更新后的论文数据
                if is_user_paper:
                    # 对于个人论文库，需要特殊处理
                    updated_paper = self._get_user_paper_with_sections(paper_id)
                else:
                    updated_paper = self.paper_model.find_paper_with_sections(paper_id)
                
>>>>>>> origin/main
                return self._wrap_success(
                    "成功添加block",
                    {
                        "addedBlock": new_block,
                        "blockId": new_block["id"],
<<<<<<< HEAD
                        "sectionId": section_id
=======
                        "sectionId": section_id,
                        "paper": updated_paper  # 添加完整的论文数据
>>>>>>> origin/main
                    }
                )
            else:
                return self._wrap_error("更新章节失败")

        except Exception as exc:
            return self._wrap_error(f"添加block失败: {exc}")

    def add_block_from_text(
        self,
        paper_id: str,
        section_id: str,
        text: str,
        user_id: str,
        is_admin: bool = False,
        after_block_id: Optional[str] = None,
<<<<<<< HEAD
    ) -> Dict[str, Any]:
        """
        使用大模型解析文本并将生成的block添加到指定section中
        """
        try:
            # 检查论文是否存在及权限
            paper = self.paper_model.find_by_id(paper_id)
            if not paper:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

            if not is_admin and paper["createdBy"] != user_id:
=======
        is_user_paper: bool = False,
    ) -> Dict[str, Any]:
        """
        使用大模型解析文本并将生成的block添加到指定section中（基于ParseBlocks临时表版本）
        
        工作流程：
        1. 创建ParseBlocks记录和临时进度block
        2. 启动后台任务进行解析
        3. 解析完成后将结果存储在ParseBlocks表中，不直接插入section
        4. 返回parseId，前端通过轮询检测解析状态
        """
        try:
            # 检查论文是否存在及权限
            # 对于个人论文库，需要特殊处理
            if is_user_paper:
                # 个人论文库中的论文，直接通过section验证权限
                paper = {"id": paper_id}  # 创建一个虚拟的paper对象用于后续验证
            else:
                # 公共论文库中的论文，正常查找
                paper = self.paper_model.find_by_id(paper_id)
                if not paper:
                    return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

            # 管理员只能操作公开的论文
            if is_admin and not is_user_paper and not paper.get("isPublic", False):
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "管理员只能操作公开的论文")

            # 修改权限检查逻辑：如果是个人论文库中的操作，允许用户修改
            # 只有在非个人论文库操作且非管理员的情况下，才检查创建者
            if not is_user_paper and not is_admin and paper.get("createdBy") != user_id:
>>>>>>> origin/main
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权修改此论文")

            # 检查输入文本
            if not text or not text.strip():
                return self._wrap_error("文本内容不能为空")

            # 查找目标section
            target_section = self.section_model.find_by_id(section_id)
            
            if target_section is None:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "指定的section不存在")
            
            # 验证section属于该论文
            if target_section.get("paperId") != paper_id:
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权修改此章节")

<<<<<<< HEAD
            # 获取section上下文信息
            section_context = f"Section标题: {target_section.get('title', '未知')}"
            if target_section.get('content'):
                section_context += f", Section内容: {target_section['content'][:200]}..."

            # 使用LLM解析文本为blocks
            llm_utils = get_llm_utils()
            try:
                new_blocks = llm_utils.parse_text_to_blocks(text, section_context)
            except Exception as llm_exc:
                raise Exception(f"LLM文本解析失败: {llm_exc}")

            if not new_blocks:
                return self._wrap_error("文本解析失败，无法生成有效的blocks")

            # 将新blocks添加到section中
            if "content" not in target_section:
                target_section["content"] = []
            
            # 根据after_block_id确定插入位置
            current_blocks = target_section["content"]
            insert_index = len(current_blocks)
            
            if after_block_id:
                for i, block in enumerate(current_blocks):
                    if block.get("id") == after_block_id:
                        insert_index = i + 1
                        break
            
            # 使用MongoDB原子更新操作
            if insert_index == len(current_blocks):
                # 在末尾添加，使用$push
                update_operation = {
                    "$push": {
                        "content": {
                            "$each": new_blocks
                        }
                    }
                }
            else:
                # 在中间插入，使用$push配合$position，避免替换整个数组
                update_operation = {
                    "$push": {
                        "content": {
                            "$each": new_blocks,
                            "$position": insert_index
                        }
                    }
                }
            
            # 执行原子更新 - 使用update_direct处理MongoDB操作符
            if self.section_model.update_direct(section_id, update_operation):
                return self._wrap_success(
                    f"成功向section添加了{len(new_blocks)}个blocks",
                    {
                        "addedBlocks": new_blocks,
                        "sectionId": section_id
                    }
                )
            else:
                return self._wrap_error("更新章节失败")
=======
            # 生成临时进度block ID和解析记录ID
            temp_block_id = "temp_" + generate_id()
            parse_id = "pb_" + generate_id()
            
            # 确保section有content字段
            if "content" not in target_section:
                target_section["content"] = []
            
            # 计算插入位置
            insert_index = self._calculate_insert_index(target_section, after_block_id)
            
            # 插入临时parsing block（注意：不再预先插入parsed blocks）
            temp_block = {
                "id": temp_block_id,
                "type": "parsing",
                "stage": "structuring",
                "message": "正在解析文本...",
                "createdAt": get_current_time().isoformat(),
                "parseId": parse_id  # 新增：方便前端拿
            }
            
            content = target_section["content"]
            content.insert(insert_index, temp_block)
            self.section_model.update_direct(section_id, {"$set": {"content": content}})

            # 在ParseBlocks表中创建记录
            from ..models.parseBlocks import get_parse_blocks_model
            parse_model = get_parse_blocks_model()
            parse_model.create_record(
                parse_id=parse_id,
                user_id=user_id,
                paper_id=paper_id,
                section_id=section_id,
                text=text,
                after_block_id=after_block_id,
                insert_index=insert_index,
                temp_block_id=temp_block_id,
                is_admin=is_admin,
                user_paper_id=paper_id if is_user_paper else None
            )

            # 启动后台任务进行解析
            from ..utils.background_tasks import get_task_manager
            task_manager = get_task_manager()
            
            # 定义后台解析任务
            def background_parse_task():
                """后台解析任务"""
                try:
                    # 创建应用上下文
                    try:
                        from flask import current_app
                        app_context = current_app.app_context()
                    except (RuntimeError, ImportError):
                        from neuink import create_app
                        app = create_app()
                        app_context = app.app_context()
                    
                    with app_context:
                        # 阶段1: 解析文本结构
                        logger.info(f"开始解析文本结构 - parse_id: {parse_id}")
                        
                        # 更新进度block状态
                        self._update_temp_block_stage(section_id, temp_block_id, "structuring", "正在解析文本...")
                        
                        # 获取section上下文
                        section_title = target_section.get("title", "") or target_section.get("titleZh", "")
                        section_context = f"章节: {section_title}"
                        
                        # 解析文本为blocks
                        parsed_blocks = self._parse_text_to_blocks_with_llm(text, section_context)
                        
                        if not parsed_blocks:
                            raise Exception("文本解析失败，无法生成有效的blocks")
                        
                        logger.info(f"解析完成 - 生成 {len(parsed_blocks)} 个blocks")
                        
                        # 写入ParseBlocks表
                        parse_model.set_completed(parse_id, parsed_blocks)
                        
                        # 更新临时block状态（但不要插入parsed_blocks到section）
                        self._update_temp_block_stage(
                            section_id, temp_block_id, "completed",
                            "解析完成，请查看结果并选择要保存的内容",
                            extra_fields={"parseId": parse_id}
                        )
                        
                        logger.info(f"后台解析任务完成 - parse_id: {parse_id}")
                        
                except Exception as e:
                    logger.error(f"后台解析任务失败: {e}")
                    # 更新ParseBlocks记录为失败状态
                    parse_model.set_failed(parse_id, str(e))
                    # 更新临时block为错误状态
                    self._update_temp_block_stage(
                        section_id, temp_block_id, "failed",
                        f"解析失败: {str(e)}"
                    )
            
            # 提交后台任务
            task_manager.submit_task(
                task_id=temp_block_id,
                func=background_parse_task
            )
            
            # 立即返回，包含parseId信息
            return self._wrap_success(
                "已开始解析文本，请通过轮询检查进度",
                {
                    "tempBlockId": temp_block_id,
                    "sectionId": section_id,
                    "parseId": parse_id  # 新增：这一次解析的ParseBlocks ID
                }
            )
>>>>>>> origin/main

        except Exception as exc:
            import traceback
            error_details = f"从文本添加block到section失败: {exc}\n详细错误: {traceback.format_exc()}"
            return self._wrap_error(error_details)
<<<<<<< HEAD

    # ------------------------------------------------------------------
    # 参考文献操作
    # ------------------------------------------------------------------
    def parse_references(self, text: str) -> Dict[str, Any]:
        """
        解析参考文献文本，返回结构化的参考文献列表
        """
        try:
            # 使用parse_reference_text方法解析参考文献
            result = self.parse_reference_text(text)
            
            # 检查是否有任何成功解析的参考文献
            if not result["references"] and not result["errors"]:
                return self._wrap_error("参考文献解析失败，无法提取有效的参考文献")
            
            # 返回包含成功解析的参考文献和错误信息的结果
            return self._wrap_success(
                "参考文献解析完成",
                {
                    "references": result["references"],
                    "count": result["count"],
                    "errors": result["errors"]
                }
            )
        except Exception as exc:
            return self._wrap_error(f"参考文献解析失败: {exc}")

    @staticmethod
    def parse_reference_text(text: str) -> Dict[str, Any]:
        """
        简化的参考文献解析方法，主要提取标题和原始文本
        """
        # 分条
        def split_entries(s: str) -> List[Tuple[Optional[int], str]]:
            """分割参考文献条目"""
            items: List[Tuple[Optional[int], str]] = []
            matches = list(re.finditer(r'\[(\d+)\]\s*', s))
            if not matches:
                return [(None, s.strip())]
            for i, m in enumerate(matches):
                idx = int(m.group(1))
                start = m.end()
                end = matches[i + 1].start() if i + 1 < len(matches) else len(s)
                raw = s[start:end].strip().rstrip('.')
                items.append((idx, raw))
            return items

        # 提取标题
        def extract_title(raw: str) -> str:
            """从原始文本中提取标题（在引号内的内容）"""
            # 尝试匹配双引号内的标题
            m = re.search(r'"([^"]+)"', raw)
            if m:
                return m.group(1).strip()
            
            # 尝试匹配单引号内的标题
            m = re.search(r"'([^']+)'", raw)
            if m:
                return m.group(1).strip()
            
            # 如果没有引号，尝试提取第一个逗号前的内容作为标题
            parts = raw.split(',', 1)
            if len(parts) > 1:
                return parts[0].strip()
            
            # 如果都没有，返回整个文本的前50个字符作为标题
            return raw[:50].strip() + ('...' if len(raw) > 50 else '')

        def parse_one(raw: str, idx: Optional[int]) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
            print(f"\n[解析开始] 处理参考文献 #{idx}: '{raw[:100]}...'")
            
            # 提取标题
            title = extract_title(raw)
            print(f"[解析过程] 提取的标题: '{title}'")
            
            # 提取年份
            year_match = re.search(r'(19|20|21)\d{2}', raw)
            year = int(year_match.group()) if year_match else None
            print(f"[解析过程] 提取的年份: {year}")
            
            # 创建参考文献记录
            rec = {
                'index': idx,
                'type': 'journal',
                'authors': [],
                'has_et_al': False,
                'title': title,
                'venue': '',
                'volume': None,
                'number': None,
                'pages': None,
                'article_no': None,
                'year': year,
                'doi': None,
                'eprint': None,
                'eprint_type': None,
                'raw': raw.strip(),
                'is_incomplete': False if title else True,
                'originalText': raw.strip()
            }
            
            if not title:
                error_message = '未能提取标题'
                rec['is_incomplete'] = True
                rec['title'] = f'【解析错误】{error_message}'
                err = {'index': idx, 'raw': raw.strip(), 'message': error_message}
                print(f"[解析错误] {error_message}")
                return rec, err
            
            print(f"[解析成功] 标题: {rec.get('title', '')}, 年份: {rec.get('year', '')}")
            return rec, None

        refs: List[Dict[str, Any]] = []
        errors: List[Dict[str, Any]] = []
        
        entries = split_entries(text)
        print(f"\n[参考文献解析] 开始解析{len(entries)}条参考文献")
        
        for idx, raw in entries:
            rec, err = parse_one(raw, idx)
            if rec:
                refs.append(rec)
                if rec.get('is_incomplete', False) and err:
                    errors.append(err)
            elif err:
                errors.append(err)

        print(f"\n[参考文献解析] 解析完成: 成功{len(refs)}条，失败{len(errors)}条")
        if errors:
            print(f"[参考文献解析] 解析错误列表:")
            for err in errors:
                print(f"  - 索引{err.get('index')}: {err.get('message')}")
        
        return {
            'references': refs,
            'count': len(refs),
            'errors': errors,
        }

    def add_references_to_paper(
        self,
        paper_id: str,
        references: List[Dict[str, Any]],
        user_id: str,
        is_admin: bool = False,
    ) -> Dict[str, Any]:
        """
        将解析后的参考文献添加到论文中，只保存原始文本，不进行重复检测
        """
        try:
            # 检查论文是否存在及权限
            paper = self.paper_model.find_by_id(paper_id)
            if not paper:
                return self._wrap_failure(BusinessCode.PAPER_NOT_FOUND, "论文不存在")

            if not is_admin and paper["createdBy"] != user_id:
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权修改此论文")

            # 获取当前参考文献列表
            current_references = paper.get("references", [])
            
            # 按照解析出的index字段排序
            sorted_references = sorted(references, key=lambda x: x.get("index", 0))
            
            # 处理参考文献：直接添加，不进行重复检测
            added_references = []
            
            print(f"\n[参考文献处理] 开始处理{len(sorted_references)}条参考文献")
            print(f"[参考文献处理] 当前已有{len(current_references)}条参考文献")
            
            for ref in sorted_references:
                ref_index = ref.get("index")
                
                print(f"\n[参考文献处理] 处理参考文献 #{ref_index}")
                
                if ref_index is None:
                    print(f"[参考文献处理] 跳过索引为None的参考文献")
                    continue
                
                ref_id = f"ref-{ref_index}"
                ref_number = ref_index
                
                new_ref = {
                    "id": ref_id,
                    "number": ref_number,
                    "authors": ref.get("authors", []),
                    "title": ref.get("title", ""),
                    "publication": ref.get("venue"),
                    "year": ref.get("year"),
                    "doi": ref.get("doi"),
                    "url": None,
                    "pages": ref.get("pages"),
                    "volume": ref.get("volume"),
                    "issue": ref.get("number"),
                    "originalText": ref.get("originalText", "")
                }
                
                # 移除空值字段
                new_ref = {k: v for k, v in new_ref.items() if v is not None}
                
                print(f"[参考文献处理] 添加新参考文献")
                added_references.append(new_ref)
                current_references.append(new_ref)
            
            # 更新论文
            update_data = {"references": current_references}
            if self.paper_model.update(paper_id, update_data):
                result_message = f"成功添加{len(added_references)}条参考文献"
                
                return self._wrap_success(
                    result_message,
                    {
                        "addedReferences": added_references,
                        "totalProcessed": len(sorted_references),
                        "totalReferences": len(current_references)
                    }
                )
            else:
                return self._wrap_error("更新论文失败")
                
        except Exception as exc:
            return self._wrap_error(f"添加参考文献失败: {exc}")
=======
    
    def _update_temp_block_stage(self, section_id: str, temp_block_id: str, stage: str, message: str, extra_fields: Optional[Dict[str, Any]] = None):
        """更新临时进度block的阶段"""
        try:
            section = self.section_model.find_by_id(section_id)
            if not section:
                return
            
            content = section.get("content", [])
            for i, block in enumerate(content):
                if block.get("id") == temp_block_id:
                    content[i]["stage"] = stage
                    content[i]["message"] = message
                    
                    # 添加额外字段，如parseId
                    if extra_fields:
                        for key, value in extra_fields.items():
                            content[i][key] = value
                    
                    break
            
            self.section_model.update_direct(section_id, {"$set": {"content": content}})
        except Exception as e:
            logger.error(f"更新临时block阶段失败: {e}")
 
         
    def _calculate_insert_index(self, section: Dict[str, Any], after_block_id: Optional[str]) -> int:
        """计算插入位置"""
        content = section.get("content", []) or []
        if not after_block_id:
            return len(content)
        
        for i, block in enumerate(content):
            if block.get("id") == after_block_id:
                return i + 1
        
        return len(content)

    def _remove_temp_block(self, section_id: str, temp_block_id: str) -> bool:
        """从section中移除临时parsing block"""
        try:
            section = self.section_model.find_by_id(section_id)
            if not section:
                return False
            
            content = section.get("content", []) or []
            new_content = [b for b in content if b.get("id") != temp_block_id]
            
            return self.section_model.update_direct(section_id, {"$set": {"content": new_content}})
        except Exception as e:
            logger.error(f"移除临时block失败: {e}")
            return False

    def _replace_temp_block_with_parsed(
        self,
        section_id: str,
        temp_block_id: str,
        insert_index: int,
        parsed_blocks: List[Dict[str, Any]],
    ):
        """
        用解析后的 blocks 替换临时进度 block：
        - 只记录真正新增的 blockId
        - 同时把 parsed_block_ids 写到临时 block 与内存缓存中，方便轮询兜底使用
        """
        try:
            section = self.section_model.find_by_id(section_id)
            if not section:
                return

            content = section.get("content", []) or []

            # ① 记录当前已经存在的 blockId（排除临时 block 自己）
            existing_ids = {
                b.get("id") for b in content
                if b.get("id") and b.get("id") != temp_block_id
            }

            # ② 只把"原来不存在"的 id 当成真正新增的 id
            parsed_block_ids: List[str] = []
            for block in parsed_blocks:
                bid = block.get("id")
                if not bid:
                    continue
                if bid not in existing_ids:
                    parsed_block_ids.append(bid)

            # ③ 先在原位置插入解析后的 blocks，但保留临时 block
            content[insert_index:insert_index] = parsed_blocks

            # ④ 在临时 block 上写入完成状态 & parsedBlockIds
            for i, block in enumerate(content):
                if block.get("id") == temp_block_id:
                    content[i]["stage"] = "completed"
                    content[i]["message"] = "解析完成"
                    content[i]["parsedBlockIds"] = parsed_block_ids
                    break

            # ⑤ 更新 section，确保临时 block 和新添加的 blocks 都存在
            self.section_model.update_direct(section_id, {"$set": {"content": content}})

            # ⑥ 同时把 parsedBlockIds 记到内存缓存（兜底用）
            try:
                # 这里假设你在同文件或可 import 的模块里实现了这个函数
                remember_parsed_blocks(temp_block_id, section_id, parsed_block_ids)
            except Exception as cache_err:
                logger.warning(f"记录解析结果到内存缓存失败: {cache_err}")

            # 给轮询一点时间，确保有机会读到 completed + parsedBlockIds
            time.sleep(0.5)

            # ⑦ 移除临时 block
            content = [block for block in content if block.get("id") != temp_block_id]

            # ⑧ 最终更新 section
            self.section_model.update_direct(section_id, {"$set": {"content": content}})

            logger.info(
                f"成功替换临时block - temp_id: {temp_block_id}, 记录新增 {len(parsed_block_ids)} 个blockId"
            )
        except Exception as e:
            logger.error(f"替换临时block失败: {e}")
>>>>>>> origin/main

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
<<<<<<< HEAD
=======

    def _get_user_paper_with_sections(self, user_paper_id: str) -> Optional[Dict[str, Any]]:
        """
        获取个人论文库中的论文并包含完整的sections数据
        """
        try:
            from ..models.userPaper import UserPaperModel
            user_paper_model = UserPaperModel()
            user_paper = user_paper_model.find_by_id(user_paper_id)
            
            if not user_paper:
                return None
                
            # 确保sections数据存在
            if "sections" not in user_paper:
                user_paper["sections"] = []
                
            return user_paper
        except Exception as e:
            logger.error(f"获取个人论文库数据失败: {e}")
            return None

    def _add_section_id_to_user_paper(self, user_paper_id: str, section_id: str, position: int) -> bool:
        """
        向个人论文库中的论文添加section ID引用
        """
        try:
            from ..models.userPaper import UserPaperModel
            user_paper_model = UserPaperModel()
            
            # 获取当前个人论文
            user_paper = user_paper_model.find_by_id(user_paper_id)
            if not user_paper:
                return False
                
            # 获取当前的sectionIds
            section_ids = user_paper.get("sectionIds", [])
            
            # 确定插入位置
            if position == -1 or position >= len(section_ids):
                # 在末尾添加
                section_ids.append(section_id)
            elif position == 0:
                # 在最顶部插入
                section_ids.insert(0, section_id)
            else:
                # 在指定位置插入
                section_ids.insert(position, section_id)
            
            # 更新个人论文的sectionIds
            return user_paper_model.update(user_paper_id, {"sectionIds": section_ids})
        except Exception as e:
            logger.error(f"更新个人论文库sectionIds失败: {e}")
            return False

    def _remove_section_id_from_user_paper(self, user_paper_id: str, section_id: str) -> bool:
        """
        从个人论文库中的论文移除section ID引用
        """
        try:
            from ..models.userPaper import UserPaperModel
            user_paper_model = UserPaperModel()
            
            # 获取当前个人论文
            user_paper = user_paper_model.find_by_id(user_paper_id)
            if not user_paper:
                return False
                
            # 获取当前的sectionIds并移除指定的section_id
            section_ids = user_paper.get("sectionIds", [])
            if section_id in section_ids:
                section_ids.remove(section_id)
            
            # 更新个人论文的sectionIds
            return user_paper_model.update(user_paper_id, {"sectionIds": section_ids})
        except Exception as e:
            logger.error(f"从个人论文库移除sectionId失败: {e}")
            return False
>>>>>>> origin/main
