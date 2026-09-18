"""Halloween Quiz Main Entrypoint.

Exposes ASGI 'app' for Gunicorn / Uvicorn production container deployments.
Supports direct execution via 'python run.py' for web mode or 'python run.py --cli' for terminal mode.
"""

import os
import sys

from halloween_quiz.web.app import app, create_app

__all__ = ["app", "create_app"]

if __name__ == "__main__":
    # If invoked with --cli flag, launch the rich terminal game
    if len(sys.argv) > 1 and sys.argv[1] in ("--cli", "-c", "cli"):
        from halloween_quiz.cli.main import cli

        # Forward any remaining arguments
        sys.argv.pop(1)
        cli()
    else:
        import uvicorn

        port = int(os.getenv("PORT", 5000))
        host = os.getenv("HOST", "0.0.0.0")
        reload = os.getenv("ENVIRONMENT", "development").lower() == "development"
        print("---------------------------------------")
        print("🎃 Spooky Master is running")
        print("Open:")
        print(f"http://127.0.0.1:{port}")
        print("---------------------------------------")
        uvicorn.run(
            "run:app",
            host=host,
            port=port,
            reload=reload,
            proxy_headers=True,
            forwarded_allow_ips="*",
        )
