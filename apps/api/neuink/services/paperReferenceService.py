"""
论文参考文献解析服务
负责使用LLM解析参考文献
"""
import json
import logging
import uuid
import re
from typing import Dict, Any, Optional, List, Tuple

from ..config.constants import BusinessCode
from ..utils.llm_utils import get_llm_utils
from ..utils.llm_prompts import (
    REFERENCE_PARSING_SYSTEM_PROMPT,
    REFERENCE_PARSING_USER_PROMPT_TEMPLATE
)

logger = logging.getLogger(__name__)


class PaperReferenceService:
    """论文参考文献解析服务类"""
    
    def __init__(self):
        self.llm_utils = get_llm_utils()
    
    def parse_references_with_llm(self, text: str) -> List[Dict[str, Any]]:
        """
        使用LLM解析参考文献
        
        Args:
            text: 参考文献文本
            
        Returns:
            解析后的参考文献列表
            
        Raises:
            RuntimeError: 如果LLM不可用或解析失败
        """
        logger.info("开始解析参考文献")
        logger.info(f"文本长度: {len(text)} 字符")
        
        # 检查API可用性
        try:
            provider = self.llm_utils._get_provider()
            if not provider.api_key or provider.api_key == "your_glm_api_key_here":
                raise RuntimeError("LLM服务不可用：未配置GLM_API_KEY或使用了占位符值。请在.env文件中设置有效的GLM API密钥。")
        except Exception as e:
            raise RuntimeError(f"LLM服务不可用: {e}")
        
        # 限制文本长度
        truncated_text = text[:50000] if len(text) > 50000 else text
        logger.info(f"原始文本长度: {len(text)} 字符")
        logger.info(f"解析文本长度: {len(truncated_text)} 字符")
        if len(text) > 50000:
            logger.warning("文本被截断，前50,000字符将被解析")
        
        # 构建提示词
        user_prompt = f"{REFERENCE_PARSING_USER_PROMPT_TEMPLATE}\n\n{truncated_text}"
        
        messages = [
            {"role": "system", "content": REFERENCE_PARSING_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ]
        
        try:
            logger.info("发送参考文献解析请求到LLM...")
            response = self.llm_utils.call_llm(messages, temperature=0.1, max_tokens=100000)
            
            if not response or "choices" not in response:
                logger.error("LLM响应格式错误")
                raise Exception("LLM响应格式错误")
                
            content = response["choices"][0]["message"]["content"]
            logger.info(f"LLM原始响应: {content[:500]}...")
            
            # 提取JSON内容
            if "```json" in content:
                fence = "```json"
                start = content.find(fence) + len(fence)
                end = content.find("```", start)
                content = content[start:end].strip()
            elif "```" in content:
                fence = "```"
                start = content.find(fence) + len(fence)
                end = content.find("```", start)
                content = content[start:end].strip()
            
            # 清理可能的特殊字符
            content = content.strip()
            if content.startswith('json'):
                content = content[4:].strip()
            
            logger.info(f"解析JSON内容: {content[:200]}...")
            parsed_references = json.loads(content)
            
            # 确保返回的是数组
            if not isinstance(parsed_references, list):
                logger.error("LLM返回的不是数组格式")
                raise Exception("LLM返回的不是数组格式")
            
            # 为每条参考文献添加ID并验证格式
            try:
                from ..utils.common import generate_id
            except ImportError:
                def generate_id():
                    return str(uuid.uuid4())
            
            validated_references = []
            
            for i, ref in enumerate(parsed_references):
                if not isinstance(ref, dict):
                    logger.warning(f"跳过无效参考文献: {ref}")
                    continue
                
                # 确保有标题
                if not ref.get("title"):
                    logger.warning(f"跳过无标题参考文献: {ref}")
                    continue
                
                # 添加ID
                ref["id"] = generate_id()
                
                # 确保authors是数组
                if "authors" in ref and not isinstance(ref["authors"], list):
                    if isinstance(ref["authors"], str):
                        ref["authors"] = [author.strip() for author in ref["authors"].split(",")]
                    else:
                        ref["authors"] = [str(ref["authors"])]
                
                validated_references.append(ref)
                logger.info(f"验证参考文献 {i+1}: {ref.get('title', 'Unknown')}")
            
            logger.info(f"完成验证，生成{len(validated_references)}条有效参考文献")
            return validated_references
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON解析失败: {e}")
            logger.error(f"原始内容: {content}")
            # 保存错误日志
            try:
                self.llm_utils._save_error_log(content, e)
            except:
                pass
            raise Exception(f"参考文献解析失败，无法解析JSON: {e}")
        except Exception as e:
            logger.error(f"参考文献解析失败: {e}")
            raise Exception(f"参考文献解析失败: {e}")

    def add_references_to_paper(
        self,
        paper_id: str,
        references: List[Dict[str, Any]],
        user_id: str,
        is_admin: bool = False,
        is_user_paper: bool = False,
    ) -> Dict[str, Any]:
        """
        将解析后的参考文献添加到论文中，只保存原始文本，不进行重复检测
        """
        try:
            from ..models.paper import PaperModel
            paper_model = PaperModel()
            
            # 检查论文是否存在及权限
            paper = paper_model.find_by_id(paper_id)
            if not paper:
                return self._wrap_failure(None, "论文不存在", BusinessCode.PAPER_NOT_FOUND)

            # 管理员只能操作公开的论文
            if is_admin and not paper.get("isPublic", False):
                return self._wrap_failure(None, "管理员只能操作公开的论文", BusinessCode.PERMISSION_DENIED)

            # 修改权限检查逻辑：如果是个人论文库中的操作，允许用户修改
            # 只有在非个人论文库操作且非管理员的情况下，才检查创建者
            if not is_user_paper and not is_admin and paper["createdBy"] != user_id:
                return self._wrap_failure(None, "无权修改此论文", BusinessCode.PERMISSION_DENIED)

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
                
                # 现在所有参考文献都应该有索引，不再跳过
                if ref_index is None:
                    print(f"[参考文献处理] 警告：参考文献索引为None，使用默认值")
                    ref_index = 0
                
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
            if paper_model.update(paper_id, update_data):
                result_message = f"成功添加{len(added_references)}条参考文献"
                
                # 获取更新后的论文数据
                from ..models.section import get_section_model
                section_model = get_section_model()
                updated_paper = paper_model.find_paper_with_sections(paper_id)
                return self._wrap_success(
                    result_message,
                    {
                        "addedReferences": added_references,
                        "totalProcessed": len(sorted_references),
                        "totalReferences": len(current_references),
                        "paper": updated_paper # 添加完整的论文数据
                    }
                )
            else:
                return self._wrap_error("更新论文失败")
                
        except Exception as exc:
            return self._wrap_error(f"添加参考文献失败: {exc}")

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
                # 全都没有编号的情况，按换行分割并自动编号
                lines = [line.strip() for line in s.strip().split('\n') if line.strip()]
                for i, line in enumerate(lines, 1):
                    items.append((i, line))
                return items
            
            # 有编号的情况，检查编号是否连续
            numbered_items = []
            for i, m in enumerate(matches):
                idx = int(m.group(1))
                start = m.end()
                end = matches[i + 1].start() if i + 1 < len(matches) else len(s)
                raw = s[start:end].strip().rstrip('.')
                numbered_items.append((idx, raw))
            
            # 检查编号是否连续
            numbered_items.sort(key=lambda x: x[0])  # 按编号排序
            indices = [idx for idx, _ in numbered_items]
            
            # 如果编号是连续的（如1,2,3,4），直接返回
            if indices == list(range(min(indices), max(indices) + 1)):
                return numbered_items
            
            # 如果编号不连续，将有编号的和无编号的分开处理
            # 先处理有编号的
            result = []
            
            # 添加有编号的条目
            for idx, raw in numbered_items:
                result.append((idx, raw))
            
            # 检查是否有无编号的内容（在最后一个编号之后的内容）
            last_match = matches[-1]
            remaining_text = s[last_match.end():].strip()
            if remaining_text:
                # 尝试按换行分割剩余内容
                lines = [line.strip() for line in remaining_text.split('\n') if line.strip()]
                # 为这些无编号的内容分配新编号（从最大编号+1开始）
                next_idx = max(indices) + 1 if indices else 1
                for line in lines:
                    result.append((next_idx, line))
                    next_idx += 1
            
            return result

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
_reference_service: Optional[PaperReferenceService] = None


def get_paper_reference_service() -> PaperReferenceService:
    """获取 PaperReferenceService 全局实例"""
    global _reference_service
    if _reference_service is None:
        _reference_service = PaperReferenceService()
    return _reference_service