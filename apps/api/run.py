from neuink import create_app
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / "apps" / "api"))

app = create_app()

if __name__ == "__main__":
    # 本地开发启动
    app.run(host="0.0.0.0", port=5000, debug=True)
