# NeuInk 后端 API 文档

## 概述

NeuInk 是一个学术论文管理系统，提供论文管理、笔记记录、用户管理等功能。本文档详细描述了后端API接口的使用方法。

### 基础信息

- **基础URL**: `http://localhost:5000/api/v1`
- **认证方式**: JWT Bearer Token
- **数据格式**: JSON
- **字符编码**: UTF-8

### 通用响应格式

所有API响应都遵循统一的格式：

```json
{
  "code": 200,          // HTTP状态码
  "message": "操作成功",  // 响应消息
  "data": {}            // 响应数据
}
```

### 业务状态码

在响应数据的`data`字段中，可能包含`code`字段表示业务状态：

```json
{
  "code": 0,            // 业务状态码，0表示成功
  "message": "操作成功", // 业务消息
  "data": {}            // 实际数据
}
```

常见业务状态码：
- `0`: 成功
- `1001`: 登录失败
- `1005`: 用户不存在
- `1006`: 用户已存在
- `1007`: 权限不足
- `1008`: Token无效
- `2001`: 论文不存在
- `3001`: 笔记不存在

## 认证

### 登录

**接口**: `POST /api/v1/users/login`

**请求体**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "code": 0,
    "message": "登录成功",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "user_123",
        "username": "admin",
        "nickname": "系统管理员",
        "role": "admin"
      }
    }
  }
}
```

### Token使用

在需要认证的接口中，需要在请求头中添加JWT Token：

```
Authorization: Bearer <token>
```

### 刷新Token

**接口**: `POST /api/v1/users/refresh`

**请求头**:
```
Authorization: Bearer <token>
```

**响应**:
```json
{
  "code": 200,
  "message": "Token刷新成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_123",
      "username": "admin",
      "nickname": "系统管理员",
      "role": "admin"
    }
  }
}
```

## 用户管理

### 获取当前用户信息

**接口**: `GET /api/v1/users/current`

**认证**: 需要登录

**响应**:
```json
{
  "code": 200,
  "message": "获取用户信息成功",
  "data": {
    "id": "user_123",
    "username": "admin",
    "nickname": "系统管理员",
    "role": "admin",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 修改密码

**接口**: `PUT /api/v1/users/password`

**认证**: 需要登录

**请求体**:
```json
{
  "oldPassword": "old_password",
  "newPassword": "new_password"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "密码修改成功",
  "data": null
}
```

### 创建用户（管理员）

**接口**: `POST /api/v1/users/`

**认证**: 需要管理员权限

**请求体**:
```json
{
  "username": "newuser",
  "password": "password123",
  "nickname": "新用户",
  "role": "user"  // 可选，默认为"user"
}
```

**响应**:
```json
{
  "code": 201,
  "message": "用户创建成功",
  "data": {
    "id": "user_456",
    "username": "newuser",
    "nickname": "新用户",
    "role": "user",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 获取用户列表（管理员）

**接口**: `GET /api/v1/users/`

**认证**: 需要管理员权限

**查询参数**:
- `page`: 页码，默认1
- `limit`: 每页数量，默认10
- `keyword`: 搜索关键词（用户名或昵称）

**响应**:
```json
{
  "code": 200,
  "message": "获取用户列表成功",
  "data": {
    "users": [
      {
        "id": "user_123",
        "username": "admin",
        "nickname": "系统管理员",
        "role": "admin",
        "createdAt": "2023-01-01T00:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

## 健康检查

### 系统健康检查

**接口**: `GET /api/v1/health/`

**认证**: 无需认证

**响应**:
```json
{
  "status": "ok",
  "mongo": {"ok": 1.0}
}
```

## 公共论文库

### 获取公共论文列表

**接口**: `GET /api/v1/notes/public_papers`

**认证**: 无需认证

**查询参数**:
- `page`: 页码，默认1
- `pageSize`: 每页数量，默认20，最大100
- `sortBy`: 排序字段，默认"createdAt"
- `sortOrder`: 排序方向，"desc"或"asc"，默认"desc"
- `search`: 搜索关键词
- `articleType`: 文章类型
- `sciQuartile`: SCI分区
- `casQuartile`: CAS分区
- `ccfRank`: CCF评级
- `year`: 发表年份
- `yearFrom`: 发表年份范围起始
- `yearTo`: 发表年份范围结束
- `tag`: 标签
- `author`: 作者
- `publication`: 发表刊物
- `doi`: DOI

**响应**:
```json
{
  "code": 200,
  "message": "获取论文列表成功",
  "data": {
    "papers": [
      {
        "id": "paper_123",
        "isPublic": true,
        "metadata": {
          "title": "论文标题",
          "titleZh": "论文标题中文",
          "authors": [
            {"name": "作者1", "affiliation": "机构1"},
            {"name": "作者2", "affiliation": "机构2"}
          ],
          "year": 2023,
          "journal": "期刊名称",
          "abstract": "摘要内容",
          "keywords": ["关键词1", "关键词2"]
        },
        "createdAt": "2023-01-01T00:00:00.000Z",
        "updatedAt": "2023-01-01T00:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

### 获取公共论文详情

**接口**: `GET /api/v1/notes/public_papers/<paper_id>`

**认证**: 无需认证

**响应**:
```json
{
  "code": 200,
  "message": "获取论文详情成功",
  "data": {
    "id": "paper_123",
    "isPublic": true,
    "createdBy": "user_123",
    "metadata": {
      "title": "论文标题",
      "titleZh": "论文标题中文",
      "authors": [
        {"name": "作者1", "affiliation": "机构1"},
        {"name": "作者2", "affiliation": "机构2"}
      ],
      "year": 2023,
      "journal": "期刊名称",
      "abstract": "摘要内容",
      "keywords": ["关键词1", "关键词2"]
    },
    "sections": [
      {
        "id": "section_123",
        "title": "章节标题",
        "titleZh": "章节标题中文",
        "content": [
          {
            "id": "block_123",
            "type": "paragraph",
            "content": {
              "en": [{"type": "text", "content": "English content"}],
              "zh": [{"type": "text", "content": "中文内容"}]
            }
          }
        ]
      }
    ],
    "references": [
      {
        "id": "ref_123",
        "title": "参考文献标题",
        "authors": ["作者1", "作者2"],
        "journal": "期刊名称",
        "year": 2022,
        "pages": "123-145"
      }
    ],
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 获取公共论文内容

**接口**: `GET /api/v1/notes/public_papers/<paper_id>/content`

**认证**: 无需认证

**响应**:
```json
{
  "code": 200,
  "message": "获取论文内容成功",
  "data": {
    "sections": [
      {
        "id": "section_123",
        "title": "章节标题",
        "titleZh": "章节标题中文",
        "content": [
          {
            "id": "block_123",
            "type": "paragraph",
            "content": {
              "en": [{"type": "text", "content": "English content"}],
              "zh": [{"type": "text", "content": "中文内容"}]
            }
          }
        ]
      }
    ]
  }
}
```

## 个人论文库

### 获取个人论文列表

**接口**: `GET /api/v1/notes/user_papers`

**认证**: 需要登录

**查询参数**:
- `page`: 页码，默认1
- `pageSize`: 每页数量，默认20，最大100
- `sortBy`: 排序字段，默认"addedAt"
- `sortOrder`: 排序方向，"desc"或"asc"，默认"desc"
- `search`: 搜索关键词
- `readingStatus`: 阅读状态（"unread", "reading", "finished"）
- `priority`: 优先级（"high", "medium", "low"）
- `customTag`: 自定义标签
- `hasSource`: 是否来自公共论文（true/false）

**响应**:
```json
{
  "code": 200,
  "message": "获取个人论文列表成功",
  "data": {
    "papers": [
      {
        "id": "user_paper_123",
        "userId": "user_123",
        "sourcePaperId": "paper_123",
        "customTags": ["重要", "机器学习"],
        "readingStatus": "unread",
        "priority": "high",
        "readingPosition": "block_123",
        "totalReadingTime": 300,
        "lastReadTime": "2023-01-01T00:00:00.000Z",
        "addedAt": "2023-01-01T00:00:00.000Z",
        "paperData": {
          "id": "paper_123",
          "metadata": {
            "title": "论文标题",
            "titleZh": "论文标题中文",
            "authors": [
              {"name": "作者1", "affiliation": "机构1"}
            ],
            "year": 2023
          }
        }
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

### 添加公共论文到个人库

**接口**: `POST /api/v1/notes/user_papers`

**认证**: 需要登录

**请求体**:
```json
{
  "paperId": "paper_123",
  "extra": {
    "customTags": ["重要", "机器学习"],
    "readingStatus": "unread",
    "priority": "high"
  }
}
```

**响应**:
```json
{
  "code": 200,
  "message": "添加成功",
  "data": {
    "id": "user_paper_123",
    "userId": "user_123",
    "sourcePaperId": "paper_123",
    "customTags": ["重要", "机器学习"],
    "readingStatus": "unread",
    "priority": "high",
    "addedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 通过文本创建个人论文

**接口**: `POST /api/v1/notes/user_papers/create-from-text`

**认证**: 需要登录

**请求体**:
```json
{
  "text": "这是一段论文文本内容...",
  "extra": {
    "customTags": ["重要", "机器学习"],
    "readingStatus": "unread",
    "priority": "high"
  }
}
```

**响应**:
```json
{
  "code": 200,
  "message": "创建成功",
  "data": {
    "id": "user_paper_123",
    "userId": "user_123",
    "paperData": {
      "id": "paper_456",
      "metadata": {
        "title": "从文本生成的论文标题",
        "titleZh": "从文本生成的论文标题中文"
      },
      "sections": [
        {
          "id": "section_123",
          "title": "自动生成的章节",
          "content": [
            {
              "id": "block_123",
              "type": "paragraph",
              "content": {
                "en": [{"type": "text", "content": "English content"}],
                "zh": [{"type": "text", "content": "中文内容"}]
              }
            }
          ]
        }
      ]
    },
    "customTags": ["重要", "机器学习"],
    "readingStatus": "unread",
    "priority": "high",
    "addedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 通过元数据创建个人论文

**接口**: `POST /api/v1/notes/user_papers/create-from-metadata`

**认证**: 需要登录

**请求体**:
```json
{
  "metadata": {
    "title": "论文标题",
    "titleZh": "论文标题中文",
    "authors": ["作者1", "作者2"],
    "year": 2023,
    "journal": "期刊名称",
    "abstract": "摘要内容",
    "keywords": ["关键词1", "关键词2"]
  },
  "extra": {
    "customTags": ["重要", "机器学习"],
    "readingStatus": "unread",
    "priority": "high"
  }
}
```

**响应**:
```json
{
  "code": 200,
  "message": "创建成功",
  "data": {
    "id": "user_paper_123",
    "userId": "user_123",
    "paperData": {
      "id": "paper_456",
      "metadata": {
        "title": "论文标题",
        "titleZh": "论文标题中文",
        "authors": ["作者1", "作者2"],
        "year": 2023,
        "journal": "期刊名称",
        "abstract": "摘要内容",
        "keywords": ["关键词1", "关键词2"]
      }
    },
    "customTags": ["重要", "机器学习"],
    "readingStatus": "unread",
    "priority": "high",
    "addedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 获取个人论文详情

**接口**: `GET /api/v1/notes/user_papers/<entry_id>`

**认证**: 需要登录

**响应**:
```json
{
  "code": 200,
  "message": "获取论文详情成功",
  "data": {
    "id": "user_paper_123",
    "userId": "user_123",
    "sourcePaperId": "paper_123",
    "customTags": ["重要", "机器学习"],
    "readingStatus": "unread",
    "priority": "high",
    "readingPosition": "block_123",
    "totalReadingTime": 300,
    "lastReadTime": "2023-01-01T00:00:00.000Z",
    "addedAt": "2023-01-01T00:00:00.000Z",
    "paperData": {
      "id": "paper_123",
      "metadata": {
        "title": "论文标题",
        "titleZh": "论文标题中文",
        "authors": [
          {"name": "作者1", "affiliation": "机构1"}
        ],
        "year": 2023
      },
      "sections": [
        {
          "id": "section_123",
          "title": "章节标题",
          "titleZh": "章节标题中文",
          "content": [
            {
              "id": "block_123",
              "type": "paragraph",
              "content": {
                "en": [{"type": "text", "content": "English content"}],
                "zh": [{"type": "text", "content": "中文内容"}]
              }
            }
          ]
        }
      ]
    }
  }
}
```

### 更新个人论文

**接口**: `PUT /api/v1/notes/user_papers/<entry_id>`

**认证**: 需要登录

**请求体**:
```json
{
  "customTags": ["已读", "重要"],
  "readingStatus": "finished",
  "priority": "high",
  "paperData": {
    "metadata": {...},
    "sections": [...]
  }
}
```

**响应**:
```json
{
  "code": 200,
  "message": "更新成功",
  "data": {
    "id": "user_paper_123",
    "customTags": ["已读", "重要"],
    "readingStatus": "finished",
    "priority": "high",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 更新阅读进度

**接口**: `PATCH /api/v1/notes/user_papers/<entry_id>/progress`

**认证**: 需要登录

**请求体**:
```json
{
  "readingPosition": "block_123",
  "readingTime": 300
}
```

**响应**:
```json
{
  "code": 200,
  "message": "更新成功",
  "data": {
    "readingPosition": "block_123",
    "totalReadingTime": 600,
    "lastReadTime": "2023-01-01T00:00:00.000Z"
  }
}
```

### 删除个人论文

**接口**: `DELETE /api/v1/notes/user_papers/<entry_id>`

**认证**: 需要登录

**响应**:
```json
{
  "code": 200,
  "message": "删除成功",
  "data": null
}
```

### 获取用户统计信息

**接口**: `GET /api/v1/notes/user_papers/statistics`

**认证**: 需要登录

**响应**:
```json
{
  "code": 200,
  "message": "获取统计信息成功",
  "data": {
    "total": 50,
    "readingStatus": {
      "unread": 20,
      "reading": 15,
      "finished": 15
    },
    "priority": {
      "high": 10,
      "medium": 30,
      "low": 10
    },
    "fromPublic": 40,
    "uploaded": 10
  }
}
```

## 笔记管理

### 创建笔记

**接口**: `POST /api/v1/notes/`

**认证**: 需要登录

**请求体**:
```json
{
  "userPaperId": "user_paper_123",
  "blockId": "block_456",
  "content": [
    {
      "type": "text",
      "content": "这是我的笔记",
      "style": {"bold": true, "color": "#ff0000"}
    },
    {
      "type": "link",
      "url": "https://example.com",
      "children": [
        {"type": "text", "content": "参考链接"}
      ]
    }
  ],
  "plainText": "这是我的笔记纯文本内容"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "创建成功",
  "data": {
    "id": "note_123",
    "userId": "user_123",
    "userPaperId": "user_paper_123",
    "blockId": "block_456",
    "content": [
      {
        "type": "text",
        "content": "这是我的笔记",
        "style": {"bold": true, "color": "#ff0000"}
      }
    ],
    "plainText": "这是我的笔记纯文本内容",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 获取论文的所有笔记

**接口**: `GET /api/v1/notes/paper/<user_paper_id>`

**认证**: 需要登录

**查询参数**:
- `page`: 页码，默认1
- `pageSize`: 每页数量，默认50，最大100

**响应**:
```json
{
  "code": 200,
  "message": "获取笔记成功",
  "data": {
    "notes": [
      {
        "id": "note_123",
        "userId": "user_123",
        "userPaperId": "user_paper_123",
        "blockId": "block_456",
        "content": [
          {
            "type": "text",
            "content": "这是我的笔记"
          }
        ],
        "createdAt": "2023-01-01T00:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 50
  }
}
```

### 获取Block的所有笔记

**接口**: `GET /api/v1/notes/paper/<user_paper_id>/block/<block_id>`

**认证**: 需要登录

**响应**:
```json
{
  "code": 200,
  "message": "获取笔记成功",
  "data": [
    {
      "id": "note_123",
      "userId": "user_123",
      "userPaperId": "user_paper_123",
      "blockId": "block_456",
      "content": [
        {
          "type": "text",
          "content": "这是我的笔记"
        }
      ],
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  ]
}
```

### 获取用户的所有笔记

**接口**: `GET /api/v1/notes/user`

**认证**: 需要登录

**查询参数**:
- `page`: 页码，默认1
- `pageSize`: 每页数量，默认50，最大100

**响应**:
```json
{
  "code": 200,
  "message": "获取笔记成功",
  "data": {
    "notes": [
      {
        "id": "note_123",
        "userId": "user_123",
        "userPaperId": "user_paper_123",
        "blockId": "block_456",
        "content": [
          {
            "type": "text",
            "content": "这是我的笔记"
          }
        ],
        "createdAt": "2023-01-01T00:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 50
  }
}
```

### 搜索笔记

**接口**: `GET /api/v1/notes/search`

**认证**: 需要登录

**查询参数**:
- `keyword`: 搜索关键词（必需）
- `page`: 页码，默认1
- `pageSize`: 每页数量，默认50，最大100

**响应**:
```json
{
  "code": 200,
  "message": "搜索成功",
  "data": {
    "notes": [
      {
        "id": "note_123",
        "userId": "user_123",
        "userPaperId": "user_paper_123",
        "blockId": "block_456",
        "content": [
          {
            "type": "text",
            "content": "这是我的笔记"
          }
        ],
        "createdAt": "2023-01-01T00:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 50
  }
}
```

### 更新笔记

**接口**: `PUT /api/v1/notes/<note_id>`

**认证**: 需要登录

**请求体**:
```json
{
  "content": [
    {
      "type": "text",
      "content": "更新后的笔记内容",
      "style": {"bold": true}
    }
  ],
  "plainText": "更新后的笔记纯文本内容"
}
```

**响应**:
```json
{
  "code": 200,
  "message": "更新成功",
  "data": {
    "id": "note_123",
    "content": [
      {
        "type": "text",
        "content": "更新后的笔记内容",
        "style": {"bold": true}
      }
    ],
    "plainText": "更新后的笔记纯文本内容",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 删除笔记

**接口**: `DELETE /api/v1/notes/<note_id>`

**认证**: 需要登录

**响应**:
```json
{
  "code": 200,
  "message": "删除成功",
  "data": null
}
```

### 删除论文的所有笔记

**接口**: `DELETE /api/v1/notes/paper/<user_paper_id>`

**认证**: 需要登录

**响应**:
```json
{
  "code": 200,
  "message": "删除成功",
  "data": null
}
```

## 管理员论文管理

### 获取管理员论文列表

**接口**: `GET /api/v1/notes/admin_papers`

**认证**: 需要管理员权限

**查询参数**:
- `page`: 页码，默认1
- `pageSize`: 每页数量，默认20，最大100
- `sortBy`: 排序字段，默认"createdAt"
- `sortOrder`: 排序方向，"desc"或"asc"，默认"desc"
- `search`: 搜索关键词
- `isPublic`: 是否公开（true/false）
- `parseStatus`: 解析状态
- `year`: 发表年份
- `articleType`: 文章类型
- `tag`: 标签
- `createdBy`: 创建者ID

**响应**:
```json
{
  "code": 200,
  "message": "获取论文列表成功",
  "data": {
    "papers": [
      {
        "id": "paper_123",
        "isPublic": true,
        "createdBy": "user_123",
        "metadata": {
          "title": "论文标题",
          "titleZh": "论文标题中文",
          "authors": [
            {"name": "作者1", "affiliation": "机构1"}
          ],
          "year": 2023
        },
        "parseStatus": {
          "status": "completed",
          "progress": 100,
          "message": "解析完成"
        },
        "createdAt": "2023-01-01T00:00:00.000Z",
        "updatedAt": "2023-01-01T00:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

### 创建公共论文

**接口**: `POST /api/v1/notes/admin_papers`

**认证**: 需要管理员权限

**请求体**:
```json
{
  "metadata": {
    "title": "论文标题",
    "titleZh": "论文标题中文",
    "authors": [
      {"name": "作者1", "affiliation": "机构1"}
    ],
    "year": 2023,
    "journal": "期刊名称",
    "abstract": "摘要内容",
    "keywords": ["关键词1", "关键词2"]
  },
  "isPublic": true
}
```

**响应**:
```json
{
  "code": 200,
  "message": "创建成功",
  "data": {
    "id": "paper_123",
    "isPublic": true,
    "createdBy": "user_123",
    "metadata": {
      "title": "论文标题",
      "titleZh": "论文标题中文",
      "authors": [
        {"name": "作者1", "affiliation": "机构1"}
      ],
      "year": 2023
    },
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 通过文本创建公共论文

**接口**: `POST /api/v1/notes/admin_papers/create-from-text`

**认证**: 需要管理员权限

**请求体**:
```json
{
  "text": "这是一段论文文本内容...",
  "isPublic": true
}
```

**响应**:
```json
{
  "code": 200,
  "message": "创建成功",
  "data": {
    "id": "paper_123",
    "isPublic": true,
    "createdBy": "user_123",
    "metadata": {
      "title": "从文本生成的论文标题",
      "titleZh": "从文本生成的论文标题中文"
    },
    "sections": [
      {
        "id": "section_123",
        "title": "自动生成的章节",
        "content": [
          {
            "id": "block_123",
            "type": "paragraph",
            "content": {
              "en": [{"type": "text", "content": "English content"}],
              "zh": [{"type": "text", "content": "中文内容"}]
            }
          }
        ]
      }
    ],
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 获取管理员论文详情

**接口**: `GET /api/v1/notes/admin_papers/<paper_id>`

**认证**: 需要管理员权限

**响应**:
```json
{
  "code": 200,
  "message": "获取论文详情成功",
  "data": {
    "id": "paper_123",
    "isPublic": true,
    "createdBy": "user_123",
    "metadata": {
      "title": "论文标题",
      "titleZh": "论文标题中文",
      "authors": [
        {"name": "作者1", "affiliation": "机构1"}
      ],
      "year": 2023
    },
    "sections": [
      {
        "id": "section_123",
        "title": "章节标题",
        "titleZh": "章节标题中文",
        "content": [
          {
            "id": "block_123",
            "type": "paragraph",
            "content": {
              "en": [{"type": "text", "content": "English content"}],
              "zh": [{"type": "text", "content": "中文内容"}]
            }
          }
        ]
      }
    ],
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 更新公共论文

**接口**: `PUT /api/v1/notes/admin_papers/<paper_id>`

**认证**: 需要管理员权限

**请求体**:
```json
{
  "metadata": {
    "title": "更新的论文标题",
    "titleZh": "更新的论文标题中文"
  }
}
```

**响应**:
```json
{
  "code": 200,
  "message": "更新成功",
  "data": {
    "id": "paper_123",
    "metadata": {
      "title": "更新的论文标题",
      "titleZh": "更新的论文标题中文"
    },
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 删除公共论文

**接口**: `DELETE /api/v1/notes/admin_papers/<paper_id>`

**认证**: 需要管理员权限

**响应**:
```json
{
  "code": 200,
  "message": "删除成功",
  "data": null
}
```

### 获取管理员统计信息

**接口**: `GET /api/v1/notes/admin_papers/statistics`

**认证**: 需要管理员权限

**响应**:
```json
{
  "code": 200,
  "message": "获取统计信息成功",
  "data": {
    "total": 100,
    "public": 80,
    "private": 20
  }
}
```

## 文件上传

### 上传图片

**接口**: `POST /api/v1/upload/image`

**认证**: 需要登录

**请求格式**: multipart/form-data

**请求参数**:
- `file`: 图片文件

**响应**:
```json
{
  "code": 200,
  "message": "上传成功",
  "data": {
    "url": "https://your-domain.com/neuink/image/12345678_abc123.jpg",
    "key": "neuink/image/12345678_abc123.jpg",
    "size": 102400,
    "contentType": "image/jpeg",
    "uploadedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 上传文档

**接口**: `POST /api/v1/upload/document`

**认证**: 需要登录

**请求格式**: multipart/form-data

**请求参数**:
- `file`: 文档文件

**响应**:
```json
{
  "code": 200,
  "message": "上传成功",
  "data": {
    "url": "https://your-domain.com/neuink/document/12345678_abc123.pdf",
    "key": "neuink/document/12345678_abc123.pdf",
    "size": 1024000,
    "contentType": "application/pdf",
    "uploadedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 上传Markdown文件

**接口**: `POST /api/v1/upload/markdown`

**认证**: 需要登录

**请求格式**: multipart/form-data

**请求参数**:
- `file`: Markdown文件

**响应**:
```json
{
  "code": 200,
  "message": "上传成功",
  "data": {
    "url": "https://your-domain.com/neuink/markdown/12345678_abc123.md",
    "key": "neuink/markdown/12345678_abc123.md",
    "size": 102400,
    "contentType": "text/markdown",
    "uploadedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 上传论文图片

**接口**: `POST /api/v1/upload/paper-image`

**认证**: 需要登录

**请求格式**: multipart/form-data

**请求参数**:
- `file`: 图片文件
- `paper_id`: 论文ID（可选）

**响应**:
```json
{
  "code": 200,
  "message": "上传成功",
  "data": {
    "url": "https://your-domain.com/neuink/paper_image/paper_123/12345678_abc123.jpg",
    "key": "neuink/paper_image/paper_123/12345678_abc123.jpg",
    "size": 102400,
    "contentType": "image/jpeg",
    "uploadedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 获取上传凭证

**接口**: `GET /api/v1/upload/token`

**认证**: 需要登录

**查询参数**:
- `key`: 文件在七牛云中的存储路径
- `expires`: 凭证有效期（秒），默认3600

**响应**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "token": "上传凭证字符串",
    "key": "文件存储路径",
    "expires": 3600,
    "domain": "https://your-domain.com"
  }
}
```

### 获取上传配置

**接口**: `GET /api/v1/upload/config`

**认证**: 需要登录

**响应**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "maxFileSize": 10485760,
    "allowedImageTypes": ["png", "jpg", "jpeg", "gif", "webp"],
    "allowedDocumentTypes": ["pdf", "doc", "docx", "ppt", "pptx", "txt"],
    "allowedMarkdownTypes": ["md", "markdown"],
    "domain": "https://your-domain.com",
    "isConfigured": true
  }
}
```

## 错误处理

### HTTP状态码

- `200`: 成功
- `201`: 创建成功
- `400`: 请求参数错误
- `401`: 未授权访问
- `403`: 权限不足
- `404`: 资源不存在
- `409`: 资源冲突
- `500`: 服务器内部错误

### 错误响应格式

```json
{
  "code": 400,
  "message": "参数错误",
  "data": {
    "code": 1004,
    "message": "参数错误",
    "data": null
  }
}
```

## 数据模型

### 用户模型

```json
{
  "id": "user_123",
  "username": "admin",
  "password": "hashed_password",
  "salt": "salt_value",
  "nickname": "系统管理员",
  "role": "admin",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

### 论文模型

```json
{
  "id": "paper_123",
  "isPublic": true,
  "createdBy": "user_123",
  "metadata": {
    "title": "论文标题",
    "titleZh": "论文标题中文",
    "authors": [
      {"name": "作者1", "affiliation": "机构1"}
    ],
    "year": 2023,
    "journal": "期刊名称",
    "abstract": "摘要内容",
    "keywords": ["关键词1", "关键词2"]
  },
  "sections": [
    {
      "id": "section_123",
      "title": "章节标题",
      "titleZh": "章节标题中文",
      "content": [
        {
          "id": "block_123",
          "type": "paragraph",
          "content": {
            "en": [{"type": "text", "content": "English content"}],
            "zh": [{"type": "text", "content": "中文内容"}]
          }
        }
      ]
    }
  ],
  "references": [
    {
      "id": "ref_123",
      "title": "参考文献标题",
      "authors": ["作者1", "作者2"],
      "journal": "期刊名称",
      "year": 2022,
      "pages": "123-145"
    }
  ],
  "parseStatus": {
    "status": "completed",
    "progress": 100,
    "message": "解析完成"
  },
  "translationStatus": {
    "isComplete": true,
    "lastChecked": "2023-01-01T00:00:00.000Z",
    "missingFields": [],
    "updatedAt": "2023-01-01T00:00:00.000Z"
  },
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

### 个人论文模型

```json
{
  "id": "user_paper_123",
  "userId": "user_123",
  "sourcePaperId": "paper_123",
  "paperData": {
    "id": "paper_123",
    "metadata": {...},
    "sections": [...]
  },
  "customTags": ["重要", "机器学习"],
  "readingStatus": "unread",
  "priority": "high",
  "readingPosition": "block_123",
  "totalReadingTime": 300,
  "lastReadTime": "2023-01-01T00:00:00.000Z",
  "remarks": "备注",
  "addedAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

### 笔记模型

```json
{
  "id": "note_123",
  "userId": "user_123",
  "userPaperId": "user_paper_123",
  "blockId": "block_456",
  "content": [
    {
      "type": "text",
      "content": "这是我的笔记",
      "style": {"bold": true, "color": "#ff0000"}
    }
  ],
  "plainText": "这是我的笔记纯文本内容",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

## 常量定义

### 用户角色

- `admin`: 管理员
- `user`: 普通用户

### 阅读状态

- `unread`: 未读
- `reading`: 阅读中
- `finished`: 已读完

### 优先级

- `high`: 高
- `medium`: 中
- `low`: 低

### 文章类型

- `journal`: 期刊
- `conference`: 会议
- `preprint`: 预印本
- `book`: 书籍
- `thesis`: 学位论文

### Block类型

- `heading`: 标题
- `paragraph`: 段落
- `ordered-list`: 有序列表
- `unordered-list`: 无序列表
- `quote`: 引用
- `math`: 数学公式
- `code`: 代码
- `figure`: 图片
- `table`: 表格
- `divider`: 分割线

### InlineContent类型

- `text`: 普通文本
- `link`: 链接
- `inline-math`: 行内数学公式
- `citation`: 引用
