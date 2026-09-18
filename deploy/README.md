# Deployment Guide — Halloween Quiz

This guide shows two simple deployment options: Docker (generic) and a Heroku/Render-style `Procfile` deployment using Gunicorn.

Prerequisites
- A Linux/macOS/Windows host with Docker installed (if using Docker).
- Or an account on Render / Railway / Heroku if deploying to a PaaS.

1) Build and run with Docker (recommended)

Build the image:

```bash
# from the repository root
docker build -t halloween-quiz:latest .
```

Run it locally (exposes port 5000):

```bash
docker run -p 5000:5000 -e PORT=5000 --rm halloween-quiz:latest
```

Open http://127.0.0.1:5000 to test.

Notes:
- The Dockerfile includes a commented line showing how to install `ffmpeg` if you want MP3 conversion inside the image. Uncomment and rebuild if desired.

2) Deploy to a Heroku-like PaaS (Render, Heroku, Railway)

These platforms detect a `Procfile` and will use the specified command. Ensure `requirements.txt` contains `gunicorn` (this repository already includes it).

- Push the repo to your git remote for your platform (e.g., Heroku remote or Render Git).
- The platform will install dependencies and run:

```
web: gunicorn -w 4 -b 0.0.0.0:$PORT run:app
```

3) Optional: Ensure static assets are served correctly

The Flask app serves static files from `assets/static` and sound files from `assets/sounds`. Make sure these folders are included in your deployment bundle.

4) Post-deploy: convert `incorrect.wav` to `incorrect.mp3` (optional)

If you want an MP3 fallback, install `ffmpeg` on the server or include it in your Docker image, then run:

```bash
ffmpeg -y -i assets/sounds/incorrect.wav assets/sounds/incorrect.mp3
```

If you cannot install `ffmpeg`, the app will still use `incorrect.wav` directly (browser support is broad for WAV but MP3 is more widely optimized).

5) Environment variables

- `PORT` — PaaS will set this. Locally the Docker image uses `PORT=5000` by default.

6) Troubleshooting

- If you see import errors for `src` modules, ensure you're running from the repository root so Python's import path includes the `src` directory.
- To run locally without Docker:

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run.py
```

Enjoy — once deployed you can share the public URL with players.

7) CI / Automatic deploy (GitHub Actions)

We included a GitHub Actions workflow at `.github/workflows/deploy.yml` that will build the Docker image and push it to GitHub Container Registry (GHCR) on every push to `main`.

To enable automatic deployment to Render from GitHub Actions, add two repository secrets in GitHub:

- `RENDER_SERVICE_ID` — the Render service id for your web service (found in the Render dashboard URL or service settings).
- `RENDER_API_KEY` — a Render API key with deploy permissions.

When both secrets are present, the workflow will call the Render API to create a new deploy after the image is pushed.

Notes about GHCR authentication:
- The workflow uses the built-in `GITHUB_TOKEN` to authenticate to GHCR. Make sure your repository settings allow the token to write packages if you run into permission errors.
