# Production Deployment Guide

## 1. Environment Variables

The application can be configured entirely via environment variables:

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | integer | `5000` | Port on which the HTTP server listens. |
| `HOST` | string | `0.0.0.0` | Host interface binding. |
| `DATABASE_URL` | string | *None* | Database connection string. If omitted, uses SQLite at `data/halloween.db`. Supports PostgreSQL (`postgresql://user:pass@host:5432/dbname`). |
| `CORS_ORIGINS` | string | `*` | Comma-separated list of allowed origins. Set to explicit domain in production. |
| `RATE_LIMIT_ENABLED` | boolean | `true` | Enables sliding window rate limiting. |
| `RATE_LIMIT_START` | integer | `15` | Maximum quiz session starts allowed per minute per IP. |
| `RATE_LIMIT_ACTION` | integer | `60` | Maximum quiz answer actions allowed per minute per IP. |
| `SESSION_TTL_SECONDS` | integer | `3600` | Inactivity duration before memory session is pruned. |
| `MAX_SESSIONS` | integer | `1000` | Maximum active concurrent sessions kept in memory. |
| `LOG_LEVEL` | string | `INFO` | Application log verbosity (`DEBUG`, `INFO`, `WARNING`, `ERROR`). |

---

## 2. Docker & Container Deployment

### 2.1 Multi-Stage Container Image
The provided [Dockerfile](file:///home/jafta/Desktop/halloween/Dockerfile) builds a lean, secure image running as a non-root system user (`appuser:1001`):

```bash
# Build production image
docker build -t halloween-quiz:2.1.0 .

# Run container with volume persistence
docker run -d \
  --name halloween-quiz \
  -p 5000:5000 \
  -e PORT=5000 \
  -v $(pwd)/data:/app/data \
  halloween-quiz:2.1.0
```

### 2.2 Docker Compose
Use [docker-compose.yml](file:///home/jafta/Desktop/halloween/docker-compose.yml) for local staging or multi-container stacks:

```bash
docker compose up -d --build
```

---

## 3. Kubernetes & Cloud Probes

The application provides three distinct operational endpoints:

1. **Liveness Probe**: `GET /live`
   - Returns `200 OK` if the process loop is responsive.
   ```yaml
   livenessProbe:
     httpGet:
       path: /live
       port: 5000
     initialDelaySeconds: 5
     periodSeconds: 10
     timeoutSeconds: 3
     failureThreshold: 3
   ```

2. **Readiness Probe**: `GET /ready`
   - Returns `200 OK` if the database and question bank are initialized and accepting traffic.
   ```yaml
   readinessProbe:
     httpGet:
       path: /ready
       port: 5000
     initialDelaySeconds: 5
     periodSeconds: 5
     timeoutSeconds: 2
     failureThreshold: 2
   ```

3. **Diagnostics Endpoint**: `GET /health`
   - Returns deep operational metadata including question counts, memory metrics, active sessions, and database connectivity.

---

## 4. Cloud Platform Recipes

### 4.1 Render / Railway / Fly.io
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn run:app --host 0.0.0.0 --port $PORT`
- **Health Check Path**: `/live` or `/health`
- **Mount Path**: Attach a persistent volume to `/app/data` (for SQLite persistence) or provision a managed PostgreSQL database and set `DATABASE_URL`.

### 4.2 Google Cloud Run
```bash
gcloud run deploy halloween-quiz \
  --image gcr.io/YOUR_PROJECT/halloween-quiz:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 5000
```

---

## 5. Backup & Maintenance

### SQLite Database Backup
To backup high scores in production:
```bash
sqlite3 data/halloween.db ".backup data/backup_$(date +%Y%m%d).db"
```
Because WAL mode (`PRAGMA journal_mode=WAL`) is enabled, backups can be performed while the quiz application is actively processing writes.
