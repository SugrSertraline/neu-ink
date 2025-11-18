"""
Paper 内容操作服务
处理论文内容相关的操作（章节、块、参考文献）
"""
import time
import uuid
import re
import json
import logging
from typing import Dict, Any, Optional, List, Tuple
from ..models.paper import PaperModel
from ..models.section import get_section_model
from ..config.constants import BusinessCode
from ..utils.llm_utils import get_llm_utils
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

class PaperContentService:
    """Paper 内容操作服务类"""

    def __init__(self, paper_model: PaperModel) -> None:
        self.paper_model = paper_model
        self.section_model = get_section_model()

    # ------------------------------------------------------------------
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

        # 构建提示词
        user_prompt = f"{TEXT_TO_BLOCKS_USER_PROMPT_TEMPLATE}\n\n章节上下文: {section_context or '无'}\n\n{text[:40000]}"

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
                return self._wrap_failure(BusinessCode.PERMISSION_DENIED, "无权修改此论文")

            # 获取当前sections
            sections = self.section_model.find_by_paper_id(paper_id)
            
            # 确保新章节有必要的字段
            title_data = section_data.get("title", {})
            title_zh_data = section_data.get("titleZh", "")
            
            # 优先使用前端提供的ID，如果没有则生成一个
            section_id = section_data.get("id")
            if not section_id:
                # 使用UUID生成唯一ID，避免冲突
                section_id = str(uuid.uuid4())
            
            if isinstance(title_data, dict) and "en" in title_data:
                new_section = {
                    "id": section_id,
                    "title": title_data.get("en", "Untitled Section"),
                    "titleZh": title_data.get("zh", title_zh_data or "未命名章节"),
                    "content": section_data.get("content", [])
                }
            else:
                new_section = {
                    "id": section_id,
                    "title": title_data if title_data else "Untitled Section",
                    "titleZh": title_zh_data if title_zh_data else "未命名章节",
                    "content": section_data.get("content", [])
                }
            
            # 确定插入位置，直接使用前端提供的值
            if position is None:
                position = -1
            
            # 创建新section
            created_section = self.section_model.create({
                "id": new_section["id"],
                "paperId": paper_id,
                "title": new_section["title"],
                "titleZh": new_section["titleZh"],
                "content": new_section["content"]
            })
            
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

        except Exception as exc:
            return self._wrap_error(f"添加章节失败: {exc}")

    def update_section(
        self,
        paper_id: str,
        section_id: str,
        update_data: Dict[str, Any],
        user_id: str,
        is_admin: bool = False,
        is_user_paper: bool = False,
    ) -> Dict[str, Any]:
        """
        更新指定章节
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
                # 获取更新后的论文数据
                if is_user_paper:
                    # 对于个人论文库，需要特殊处理
                    updated_paper = self._get_user_paper_with_sections(paper_id)
                else:
                    updated_paper = self.paper_model.find_paper_with_sections(paper_id)
                
                return self._wrap_success(
                    "章节更新成功",
                    {
                        "updatedSection": updated_section,
                        "sectionId": section_id,
                        "paper": updated_paper  # 添加完整的论文数据
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
        is_user_paper: bool = False,
    ) -> Dict[str, Any]:
        """
        删除指定章节
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
        is_user_paper: bool = False,
    ) -> Dict[str, Any]:
        """
        使用大模型解析文本并将生成的blocks添加到指定section中
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
            try:
                new_blocks = self._parse_text_to_blocks_with_llm(text, section_context)
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
                # 获取更新后的论文数据
                if is_user_paper:
                    # 对于个人论文库，需要特殊处理
                    updated_paper = self._get_user_paper_with_sections(paper_id)
                else:
                    updated_paper = self.paper_model.find_paper_with_sections(paper_id)
                
                return self._wrap_success(
                    f"成功向section添加了{len(new_blocks)}个blocks",
                    {
                        "addedBlocks": new_blocks,
                        "sectionId": section_id,
                        "paper": updated_paper  # 添加完整的论文数据
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
        is_user_paper: bool = False,
    ) -> Dict[str, Any]:
        """
        更新指定block
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

            # 更新section
            target_section["content"] = blocks
            if self.section_model.update(section_id, {"content": blocks}):
                # 获取更新后的论文数据
                if is_user_paper:
                    # 对于个人论文库，需要特殊处理
                    updated_paper = self._get_user_paper_with_sections(paper_id)
                else:
                    updated_paper = self.paper_model.find_paper_with_sections(paper_id)
                
                return self._wrap_success(
                    "block更新成功",
                    {
                        "updatedBlock": target_block,
                        "blockId": target_block["id"],
                        "sectionId": section_id,
                        "paper": updated_paper  # 添加完整的论文数据
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
        is_user_paper: bool = False,
    ) -> Dict[str, Any]:
        """
        删除指定block
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

            # 更新section
            target_section["content"] = blocks
            if self.section_model.update(section_id, {"content": blocks}):
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
        is_user_paper: bool = False,
    ) -> Dict[str, Any]:
        """
        直接向指定section添加一个block，不通过LLM解析
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
                new_block_id = str(uuid.uuid4())
            
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
                # 获取更新后的论文数据
                if is_user_paper:
                    # 对于个人论文库，需要特殊处理
                    updated_paper = self._get_user_paper_with_sections(paper_id)
                else:
                    updated_paper = self.paper_model.find_paper_with_sections(paper_id)
                
                return self._wrap_success(
                    "成功添加block",
                    {
                        "addedBlock": new_block,
                        "blockId": new_block["id"],
                        "sectionId": section_id,
                        "paper": updated_paper  # 添加完整的论文数据
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
        is_user_paper: bool = False,
    ) -> Dict[str, Any]:
        """
        使用大模型解析文本并将生成的block添加到指定section中（异步后台任务版本）
        
        工作流程：
        1. 立即创建临时进度block并插入到section
        2. 启动后台任务进行解析
        3. 返回临时block ID，前端通过轮询检测block是否被替换
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
            if not is_user_paper and not is_admin and paper.get("createdBy") != user_id:
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

            # 生成临时进度block ID
            temp_block_id = str(uuid.uuid4())
            
            # 确保section有content字段
            if "content" not in target_section:
                target_section["content"] = []
            
            # 确定插入位置
            current_blocks = target_section["content"]
            insert_index = len(current_blocks)
            
            if after_block_id:
                for i, block in enumerate(current_blocks):
                    if block.get("id") == after_block_id:
                        insert_index = i + 1
                        break
            
            # 创建临时进度block
            temp_block = {
                "id": temp_block_id,
                "type": "parsing",
                "stage": "structuring",
                "message": "正在解析文本...",
                "createdAt": get_current_time().isoformat()
            }
            
            # 插入临时block
            current_blocks.insert(insert_index, temp_block)
            
            # 更新section
            if not self.section_model.update_direct(section_id, {"$set": {"content": current_blocks}}):
                return self._wrap_error("添加临时进度块失败")
            
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
                        logger.info(f"开始解析文本结构 - temp_block: {temp_block_id}")
                        
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
                        
                        # 完成：替换临时block
                        self._replace_temp_block_with_parsed(
                            section_id, temp_block_id, insert_index, parsed_blocks
                        )
                        
                        logger.info(f"后台解析任务完成 - temp_block: {temp_block_id}")
                        
                except Exception as e:
                    logger.error(f"后台解析任务失败: {e}")
                    # 更新临时block为错误状态
                    self._update_temp_block_stage(
                        section_id, temp_block_id, "failed", f"解析失败: {str(e)}"
                    )
            
            # 提交后台任务
            task_manager.submit_task(
                task_id=temp_block_id,
                func=background_parse_task
            )
            
            # 立即返回，包含临时block信息
            return self._wrap_success(
                "已开始解析文本，请通过轮询检查进度",
                {
                    "tempBlockId": temp_block_id,
                    "sectionId": section_id,
                    "message": "后台任务已启动，前端可以通过轮询section数据检测解析进度"
                }
            )

        except Exception as exc:
            import traceback
            error_details = f"从文本添加block到section失败: {exc}\n详细错误: {traceback.format_exc()}"
            return self._wrap_error(error_details)
    
    def _update_temp_block_stage(self, section_id: str, temp_block_id: str, stage: str, message: str):
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
                    break
            
            self.section_model.update_direct(section_id, {"$set": {"content": content}})
        except Exception as e:
            logger.error(f"更新临时block阶段失败: {e}")
 
        
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
