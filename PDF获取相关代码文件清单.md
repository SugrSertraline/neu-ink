# PDF获取相关代码文件清单

## 核心文件列表

### 前端文件 (Next.js)

#### 1. 主要组件文件
- **`apps/web/src/components/paper/PaperAttachmentsDrawer.tsx`**
  - **功能**: PDF附件抽屉组件，包含PDF查看器
  - **关键代码行**: 264 (useEffect中的PDF获取逻辑)
  - **主要方法**: 
    - `PdfViewer` 组件 (143-504行)
    - 跨域代理逻辑 (233-282行)
    - PDF渲染和错误处理

#### 2. HTTP客户端文件
- **`apps/web/src/lib/http/client.ts`**
  - **功能**: HTTP请求客户端，处理API调用
  - **关键代码行**: 187 (ApiError抛出位置)
  - **主要方法**:
    - `doFetch` 方法
    - 错误处理和响应解析

#### 3. 服务层文件
- **`apps/web/src/lib/services/paper.ts`**
  - **功能**: 论文相关API服务
  - **主要方法**:
    - `getAdminPaperPdfContent`
    - `getUserPaperPdfContent`

#### 4. 类型定义文件
- **`apps/web/src/types/paper/models.ts`**
  - **功能**: 论文相关类型定义
  - **关键类型**: `PaperAttachments`, `PdfAttachment`

### 后端文件 (Flask/Python)

#### 1. 管理员路由文件
- **`apps/api/neuink/routes/admin_papers.py`**
  - **功能**: 管理员论文管理API
  - **关键路由**: `/api/v1/admin/papers/<paper_id>/pdf-content` (2362行)
  - **主要方法**:
    - `get_admin_paper_pdf_content_proxy` (2365-2439行)
    - 权限验证和PDF内容获取

#### 2. 用户路由文件
- **`apps/api/neuink/routes/user_papers.py`**
  - **功能**: 用户论文管理API
  - **关键路由**: `/api/v1/user/papers/<paper_id>/pdf-content`
  - **主要方法**: 类似管理员的PDF内容获取逻辑

#### 3. 七牛云服务文件
- **`apps/api/neuink/services/qiniuService.py`**
  - **功能**: 七牛云文件存储服务
  - **主要方法**:
    - `fetch_file_content_with_retry` (重试机制)
    - `fetch_file_content` (单次获取)
    - 错误处理和日志记录

#### 4. 论文服务文件
- **`apps/api/neuink/services/paperService.py`**
  - **功能**: 论文业务逻辑服务
  - **主要方法**:
    - `get_admin_paper_detail`
    - `update_paper_attachments`

#### 5. 工具和配置文件
- **`apps/api/neuink/utils/auth.py`**
  - **功能**: 认证和权限验证
  - **装饰器**: `@login_required`, `@admin_required`

- **`apps/api/neuink/config/constants.py`**
  - **功能**: 业务常量定义
  - **常量**: `BusinessCode`, 错误码等

## 数据流图

```
前端PDF查看器
    ↓ (检测跨域URL)
代理API调用
    ↓ (/api/v1/admin/papers/{paperId}/pdf-content)
后端权限验证
    ↓ (检查管理员权限)
获取论文详情
    ↓ (从数据库获取PDF URL)
七牛云文件获取
    ↓ (3次重试机制)
返回PDF内容(base64)
    ↓ (成功或失败)
前端渲染/错误显示
```

## 错误处理链

### 前端错误处理
1. **PDF查看器组件** (`PaperAttachmentsDrawer.tsx:268`)
   ```typescript
   if (response.code !== 200) {
     throw new Error(response.message || '获取PDF内容失败');
   }
   ```

2. **HTTP客户端** (`client.ts:187`)
   ```typescript
   throw new ApiError(message, errorOptions);
   ```

### 后端错误处理
1. **管理员路由** (`admin_papers.py:2422-2424`)
   ```python
   if not pdf_content["success"]:
       return bad_request_response(f"获取PDF文件失败: {pdf_content['error']}")
   ```

2. **七牛云服务** (`qiniuService.py`)
   ```python
   return {"success": False, "error": f"获取文件内容失败，已重试 {max_retries} 次。最后错误: {str(e)}"}
   ```

## 配置和依赖

### 前端依赖
- **pdfjs-dist**: PDF渲染库
- **react**: UI框架
- **sonner**: 通知组件

### 后端依赖
- **flask**: Web框架
- **requests**: HTTP客户端
- **qiniu**: 七牛云SDK

## 关键配置项

### 七牛云配置
- 存储桶名称
- 访问域名: `https://image.neuwiki.top`
- 文件路径结构: `neuink/{paperId}/{paperId}.pdf`

### API配置
- 管理员API前缀: `/api/v1/admin/papers`
- 用户API前缀: `/api/v1/user/papers`
- 认证方式: Token-based

## 调试和监控

### 日志位置
- **前端**: 浏览器控制台
- **后端**: Flask应用日志
- **七牛云**: 服务访问日志

### 关键监控指标
- PDF文件获取成功率
- API响应时间
- 七牛云服务可用性
- 404错误频率

## 相关数据库表

### 论文表 (papers)
- **字段**: `id`, `attachments`, `metadata`
- **attachments字段结构**:
  ```json
  {
    "pdf": {
      "url": "https://image.neuwiki.top/neuink/...",
      "key": "neuink/...",
      "size": 1024000,
      "uploadedAt": "2023-12-01T10:00:00.000Z"
    }
  }
  ```

### 用户表 (users)
- **字段**: `id`, `username`, `role`
- **权限验证**: `role = 'admin'` 用于管理员权限

## 测试用例

### 成功场景
1. PDF文件存在且可访问
2. 用户有相应权限
3. 网络连接正常

### 失败场景
1. PDF文件不存在 (404错误)
2. 用户权限不足
3. 网络连接问题
4. 七牛云服务异常

### 边界场景
1. 大文件PDF处理
2. 并发访问
3. 权限边界情况
4. 网络超时处理

## 性能考虑

### 前端优化
- PDF懒加载
- Canvas复用管理
- 内存泄漏防护

### 后端优化
- 文件缓存策略
- 连接池管理
- 重试机制优化

### 存储优化
- CDN加速
- 文件压缩
- 分片上传