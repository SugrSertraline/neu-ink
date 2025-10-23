"""
测试数据生成脚本
生成Paper测试数据并插入数据库
"""
import os
import sys
from datetime import datetime, timedelta, timezone
import uuid
from dotenv import load_dotenv, find_dotenv
from pymongo import MongoClient

dotenv_path = find_dotenv(usecwd=True) or find_dotenv()
if dotenv_path:
    load_dotenv(dotenv_path, override=False)
    print(f"[env] Loaded .env from: {dotenv_path}")
else:
    print("[env] No .env found; using OS env/defaults")
def _env(key, *aliases, default=None):
    """读取环境变量（带 strip），兼容多种键名"""
    for k in (key, *aliases):
        v = os.getenv(k)
        if v is not None:
            return v.strip()
    return default
# ② 添加项目路径（你的写法保留）
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# ③ 复用后端的连接（关键）
from neuink.services.db import get_db
from neuink.config.constants import Collections

def generate_id():
    """生成唯一ID"""
    return str(uuid.uuid4())
def _coll_name(c):
    """兼容 Enum 或 纯字符串常量"""
    return getattr(c, "value", c)
def _db_name_from_uri(uri: str):
    """从 Mongo URI 的 path 中解析库名，如 .../NeuInk?xxx -> NeuInk"""
    try:
        p = urlparse(uri)
        if p.path and p.path != "/":
            return p.path.lstrip("/")
    except Exception:
        pass
    return None
def get_test_papers():
    """生成测试论文数据"""
    
    # 假设admin用户的ID（需要根据实际情况调整）
    admin_id = "admin-user-id"
    
    papers = []
    
    # ========== 论文1: 深度学习综述（包含各种Block类型） ==========
    papers.append({
        "id": generate_id(),
        "isPublic": True,
        "createdBy": admin_id,
        "metadata": {
            "title": "Deep Learning: A Comprehensive Survey",
            "titleZh": "深度学习：综合综述",
            "authors": [
                {
                    "name": "Yann LeCun",
                    "affiliation": "New York University",
                    "email": "yann@lecun.com"
                },
                {
                    "name": "Yoshua Bengio",
                    "affiliation": "University of Montreal"
                },
                {
                    "name": "Geoffrey Hinton",
                    "affiliation": "University of Toronto"
                }
            ],
            "publication": "Nature",
            "year": 2024,
            "date": "2024-05-15",
            "doi": "10.1038/nature12345",
            "articleType": "journal",
            "sciQuartile": "Q1",
            "casQuartile": "1区",
            "impactFactor": 49.962,
            "tags": ["deep learning", "neural networks", "AI"]
        },
        "abstract": {
            "en": "Deep learning has revolutionized artificial intelligence by enabling machines to learn from vast amounts of data. This comprehensive survey covers the fundamental concepts, architectures, and applications of deep learning.",
            "zh": "深度学习通过使机器能够从大量数据中学习,彻底改变了人工智能。这篇综合综述涵盖了深度学习的基本概念、架构和应用。"
        },
        "keywords": ["deep learning", "neural networks", "convolutional networks", "recurrent networks", "transformers"],
        "sections": [
            {
                "id": "sec-1",
                "number": "1",
                "title": {
                    "en": "Introduction",
                    "zh": "引言"
                },
                "content": [
                    {
                        "id": generate_id(),
                        "type": "paragraph",
                        "content": {
                            "en": [
                                {
                                    "type": "text",
                                    "content": "Deep learning has emerged as one of the most ",
                                    "style": {}
                                },
                                {
                                    "type": "text",
                                    "content": "transformative technologies",
                                    "style": {"bold": True}
                                },
                                {
                                    "type": "text",
                                    "content": " of the 21st century. As shown in ",
                                    "style": {}
                                },
                                {
                                    "type": "figure-ref",
                                    "figureId": "fig-1",
                                    "displayText": "Figure 1"
                                },
                                {
                                    "type": "text",
                                    "content": ", the field has experienced exponential growth.",
                                    "style": {}
                                }
                            ],
                            "zh": [
                                {
                                    "type": "text",
                                    "content": "深度学习已成为21世纪最具",
                                    "style": {}
                                },
                                {
                                    "type": "text",
                                    "content": "变革性的技术",
                                    "style": {"bold": True}
                                },
                                {
                                    "type": "text",
                                    "content": "之一。如",
                                    "style": {}
                                },
                                {
                                    "type": "figure-ref",
                                    "figureId": "fig-1",
                                    "displayText": "图1"
                                },
                                {
                                    "type": "text",
                                    "content": "所示,该领域经历了指数级增长。",
                                    "style": {}
                                }
                            ]
                        }
                    },
                    {
                        "id": "fig-1",
                        "type": "figure",
                        "src": "/images/dl-growth.png",
                        "number": 1,
                        "caption": {
                            "en": [
                                {
                                    "type": "text",
                                    "content": "Growth of deep learning publications over time",
                                    "style": {}
                                }
                            ],
                            "zh": [
                                {
                                    "type": "text",
                                    "content": "深度学习论文随时间的增长趋势",
                                    "style": {}
                                }
                            ]
                        },
                        "width": "600px",
                        "height": "400px"
                    }
                ]
            },
            {
                "id": "sec-2",
                "number": "2",
                "title": {
                    "en": "Neural Network Fundamentals",
                    "zh": "神经网络基础"
                },
                "content": [
                    {
                        "id": generate_id(),
                        "type": "heading",
                        "level": 3,
                        "content": {
                            "en": [{"type": "text", "content": "Basic Architecture", "style": {}}],
                            "zh": [{"type": "text", "content": "基本架构", "style": {}}]
                        }
                    },
                    {
                        "id": generate_id(),
                        "type": "paragraph",
                        "content": {
                            "en": [
                                {
                                    "type": "text",
                                    "content": "A neural network consists of interconnected layers. The forward propagation is defined by ",
                                    "style": {}
                                },
                                {
                                    "type": "inline-math",
                                    "latex": "y = f(Wx + b)"
                                },
                                {
                                    "type": "text",
                                    "content": " where ",
                                    "style": {}
                                },
                                {
                                    "type": "inline-math",
                                    "latex": "W"
                                },
                                {
                                    "type": "text",
                                    "content": " is the weight matrix.",
                                    "style": {}
                                }
                            ]
                        }
                    },
                    {
                        "id": "eq-1",
                        "type": "math",
                        "latex": "\\frac{\\partial L}{\\partial W} = \\frac{\\partial L}{\\partial y} \\cdot \\frac{\\partial y}{\\partial W}",
                        "label": "Backpropagation",
                        "number": 1
                    },
                    {
                        "id": generate_id(),
                        "type": "paragraph",
                        "content": {
                            "en": [
                                {
                                    "type": "text",
                                    "content": "The backpropagation algorithm, described in ",
                                    "style": {}
                                },
                                {
                                    "type": "equation-ref",
                                    "equationId": "eq-1",
                                    "displayText": "Equation 1"
                                },
                                {
                                    "type": "text",
                                    "content": ", enables efficient gradient computation",
                                    "style": {}
                                },
                                {
                                    "type": "citation",
                                    "referenceIds": ["ref-1", "ref-2"],
                                    "displayText": "[1, 2]"
                                },
                                {
                                    "type": "text",
                                    "content": ".",
                                    "style": {}
                                }
                            ]
                        }
                    },
                    {
                        "id": generate_id(),
                        "type": "code",
                        "language": "python",
                        "code": "import torch\nimport torch.nn as nn\n\nclass SimpleNet(nn.Module):\n    def __init__(self):\n        super().__init__()\n        self.fc1 = nn.Linear(784, 128)\n        self.fc2 = nn.Linear(128, 10)\n    \n    def forward(self, x):\n        x = torch.relu(self.fc1(x))\n        x = self.fc2(x)\n        return x",
                        "caption": {
                            "en": [{"type": "text", "content": "Simple neural network implementation in PyTorch", "style": {}}]
                        },
                        "showLineNumbers": True
                    }
                ]
            },
            {
                "id": "sec-3",
                "number": "3",
                "title": {
                    "en": "Experimental Results",
                    "zh": "实验结果"
                },
                "content": [
                    {
                        "id": generate_id(),
                        "type": "paragraph",
                        "content": {
                            "en": [
                                {
                                    "type": "text",
                                    "content": "We evaluated our model on multiple datasets. The results are summarized in ",
                                    "style": {}
                                },
                                {
                                    "type": "table-ref",
                                    "tableId": "tab-1",
                                    "displayText": "Table 1"
                                },
                                {
                                    "type": "text",
                                    "content": ".",
                                    "style": {}
                                }
                            ]
                        }
                    },
                    {
                        "id": "tab-1",
                        "type": "table",
                        "number": 1,
                        "caption": {
                            "en": [{"type": "text", "content": "Performance comparison on benchmark datasets", "style": {}}],
                            "zh": [{"type": "text", "content": "基准数据集上的性能比较", "style": {}}]
                        },
                        "headers": ["Model", "MNIST", "CIFAR-10", "ImageNet"],
                        "rows": [
                            ["LeNet", "98.5%", "65.2%", "-"],
                            ["AlexNet", "99.1%", "82.3%", "57.1%"],
                            ["ResNet-50", "99.6%", "95.2%", "76.5%"],
                            ["Our Model", {"en": "99.8%", "zh": "99.8%"}, {"en": "96.1%", "zh": "96.1%"}, {"en": "78.2%", "zh": "78.2%"}]
                        ],
                        "align": ["left", "center", "center", "center"]
                    },
                    {
                        "id": generate_id(),
                        "type": "unordered-list",
                        "items": [
                            {
                                "content": {
                                    "en": [{"type": "text", "content": "Achieved state-of-the-art performance on MNIST", "style": {}}]
                                }
                            },
                            {
                                "content": {
                                    "en": [{"type": "text", "content": "Competitive results on CIFAR-10", "style": {}}]
                                }
                            },
                            {
                                "content": {
                                    "en": [{"type": "text", "content": "Improved ImageNet accuracy by 1.7%", "style": {}}]
                                }
                            }
                        ]
                    },
                    {
                        "id": generate_id(),
                        "type": "quote",
                        "content": {
                            "en": [
                                {
                                    "type": "text",
                                    "content": "The key to success in deep learning is not just the architecture, but also the training strategy.",
                                    "style": {"italic": True}
                                }
                            ]
                        },
                        "author": "Andrew Ng"
                    }
                ]
            }
        ],
        "references": [
            {
                "id": "ref-1",
                "number": 1,
                "authors": ["Rumelhart", "Hinton", "Williams"],
                "title": "Learning representations by back-propagating errors",
                "publication": "Nature",
                "year": 1986,
                "volume": "323",
                "pages": "533-536"
            },
            {
                "id": "ref-2",
                "number": 2,
                "authors": ["LeCun", "Bengio", "Hinton"],
                "title": "Deep learning",
                "publication": "Nature",
                "year": 2015,
                "doi": "10.1038/nature14539"
            }
        ],
        "attachments": {
            "pdf": "/papers/deep-learning-survey.pdf",
            "markdown": "/papers/deep-learning-survey.md"
        },
        "parseStatus": {
            "status": "completed",
            "progress": 100,
            "message": "论文解析完成"
        },
        "createdAt": datetime.now(timezone.utc) - timedelta(days=30),
        "updatedAt": datetime.now(timezone.utc) - timedelta(days=5)
    })
    
    # ========== 论文2: Transformer架构 ==========
    papers.append({
        "id": generate_id(),
        "isPublic": True,
        "createdBy": admin_id,
        "metadata": {
            "title": "Attention Is All You Need",
            "titleZh": "注意力机制就是全部",
            "authors": [
                {"name": "Ashish Vaswani", "affiliation": "Google Brain"},
                {"name": "Noam Shazeer", "affiliation": "Google Brain"}
            ],
            "publication": "NeurIPS",
            "year": 2023,
            "articleType": "conference",
            "ccfRank": "A",
            "tags": ["transformer", "attention", "NLP"]
        },
        "abstract": {
            "en": "We propose a new architecture based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.",
            "zh": "我们提出了一种完全基于注意力机制的新架构,完全摒弃了循环和卷积。"
        },
        "keywords": ["transformer", "self-attention", "neural machine translation"],
        "sections": [
            {
                "id": "sec-1",
                "number": "1",
                "title": {"en": "Introduction", "zh": "引言"},
                "content": [
                    {
                        "id": generate_id(),
                        "type": "paragraph",
                        "content": {
                            "en": [
                                {"type": "text", "content": "Recurrent neural networks have been the dominant approach for sequence modeling. However, they suffer from ", "style": {}},
                                {"type": "text", "content": "sequential computation", "style": {"italic": True}},
                                {"type": "text", "content": " limitations.", "style": {}}
                            ]
                        }
                    },
                    {
                        "id": generate_id(),
                        "type": "ordered-list",
                        "items": [
                            {"content": {"en": [{"type": "text", "content": "Cannot be parallelized effectively", "style": {}}]}},
                            {"content": {"en": [{"type": "text", "content": "Difficult to capture long-range dependencies", "style": {}}]}},
                            {"content": {"en": [{"type": "text", "content": "Slow training on modern hardware", "style": {}}]}}
                        ],
                        "start": 1
                    }
                ]
            },
            {
                "id": "sec-2",
                "number": "2",
                "title": {"en": "Model Architecture", "zh": "模型架构"},
                "content": [
                    {
                        "id": "eq-2",
                        "type": "math",
                        "latex": "\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V",
                        "label": "Scaled Dot-Product Attention",
                        "number": 1
                    },
                    {
                        "id": generate_id(),
                        "type": "divider"
                    }
                ]
            }
        ],
        "references": [
            {
                "id": "ref-1",
                "number": 1,
                "authors": ["Bahdanau", "Cho", "Bengio"],
                "title": "Neural machine translation by jointly learning to align and translate",
                "publication": "ICLR",
                "year": 2015
            }
        ],
        "attachments": {
            "pdf": "/papers/transformer.pdf"
        },
        "parseStatus": {
            "status": "completed",
            "progress": 100,
            "message": "论文解析完成"
        },
        "createdAt": datetime.now(timezone.utc) - timedelta(days=20),
        "updatedAt": datetime.now(timezone.utc) - timedelta(days=3)
    })
    
    # ========== 论文3: 计算机视觉应用 ==========
    papers.append({
        "id": generate_id(),
        "isPublic": True,
        "createdBy": admin_id,
        "metadata": {
            "title": "Object Detection with Deep Neural Networks",
            "titleZh": "基于深度神经网络的目标检测",
            "shortTitle": "Deep Object Detection",
            "authors": [
                {"name": "Ross Girshick", "affiliation": "Facebook AI Research", "email": "ross@fb.com"}
            ],
            "publication": "IEEE CVPR",
            "year": 2024,
            "articleType": "conference",
            "ccfRank": "A",
            "tags": ["computer vision", "object detection", "RCNN"]
        },
        "abstract": {
            "en": "This paper presents a novel approach for object detection using region-based convolutional neural networks.",
            "zh": "本文提出了一种使用基于区域的卷积神经网络进行目标检测的新方法。"
        },
        "keywords": ["object detection", "RCNN", "computer vision"],
        "sections": [
            {
                "id": "sec-1",
                "title": {"en": "Method", "zh": "方法"},
                "content": [
                    {
                        "id": generate_id(),
                        "type": "paragraph",
                        "content": {
                            "en": [
                                {"type": "text", "content": "Our method consists of ", "style": {}},
                                {"type": "text", "content": "three main steps", "style": {"bold": True}},
                                {"type": "text", "content": ":", "style": {}}
                            ]
                        }
                    },
                    {
                        "id": "fig-method",
                        "type": "figure",
                        "src": "/images/detection-pipeline.png",
                        "number": 1,
                        "caption": {
                            "en": [{"type": "text", "content": "Object detection pipeline overview", "style": {}}],
                            "zh": [{"type": "text", "content": "目标检测流程概览", "style": {}}]
                        },
                        "description": {
                            "en": [{"type": "text", "content": "The pipeline consists of region proposal, feature extraction, and classification stages.", "style": {}}]
                        }
                    }
                ]
            }
        ],
        "references": [],
        "attachments": {},
        "parseStatus": {
            "status": "completed",
            "progress": 100,
            "message": "论文解析完成"
        },
        "createdAt": datetime.now(timezone.utc) - timedelta(days=15),
        "updatedAt": datetime.now(timezone.utc) - timedelta(days=2)
    })
    
    # ========== 论文4: 强化学习（包含脚注） ==========
    papers.append({
        "id": generate_id(),
        "isPublic": True,
        "createdBy": admin_id,
        "metadata": {
            "title": "Reinforcement Learning: An Introduction",
            "titleZh": "强化学习导论",
            "authors": [
                {"name": "Richard Sutton", "affiliation": "University of Alberta"},
                {"name": "Andrew Barto", "affiliation": "University of Massachusetts"}
            ],
            "publication": "MIT Press",
            "year": 2023,
            "articleType": "book",
            "tags": ["reinforcement learning", "Q-learning", "policy gradient"]
        },
        "abstract": {
            "en": "A comprehensive introduction to reinforcement learning, covering fundamental algorithms and recent advances.",
            "zh": "强化学习的全面介绍,涵盖基本算法和最新进展。"
        },
        "keywords": ["reinforcement learning", "MDP", "Q-learning", "policy gradient"],
        "sections": [
            {
                "id": "sec-1",
                "title": {"en": "Markov Decision Process", "zh": "马尔可夫决策过程"},
                "content": [
                    {
                        "id": generate_id(),
                        "type": "paragraph",
                        "content": {
                            "en": [
                                {"type": "text", "content": "An MDP is defined by a tuple ", "style": {}},
                                {"type": "inline-math", "latex": "(S, A, P, R, \\gamma)"},
                                {"type": "footnote", "id": "fn-1", "content": "S represents the state space, A the action space", "displayText": "1"}
                            ]
                        }
                    },
                    {
                        "id": "eq-bellman",
                        "type": "math",
                        "latex": "V(s) = \\max_a \\left[ R(s,a) + \\gamma \\sum_{s'} P(s'|s,a) V(s') \\right]",
                        "label": "Bellman Equation",
                        "number": 1
                    },
                    {
                        "id": generate_id(),
                        "type": "code",
                        "language": "python",
                        "code": "def q_learning(env, episodes=1000, alpha=0.1, gamma=0.99):\n    Q = defaultdict(lambda: np.zeros(env.action_space.n))\n    \n    for episode in range(episodes):\n        state = env.reset()\n        done = False\n        \n        while not done:\n            action = epsilon_greedy(Q[state], epsilon)\n            next_state, reward, done, _ = env.step(action)\n            \n            # Q-learning update\n            Q[state][action] += alpha * (\n                reward + gamma * np.max(Q[next_state]) - Q[state][action]\n            )\n            \n            state = next_state\n    \n    return Q",
                        "caption": {"en": [{"type": "text", "content": "Q-learning algorithm implementation", "style": {}}]},
                        "showLineNumbers": True
                    }
                ]
            }
        ],
        "references": [
            {
                "id": "ref-watkins",
                "number": 1,
                "authors": ["Watkins", "Dayan"],
                "title": "Q-learning",
                "publication": "Machine Learning",
                "year": 1992,
                "volume": "8",
                "pages": "279-292"
            }
        ],
        "attachments": {
            "pdf": "/papers/rl-intro.pdf"
        },
        "parseStatus": {
            "status": "completed",
            "progress": 100,
            "message": "论文解析完成"
        },
        "createdAt": datetime.now(timezone.utc) - timedelta(days=10),
        "updatedAt": datetime.now(timezone.utc) - timedelta(days=1)
    })
    
    # ========== 论文5: 最新预印本（解析中状态） ==========
    papers.append({
        "id": generate_id(),
        "isPublic": True,
        "createdBy": admin_id,
        "metadata": {
            "title": "Large Language Models: Scaling Laws and Emergent Abilities",
            "titleZh": "大型语言模型：缩放定律与涌现能力",
            "authors": [
                {"name": "Jason Wei", "affiliation": "Google Research"},
                {"name": "Yi Tay", "affiliation": "Google Research"}
            ],
            "year": 2024,
            "date": "2024-10-01",
            "articleType": "preprint",
            "tags": ["LLM", "scaling laws", "emergent abilities", "GPT"]
        },
        "abstract": {
            "en": "We investigate the scaling behavior of large language models and identify several emergent abilities that appear only at sufficient scale.",
            "zh": "我们研究了大型语言模型的缩放行为,并识别出仅在足够规模下出现的几种涌现能力。"
        },
        "keywords": ["large language models", "scaling laws", "emergent abilities", "GPT", "transformer"],
        "sections": [
            {
                "id": "sec-intro",
                "title": {"en": "Introduction", "zh": "引言"},
                "content": [
                    {
                        "id": generate_id(),
                        "type": "paragraph",
                        "content": {
                            "en": [
                                {"type": "text", "content": "Recent advances in ", "style": {}},
                                {"type": "text", "content": "large language models (LLMs)", "style": {"bold": True}},
                                {"type": "text", "content": " have demonstrated remarkable capabilities across diverse tasks. Visit ", "style": {}},
                                {"type": "link", "url": "https://openai.com", "children": [{"type": "text", "content": "OpenAI", "style": {}}], "title": "OpenAI Website"},
                                {"type": "text", "content": " for more information.", "style": {}}
                            ]
                        }
                    },
                    {
                        "id": generate_id(),
                        "type": "quote",
                        "content": {
                            "en": [
                                {"type": "text", "content": "The emergence of new capabilities in large language models is one of the most exciting phenomena in modern AI research.", "style": {"italic": True}}
                            ]
                        }
                    }
                ]
            }
        ],
        "references": [],
        "attachments": {},
        "parseStatus": {
            "status": "parsing",
            "progress": 65,
            "message": "正在解析论文内容..."
        },
        "createdAt": datetime.now(timezone.utc) - timedelta(days=2),
        "updatedAt": datetime.now(timezone.utc)
    })
    
    return papers

def insert_test_data():
    """将测试数据插入数据库（基于 .env 的稳定直连版本）"""
    try:
        # 1) 加载 .env（如果你已在文件顶部 load 过，这里不会重复加载）
        try:
            from dotenv import find_dotenv, load_dotenv
            dotenv_path = find_dotenv(usecwd=True) or find_dotenv()
            if dotenv_path:
                load_dotenv(dotenv_path, override=False)
                print(f"[env] Loaded .env from: {dotenv_path}")
            else:
                print("[env] No .env found; using OS env/defaults")
        except Exception:
            # 没装 python-dotenv 也没关系
            pass

        # 2) 读取 URI 和 DB 名（兼容两种常见键名）
        mongo_uri = _env("MONGO_URI", "MONGODB_URI")
        db_name   = _env("MONGO_DB_NAME", "MONGODB_DB")

        if not mongo_uri:
            raise RuntimeError("MONGO_URI/MONGODB_URI 未设置（.env 或系统环境变量）。")

        # 3) 解析库名：优先 URI path，其次 MONGO_DB_NAME
        uri_db = _db_name_from_uri(mongo_uri)
        final_db_name = uri_db or db_name
        if not final_db_name:
            raise RuntimeError(
                "No default database name defined or provided.\n"
                "修复方式二选一：\n"
                "  A) 在 URI 里带上库名，例如：\n"
                "     mongodb+srv://<user>:<pass>@host/NeuInk?retryWrites=true&w=majority\n"
                "  B) 在 .env 里设置 MONGO_DB_NAME=NeuInk（或 MONGODB_DB）"
            )

        # 4) 建立连接与集合
        client = MongoClient(mongo_uri)
        db = client[final_db_name]
        coll_name = _coll_name(Collections.PAPER)
        paper_collection = db[coll_name]

        # 打印连接信息确认
        try:
            host, port = getattr(db.client, "address", ("(SRV)", ""))
            print(f"[DB] Writing to: {host}:{port}/{db.name}.{coll_name}")
        except Exception:
            print(f"[DB] Writing to: {db.name}.{coll_name}")

        # 5) 清空并插入
        print("清空现有论文数据...")
        paper_collection.delete_many({})

        papers = get_test_papers()

        # 统一时间 & _id & 常见过滤位
        for p in papers:
            for k in ("createdAt", "updatedAt"):
                dt = p.get(k)
                if isinstance(dt, datetime) and dt.tzinfo is None:
                    p[k] = dt.replace(tzinfo=timezone.utc)
            p["_id"] = p["id"]
            p.setdefault("isDeleted", False)

        print(f"插入 {len(papers)} 条测试论文数据...")
        result = paper_collection.insert_many(papers, ordered=True)
        print(f"✓ 成功插入 {len(result.inserted_ids)} 条论文数据")

        # 6) 自检
        count = paper_collection.count_documents({})
        print(f"✓ 当前集合文档数: {count}\n")

        print("插入的论文:")
        for paper in papers:
            status_emoji = "✓" if paper["parseStatus"]["status"] == "completed" else "⏳"
            print(f"{status_emoji} {paper['metadata']['title']}")
            print(f"   - 状态: {paper['parseStatus']['status']} ({paper['parseStatus']['progress']}%)")
            print(f"   - 作者: {', '.join([a['name'] for a in paper['metadata']['authors']])}")
            print(f"   - 年份: {paper['metadata'].get('year', 'N/A')}")
            print(f"   - 类型: {paper['metadata'].get('articleType', 'N/A')}\n")

        return True

    except Exception as e:
        print(f"✗ 插入数据失败: {e}")
        import traceback; traceback.print_exc()
        return False
if __name__ == "__main__":
    # 尝试优先用 app context（与后端完全一致）
    app = None
    try:
        from neuink.app import create_app
        app = create_app()
    except Exception:
        try:
            from neuink.app import app as _app
            app = _app
        except Exception:
            app = None

    if app:
        with app.app_context():
            ok = insert_test_data()
    else:
        # 没法创建 app，则在函数里会走 env 兜底
        ok = insert_test_data()

    if ok:
        print("\n" + "=" * 60)
        print("✓ 测试数据生成完成！")
        print("=" * 60)
        print("\n您现在可以:")
        print("1. 启动后端服务: python run.py")
        print("2. 测试API端点:")
        print("   - GET /api/papers - 获取论文列表")
        print("   - GET /api/papers/<id> - 获取论文详情")
        print("   - POST /api/papers - 创建论文（需要管理员权限）")
        print("   - PUT /api/papers/<id> - 更新论文（需要管理员权限）")
        print("   - DELETE /api/papers/<id> - 删除论文（需要管理员权限)")
    else:
        print("\n✗ 测试数据生成失败")
        sys.exit(1)
