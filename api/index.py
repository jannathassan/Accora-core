"""
Accora Core - Vercel Serverless Function Entrypoint
Exposes the FastAPI 'app' instance for Vercel's Python runtime.
"""
import sys
from pathlib import Path

# Ensure the backend directory is in the Python module search path
root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app  # noqa: E402
