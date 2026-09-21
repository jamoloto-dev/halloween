# Spooky Master Custom Domain & Production Setup Guide

This guide explains how to deploy **Spooky Master** (Halloween Quiz) and configure a custom domain (e.g., `halloween.jamoloto.dev`) with automatic SSL/TLS encryption.

---

## 1. Application Architecture & Domain Overview

Spooky Master is a containerized, unified FastAPI application that serves:
1. **REST API**: Quiz engine, leaderboards, daily haunt, and multiplayer duels under `/api/`.
2. **SPA Frontend**: Responsive HTML5, CSS3, Web Audio engine, and Witch's Market.
3. **PWA Runtime**: Progressive Web App manifest (`/manifest.json`), offline service worker (`/sw.js`), and cached game assets.

Because frontend and backend are served from the same origin, API calls are relative (`/api/...`). When configuring a custom domain:
* **Production Custom Domain**: `https://halloween.jamoloto.dev`
* **Default Hosting Domain**: `https://halloween-quiz.onrender.com`
* **CORS & Domain Environment Variables**: Set `CUSTOM_DOMAIN` and `CORS_ORIGINS` to allow cross-origin requests and PWA sync.

---

## 2. Deploying on Render with a Custom Domain (Recommended)

Render is the primary supported platform for Spooky Master, offering native Docker builds, persistent disk storage for SQLite, and free automatic SSL.

### Step 1: Deploy with Render Blueprint
1. Log in to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** &rarr; **Blueprint**.
3. Connect your repository: `jamoloto-dev/halloween` (branch: `main`).
4. Render will read [deploy/render.yaml](deploy/render.yaml), which automatically configures:
   - Docker build from `Dockerfile`
   - Healthcheck path: `/health`
   - Persistent disk (`/app/data`) for score retention
   - Environment variables (`ENVIRONMENT=production`, `CUSTOM_DOMAIN=halloween.jamoloto.dev`)
   - Pre-configured custom domain: `halloween.jamoloto.dev`
5. Click **Apply**.

*(Alternatively, create a **Web Service** manually: select Docker environment, healthcheck path `/health`, and add a persistent disk mounted at `/app/data`)*.

### Step 2: Configure Custom Domain in Render
If you created the service manually without the blueprint:
1. In your service dashboard, go to **Settings** &rarr; **Custom Domains**.
2. Click **Add Custom Domain**.
3. Enter your domain: `halloween.jamoloto.dev` (or your chosen domain).
4. Click **Save**. Render will display the DNS records you must create at your registrar.

### Step 3: Configure DNS Records at Your Registrar
Log into your DNS provider (Cloudflare, Namecheap, GoDaddy, Porkbun, Google Domains, etc.) and add the appropriate record:

#### For a Subdomain (e.g., `halloween.jamoloto.dev`):
| Type | Name / Host | Value / Target | TTL |
| :--- | :--- | :--- | :--- |
| `CNAME` | `halloween` | `halloween-quiz.onrender.com` | `Auto` or `3600` |

#### For an Apex / Root Domain (e.g., `jamoloto.dev`):
If your DNS provider supports **CNAME Flattening** or **ALIAS/ANAME** records:
| Type | Name / Host | Value / Target | TTL |
| :--- | :--- | :--- | :--- |
| `ALIAS` or `ANAME` | `@` | `halloween-quiz.onrender.com` | `Auto` or `3600` |

If your DNS provider only supports standard **A Records**:
| Type | Name / Host | Value / Target | TTL |
| :--- | :--- | :--- | :--- |
| `A` | `@` | `216.24.57.1` *(or IP provided by Render)* | `Auto` or `3600` |

### Step 4: Automatic SSL Certificate
Once DNS propagates, Render automatically issues and renews a free Let's Encrypt SSL certificate. HTTPS redirects are enforced automatically.

---

## 3. Using Cloudflare DNS & Proxy

If your domain is managed by Cloudflare:
1. **Add CNAME Record**:
   - Name: `halloween`
   - Target: `halloween-quiz.onrender.com`
2. **Proxy Status**:
   - Start with **DNS Only (Grey Cloud)** while Render provisions the Let's Encrypt certificate.
   - Once verified, you can switch to **Proxied (Orange Cloud)** for Cloudflare CDN and DDoS protection.
3. **SSL/TLS Encryption Mode**:
   - Go to Cloudflare &rarr; **SSL/TLS**.
   - Set encryption mode to **Full (strict)**. *Do not use Flexible, as it will cause redirect loops with Render's HTTPS.*
4. **Service Worker Caching**:
   - Cloudflare automatically respects `Cache-Control: no-cache, no-store, must-revalidate` sent by Spooky Master for `/sw.js`.

---

## 4. Alternative Deployment Platforms

### 4.1 Railway
1. Create a new project from GitHub repository `jamoloto-dev/halloween`.
2. Go to **Settings** &rarr; **Networking** &rarr; **Custom Domain**.
3. Enter `halloween.jamoloto.dev`.
4. Add the provided CNAME record (pointing to `<project>.up.railway.app`).

### 4.2 Fly.io
1. Deploy the app: `fly launch` (uses the Dockerfile).
2. Allocate an IP and certificate:
   ```bash
   fly ips allocate-v4
   fly ips allocate-v6
   fly certs add halloween.jamoloto.dev
   ```
3. Add the A, AAAA, or CNAME records indicated by `fly certs show halloween.jamoloto.dev`.

### 4.3 Self-Hosted VPS (Nginx Reverse Proxy)
When hosting on a Linux server running Docker or systemd on port 5000:
```nginx
server {
    server_name halloween.jamoloto.dev;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 90;
    }

    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/halloween.jamoloto.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/halloween.jamoloto.dev/privkey.pem;
}

server {
    listen 80;
    server_name halloween.jamoloto.dev;
    return 301 https://$host$request_uri;
}
```

---

## 5. Environment Variables for Custom Domains

Configure these environment variables in your hosting provider's dashboard:

| Variable | Value for Production | Description |
| :--- | :--- | :--- |
| `ENVIRONMENT` | `production` | Enables production security, rate limits, and restricted CORS. |
| `CUSTOM_DOMAIN` | `halloween.jamoloto.dev` | Primary domain. Automatically adds `https://` and `http://` variants to CORS. |
| `CORS_ORIGINS` | `https://halloween.jamoloto.dev,https://halloween-quiz.onrender.com` | Allowed browser origins for API and cross-origin resource sharing. |
| `PORT` | `5000` | Port for the Uvicorn ASGI server. |
| `DATABASE_PATH` | `/app/data/halloween.db` | Path to persistent SQLite database file on mounted disk. |

---

## 6. PWA & Service Worker Origin Verification

Browsers isolate PWA storage, Cache Storage, and Service Workers strictly by origin.

When moving from local development (`127.0.0.1:5000`) to your custom domain (`https://halloween.jamoloto.dev`):
1. **HTTPS Is Mandatory**: Service workers require a secure context (`https://`).
2. **Fresh Cache**: The custom domain will start with a fresh cache of the latest `spooky-master-v2.3.0` assets.
3. **PWA Install Banner**: Chrome, Edge, and mobile Safari will show the "Install Spooky Master" prompt once served over HTTPS with a valid manifest.

---

## 7. Post-Deployment Verification Checklist

Run these quick checks after configuring your DNS:

### 1. Check DNS Propagation
```bash
# Check CNAME resolution
dig CNAME halloween.jamoloto.dev +short

# Or using nslookup
nslookup halloween.jamoloto.dev
```

### 2. Verify HTTPS & Server Headers
```bash
curl -sI https://halloween.jamoloto.dev/
```
Expected output:
* HTTP status `200 OK`
* Valid SSL certificate (issued by Let's Encrypt or Cloudflare)

### 3. Verify Health & Operational Probes
```bash
# General application health
curl -s https://halloween.jamoloto.dev/health

# Liveness probe
curl -s https://halloween.jamoloto.dev/live

# Readiness probe
curl -s https://halloween.jamoloto.dev/ready
```

### 4. Verify Service Worker & Manifest
```bash
# Manifest JSON
curl -sI https://halloween.jamoloto.dev/manifest.json | grep "content-type"

# Service Worker JS
curl -sI https://halloween.jamoloto.dev/sw.js | grep "service-worker-allowed"
```

### 5. In-Browser Verification
1. Open `https://halloween.jamoloto.dev` in your browser.
2. Verify the 🔒 secure lock icon in the address bar.
3. Open Developer Tools (F12) &rarr; **Console** &rarr; verify 0 errors.
4. Test audio playback, chapter map navigation, and category selection.
