# NeuInk 论文阅读器需求文档

## 项目概述
NeuInk 是一个论文阅读和笔记管理系统，允许用户管理个人论文库，支持上传 Markdown 格式的论文并转换为结构化数据进行保存、阅读和编辑。系统还提供一个论文市场，用户可以浏览和添加预处理的结构化论文数据到个人库中，进行阅读和笔记记录。

## 技术栈
- **后端**：Python + Flask
- **数据库**：MongoDB
- **前端**：Next.js（另立项目开发）
- **API**：RESTful API 支持前后端交互

## 主要功能需求

### 1. 用户账号系统
- **用户登录**：暂不开发注册功能，仅提供登录功能，管理员预先创建账号
- **用户个人资料管理**：
  - 头像（支持上传图片）
  - 昵称（可修改）
  - 其他基础信息（邮箱、创建时间等）
- **账号安全和权限控制**

### 2. 个人论文库管理
- **上传论文**：用户可以上传 Markdown 格式的论文文件
- **解析状态管理**：由于解析可能耗时较长，需要完善的状态管理
  - 上传中（uploading）
  - 解析中（parsing）
  - 解析完成（completed）
  - 解析失败（failed）
- **数据解析**：后端异步将上传的 Markdown 解析为结构化数据格式
- **数据保存**：将结构化数据存储在 MongoDB 中，支持快速检索
- **论文列表**：显示用户的所有论文，支持搜索和筛选
- **论文详情**：查看论文的结构化内容
- **编辑功能**：支持快速编辑论文内容和结构
- **PDF 链接管理**：支持关联 PDF 文件或链接

### 3. 笔记系统
- **块级笔记**：针对论文中特定块（段落、图表等）添加笔记
- **笔记管理**：查看、编辑、删除笔记，支持分类和搜索
- **笔记标签**：支持为笔记添加标签，便于分类管理

### 4. 论文市场
- **市场浏览**：展示预处理的结构化论文数据（已完成的论文）
- **添加至个人库**：用户可以将市场中的论文添加到自己的论文库
- **市场搜索**：支持按标题、作者、关键词等搜索论文
- **论文预览**：在添加前提供论文摘要或部分内容预览

### 5. 阅读和记录功能
- **阅读界面**：提供友好的阅读界面，支持结构化数据显示
- **阅读进度**：记录用户的阅读进度和位置
- **阅读时间统计**：记录总阅读时间和最后阅读时间
- **导出功能**：支持导出论文和笔记为 Markdown 或其他格式

## 数据模型设计

### 用户模型（User）
```javascript
{
  _id: ObjectId,
  用户名: string,
  密码哈希: string,
  昵称: string,
  头像路径: string?,
  邮箱: string?,
  创建时间: Date,
  更新时间: Date,
  最后登录时间: Date?
}
```

### 论文库模型（PaperLibrary）
全局唯一的论文库，存储所有论文的完整信息：
```javascript
{
  _id: ObjectId, // 论文库唯一ID
  标题: string,
  中文标题: string?, // 替代原来的短标题
  作者列表: Author[], // [{name, affiliation?, email?}]
  发表信息: {
    期刊会议名称: string?,
    年份: number?,
    发表日期: string?,
    DOI: string?,
    文章类型: 'journal'|'conference'|'preprint'|'book'|'thesis'?
  },
  质量评级: {
    SCI分区: '无'|'Q1'|'Q2'|'Q3'|'Q4'?,
    中科院分区: '无'|'1区'|'2区'|'3区'|'4区'?,
    CCF分级: '无'|'A'|'B'|'C'?,
    影响因子: number?
  },
  解析状态: {
    进度: number, // 0-100 的进度百分比
    描述: string, // 当前解析步骤的描述
    状态: 'pending'|'parsing'|'completed'|'failed'
  },
  PDF链接: string?,
  标签列表: string[],
  
  // 完整论文内容（与元数据合并）
  摘要: {en?: string, zh?: string}?,
  关键词: string[]?,
  章节列表: Section[],
  参考文献: Reference[],
  
  // 统计信息
  被添加次数: number, // 有多少用户添加了这篇论文
  总评分: number?, // 所有用户评分的平均值
  
  // 管理信息
  上传者: ObjectId?, // 首次上传的用户_id
  审核状态: 'pending'|'approved'|'rejected'?,
  
  创建时间: Date,
  更新时间: Date
}
```

### 用户论文关系模型（UserPaper）
用户与论文的个人化关系：
```javascript
{
  _id: ObjectId,
  用户: ObjectId, // 引用 User._id
  论文: ObjectId, // 引用 PaperLibrary._id
  
  // 用户个人状态
  用户状态: {
    阅读状态: 'unread'|'reading'|'finished',
    优先级: 'high'|'medium'|'low',
    推荐状态: 'recommend'|'not_recommend'|null, // 替代原来的评分
    备注: string?,
    阅读位置: string?, // 记录当前阅读到的 blockId
    总阅读时长: number?, // 秒
    最后阅读时间: Date?
  },
  
  // 个人标签（区别于论文全局标签）
  个人标签: string[],
  
  添加时间: Date,
  更新时间: Date
}
```

### 笔记模型（Note）
用户针对特定论文块的笔记：
```javascript
{
  _id: ObjectId,
  用户: ObjectId, // 引用 User._id
  论文: ObjectId, // 引用 PaperLibrary._id
  块ID: string, // 对应论文内容中的具体块
  笔记内容: string, // Markdown 格式
  标签列表: string[]?,
  创建时间: Date,
  更新时间: Date
}
```

### 论文评价模型（PaperReview）
用户对论文的详细评价（可选功能）：
```javascript
{
  _id: ObjectId,
  用户: ObjectId, // 引用 User._id
  论文: ObjectId, // 引用 PaperLibrary._id
  推荐状态: 'recommend'|'not_recommend',
  评价内容: string?, // 用户的文字评价
  评价标签: string[]?, // 如：['方法新颖', '实验充分', '写作清晰']
  是否公开: boolean, // 是否在论文市场显示
  创建时间: Date,
  更新时间: Date
}
```

## 上传解析流程设计

### 文件上传流程
1. 用户选择 Markdown 文件上传
2. 前端发送文件到后端，检查是否已存在相同论文（基于标题、DOI等）
3. 如果不存在，创建新的 PaperLibrary 记录，解析状态为 `{进度: 0, 描述: "等待解析", 状态: "pending"}`
4. 如果已存在，直接创建 UserPaper 关联记录
5. 后端异步开始解析过程，实时更新进度和描述
6. 解析完成后更新状态，并创建 UserPaper 关联记录
7. 前端可通过轮询或 WebSocket 获取解析进度

### 解析状态管理
- **pending**: `{进度: 0, 描述: "等待解析队列", 状态: "pending"}`
- **parsing**: `{进度: 20, 描述: "正在解析 Markdown 结构", 状态: "parsing"}`
- **parsing**: `{进度: 60, 描述: "正在提取图表和公式", 状态: "parsing"}`
- **parsing**: `{进度: 80, 描述: "正在生成结构化数据", 状态: "parsing"}`
- **completed**: `{进度: 100, 描述: "解析完成", 状态: "completed"}`
- **failed**: `{进度: 0, 描述: "解析失败：文件格式不支持", 状态: "failed"}`

## API 接口设计

### 用户相关接口
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/user/profile` - 获取用户信息
- `PUT /api/user/profile` - 更新用户信息
- `POST /api/user/avatar` - 上传用户头像

### 个人论文库相关接口
- `GET /api/user/papers` - 获取用户论文列表（返回 UserPaper + PaperLibrary 合并数据）
- `POST /api/papers/upload` - 上传论文文件
- `GET /api/papers/:libraryId` - 获取论文库详情
- `GET /api/papers/:libraryId/status` - 获取论文解析状态
- `PUT /api/user/papers/:userPaperId` - 更新用户论文状态
- `DELETE /api/user/papers/:userPaperId` - 从个人库移除论文
- `POST /api/user/papers/:userPaperId/recommend` - 设置推荐状态

### 笔记相关接口
- `GET /api/papers/:libraryId/notes` - 获取当前用户在该论文的笔记列表
- `POST /api/papers/:libraryId/notes` - 创建笔记
- `PUT /api/notes/:id` - 更新笔记
- `DELETE /api/notes/:id` - 删除笔记

### 论文市场相关接口
- `GET /api/market/papers` - 获取市场论文列表（PaperLibrary 中状态为 completed 的）
- `GET /api/market/papers/:id` - 获取市场论文详情
- `POST /api/market/papers/:id/add` - 将市场论文添加到个人库（创建 UserPaper）
- `GET /api/market/papers/:id/reviews` - 获取论文的公开评价
- `POST /api/market/papers/:id/reviews` - 发表论文评价

## 非功能需求
- **性能**：支持大量论文和笔记的高效加载和搜索
- **安全性**：数据加密存储，用户隐私保护
- **可扩展性**：MongoDB 的灵活性支持未来字段扩展
- **用户体验**：异步处理和状态反馈，确保良好的上传体验

## 设计优势

### 数据分离的优势
1. **避免重复存储**：相同论文只存储一份，节省存储空间
2. **数据一致性**：论文内容更新时，所有用户都能获得最新版本
3. **个性化管理**：每个用户可以有自己的阅读状态、笔记和标签
4. **统计分析**：可以统计论文被多少用户添加、平均评分等

### 扩展性考虑
1. **MongoDB 灵活性**：可以随时添加新字段，无需修改表结构
2. **微服务化潜力**：不同模型可以独立扩展和优化
3. **缓存友好**：热门论文可以缓存，提高访问速度

## 开发阶段

### 第一阶段：基础功能
1. 用户登录系统
2. 论文上传和基础解析
3. PaperLibrary 和 UserPaper 模型实现
4. 论文列表和详情页面
5. 基础的笔记功能

### 第二阶段：完善功能
1. 论文市场功能
2. 高级搜索和筛选
3. 解析状态优化
4. 笔记系统完善
5. 推荐状态和评价系统

### 第三阶段：优化和扩展
1. 性能优化
2. 用户体验优化
3. 统计分析功能
4. 额外功能开发

此文档将作为后续开发的基础，随着项目进展将持续更新和完善。