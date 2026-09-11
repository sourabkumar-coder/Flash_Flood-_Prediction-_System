import os
from pathlib import Path

def load_env(dotenv_path=None):
    """Load environment variables from .env file with or without python-dotenv."""
    try:
        from dotenv import load_dotenv as _load_dotenv
        _load_dotenv(dotenv_path)
        return
    except ImportError:
        pass

    if dotenv_path is None:
        candidates = [
            Path.cwd() / ".env",
            Path(__file__).resolve().parent / ".env",
            Path(__file__).resolve().parent.parent / ".env",
        ]
        for candidate in candidates:
            if candidate.exists() and candidate.is_file():
                dotenv_path = candidate
                break

    if not dotenv_path:
        return

    path = Path(dotenv_path)
    if not path.exists() or not path.is_file():
        return

    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip("'\"")
                if key and key not in os.environ:
                    os.environ[key] = val
    except Exception:
        pass
