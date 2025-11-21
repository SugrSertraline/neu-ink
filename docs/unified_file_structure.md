# 统一文件存储结构实现

## 概述

本文档描述了为NeuInk项目实现的统一文件存储结构，将原来分散在不同目录下的文件统一到 `neuink/{paper_id}/` 目录结构下。

## 新的目录结构

```
neuink/
├── {paper_id}/
│   ├── {paper_id}.pdf          # PDF文件
│   ├── {paper_id}.md           # Markdown文件
│   ├── {paper_id}.json         # content_list.json文件
│   └── images/                 # 论文相关图片
│       ├── image_001.jpg
│       ├── image_002.png
│       └── ...
```

## 优势

1. **统一管理**：所有与论文相关的文件都在同一个目录下
2. **清晰简洁**：文件名包含论文ID，便于识别
3. **易于维护**：删除论文时只需删除整个目录
4. **向后兼容**：保留原有文件类型的支持

## 实现的更改

### 1. 配置文件更新 (`apps/api/neuink/config/constants.py`)

- 添加了新的 `unified_paper` 文件类型前缀：`"neuink/{paper_id}/"`
- 在上传策略中添加了对 `.json` 文件类型的支持

### 2. 七牛云服务更新 (`apps/api/neuink/services/qiniuService.py`)

- `generate_file_key()` 方法新增 `paper_id` 参数
- 添加对统一目录结构的支持
- `upload_file_data()` 方法支持传递 `paper_id` 参数
- 在 `_get_content_type()` 中添加了对 `.json` 文件的支持

### 3. MinerU服务更新 (`apps/api/neuink/services/mineruService.py`)

- `fetch_markdown_content_and_upload()` 方法现在支持提取和上传 `content_list.json`
- 使用统一目录结构上传文件
- 返回结果中包含 `content_list_attachment` 和 `content_list_content` 信息

### 4. 路由文件更新

#### 管理员论文路由 (`apps/api/neuink/routes/admin_papers.py`)
- PDF和Markdown上传使用统一目录结构
- 解析任务状态查询支持 `content_list.json` 附件
- 更新论文附件时包含 `content_list` 信息

#### 用户论文路由 (`apps/api/neuink/routes/user_papers.py`)
- PDF和Markdown上传使用统一目录结构
- 解析任务状态查询支持 `content_list.json` 附件
- 更新论文附件时包含 `content_list` 信息

#### 通用上传路由 (`apps/api/neuink/routes/upload.py`)
- 论文图片上传支持统一目录结构（当提供paper_id时）
- 保留原有文件类型的支持

## 使用示例

### 1. 上传PDF文件到统一目录结构

```python
from neuink.services.qiniuService import get_qiniu_service

qiniu_service = get_qiniu_service()
result = qiniu_service.upload_file_data(
    file_data=pdf_content,
    file_extension=".pdf",
    file_type="unified_paper",
    filename=f"{paper_id}.pdf",
    paper_id=paper_id
)
```

### 2. MinerU解析自动上传content_list.json

```python
from neuink.services.mineruService import get_mineru_service

mineru_service = get_mineru_service()
result = mineru_service.fetch_markdown_content_and_upload(
    result_url="https://mineru.example.com/result.zip",
    paper_id="paper_123",
    qiniu_service=qiniu_service
)

# 结果包含：
# - markdown_content: Markdown内容
# - markdown_attachment: Markdown文件附件信息
# - content_list_content: content_list.json内容（如果存在）
# - content_list_attachment: content_list.json附件信息（如果存在）
```

## 文件路径示例

### 传统路径结构
- PDF: `neuink/pdf/paper_123.pdf`
- Markdown: `neuink/markdown/paper_123.md`
- 图片: `neuink/paper_image/paper_123/image_001.jpg`

### 统一路径结构
- PDF: `neuink/paper_123/paper_123.pdf`
- Markdown: `neuink/paper_123/paper_123.md`
- JSON: `neuink/paper_123/paper_123.json`
- 图片: `neuink/paper_123/images/image_001.jpg`

## 迁移指南

### 对于现有文件
1. 现有文件路径保持不变，向后兼容
2. 新上传的文件将使用统一目录结构
3. 可以逐步迁移现有文件到新结构

### 对于前端应用
1. 更新文件URL处理逻辑，支持新的路径结构
2. 在显示附件时，检查新的 `content_list` 附件类型
3. 更新上传组件，支持传递 `paper_id` 参数

## 测试

创建了测试脚本 `apps/api/test_unified_structure.py` 来验证：
1. 统一目录结构的文件路径生成
2. MinerU服务的content_list.json处理
3. 各种文件类型的上传功能

## 注意事项

1. **权限控制**：确保只有有权限的用户才能访问对应论文的文件
2. **文件清理**：删除论文时需要清理整个目录
3. **存储空间**：统一结构可能影响存储分布，需要监控
4. **CDN配置**：可能需要更新CDN配置以支持新的路径结构

## 未来改进

1. **自动迁移**：可以添加脚本自动迁移现有文件到新结构
2. **批量操作**：支持批量文件的统一目录结构操作
3. **存储优化**：根据文件访问频率优化存储分布
4. **版本控制**：为文件添加版本控制支持