# Multi-stage production Dockerfile for Halloween Quiz 2.0
FROM python:3.12-slim AS builder

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc python3-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir --user -r requirements.txt

FROM python:3.12-slim AS runner

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=5000 \
    PATH=/home/appuser/.local/bin:$PATH \
    PYTHONPATH=/app/src:$PYTHONPATH

# Create non-root system user for secure container execution
RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -m -s /bin/bash appuser

# Copy installed wheels from builder
COPY --from=builder --chown=appuser:appgroup /root/.local /home/appuser/.local

# Copy application source code and assets
COPY --chown=appuser:appgroup . .

# Ensure data directory exists and is writable by appuser
RUN mkdir -p /app/data && chown -R appuser:appgroup /app/data

USER appuser

EXPOSE ${PORT}

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD python3 -c "import urllib.request, os; port = os.getenv('PORT', '5000'); urllib.request.urlopen(f'http://localhost:{port}/health')" || exit 1

CMD ["sh", "-c", "uvicorn run:app --host 0.0.0.0 --port ${PORT:-5000}"]
