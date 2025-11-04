#!/usr/bin/env python3
import json
from pathlib import Path

from markdownParserService import get_markdown_parser_service



# 这里填入你的 Markdown 文件路径与补充元数据
SCRIPT_DIR = Path(__file__).parent
MARKDOWN_PATH = SCRIPT_DIR / "testmd.md"
EXTRA_METADATA = {
    "title": "硬编码示例标题",
    "year": 2024,
    "authors": "Alice Zhang, Bob Li"
}


def main() -> None:
    if not MARKDOWN_PATH.is_file():
        raise FileNotFoundError(f"Markdown file not found: {MARKDOWN_PATH}")

    service = get_markdown_parser_service()
    markdown_text = MARKDOWN_PATH.read_text(encoding="utf-8")
    result = service.parse_markdown_file(markdown_text, metadata=EXTRA_METADATA)

    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
