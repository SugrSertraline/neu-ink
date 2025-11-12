from neuink import create_app
import sys
import os
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / "apps" / "api"))

# 解决Windows下Python输出缓冲问题
if sys.platform == "win32":
    # 设置环境变量PYTHONUNBUFFERED=1，禁用Python输出缓冲
    os.environ['PYTHONUNBUFFERED'] = '1'

app = create_app()

if __name__ == "__main__":
    # 本地开发启动
    # 在Windows环境下添加额外的参数确保输出不被缓冲
    if sys.platform == "win32":
        app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)
    else:
        app.run(host="0.0.0.0", port=5000, debug=True)
