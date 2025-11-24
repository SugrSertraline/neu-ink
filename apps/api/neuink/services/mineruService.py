"""
MinerU PDF解析服务
处理通过MinerU API解析PDF文件并生成Markdown的功能
"""
import os
import json
import time
import logging
import requests
import zipfile
import io
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

from ..config.constants import BusinessCode

# 初始化logger
logger = logging.getLogger(__name__)


class MinerUService:
    """MinerU PDF解析服务类"""
    
    def __init__(self) -> None:
        """初始化MinerU服务"""
        # 从环境变量获取MinerU API配置
        self.api_token = os.getenv('MINERU_API_TOKEN')
        self.api_base_url = os.getenv('MINERU_API_BASE_URL', 'https://mineru.net/api/v4')
        
        # 验证配置是否完整
        if not self.api_token:
            logger.warning("MinerU API Token未配置，PDF解析功能将不可用")
        
        # 设置请求超时时间
        self.timeout = 30
    
    def is_configured(self) -> bool:
        """检查MinerU服务是否已配置"""
        return bool(self.api_token)
    
    def submit_parsing_task(self, pdf_url: str) -> Dict[str, Any]:
        """
        提交PDF解析任务到MinerU
        
        Args:
            pdf_url: PDF文件的URL地址
            
        Returns:
            提交结果，包含task_id等信息
        """
        if not self.is_configured():
            return {
                "success": False,
                "error": "MinerU服务未配置，请联系管理员添加API Token"
            }
        
        try:
            url = f"{self.api_base_url}/extract/task"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_token}"
            }
            data = {
                "url": pdf_url,
                "model_version": "vlm"
            }
            
            logger.info(f"提交PDF解析任务: {pdf_url}")
            
            response = requests.post(url, headers=headers, json=data, timeout=self.timeout)
            
            # 添加详细的响应日志
            logger.info(f"MinerU API响应状态码: {response.status_code}")
            logger.info(f"MinerU API响应内容: {response.text[:500]}...")
            
            if response.status_code == 200:
                try:
                    result = response.json()
                    logger.info(f"解析后的JSON响应: {result}")
                    if result.get("code") == 0:
                        task_id = result.get("data", {}).get("task_id")
                        logger.info(f"成功获取任务ID: {task_id}")
                        return {
                            "success": True,
                            "task_id": task_id,
                            "message": "PDF解析任务提交成功"
                        }
                    else:
                        error_msg = result.get("message", "提交解析任务失败")
                        logger.error(f"MinerU API返回错误: {error_msg}")
                        return {
                            "success": False,
                            "error": error_msg
                        }
                except json.JSONDecodeError as e:
                    logger.error(f"解析MinerU API响应JSON失败: {str(e)}")
                    logger.error(f"原始响应内容: {response.text}")
                    return {
                        "success": False,
                        "error": f"API响应格式错误: {str(e)}"
                    }
            else:
                logger.error(f"MinerU API请求失败，状态码: {response.status_code}")
                logger.error(f"响应内容: {response.text}")
                return {
                    "success": False,
                    "error": f"API请求失败，状态码: {response.status_code}"
                }
                
        except requests.exceptions.Timeout:
            return {
                "success": False,
                "error": "请求超时，请稍后重试"
            }
        except requests.exceptions.RequestException as e:
            logger.error(f"提交PDF解析任务异常: {str(e)}")
            return {
                "success": False,
                "error": f"网络请求失败: {str(e)}"
            }
        except Exception as e:
            logger.error(f"提交PDF解析任务异常: {str(e)}")
            return {
                "success": False,
                "error": f"服务器错误: {str(e)}"
            }
    
    def get_parsing_status(self, task_id: str) -> Dict[str, Any]:
        """
        查询PDF解析任务状态
        
        Args:
            task_id: 解析任务ID
            
        Returns:
            解析状态结果
        """
        if not self.is_configured():
            return {
                "success": False,
                "error": "MinerU服务未配置"
            }
        
        try:
            url = f"{self.api_base_url}/extract/task/{task_id}"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_token}"
            }
            
            response = requests.get(url, headers=headers, timeout=self.timeout)
            
            if response.status_code == 200:
                result = response.json()
                if result.get("code") == 0:
                    data = result.get("data", {})
                    state = data.get("state", "pending")  # pending/running/converting/done/failed
                    
                    # 解析MinerU返回的状态
                    if state in ["running", "converting"]:
                        status = "processing"
                        progress = 50
                        msg = "PDF解析中..."
                        
                        # 尝试从进度信息计算更精确的进度
                        progress_info = data.get("extract_progress") or {}
                        total_pages = progress_info.get("total_pages") or 0
                        extracted_pages = progress_info.get("extracted_pages") or 0
                        if total_pages > 0:
                            progress = int(extracted_pages / total_pages * 100)
                        
                        return {
                            "success": True,
                            "status": status,
                            "progress": progress,
                            "message": msg,
                            "state": state,
                            "data": data
                        }
                    elif state == "done":
                        # 解析完成，获取Markdown内容
                        markdown_content = ""
                        
                        # 尝试从full_zip_url获取Markdown内容
                        full_zip_url = data.get("full_zip_url")
                        if full_zip_url:
                            markdown_content = self._fetch_result_from_url(full_zip_url)
                        
                        return {
                            "success": True,
                            "status": "completed",
                            "progress": 100,
                            "message": "PDF解析完成",
                            "markdown_content": markdown_content,
                            "state": state,
                            "data": data,
                            "full_zip_url": full_zip_url
                        }
                    elif state == "failed":
                        return {
                            "success": True,
                            "status": "failed",
                            "progress": 0,
                            "message": data.get("err_msg", "PDF解析失败"),
                            "state": state,
                            "data": data
                        }
                    else:  # pending
                        return {
                            "success": True,
                            "status": "pending",
                            "progress": 0,
                            "message": "等待解析开始...",
                            "state": state,
                            "data": data
                        }
                else:
                    return {
                        "success": False,
                        "error": result.get("msg", "查询解析状态失败")
                    }
            else:
                return {
                    "success": False,
                    "error": f"API请求失败，状态码: {response.status_code}"
                }
                
        except requests.exceptions.Timeout:
            return {
                "success": False,
                "error": "请求超时，请稍后重试"
            }
        except requests.exceptions.RequestException as e:
            logger.error(f"查询PDF解析状态异常: {str(e)}")
            return {
                "success": False,
                "error": f"网络请求失败: {str(e)}"
            }
        except Exception as e:
            logger.error(f"查询PDF解析状态异常: {str(e)}")
            return {
                "success": False,
                "error": f"服务器错误: {str(e)}"
            }
    
    def _fetch_result_from_url(self, result_url: str) -> str:
        """
        从结果URL获取Markdown内容
        
        Args:
            result_url: 结果文件的URL（ZIP格式）
            
        Returns:
            Markdown内容
        """
        try:
            logger.info(f"开始下载ZIP文件: {result_url}")
            response = requests.get(result_url, timeout=self.timeout)
            
            if response.status_code == 200:
                # 使用内存中的字节数据创建ZIP文件对象
                zip_data = io.BytesIO(response.content)
                
                # 打开ZIP文件
                with zipfile.ZipFile(zip_data, 'r') as zip_file:
                    # 获取ZIP文件中的所有文件列表
                    file_list = zip_file.namelist()
                    logger.info(f"ZIP文件包含的文件: {file_list}")
                    
                    # 查找.md文件
                    md_files = [f for f in file_list if f.endswith('.md')]
                    
                    if not md_files:
                        logger.error("ZIP文件中未找到.md文件")
                        return ""
                    
                    # 优先查找full.md文件，否则使用第一个.md文件
                    md_file = "full.md" if "full.md" in md_files else md_files[0]
                    logger.info(f"使用Markdown文件: {md_file}")
                    
                    # 读取Markdown内容
                    with zip_file.open(md_file) as md_file_content:
                        markdown_content = md_file_content.read().decode('utf-8')
                        logger.info(f"成功读取Markdown内容，长度: {len(markdown_content)} 字符")
                        return markdown_content
            else:
                logger.error(f"下载ZIP文件失败，状态码: {response.status_code}")
                return ""
                
        except zipfile.BadZipFile:
            logger.error("下载的文件不是有效的ZIP格式")
            return ""
        except UnicodeDecodeError as e:
            logger.error(f"解码Markdown文件失败: {str(e)}")
            return ""
        except Exception as e:
            logger.error(f"获取解析结果异常: {str(e)}")
            return ""
    
    def fetch_markdown_content_and_upload(self, result_url: str, paper_id: str, qiniu_service=None) -> Dict[str, Any]:
        """
        从结果URL获取Markdown内容、图片、content_list.json、model.json和layout.json并上传到七牛云
        
        Args:
            result_url: 结果文件的URL（ZIP格式）
            paper_id: 论文ID，用于生成文件名
            qiniu_service: 七牛云服务实例
            
        Returns:
            上传结果，包含Markdown内容、图片信息、JSON文件内容和附件信息
        """
        try:
            logger.info(f"开始下载ZIP文件: {result_url}")
            response = requests.get(result_url, timeout=self.timeout)
            
            if response.status_code == 200:
                # 使用内存中的字节数据创建ZIP文件对象
                zip_data = io.BytesIO(response.content)
                
                # 打开ZIP文件
                with zipfile.ZipFile(zip_data, 'r') as zip_file:
                    # 获取ZIP文件中的所有文件列表
                    file_list = zip_file.namelist()
                    logger.info(f"ZIP文件包含的文件: {file_list}")
                    
                    # 查找.md文件
                    md_files = [f for f in file_list if f.endswith('.md')]
                    
                    if not md_files:
                        logger.error("ZIP文件中未找到.md文件")
                        return {
                            "success": False,
                            "error": "ZIP文件中未找到.md文件"
                        }
                    
                    # 查找各类JSON文件
                    content_list_json_files = [f for f in file_list if f.endswith('content_list.json')]
                    model_json_files = [f for f in file_list if f.endswith('model.json')]
                    layout_json_files = [f for f in file_list if f.endswith('layout.json')]
                    
                    # 查找图片文件
                    image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
                    image_files = [f for f in file_list if any(f.lower().endswith(ext) for ext in image_extensions)]
                    
                    # 获取文件引用
                    content_list_json_file = content_list_json_files[0] if content_list_json_files else None
                    model_json_file = model_json_files[0] if model_json_files else None
                    layout_json_file = layout_json_files[0] if layout_json_files else None
                    
                    # 初始化内容变量
                    content_list_json_content = None
                    model_json_content = None
                    layout_json_content = None
                    
                    # 优先查找full.md文件，否则使用第一个.md文件
                    md_file = "full.md" if "full.md" in md_files else md_files[0]
                    logger.info(f"使用Markdown文件: {md_file}")
                    
                    # 记录找到的文件
                    if content_list_json_file:
                        logger.info(f"找到content_list.json文件: {content_list_json_file}")
                    if model_json_file:
                        logger.info(f"找到model.json文件: {model_json_file}")
                    if layout_json_file:
                        logger.info(f"找到layout.json文件: {layout_json_file}")
                    if image_files:
                        logger.info(f"找到图片文件: {image_files}")
                    
                    # 读取Markdown内容
                    with zip_file.open(md_file) as md_file_content:
                        markdown_content = md_file_content.read().decode('utf-8')
                        logger.info(f"成功读取Markdown内容，长度: {len(markdown_content)} 字符")
                    
                    # 读取各类JSON文件内容
                    if content_list_json_file:
                        try:
                            with zip_file.open(content_list_json_file) as json_file_content:
                                content_list_json_content = json_file_content.read().decode('utf-8')
                                logger.info(f"成功读取content_list.json内容，长度: {len(content_list_json_content)} 字符")
                        except Exception as e:
                            logger.warning(f"读取content_list.json失败: {str(e)}")
                    
                    if model_json_file:
                        try:
                            with zip_file.open(model_json_file) as json_file_content:
                                model_json_content = json_file_content.read().decode('utf-8')
                                logger.info(f"成功读取model.json内容，长度: {len(model_json_content)} 字符")
                        except Exception as e:
                            logger.warning(f"读取model.json失败: {str(e)}")
                    
                    if layout_json_file:
                        try:
                            with zip_file.open(layout_json_file) as json_file_content:
                                layout_json_content = json_file_content.read().decode('utf-8')
                                logger.info(f"成功读取layout.json内容，长度: {len(layout_json_content)} 字符")
                        except Exception as e:
                            logger.warning(f"读取layout.json失败: {str(e)}")
                    
                    # 如果提供了七牛云服务，则上传所有文件
                    if qiniu_service:
                        # 初始化结果数据，确保包含所有附件字段（除了images）
                        result_data = {
                            "success": True,
                            "markdown_content": markdown_content,
                            "attachments": {
                                "pdf": None,
                                "markdown": None,
                                "content_list": None,
                                "model": None,
                                "layout": None
                            },
                            "uploaded_images": []  # 图片信息单独返回，不保存到数据库
                        }
                        
                        # 上传Markdown文件
                        markdown_result = qiniu_service.upload_file_data(
                            file_data=markdown_content.encode('utf-8'),
                            file_extension=".md",
                            file_type="unified_paper",
                            filename=f"{paper_id}.md",
                            paper_id=paper_id,
                            overwrite=True
                        )
                        
                        if markdown_result["success"]:
                            result_data["attachments"]["markdown"] = {
                                "url": markdown_result["url"],
                                "key": markdown_result["key"],
                                "size": markdown_result["size"],
                                "uploadedAt": markdown_result["uploadedAt"]
                            }
                        else:
                            logger.error(f"上传Markdown文件失败: {markdown_result['error']}")
                            return {
                                "success": False,
                                "error": f"上传Markdown文件失败: {markdown_result['error']}"
                            }
                        
                        # 上传content_list.json文件
                        if content_list_json_content:
                            content_list_result = qiniu_service.upload_file_data(
                                file_data=content_list_json_content.encode('utf-8'),
                                file_extension=".json",
                                file_type="unified_paper",
                                filename=f"{paper_id}_content_list.json",
                                paper_id=paper_id,
                                overwrite=True
                            )
                            
                            if content_list_result["success"]:
                                result_data["attachments"]["content_list"] = {
                                    "url": content_list_result["url"],
                                    "key": content_list_result["key"],
                                    "size": content_list_result["size"],
                                    "uploadedAt": content_list_result["uploadedAt"]
                                }
                                result_data["content_list_content"] = content_list_json_content
                            else:
                                logger.warning(f"上传content_list.json失败: {content_list_result['error']}")
                        
                        # 上传model.json文件
                        if model_json_content:
                            model_result = qiniu_service.upload_file_data(
                                file_data=model_json_content.encode('utf-8'),
                                file_extension=".json",
                                file_type="unified_paper",
                                filename=f"{paper_id}_model.json",
                                paper_id=paper_id,
                                overwrite=True
                            )
                            
                            if model_result["success"]:
                                result_data["attachments"]["model"] = {
                                    "url": model_result["url"],
                                    "key": model_result["key"],
                                    "size": model_result["size"],
                                    "uploadedAt": model_result["uploadedAt"]
                                }
                                result_data["model_content"] = model_json_content
                            else:
                                logger.warning(f"上传model.json失败: {model_result['error']}")
                        
                        # 上传layout.json文件
                        if layout_json_content:
                            layout_result = qiniu_service.upload_file_data(
                                file_data=layout_json_content.encode('utf-8'),
                                file_extension=".json",
                                file_type="unified_paper",
                                filename=f"{paper_id}_layout.json",
                                paper_id=paper_id,
                                overwrite=True
                            )
                            
                            if layout_result["success"]:
                                result_data["attachments"]["layout"] = {
                                    "url": layout_result["url"],
                                    "key": layout_result["key"],
                                    "size": layout_result["size"],
                                    "uploadedAt": layout_result["uploadedAt"]
                                }
                                result_data["layout_content"] = layout_json_content
                            else:
                                logger.warning(f"上传layout.json失败: {layout_result['error']}")
                        
                        # 上传图片文件到neuink/{paper_id}/images/目录
                        uploaded_images = []
                        for image_file in image_files:
                            try:
                                # 读取图片文件内容
                                with zip_file.open(image_file) as image_file_content:
                                    image_data = image_file_content.read()
                                    
                                    # 获取文件扩展名
                                    file_extension = os.path.splitext(image_file)[1].lower()
                                    
                                    # 生成图片文件名，保持原始文件名
                                    image_filename = os.path.basename(image_file)
                                    
                                    # 上传图片到neuink/{paper_id}/images/目录
                                    image_result = qiniu_service.upload_file_data(
                                        file_data=image_data,
                                        file_extension=file_extension,
                                        file_type="unified_paper",
                                        filename=f"images/{image_filename}",
                                        paper_id=paper_id,
                                        overwrite=True
                                    )
                                    
                                    if image_result["success"]:
                                        uploaded_images.append({
                                            "filename": image_filename,
                                            "url": image_result["url"],
                                            "key": image_result["key"],
                                            "size": image_result["size"],
                                            "uploadedAt": image_result["uploadedAt"]
                                        })
                                        logger.info(f"成功上传图片: {image_filename}")
                                    else:
                                        logger.warning(f"上传图片失败 {image_filename}: {image_result['error']}")
                            except Exception as e:
                                logger.warning(f"处理图片文件失败 {image_file}: {str(e)}")
                        
                        # 添加上传的图片信息到结果中（不保存到数据库）
                        if uploaded_images:
                            result_data["uploaded_images"] = uploaded_images
                            logger.info(f"共上传了 {len(uploaded_images)} 张图片")
                        
                        return result_data
                    else:
                        # 如果没有提供七牛云服务，只返回内容
                        result_data = {
                            "success": True,
                            "markdown_content": markdown_content,
                            "attachments": None
                        }
                        
                        # 如果有content_list.json内容，提取参考文献
                        if content_list_json_content:
                            from .referenceExtractorService import get_reference_extractor_service
                            reference_extractor = get_reference_extractor_service()
                            # 将JSON字符串解析为Python对象
                            try:
                                content_list_data = json.loads(content_list_json_content)
                                ref_result = reference_extractor.extract_references_from_json_data(content_list_data)
                            except json.JSONDecodeError as e:
                                logger.error(f"解析content_list.json内容失败: {str(e)}")
                                ref_result = {"success": False, "error": f"解析content_list.json内容失败: {str(e)}", "references": []}
                            
                            if ref_result["success"]:
                                result_data["references"] = ref_result["references"]
                                result_data["extraction_info"] = ref_result.get("extraction_info", {})
                                logger.info(f"成功提取 {len(ref_result['references'])} 条参考文献")
                            else:
                                logger.warning(f"提取参考文献失败: {ref_result.get('error', '未知错误')}")
                        
                        if content_list_json_content:
                            result_data["content_list_content"] = content_list_json_content
                        if model_json_content:
                            result_data["model_content"] = model_json_content
                        if layout_json_content:
                            result_data["layout_content"] = layout_json_content
                        
                        return result_data
            else:
                logger.error(f"下载ZIP文件失败，状态码: {response.status_code}")
                return {
                    "success": False,
                    "error": f"下载ZIP文件失败，状态码: {response.status_code}"
                }
                
        except zipfile.BadZipFile:
            logger.error("下载的文件不是有效的ZIP格式")
            return {
                "success": False,
                "error": "下载的文件不是有效的ZIP格式"
            }
        except UnicodeDecodeError as e:
            logger.error(f"解码文件失败: {str(e)}")
            return {
                "success": False,
                "error": f"解码文件失败: {str(e)}"
            }
        except Exception as e:
            logger.error(f"获取解析结果异常: {str(e)}")
            return {
                "success": False,
                "error": f"获取解析结果异常: {str(e)}"
            }
    
    def parse_pdf_to_markdown(self, pdf_url: str, max_wait_time: int = 300) -> Dict[str, Any]:
        """
        完整的PDF解析流程，从提交任务到获取结果
        
        Args:
            pdf_url: PDF文件的URL地址
            max_wait_time: 最大等待时间（秒）
            
        Returns:
            解析结果，包含Markdown内容
        """
        # 提交解析任务
        submit_result = self.submit_parsing_task(pdf_url)
        if not submit_result["success"]:
            return submit_result
        
        task_id = submit_result["task_id"]
        start_time = time.time()
        
        # 轮询解析状态
        while time.time() - start_time < max_wait_time:
            status_result = self.get_parsing_status(task_id)
            
            if not status_result["success"]:
                return status_result
            
            status = status_result["status"]
            
            if status == "completed":
                return {
                    "success": True,
                    "status": "completed",
                    "markdown_content": status_result.get("markdown_content", ""),
                    "message": "PDF解析完成"
                }
            elif status == "failed":
                return {
                    "success": False,
                    "error": status_result.get("message", "PDF解析失败")
                }
            
            # 等待一段时间再查询
            time.sleep(5)
        
        # 超时
        return {
            "success": False,
            "error": f"PDF解析超时，超过最大等待时间 {max_wait_time} 秒"
        }


# 全局实例
_mineru_service: Optional[MinerUService] = None


def get_mineru_service() -> MinerUService:
    """获取MinerU服务实例（单例模式）"""
    global _mineru_service
    if _mineru_service is None:
        _mineru_service = MinerUService()
    return _mineru_service


def is_mineru_configured() -> bool:
    """检查MinerU是否已配置"""
    return get_mineru_service().is_configured()