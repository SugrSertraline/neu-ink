# NeuInk API 文档

## 概述

NeuInk 论文管理API提供统一的论文管理接口，支持管理员论文库和用户个人论文库的操作。API基于RESTful设计，采用统一的错误处理和响应格式。

## 架构概述

### 分层架构
```
┌─────────────────┐
│   Routes (路由层)    │
├─────────────────┤
│   Services (服务层)   │
├─────────────────┤
│   Models (模型层)     │
└─────────────────┤
│   Database (数据层)     │
└─────────────────┘
```

### 核心组件
- **BasePaper**: 论文模型抽象基类
- **AdminPaper**: 管理员论文模型
- **UserPaper**: 用户个人论文库模型
- **PaperContext**: 上下文管理系统
- **权限装饰器**: 统一的权限检查机制

## 基础概念

### 上下文感知系统
NeuInk 使用上下文感知系统来管理用户权限和论文类型：

```python
from neuink.models.context import PaperContext, create_paper_context

# 创建管理员论文上下文
context = create_paper_context(user_id="user123", paper_type="admin", paper_id="paper_456")

# 创建用户论文上下文
context = create_paper_context(user_id="user123", paper_type="user", user_paper_id="user_paper_789")
```

### 权限矩阵
| 操作类型 | 管理员论文 | 用户论文 | 公开论文 | 私有论文 |
|---------|------------|-----------|----------|----------|
| 读取公开论文 | ✓ | ✓ | ✓ | ✗ |
| 读取私有论文 | ✓ | ✗ | ✗ | ✗ |
| 创建论文 | ✓ | ✓ | ✗ | ✗ |
| 更新论文 | ✓ | ✓ | ✗ | ✗ |
| 删除论文 | ✓ | ✓ | ✗ | ✗ |

## API 端点

### 论文管理

#### 管理员论文库
- `GET /api/papers/admin` - 获取管理员论文列表
- `POST /api/papers/admin` - 创建管理员论文
- `GET /api/papers/admin/{paper_id}` - 获取管理员论文详情
- `PUT /api/papers/admin/{paper_id}` - 更新管理员论文
- `PUT /api/papers/admin/{paper_id}/metadata` - 更新管理员论文的metadata
- `PUT /api/papers/admin/{paper_id}/abstract-keywords` - 更新管理员论文的abstract和keywords
- `PUT /api/papers/admin/{paper_id}/references` - 更新管理员论文的references
- `DELETE /api/papers/admin/{paper_id}` - 删除管理员论文

#### 用户个人论文库
- `GET /api/papers/user` - 获取用户论文库列表
- `POST /api/papers/user` - 添加公共论文到个人库
- `POST /api/papers/user/create` - 创建用户个人论文
- `GET /api/papers/user/{entry_id}` - 获取个人论文详情
- `PUT /api/papers/user/{entry_id}/metadata` - 更新个人论文的metadata
- `PUT /api/papers/user/{entry_id}/abstract-keywords` - 更新个人论文的abstract和keywords
- `PUT /api/papers/user/{entry_id}/references` - 更新个人论文的references
- `DELETE /api/papers/user/{entry_id}` - 删除个人论文

#### 公开论文访问
- `GET /api/public-papers` - 获取公开论文列表
- `GET /api/public-papers/{paper_id}` - 获取公开论文详情
- `GET /api/public-papers/{paper_id}/content` - 获取公开论文内容

### 章节管理

#### 管理员论文章节
- `GET /api/sections/admin/{paper_id}/{section_id}` - 获取章节详情
- `POST /api/sections/admin/{paper_id}/add-section` - 添加章节
- `PUT /api/sections/admin/{paper_id}/{section_id}` - 更新章节
- `DELETE /api/sections/admin/{paper_id}/{section_id}` - 删除章节

#### 管理员论文章节Block操作
- `POST /api/sections/admin/{paper_id}/sections/{section_id}/add-block` - 向指定section直接添加一个block（不通过LLM解析）
- `POST /api/sections/admin/{paper_id}/sections/{section_id}/add-block-from-text` - 向指定section中添加block（使用大模型解析文本）
- `PUT /api/sections/admin/{paper_id}/sections/{section_id}/blocks/{block_id}` - 更新指定section中的指定block
- `DELETE /api/sections/admin/{paper_id}/sections/{section_id}/blocks/{block_id}` - 删除指定section中的指定block

#### 用户论文章节
- `GET /api/sections/user/{entry_id}/{section_id}` - 获取章节详情
- `POST /api/sections/user/{entry_id}/add-section` - 添加章节
- `PUT /api/sections/user/{entry_id}/{section_id}` - 更新章节
- `DELETE /api/sections/user/{entry_id}/{section_id}` - 删除章节

#### 用户论文章节Block操作
- `POST /api/sections/user/{entry_id}/sections/{section_id}/add-block` - 向指定section直接添加一个block（不通过LLM解析）
- `POST /api/sections/user/{entry_id}/sections/{section_id}/add-block-from-text` - 向指定section中添加block（使用大模型解析文本）
- `PUT /api/sections/user/{entry_id}/sections/{section_id}/blocks/{block_id}` - 更新指定section中的指定block
- `DELETE /api/sections/user/{entry_id}/sections/{section_id}/blocks/{block_id}` - 删除指定section中的指定block

### 块管理

#### 用户论文笔记
- `GET /api/notes/user/{entry_id}` - 获取个人论文的所有笔记
- `POST /api/notes/user/{entry_id}` - 创建笔记
- `PUT /api/notes/user/{entry_id}/{note_id}` - 更新笔记
- `DELETE /api/notes/user/{entry_id}/{note_id}` - 删除笔记

#### 通用笔记操作
- `GET /api/notes/user/{note_id}` - 获取笔记详情（仅限用户论文）
- `GET /api/notes/user/all` - 获取用户的所有笔记（跨论文）

### 解析管理

#### 解析结果管理
- `GET /api/parse-results/{paper_id}/{parse_id}` - 获取解析结果
- `POST /api/parse-results/{paper_id}/{parse_id}/confirm` - 确认解析结果
- `POST /api/parse-results/{paper_id}/{parse_id}/discard` - 丢弃解析结果
- `POST /api/parse-results/{paper_id}/{parse_id}/save-all` - 保存所有解析结果

#### 参考文献解析
- `POST /api/parsing/admin/{paper_id}/parse-references` - 解析参考文献文本
- `POST /api/parsing/user/{entry_id}/parse-references` - 解析用户论文参考文献

#### 文本解析
- `POST /api/parsing/admin/{paper_id}/parse-text` - 解析文本为blocks
- `POST /api/parsing/user/{entry_id}/parse-text` - 解析用户论文文本为blocks

### 翻译服务

#### 快速翻译
- `POST /api/translation/quick` - 快速翻译接口（公共接口，无需登录）
- `GET /api/translation/models` - 获取可用翻译模型列表（公共接口，无需登录）

### 文件上传

#### 文件上传接口
- `POST /api/upload/image` - 上传图片
- `POST /api/upload/pdf` - 上传PDF文件
- `POST /api/upload/markdown` - 上传Markdown文件
- `POST /api/upload/document` - 上传文档文件
- `POST /api/upload/paper-image` - 上传论文图片

#### 上传工具
- `GET /api/upload/token` - 获取上传凭证
- `GET /api/upload/config` - 获取上传配置

### 用户管理

#### 用户认证
- `POST /api/users/login` - 用户登录
- `POST /api/users/logout` - 用户登出
- `POST /api/users/refresh` - 刷新token
- `GET /api/users/current` - 获取当前用户信息

#### 管理员操作
- `GET /api/users/` - 获取用户列表
- `POST /api/users/` - 创建用户
- `GET /api/users/{user_id}` - 获取用户详情
- `PUT /api/users/{user_id}` - 更新用户信息
- `DELETE /api/users/{user_id}` - 删除用户

#### 用户操作
- `PUT /api/users/{user_id}/password` - 修改密码
- `PATCH /api/users/{user_id}/role` - 变更用户角色

### 系统监控

#### 健康检查
- `GET /api/health` - 系统健康检查

## 使用指南

### 认证机制
API使用JWT token进行身份验证：

```http
Authorization: Bearer <token>
```

### 错误处理
API使用统一的错误码和消息格式：

```json
{
  "code": 1007,
  "message": "无权执行此操作",
  "data": null
}
```

### 分页参数
列表接口支持分页参数：

```json
{
  "page": 1,
  "pageSize": 20,
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### 排序参数
列表接口支持排序参数：

```json
{
  "sortBy": "createdAt",
  "sortOrder": "desc"  // "asc" | "desc"
}
```

### 搜索功能
列表接口支持搜索功能：

```json
{
  "search": "关键词搜索"
}
```

## 请求示例

### 创建管理员论文
```http
POST /api/papers/admin
Content-Type: application/json
Authorization: Bearer <token>

{
    "metadata": {
        "title": "论文标题",
        "authors": ["作者1", "作者2"],
        "year": 2023,
        "venue": "期刊名称"
    },
    "abstract": {
        "en": "English abstract...",
        "zh": "中文摘要..."
    },
    "keywords": ["关键词1", "关键词2"],
    "isPublic": true
}
```

### 创建笔记
```http
POST /api/notes/admin/{paper_id}
Content-Type: application/json
Authorization: Bearer <token>

{
    "blockId": "block_123",
    "content": [
        {
            "type": "text",
            "content": "text content"
        }
    ],
    "plainText": "纯文本内容"
}
```

### 解析文本为blocks
```http
POST /api/parsing/admin/{paper_id}/parse-text
Content-Type: application/json
Authorization: Bearer <token>

{
    "text": "需要解析的文本内容...",
    "afterBlockId": "block_456"
}
```

### 更新个人论文metadata
```http
PUT /api/papers/user/{entry_id}/metadata
Content-Type: application/json
Authorization: Bearer <token>

{
    "metadata": {
        "title": "论文标题",
        "titleZh": "论文中文标题",
        "authors": [{"name": "作者名", "affiliation": "机构"}],
        "publication": "期刊名称",
        "year": 2023,
        "doi": "10.1000/182"
    }
}
```

### 更新个人论文abstract和keywords
```http
PUT /api/papers/user/{entry_id}/abstract-keywords
Content-Type: application/json
Authorization: Bearer <token>

{
    "abstract": {
        "en": "This is English abstract.",
        "zh": "这是中文摘要"
    },
    "keywords": ["keyword1", "keyword2", "关键词1", "关键词2"]
}
```

### 更新个人论文references
```http
PUT /api/papers/user/{entry_id}/references
Content-Type: application/json
Authorization: Bearer <token>

{
    "references": [
        {
            "id": "1",
            "type": "article",
            "title": "Reference Title",
            "authors": ["Author1", "Author2"],
            "publication": "Journal Name",
            "year": 2023,
            "pages": "1-10"
        }
    ]
}
```

### 更新管理员论文metadata
```http
PUT /api/papers/admin/{paper_id}/metadata
Content-Type: application/json
Authorization: Bearer <token>

{
    "metadata": {
        "title": "论文标题",
        "titleZh": "论文中文标题",
        "authors": [{"name": "作者名", "affiliation": "机构"}],
        "publication": "期刊名称",
        "year": 2023,
        "doi": "10.1000/182"
    }
}
```

### 更新管理员论文abstract和keywords
```http
PUT /api/papers/admin/{paper_id}/abstract-keywords
Content-Type: application/json
Authorization: Bearer <token>

{
    "abstract": {
        "en": "This is English abstract.",
        "zh": "这是中文摘要"
    },
    "keywords": ["keyword1", "keyword2", "关键词1", "关键词2"]
}
```

### 更新管理员论文references
```http
PUT /api/papers/admin/{paper_id}/references
Content-Type: application/json
Authorization: Bearer <token>

{
    "references": [
        {
            "id": "1",
            "type": "article",
            "title": "Reference Title",
            "authors": ["Author1", "Author2"],
            "publication": "Journal Name",
            "year": 2023,
            "pages": "1-10"
        }
    ]
}
```

### 添加block到管理员论文章节
```http
POST /api/sections/admin/{paper_id}/sections/{section_id}/add-block
Content-Type: application/json
Authorization: Bearer <token>

{
    "blockData": {
        "type": "paragraph",
        "content": {
            "en": [{"type": "text", "content": "English content"}],
            "zh": [{"type": "text", "content": "中文内容"}]
        },
        "metadata": {}
    },
    "afterBlockId": "block_123"
}
```

### 添加block到用户论文章节
```http
POST /api/sections/user/{entry_id}/sections/{section_id}/add-block
Content-Type: application/json
Authorization: Bearer <token>

{
    "blockData": {
        "type": "paragraph",
        "content": {
            "en": [{"type": "text", "content": "English content"}],
            "zh": [{"type": "text", "content": "中文内容"}]
        },
        "metadata": {}
    },
    "afterBlockId": "block_123"
}
```

### 快速翻译（公共接口）
```http
POST /api/translation/quick
Content-Type: application/json

{
    "text": "This is an English text to be translated.",
    "model": "glm-4.6",
    "temperature": 0.1,
    "maxTokens": 100000
}
```

## 响应格式

### 成功响应
```json
{
  "code": 200,
    "message": "操作成功",
    "data": {
        // 响应数据
    }
}
```

### 错误响应
```json
{
  "code": 1007,
    "message": "无权执行此操作",
    "data": null
}
```

## 权限说明

### 管理员权限
- 可以访问所有论文（公开和私有）
- 可以执行所有操作（读取、创建、更新、删除）
- 可以管理用户权限

### 普通用户权限
- 可以访问公开论文
- 可以将公开论文添加到个人库
- 只能操作自己个人库中的论文

### 用户权限
- 只能访问自己个人库中的论文
- 只能操作自己创建的论文

## 开发指南

### 添加新的论文类型
1. 在 `models/basePaper.py` 中添加新的论文类型常量
2. 创建对应的具体模型类，继承自 `BasePaper`
3. 在 `services/basePaperService.py` 中添加对应的工厂方法
4. 在路由中注册新的路由

### 添加新的API端点
1. 在相应的路由文件中添加新的路由函数
2. 使用 `@paper_permission_required` 装查权限
3. 调用相应的服务方法
4. 使用标准的错误处理和响应格式

### 添加新的服务方法
1. 在抽象基类中定义抽象方法
2. 在具体服务类中实现具体逻辑
3. 确保方法支持上下文感知
4. 使用统一的错误处理机制

## 版本更新

### v2.0.0
- 统一的论文管理架构
- 上下文感知的权限系统
- 标准化的错误处理
- 完整的API文档

### 更新日志
- v2.0.0: 初始版本发布
- v2.0.1: 修复权限检查问题
- v2.0.2: 添加批量操作支持
- v2.0.3: 优化性能和错误处理
- v2.0.4: 重构论文更新接口，拆分为metadata、abstract&keywords、references三个独立接口
- v2.0.4: 新增管理员和用户论文章节Block的完整CRUD接口
- v2.0.4: 翻译接口改为公共接口，无需登录即可使用
- v2.0.5: 修复公共论文API路径问题，统一使用破折号分隔符
- v2.0.5: 移除已废弃的论文翻译接口，保留快速翻译功能
- v2.0.5: 修复后端路由定义中的路径错误
- v2.0.6: 移除管理员论文笔记功能，仅保留用户论文笔记
- v2.0.6: 移除流式解析接口，简化解析功能
- v2.0.6: 新增用户个人论文创建接口
- v2.0.6: 调整笔记详情接口，仅支持用户论文

## 联系方式

如有问题或建议，请通过以下方式联系：
- 创建Issue在项目仓库
- 发送邮件到开发团队
- 在团队沟通群中讨论

## 附录

### 错误码对照表
| 错误码 | 描述 | 解决方案 |
|---------|------|-------------|
| 200 | 成功 | 操作成功完成 |
| 400 | 请求错误 | 检查请求参数格式 |
| 401 | 未授权 | 检查token是否有效 |
| 403 | 禁止访问 | 检查用户权限 |
| 404 | 资源未找到 | 检查资源是否存在 |
| 405 | 方法不允许 | 检查HTTP方法是否正确 |
| 409 | 冲突 | 检查资源状态 |
| 1007 | 权限被拒绝 | 检查用户权限和资源权限 |
| 1008 | Token无效 | 检查token格式和有效性 |
| 1009 | 用户不存在 | 检查用户是否存在 |
| 1010 | 论文不存在 | 检查论文是否存在 |
| 1999 | 内部错误 | 检查服务器日志 |
| 5000 | 服务器错误 | 检查服务器状态 |

### 业务错误码
| 错误码 | 描述 | 解决方案 |
|---------|------|-------------|
| 2001 | 论文不存在 | 检查论文ID是否正确 |
| 2002 | 权限被拒绝 | 检查用户权限 |
| 2003 | 参数错误 | 检查请求参数 |
| 2004 | 无效操作 | 检查操作是否允许 |
| 2005 | 数据冲突 | 检查数据格式和约束 |
| 2006 | 业务规则违反 | 检查业务规则 |

### HTTP状态码
| 状态码 | 描述 | 解决方案 |
|---------|------|-------------|
| 200 | 成功 | 操作成功 |
| 201 | 创建成功 | 资源创建成功 |
| 204 | 无内容 | 请求成功但无返回数据 |
| 400 | 请求错误 | 检查请求格式 |
| 401 | 未授权 | 检查认证信息 |
| 403 | 禁止访问 | 检查用户权限 |
| 404 | 资源未找到 | 检查资源是否存在 |
| 405 | 方法不允许 | 检查HTTP方法 |
| 409 | 冲突 | 检查资源状态 |
| 500 | 服务器错误 | 检查服务器状态 |

### 常用配置
- JWT_SECRET_KEY: JWT密钥
- MONGO_URI: MongoDB连接字符串
- QINIU_*: 七牛云存储配置

### 环境变量
- FLASK_ENV: 运行环境（development/production）
- DEBUG: 调试模式开关
- LOG_LEVEL: 日志级别

## 最佳实践

### 安全建议
1. **Token管理**：
   - 使用HTTPS传输token
   - 设置合理的token过期时间
   - 定期刷新token

2. **权限控制**：
   - 最小权限原则
   - 定期审查权限设置
   - 记录敏感操作

3. **数据验证**：
   - 输入参数严格验证
   - SQL注入防护
   - 文件类型和大小限制

4. **错误处理**：
   - 统一的错误日志记录
   - 用户友好的错误消息
   - 避免暴露敏感信息

### 性能优化
1. **数据库优化**：
   - 适当的索引策略
   - 查询优化
   - 连接池管理

2. **缓存策略**：
   - 合理的缓存设置
   - 缓存失效机制
   - 热点数据缓存

3. **分页优化**：
   - 合理的页面大小
   - 游进式分页
   - 总数统计优化

### 监控和日志
1. **访问日志**：
   - 请求记录
   - 错误日志
   - 性能指标

2. **业务监控**：
   - 操作统计
   - 用户行为分析
- 系统健康检查

3. **告警机制**：
   - 异常检测
   - 性能阈值告警
   - 安全事件告警