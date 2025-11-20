<<<<<<< HEAD
好的！我来给您写一个完整的API文档：

# 📚 论文库阅读工具 API 文档

## 目录
- [1. 概述](#1-概述)
- [2. 认证机制](#2-认证机制)
- [3. 响应格式](#3-响应格式)
- [4. 公共论文库接口](#4-公共论文库接口)
- [5. 管理员接口](#5-管理员接口)
- [6. 个人论文库接口](#6-个人论文库接口)
- [7. 用户管理接口](#7-用户管理接口)
- [8. 健康检查接口](#8-健康检查接口)
- [9. 笔记管理接口](#9-笔记管理接口)
- [10. 错误码说明](#10-错误码说明)

---

## 1. 概述

### 1.1 基本信息
- **Base URL**: `http://your-domain.com/api/v1/`
- **协议**: HTTP/HTTPS
- **数据格式**: JSON
- **字符编码**: UTF-8

### 1.2 角色说明
- **管理员**: 可以管理公共论文库（增删改查）
- **普通用户**: 可以浏览公共论文库，创建个人论文库，添加笔记

---

## 2. 认证机制

### 2.1 Token 获取
通过登录接口获取 JWT Token（登录接口不在本文档范围内）

### 2.2 Token 使用
在请求头中携带 Token：
```http
Authorization: Bearer <your-token>
```

### 2.3 权限说明
- 🔓 **无需认证**: 可匿名访问
- 🔒 **需要登录**: 需要有效 Token
- 🔐 **需要管理员**: 需要管理员权限

---

## 3. 响应格式

### 3.1 成功响应
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "code": 0,
    "message": "获取成功",
    "data": {
      // 实际业务数据
=======
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
>>>>>>> origin/main
    }
  }
}
```

<<<<<<< HEAD
### 3.2 错误响应
```json
{
  "code": 400,
  "message": "参数错误",
=======
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
>>>>>>> origin/main
  "data": null
}
```

<<<<<<< HEAD
### 3.3 HTTP 状态码
- `200` - 成功
- `201` - 创建成功
- `400` - 请求参数错误
- `401` - 未授权（未登录或 Token 无效）
- `403` - 权限不足
- `404` - 资源不存在
- `409` - 资源冲突
- `500` - 服务器内部错误

---

## 4. 公共论文库接口

### 4.1 获取公共论文列表

**接口**: `GET /api/public/papers`  
**权限**: 🔓 无需认证

**查询参数**:
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | integer | 否 | 1 | 页码 |
| pageSize | integer | 否 | 20 | 每页数量（最大100） |
| sortBy | string | 否 | createdAt | 排序字段 |
| sortOrder | string | 否 | desc | 排序方向（asc/desc） |
| search | string | 否 | - | 搜索关键词 |
| articleType | string | 否 | - | 论文类型 |
| year | integer | 否 | - | 年份 |
| yearFrom | integer | 否 | - | 起始年份 |
| yearTo | integer | 否 | - | 结束年份 |
| sciQuartile | string | 否 | - | SCI分区（Q1/Q2/Q3/Q4） |
| casQuartile | string | 否 | - | CAS分区（1区/2区/3区/4区） |
| ccfRank | string | 否 | - | CCF等级（A/B/C） |
| tag | string | 否 | - | 标签 |
| author | string | 否 | - | 作者名 |
| publication | string | 否 | - | 期刊/会议名 |
| doi | string | 否 | - | DOI |

**响应示例**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "code": 0,
    "message": "获取公开论文成功",
    "data": {
      "papers": [
        {
          "id": "paper_123",
          "isPublic": true,
          "metadata": {
            "title": "Deep Learning for Computer Vision",
            "titleZh": "面向计算机视觉的深度学习",
            "authors": [
              {
                "name": "张三",
                "affiliation": "清华大学",
                "email": "zhangsan@example.com"
              }
            ],
            "publication": "IEEE CVPR",
            "year": 2024,
            "articleType": "conference",
            "sciQuartile": "Q1",
            "tags": ["深度学习", "计算机视觉"]
          },
          "createdAt": "2025-01-15T10:30:00Z",
          "updatedAt": "2025-01-15T10:30:00Z"
        }
      ],
      "pagination": {
        "page": 1,
        "pageSize": 20,
        "total": 100,
        "totalPages": 5
      }
    }
  }
}
```

---

### 4.2 获取公共论文详情

**接口**: `GET /api/public/papers/public/{paper_id}`  
**权限**: 🔓 无需认证

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| paper_id | string | 是 | 论文ID |

**响应示例**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "code": 0,
    "message": "获取论文成功",
    "data": {
      "id": "paper_123",
      "isPublic": true,
      "createdBy": "admin",
      "metadata": {
        "title": "Deep Learning for Computer Vision",
        "authors": [...],
        "year": 2024
      },
      "abstract": {
        "en": "This paper presents...",
        "zh": "本文介绍了..."
      },
      "keywords": ["deep learning", "computer vision"],
      "sections": [
        {
          "id": "section_1",
          "number": "1",
          "title": {
            "en": "Introduction",
            "zh": "引言"
          },
          "content": [
            {
              "id": "block_1",
              "type": "paragraph",
              "content": {
                "en": [
                  {
                    "type": "text",
                    "content": "Deep learning has revolutionized..."
                  }
                ]
              }
            }
          ],
          "subsections": []
        }
      ],
      "references": [
        {
          "id": "ref_1",
          "number": 1,
          "authors": ["LeCun, Y.", "Bengio, Y."],
          "title": "Deep learning",
          "publication": "Nature",
          "year": 2015
        }
      ],
      "attachments": {
        "pdf": "https://cdn.example.com/papers/paper_123.pdf"
      },
      "parseStatus": {
        "status": "completed",
        "progress": 100,
        "message": "论文已就绪"
      },
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-15T10:30:00Z"
    }
  }
}
```

---

### 4.3 获取公共论文阅读内容

**接口**: `GET /api/public/papers/public/{paper_id}/content`  
**权限**: 🔓 无需认证

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| paper_id | string | 是 | 论文ID |

**响应示例**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "code": 0,
    "message": "获取论文内容成功",
    "data": {
      "metadata": {...},
      "abstract": {...},
      "keywords": [...],
      "sections": [...],
      "references": [...],
      "attachments": {...}
    }
  }
}
```

---

## 5. 管理员接口

### 5.1 获取管理员论文列表

**接口**: `GET /api/admin/papers`  
**权限**: 🔐 需要管理员

**查询参数**:
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | integer | 否 | 1 | 页码 |
| pageSize | integer | 否 | 20 | 每页数量 |
| sortBy | string | 否 | createdAt | 排序字段 |
| sortOrder | string | 否 | desc | 排序方向 |
| search | string | 否 | - | 搜索关键词 |
| isPublic | boolean | 否 | - | 是否公开 |
| parseStatus | string | 否 | - | 解析状态 |
| createdBy | string | 否 | - | 创建者ID |

**响应示例**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "code": 0,
    "message": "获取论文列表成功",
    "data": {
      "papers": [...],
      "pagination": {...}
    }
  }
}
```

---

### 5.2 创建论文

**接口**: `POST /api/admin/papers`  
**权限**: 🔐 需要管理员
=======
### 创建用户（管理员）

**接口**: `POST /api/v1/users/`

**认证**: 需要管理员权限
>>>>>>> origin/main

**请求体**:
```json
{
<<<<<<< HEAD
  "metadata": {
    "title": "论文标题",
    "titleZh": "中文标题",
    "authors": [
      {
        "name": "张三",
        "affiliation": "清华大学",
        "email": "zhangsan@example.com"
      }
    ],
    "publication": "IEEE CVPR",
    "year": 2024,
    "articleType": "conference",
    "sciQuartile": "Q1",
    "tags": ["深度学习", "计算机视觉"]
  },
  "abstract": {
    "en": "This paper presents...",
    "zh": "本文介绍了..."
  },
  "keywords": ["deep learning", "computer vision"],
  "sections": [
    {
      "id": "section_1",
      "number": "1",
      "title": {
        "en": "Introduction"
      },
      "content": [
        {
          "id": "block_1",
          "type": "paragraph",
          "content": {
            "en": [
              {
                "type": "text",
                "content": "This is the introduction..."
              }
            ]
          }
        }
      ]
    }
  ],
  "references": [],
  "attachments": {
    "pdf": "https://cdn.example.com/papers/paper_new.pdf"
  },
  "isPublic": true
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "code": 0,
    "message": "论文创建成功",
    "data": {
      "id": "paper_new_123",
      "isPublic": true,
      "createdBy": "admin_user_id",
      "metadata": {...},
      "createdAt": "2025-10-30T12:00:00Z",
      "updatedAt": "2025-10-30T12:00:00Z"
    }
=======
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
>>>>>>> origin/main
  }
}
```

<<<<<<< HEAD
---

### 5.3 更新论文

**接口**: `PUT /api/admin/papers/{paper_id}`  
**权限**: 🔐 需要管理员

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| paper_id | string | 是 | 论文ID |

**请求体**:
```json
{
  "metadata": {
    "title": "更新后的标题"
  },
  "isPublic": false
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "code": 0,
    "message": "论文更新成功",
    "data": {
      "id": "paper_123",
      "metadata": {
        "title": "更新后的标题"
      },
      "updatedAt": "2025-10-30T12:30:00Z"
    }
  }
}
```

---

### 5.4 删除论文

**接口**: `DELETE /api/admin/papers/{paper_id}`  
**权限**: 🔐 需要管理员

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| paper_id | string | 是 | 论文ID |

**响应示例**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "code": 0,
    "message": "论文删除成功",
    "data": null
  }
}
```

---

### 5.5 获取统计信息

**接口**: `GET /api/admin/papers/statistics`  
**权限**: 🔐 需要管理员

**响应示例**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "code": 0,
    "message": "获取统计信息成功",
    "data": {
      "total": 150,
      "public": 120,
      "private": 30
    }
  }
}
```

---

## 6. 个人论文库接口

### 6.1 获取个人论文库列表

**接口**: `GET /api/user/papers`  
**权限**: 🔒 需要登录

**查询参数**:
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | integer | 否 | 1 | 页码 |
| pageSize | integer | 否 | 20 | 每页数量 |
| sortBy | string | 否 | addedAt | 排序字段 |
| sortOrder | string | 否 | desc | 排序方向 |
| search | string | 否 | - | 搜索关键词 |
| readingStatus | string | 否 | - | 阅读状态（unread/reading/finished） |
| priority | string | 否 | - | 优先级（high/medium/low） |
| customTag | string | 否 | - | 自定义标签 |
| hasSource | boolean | 否 | - | 是否来自公共论文库 |

**响应示例**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "code": 0,
    "message": "获取个人论文库成功",
    "data": {
      "papers": [
        {
          "id": "user_paper_123",
          "userId": "user_456",
          "sourcePaperId": "paper_789",
          "paperData": {
            "metadata": {
              "title": "我收藏的论文"
            },
            "sections": [...]
          },
          "customTags": ["重要", "机器学习"],
          "readingStatus": "reading",
          "priority": "high",
          "noteCount": 5,
          "addedAt": "2025-10-20T10:00:00Z",
          "updatedAt": "2025-10-25T15:30:00Z"
        }
      ],
      "pagination": {
        "page": 1,
        "pageSize": 20,
        "total": 50,
        "totalPages": 3
      }
    }
=======
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
>>>>>>> origin/main
  }
}
```

<<<<<<< HEAD
---

### 6.2 添加公共论文到个人库

**接口**: `POST /api/user/papers`  
**权限**: 🔒 需要登录
=======
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
>>>>>>> origin/main

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

<<<<<<< HEAD
**响应示例**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "code": 0,
    "message": "添加到个人论文库成功",
    "data": {
      "id": "user_paper_new_456",
      "userId": "user_123",
      "sourcePaperId": "paper_123",
      "paperData": {
        "metadata": {...},
        "sections": [...]
      },
      "customTags": ["重要", "机器学习"],
      "readingStatus": "unread",
      "priority": "high",
      "addedAt": "2025-10-30T12:00:00Z",
      "updatedAt": "2025-10-30T12:00:00Z"
    }
=======
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
>>>>>>> origin/main
  }
}
```

<<<<<<< HEAD
---

### 6.3 上传私有论文

**接口**: `POST /api/user/papers/uploads`  
**权限**: 🔒 需要登录

**请求体**: `multipart/form-data`

**说明**: 该功能当前返回提示信息，PDF解析功能待实现。

**响应示例**:
```json
{
  "code": 400,
  "message": "参数错误",
  "data": {
    "code": 1004,
    "message": "PDF 上传解析功能开发中，敬请期待",
    "data": null
=======
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
>>>>>>> origin/main
  }
}
```

<<<<<<< HEAD
---

### 6.4 获取个人论文详情

**接口**: `GET /api/user/papers/{entry_id}`  
**权限**: 🔒 需要登录

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| entry_id | string | 是 | 个人论文ID |

**响应示例**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "code": 0,
    "message": "获取论文详情成功",
    "data": {
      "id": "user_paper_123",
      "userId": "user_456",
      "sourcePaperId": "paper_789",
      "paperData": {
        "metadata": {...},
        "abstract": {...},
        "sections": [...]
      },
      "customTags": ["重要"],
      "readingStatus": "reading",
      "priority": "high",
      "notes": [
        {
          "id": "note_1",
          "blockId": "block_123",
          "content": [
            {
              "type": "text",
              "content": "这是我的笔记"
            }
          ],
          "createdAt": "2025-10-25T10:00:00Z"
        }
      ],
      "noteCount": 1,
      "addedAt": "2025-10-20T10:00:00Z",
      "updatedAt": "2025-10-25T15:30:00Z"
=======
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
>>>>>>> origin/main
    }
  }
}
```

<<<<<<< HEAD
---

### 6.5 更新个人论文

**接口**: `PUT /api/user/papers/{entry_id}`  
**权限**: 🔒 需要登录

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| entry_id | string | 是 | 个人论文ID |
=======
### 更新个人论文

**接口**: `PUT /api/v1/notes/user_papers/<entry_id>`

**认证**: 需要登录
>>>>>>> origin/main

**请求体**:
```json
{
  "customTags": ["已读", "重要"],
  "readingStatus": "finished",
  "priority": "high",
  "paperData": {
<<<<<<< HEAD
    "metadata": {
      "title": "修改后的标题"
    },
    "sections": [
      {
        "id": "section_1",
        "title": {
          "en": "Modified Introduction"
        },
        "content": [...]
      }
    ]
=======
    "metadata": {...},
    "sections": [...]
>>>>>>> origin/main
  }
}
```

<<<<<<< HEAD
**响应示例**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "code": 0,
    "message": "更新成功",
    "data": {
      "id": "user_paper_123",
      "paperData": {
        "metadata": {
          "title": "修改后的标题"
        }
      },
      "customTags": ["已读", "重要"],
      "readingStatus": "finished",
      "updatedAt": "2025-10-30T14:00:00Z"
    }
=======
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
>>>>>>> origin/main
  }
}
```

<<<<<<< HEAD
---

### 6.6 更新阅读进度

**接口**: `PATCH /api/user/papers/{entry_id}/progress`
**权限**: 🔒 需要登录

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| entry_id | string | 是 | 个人论文ID |
=======
### 更新阅读进度

**接口**: `PATCH /api/v1/notes/user_papers/<entry_id>/progress`

**认证**: 需要登录
>>>>>>> origin/main

**请求体**:
```json
{
  "readingPosition": "block_123",
  "readingTime": 300
}
```

<<<<<<< HEAD
**请求体参数说明**:
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| readingPosition | string | 否 | - | 当前阅读的 blockId |
| readingTime | integer | 否 | 0 | 本次阅读时长（秒） |

**响应示例**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "code": 0,
    "message": "阅读进度更新成功",
    "data": {
      "id": "user_paper_123",
      "readingPosition": "block_123",
      "totalReadingTime": 450,
      "updatedAt": "2025-10-30T12:00:00Z"
    }
=======
**响应**:
```json
{
  "code": 200,
  "message": "更新成功",
  "data": {
    "readingPosition": "block_123",
    "totalReadingTime": 600,
    "lastReadTime": "2023-01-01T00:00:00.000Z"
>>>>>>> origin/main
  }
}
```

<<<<<<< HEAD
---

### 6.7 删除个人论文

**接口**: `DELETE /api/user/papers/{entry_id}`
**权限**: 🔒 需要登录

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| entry_id | string | 是 | 个人论文ID |

**响应示例**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "code": 0,
    "message": "删除成功，同时删除了 3 条笔记",
    "data": {
      "deletedNotes": 3
    }
  }
}
```

---

### 6.8 获取用户统计信息

**接口**: `GET /api/user/papers/statistics`
**权限**: 🔒 需要登录

**响应示例**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "code": 0,
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
      "uploaded": 10,
      "totalNotes": 123
    }
=======
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
>>>>>>> origin/main
  }
}
```

<<<<<<< HEAD
---

## 7. 用户管理接口

### 7.1 用户登录

**接口**: `POST /api/users/login`
**权限**: 🔓 无需认证

**请求体**:
```json
{
  "username": "testuser",
  "password": "password123"
}
```

**请求体参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | 是 | 用户名 |
| password | string | 是 | 密码 |

**响应示例**:
```json
{
  "code": 200,
  "message": "请求处理完成",
  "data": {
    "code": 0,
    "message": "登录成功",
    "data": {
      "user": {
        "user_id": "user_123",
        "username": "testuser",
        "nickname": "测试用户",
        "role": "user"
      },
      "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
    }
  }
}
```

---

### 7.2 用户登出

**接口**: `POST /api/users/logout`
**权限**: 🔒 需要登录

**响应示例**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "code": 0,
    "message": "登出成功",
    "data": null
  }
}
```

---

### 7.3 获取当前用户信息

**接口**: `GET /api/users/current`
**权限**: 🔒 需要登录

**响应示例**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "code": 0,
    "message": "获取用户信息成功",
    "data": {
      "user_id": "user_123",
      "username": "testuser",
      "nickname": "测试用户",
      "role": "user",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  }
}
```

---

### 7.4 创建用户

**接口**: `POST /api/users/`
**权限**: 🔐 需要管理员

**请求体**:
```json
{
  "username": "newuser",
  "password": "password123",
  "nickname": "新用户",
  "role": "user"
}
```

**请求体参数说明**:
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| username | string | 是 | - | 用户名 |
| password | string | 是 | - | 密码 |
| nickname | string | 是 | - | 昵称 |
| role | string | 否 | user | 用户角色（user/admin） |

**响应示例**:
```json
{
  "code": 201,
  "message": "创建成功",
  "data": {
    "code": 0,
    "message": "用户创建成功",
    "data": {
      "user_id": "user_456",
      "username": "newuser",
      "nickname": "新用户",
      "role": "user",
      "createdAt": "2025-10-30T12:00:00Z"
    }
  }
}
```

---

### 7.5 删除用户

**接口**: `DELETE /api/users/{user_id}`
**权限**: 🔐 需要管理员

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| user_id | string | 是 | 用户ID |

**响应示例**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "code": 0,
    "message": "用户删除成功",
    "data": null
  }
}
```

---

### 7.6 修改密码

**接口**: `PUT /api/users/password`
**权限**: 🔒 需要登录

**请求体**:
```json
{
  "oldPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

**请求体参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| oldPassword | string | 是 | 旧密码 |
| newPassword | string | 是 | 新密码 |

**响应示例**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "code": 0,
    "message": "密码修改成功",
    "data": null
  }
}
```

---

### 7.7 变更用户角色

**接口**: `PATCH /api/users/{user_id}/role`
**权限**: 🔐 需要管理员

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| user_id | string | 是 | 用户ID |

**请求体**:
```json
{
  "role": "admin"
}
```

**请求体参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| role | string | 是 | 新角色（user/admin） |

**响应示例**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "code": 0,
    "message": "角色更新成功",
    "data": {
      "user_id": "user_123",
      "username": "testuser",
      "role": "admin",
      "updatedAt": "2025-10-30T12:00:00Z"
    }
  }
}
```

---

## 9. 健康检查接口

### 9.1 健康检查

**接口**: `GET /api/health/`
**权限**: 🔓 无需认证

**响应示例**:
```json
{
  "status": "ok",
  "mongo": {
    "ok": 1.0
  }
}
```

---

## 10. 笔记管理接口

### 10.1 创建笔记

**接口**: `POST /api/notes`  
**权限**: 🔒 需要登录
=======
## 笔记管理

### 创建笔记

**接口**: `POST /api/v1/notes/`

**认证**: 需要登录
>>>>>>> origin/main

**请求体**:
```json
{
  "userPaperId": "user_paper_123",
  "blockId": "block_456",
  "content": [
    {
      "type": "text",
<<<<<<< HEAD
      "content": "这是我的笔记内容",
      "style": {
        "bold": true,
        "color": "#ff0000"
      }
=======
      "content": "这是我的笔记",
      "style": {"bold": true, "color": "#ff0000"}
>>>>>>> origin/main
    },
    {
      "type": "link",
      "url": "https://example.com",
      "children": [
<<<<<<< HEAD
        {
          "type": "text",
          "content": "参考链接"
        }
      ]
    },
    {
      "type": "inline-math",
      "latex": "E = mc^2"
    }
  ]
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "code": 0,
    "message": "笔记创建成功",
    "data": {
      "id": "note_789",
=======
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
>>>>>>> origin/main
      "userId": "user_123",
      "userPaperId": "user_paper_123",
      "blockId": "block_456",
      "content": [
        {
          "type": "text",
<<<<<<< HEAD
          "content": "这是我的笔记内容",
          "style": {
            "bold": true,
            "color": "#ff0000"
          }
        }
      ],
      "createdAt": "2025-10-30T15:00:00Z",
      "updatedAt": "2025-10-30T15:00:00Z"
    }
  }
}
```

---

### 10.2 获取论文的所有笔记

**接口**: `GET /api/notes/paper/{user_paper_id}`
**权限**: 🔒 需要登录

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| user_paper_id | string | 是 | 个人论文ID |

**查询参数**:
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | integer | 否 | 1 | 页码 |
| pageSize | integer | 否 | 50 | 每页数量 |

**响应示例**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "code": 0,
    "message": "获取笔记列表成功",
    "data": {
      "notes": [
        {
          "id": "note_1",
          "userId": "user_123",
          "userPaperId": "user_paper_123",
          "blockId": "block_456",
          "content": [...],
          "createdAt": "2025-10-30T15:00:00Z",
          "updatedAt": "2025-10-30T15:00:00Z"
        }
      ],
      "pagination": {
        "page": 1,
        "pageSize": 50,
        "total": 10,
        "totalPages": 1
      }
    }
=======
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
>>>>>>> origin/main
  }
}
```

<<<<<<< HEAD
---

### 10.3 获取某个 Block 的笔记

**接口**: `GET /api/notes/paper/{user_paper_id}/block/{block_id}`  
**权限**: 🔒 需要登录

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| user_paper_id | string | 是 | 个人论文ID |
| block_id | string | 是 | Block ID |

**响应示例**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "code": 0,
    "message": "获取 block 笔记成功",
    "data": {
      "notes": [
        {
          "id": "note_1",
          "blockId": "block_456",
          "content": [...],
          "createdAt": "2025-10-30T15:00:00Z"
        }
      ]
    }
  }
}
```

---

### 10.4 获取用户所有笔记

**接口**: `GET /api/notes/user`
**权限**: 🔒 需要登录

**查询参数**:
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | integer | 否 | 1 | 页码 |
| pageSize | integer | 否 | 50 | 每页数量 |

**响应示例**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "code": 0,
    "message": "获取用户笔记成功",
    "data": {
      "notes": [...],
      "pagination": {...}
    }
=======
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
>>>>>>> origin/main
  }
}
```

<<<<<<< HEAD
---

### 10.5 搜索笔记

**接口**: `GET /api/notes/search`  
**权限**: 🔒 需要登录

**查询参数**:
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| keyword | string | 是 | - | 搜索关键词 |
| page | integer | 否 | 1 | 页码 |
| pageSize | integer | 否 | 50 | 每页数量 |

**响应示例**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "code": 0,
    "message": "搜索笔记成功",
    "data": {
      "notes": [
        {
          "id": "note_1",
          "userPaperId": "user_paper_123",
          "blockId": "block_456",
          "content": [
            {
              "type": "text",
              "content": "包含关键词的笔记内容"
            }
          ],
          "createdAt": "2025-10-30T15:00:00Z"
        }
      ],
      "pagination": {...}
    }
  }
}
```

---

### 10.6 更新笔记

**接口**: `PUT /api/notes/{note_id}`
**权限**: 🔒 需要登录

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| note_id | string | 是 | 笔记ID |
=======
### 更新笔记

**接口**: `PUT /api/v1/notes/<note_id>`

**认证**: 需要登录
>>>>>>> origin/main

**请求体**:
```json
{
  "content": [
    {
      "type": "text",
      "content": "更新后的笔记内容",
<<<<<<< HEAD
      "style": {
        "bold": true,
        "italic": true
      }
    }
  ]
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "code": 0,
    "message": "笔记更新成功",
    "data": {
      "id": "note_789",
      "content": [
        {
          "type": "text",
          "content": "更新后的笔记内容",
          "style": {
            "bold": true,
            "italic": true
          }
        }
      ],
      "updatedAt": "2025-10-30T16:00:00Z"
    }
=======
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
>>>>>>> origin/main
  }
}
```

<<<<<<< HEAD
---

### 10.7 删除笔记

**接口**: `DELETE /api/notes/{note_id}`  
**权限**: 🔒 需要登录

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| note_id | string | 是 | 笔记ID |

**响应示例**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "code": 0,
    "message": "笔记删除成功",
=======
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
>>>>>>> origin/main
    "data": null
  }
}
```

<<<<<<< HEAD
---

### 10.8 批量删除论文笔记

**接口**: `DELETE /api/notes/paper/{user_paper_id}`
**权限**: 🔒 需要登录

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| user_paper_id | string | 是 | 个人论文ID |

**响应示例**:
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "code": 0,
    "message": "已删除 5 条笔记",
    "data": {
      "deletedCount": 5
    }
  }
}
```

---

## 11. 错误码说明

### 8.1 HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权（未登录或 Token 无效） |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 409 | 资源冲突 |
| 500 | 服务器内部错误 |

### 8.2 业务状态码

| 业务码 | 说明 |
|--------|------|
| 0 | 业务成功 |
| 1001 | 登录失败 |
| 1004 | 参数错误 |
| 1005 | 用户不存在 |
| 1006 | 用户已存在 |
| 1007 | 权限不足 |
| 1008 | Token无效 |
| 1009 | Token已过期 |
| 1998 | 未知错误 |
| 1999 | 服务器内部错误 |
| 2001 | 论文不存在 |
| 2002 | 论文创建失败 |
| 2003 | 论文更新失败 |
| 2004 | 论文删除失败 |
| 2005 | 论文数据无效 |
| 3001 | 笔记不存在 |
| 3002 | 笔记创建失败 |
| 3003 | 笔记更新失败 |
| 3004 | 笔记删除失败 |

---

## 12. 数据模型示例

### 9.1 InlineContent 类型

```typescript
// 文本节点
{
  "type": "text",
  "content": "这是文本内容",
  "style": {
    "bold": true,
    "italic": false,
    "underline": false,
    "color": "#000000"
  }
}

// 链接节点
{
  "type": "link",
  "url": "https://example.com",
  "children": [
    {"type": "text", "content": "链接文字"}
  ],
  "title": "鼠标悬停提示"
}

// 行内数学公式
{
  "type": "inline-math",
  "latex": "E = mc^2"
}

// 引用节点
{
  "type": "citation",
  "referenceIds": ["ref_1", "ref_2"],
  "displayText": "[1, 2]"
}

// 图片引用
{
  "type": "figure-ref",
  "figureId": "fig_1",
  "displayText": "Figure 1"
}
```

### 9.2 BlockContent 类型

```typescript
// 段落
{
  "id": "block_1",
  "type": "paragraph",
  "content": {
    "en": [InlineContent[]],
    "zh": [InlineContent[]]
  },
  "align": "left"
}

// 标题
{
  "id": "block_2",
  "type": "heading",
  "level": 2,
  "content": {
    "en": [InlineContent[]]
  },
  "number": "2.1"
}

// 数学公式块
{
  "id": "block_3",
  "type": "math",
  "latex": "\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}",
  "label": "eq:gaussian",
  "number": 1
}

// 图片
{
  "id": "block_4",
  "type": "figure",
  "src": "https://cdn.example.com/images/fig1.png",
  "number": 1,
  "caption": {
    "en": [InlineContent[]]
  },
  "width": "80%"
}

// 代码块
{
  "id": "block_5",
  "type": "code",
  "language": "python",
  "code": "def hello():\n    print('Hello World')",
  "showLineNumbers": true
}
```

---

## 13. 使用示例

### 10.1 完整流程示例

#### 场景：用户从公共论文库添加论文并添加笔记

```bash
# 1. 浏览公共论文库
GET /api/public/papers?search=深度学习&page=1&pageSize=20

# 2. 查看论文详情
GET /api/public/papers/public/paper_123

# 3. 添加到个人论文库
POST /api/user/papers
{
  "paperId": "paper_123",
  "extra": {
    "customTags": ["深度学习", "重要"],
    "priority": "high"
  }
}

# 4. 在个人论文库中查看
GET /api/user/papers/user_paper_456

# 5. 为某个段落添加笔记
POST /api/notes
{
  "userPaperId": "user_paper_456",
  "blockId": "block_789",
  "content": [
    {
      "type": "text",
      "content": "这段很重要，需要重点关注",
      "style": {"bold": true, "color": "#ff0000"}
    }
  ]
}

# 6. 修改论文内容（在个人库中）
PUT /api/user/papers/user_paper_456
{
  "paperData": {
    "sections": [
      {
        "id": "section_1",
        "content": [
          {
            "id": "block_789",
            "type": "paragraph",
            "content": {
              "zh": [
                {
                  "type": "text",
                  "content": "我修改后的内容"
                }
              ]
            }
          }
        ]
      }
    ]
  }
}
```

---

## 14. 注意事项

### 11.1 性能优化建议
- 使用分页查询，避免一次性加载大量数据
- 搜索功能使用关键词，保持简洁
- 论文内容较大时，先获取列表（只包含 metadata），再按需获取详情

### 11.2 安全建议
- 所有需要登录的接口必须携带有效 Token
- Token 过期后需要重新登录
- 不要在 URL 中传递敏感信息

### 11.3 最佳实践
- 个人论文的修改不会影响公共论文库
- 删除个人论文会级联删除所有关联的笔记
- 笔记内容使用 InlineContent[] 格式，支持富文本
- 建议先在本地测试完整流程后再部署

---
=======
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
>>>>>>> origin/main
