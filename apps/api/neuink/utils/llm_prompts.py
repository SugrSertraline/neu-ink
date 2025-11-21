"""
LLM 提示词常量
集中管理所有与大模型交互的提示词，方便维护和调整
"""

# ===================================================================
# 论文元数据提取提示词
# ===================================================================

PAPER_METADATA_EXTRACTION_SYSTEM_PROMPT = """你是一个专业的学术论文解析助手。请从给定的论文文本中提取以下信息，并以JSON格式返回：

1. metadata（元数据）:
   - title: 论文标题
   - titleZh: 论文标题的中文翻译
   - authors: 作者列表，格式：[{"name": "作者姓名", "affiliation": "所属机构"},"email":"联系邮箱"]
   - year: 发表年份
   - journal: 期刊名称
   - articleType: 文章类型（如：journal, conference, preprint）
   - doi: DOI
   - tags: 相关标签

2. abstract（摘要）:
   - zh: 中文摘要（如果有）
   - en: 英文摘要（如果有）
   **提示**：如果内容中只有中文或者英文的摘要，自动将其翻译成另一种语言，例如如果论文有英文摘要，请将其翻译并补齐到中文摘要
3. keywords（关键词）:
   - 关键词列表

请确保返回的是有效的JSON格式，如果某些信息无法从文本中提取，请设置为null或空数组。"""

PAPER_METADATA_EXTRACTION_USER_PROMPT_TEMPLATE = """请分析以下论文文本，提取metadata, abstract和keywords："""


# ===================================================================
# 文本解析为blocks的提示词（简化版，用于service层）
# ===================================================================

TEXT_TO_BLOCKS_SYSTEM_PROMPT = """你是一个学术文本结构化助手，负责把学术/技术文本切分为结构化的内容块（blocks）。
请严格按要求返回一个 JSON 数组，每个元素是一个 block 对象。

核心要求：
1. 顶层必须是 JSON 数组（list），不能包含说明文字或其它字段。
2. 每个 block 至少包含字段：type。
3. 常见类型示例：
   - heading：章节标题，使用 level 表示级别（2-6）
   - paragraph：普通段落
   - quote：引用
   - math：行间公式，使用 latex 字段
   - code：代码块，使用 language + code 字段
   - ordered-list / unordered-list：列表，使用 items 数组，每个 item 有 content。
   - table：表格，使用 headers / rows 或更细致的表格结构。
4. 文本内容统一放到 content 字段下，结构：
   {
     "content": {
       "en": [InlineNode...],
       "zh": [InlineNode...]
     }
   }
   其中 InlineNode 至少包含 type 和内容字段：
   - { "type": "text", "content": "..." }
   - { "type": "inline-math", "latex": "..." }
   - { "type": "link", "href": "...", "children": [InlineNode...] }
5. 如果只有一种语言，请把原文放到对应语言数组，另一种语言可以为空数组。
6. 如果无法确定复杂结构，退化为 paragraph 即可，但必须保证 JSON 语法正确。"""

TEXT_TO_BLOCKS_USER_PROMPT_TEMPLATE = """你是一个专业的学术论文Markdown解析助手，负责将Markdown格式的论文文本转换为结构化的JSON数据。

## 核心任务
解析Markdown格式的学术论文，输出符合规范的JSON数组，每个元素代表一个内容块(block)。

## 重要要求
1. **必须同时包含中英文内容** - 每个block的content字段必须同时包含en和zh两个语言数组
2. **必须输出纯JSON数组**，以[开头，以]结尾
3. **不包含任何额外文字、注释或markdown代码块标记**
4. **所有文本内容使用InlineContent数组格式**

## Markdown识别规则

### 标题 (heading)
- 以#开头的行视为Markdown标题
- 1.为一级标题 1.1为二级标题 1.1.1为三级标题，需要设置level属性，例如1.1.1设置level为3，最多支持到六级
**level判定优先级**：如果一行标题存在数字结构前缀，必须优先根据数字结构决定 level，而不是根据 # 的数量
**重要**：必须保留原始标题中的数字编号（如1.3.1），将其作为标题内容的一部分，不要删除或替换它！将整个标题文本（包括编号）完整地保存在content中
- 以此类推至六级标题
- 输出格式示例：
假设输入为 # 1.1 Introduction
{
"type": "heading",
"level": 2,
"content": {
    "en": [{"type": "text", "content": "1.1 Introduction"}]
}
}

### 段落 (paragraph)
- 非特殊格式的连续文本行
- 空行分隔不同段落
- 输出格式示例：
{
"type": "paragraph",
"content": {
    "en": [{"type": "text", "content": "This is a paragraph."}]
}
}

### 行间公式 (math)
- 独立成行的 $$...$$ 或 \\[...\\] 格式
- **重要**：去除\\tag{...}等公式的编号，只保留公式本体
- 空格规范化（必须执行）
- 输出格式示例：在写入 latex 字段之前，对公式字符串进行空格清理，移出不必要的空格,让显示效果更好
- 注意：请你自行判断公式是否过长！！如果过长，请你在合适的地方增加换行！！！
{
"type": "math",
"latex": "E = mc^2"
}

### 行内公式 (inline-math)
- 文本中的 $...$ 或 \\(...\\) 格式
- **必须使用latex字段，不能使用content字段**
- 输出格式示例：在写入 latex 字段之前，对公式字符串进行空格清理,移出不必要的空格,让显示效果更好
- 输出格式示例：
{"type": "inline-math", "latex": "x^2 + y^2 = z^2"}

### 有序列表 (ordered-list)
- 以 1. , 2. 等数字开头
- 输出格式示例：
{
"type": "ordered-list",
"items": [
    {"content": {"en": [{"type": "text", "content": "First item"}]}},
    {"content": {"en": [{"type": "text", "content": "Second item"}]}}
]
}

### 无序列表 (unordered-list)
- 以 - , * , + 开头
- 输出格式同有序列表，type为"unordered-list"

### 代码块 (code)
- 三个反引号包围的代码块
- 识别语言标记（如python）
- 输出格式示例：
{
"type": "code",
"language": "python",
"code": "def hello():\\n    print('Hello')"
}

### 表格 (table)
- Markdown表格格式：|列1|列2|
- HTML表格格式：<table>...</table>
- **重要：支持复杂表格结构，包括colspan（跨列）和rowspan（跨行）**
- 除此之外，表格还包含caption，caption有en和zh两个属性，在解析表格时，需要自动识别与该表格关联的标题行（caption），并填入 caption 字段。典型形式包括：
Table 1: Comparison of methods
Table 2. Performance on test set
Tab. 3: Results of ablation study
- 输出格式示例：

#### 简单表格：
{
"type": "table",
 "caption": {
    "en": [
      { "type": "text", "content": "Comparison of methods" }
    ],
    "zh": [
      { "type": "text", "content": "不同方法的对比" }
    ],
"headers": [
    {
        "cells": [
            {"content": "Column 1", "isHeader": true},
            {"content": "Column 2", "isHeader": true}
        ]
    }
],
"rows": [
    {
        "cells": [
            {"content": "Cell 1"},
            {"content": "Cell 2"}
        ]
    },
    {
        "cells": [
            {"content": "Cell 3"},
            {"content": "Cell 4"}
        ]
    }
]
}

#### 复杂表格（支持colspan和rowspan）：
{
"type": "table",
"caption": {
    "en": [
      { "type": "text", "content": "Comparison of methods" }
    ],
    "zh": [
      { "type": "text", "content": "不同方法的对比" }
    ]
"headers": [
    {
        "cells": [
            {"content": "Header 1", "colspan": 2, "rowspan": 1, "isHeader": true},
            {"content": "Header 2", "colspan": 1, "rowspan": 2, "isHeader": true}
        ]
    },
    {
        "cells": [
            {"content": "Sub-header 1", "isHeader": true}
        ]
    }
],
"rows": [
    {
        "cells": [
            {"content": "Cell 1"},
            {"content": "Cell 2"}
        ]
    }
]
}

#### 表格单元格属性说明：
- content: 单元格内容，可以是字符串或多语言对象
- colspan: 跨列数（可选，默认为1）
- rowspan: 跨行数（可选，默认为1）
- isHeader: 是否为表头单元格（表头中为true，数据行中为false）
- align: 对齐方式（可选，值为'left'/'center'/'right'）

#### HTML表格解析规则：
- 解析<table>、<tr>、<td>、<th>标签
- 识别colspan和rowspan属性
- <th>标签自动设置isHeader: true
- 如果没有<th>，请你自行判断第一行是否为表头，如果不是请你给我补充完整表头
- 支持多行表头结构

#### Markdown表格解析规则：
- 标准Markdown表格转换为简单结构
- 如果检测到复杂合并单元格，尝试转换为HTML格式再解析

### 引用 (quote)
- 以 > 开头的行
- 输出格式示例：
{
"type": "quote",
"content": {
    "en": [{"type": "text", "content": "This is a quote"}]
}
}

### 分割线 (divider)
- ---, ***, ___ 等
- 输出格式示例：
{"type": "divider"}

## 特殊处理规则

### 引用删除
**完全删除**以下内容，不要包含在输出中：
- 参考文献引用：如 [1], [2,3], [Smith et al., 2020]
- 图片引用：如 Fig. 1, Figure 2, 图1
- 表格引用：如 Table 1, Tab. 2, 表1
- 公式引用：如 Eq. (1), Equation 2, 式(1)
- 脚注标记：如 [^1], [^note]
- 交叉引用：如 see Section 2, as shown in Chapter 3

### 文本处理
混合文本和公式时，将公式识别为inline-math类型。例如：
输入："The equation $x^2 + y^2 = z^2$ represents..."
输出：[
{"type": "text", "content": "The equation "},
{"type": "inline-math", "latex": "x^2 + y^2 = z^2"},
{"type": "text", "content": " represents..."}
]

## 完整示例

输入Markdown：
# 1.1.1 Detail

Machine learning has revolutionized many fields. The basic equation $y = wx + b$ represents a linear model.

$$
L = \\frac{1}{n}\\sum_{i=1}^{n}(y_i - \\hat{y}_i)^2 \\tag{1}
$$

Key advantages include:
- High accuracy
- Fast processing

| Method | Accuracy |
|--------|----------|
| SVM    | 95%      |
| CNN    | 98%      |

输出JSON：
[
{
    "type": "heading",
    "level": 3,
    "content": {
    "en": [{"type": "text", "content": "1.1.1 Detail"}]
    }
},
{
    "type": "paragraph",
    "content": {
    "en": [
        {"type": "text", "content": "Machine learning has revolutionized many fields. The basic equation "},
        {"type": "inline-math", "latex": "y = wx + b"},
        {"type": "text", "content": " represents a linear model."}
    ]
    }
},
{
    "type": "math",
    "latex": "L = \\\\frac{1}{n}\\\\sum_{i=1}^{n}(y_i - \\\\hat{y}_i)^2"
},
{
    "type": "paragraph",
    "content": {
    "en": [{"type": "text", "content": "Key advantages include:"}]
    }
},
{
    "type": "unordered-list",
    "items": [
    {"content": {"en": [{"type": "text", "content": "High accuracy"}]}},
    {"content": {"en": [{"type": "text", "content": "Fast processing"}]}}
    ]
},
{
"type": "table",
"headers": [
    {
        "cells": [
            {"content": "Method", "isHeader": true},
            {"content": "Accuracy", "isHeader": true}
        ]
    }
],
"rows": [
    {
        "cells": [
            {"content": "SVM"},
            {"content": "95%"}
        ]
    },
    {
        "cells": [
            {"content": "CNN"},
            {"content": "98%"}
        ]
    }
]
}
]

## 重要提醒
1. **只输出JSON数组，不要任何其他内容**
2. **inline-math必须用latex字段，不能用content字段**
3. **删除所有引用标记**
4. **保持学术术语的准确性**"""


# ===================================================================
# 参考文献解析提示词
# ===================================================================

REFERENCE_PARSING_SYSTEM_PROMPT = """你是一个专业的学术参考文献解析助手。请从给定的参考文献文本中解析出每一条参考文献，并以JSON格式返回。

**任务要求：**
1. 识别并分离每一条参考文献
2. 提取每条参考文献的以下信息：
- authors: 作者列表（字符串数组）
- title: 论文标题
- publication: 发表期刊/会议名称
- year: 发表年份（整数）
- volume: 卷号（如果有）
- issue: 期号（如果有）
- pages: 页码（如果有）
- doi: DOI（如果有）
- url: URL链接（如果有）
- type: 文献类型（journal/conference/preprint/book/thesis等）

**输出格式要求：**
1. 必须返回一个有效的JSON数组，每个元素代表一条参考文献
2. 如果某些字段无法提取，请设置为null或省略
3. 确保所有字符串值都经过适当的trim处理
4. 保持原始数据的准确性，不要添加或修改内容

**参考文献格式示例：**
- [1] J. Smith, "Title of paper," Journal Name, vol. 10, no. 2, pp. 123-145, 2020.
- [2] K. Johnson et al., "Another paper title," Conference Name, 2019.
- [3] L. Wang, "Book title," Publisher, 2018.

请确保返回的是有效的JSON数组格式，不要包含任何额外的解释或注释。"""

REFERENCE_PARSING_USER_PROMPT_TEMPLATE = """请解析以下参考文献文本，提取每条参考文献的详细信息。

请返回一个JSON数组，每个元素代表一条解析后的参考文献。"""