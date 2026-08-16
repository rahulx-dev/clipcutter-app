FROM python:3.12-slim

# ------------------------------------------------------------
# System dependencies
# ------------------------------------------------------------

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    git \
    nodejs \
    npm \
    && curl -fsSL https://deno.land/install.sh | sh \
    && mv /root/.deno/bin/deno /usr/local/bin/deno \
    && deno --version \
    && node --version \
    && npm --version \
    && rm -rf /var/lib/apt/lists/*


# ------------------------------------------------------------
# Application
# ------------------------------------------------------------

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir \
    -r requirements.txt


# ------------------------------------------------------------
# bgutil PO Token Provider
# ------------------------------------------------------------

RUN git clone \
    --single-branch \
    --branch 1.3.1 \
    https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git \
    /opt/bgutil-ytdlp-pot-provider


RUN cd /opt/bgutil-ytdlp-pot-provider/server \
    && npm ci \
    && npx tsc


# ------------------------------------------------------------
# Copy backend
# ------------------------------------------------------------

COPY . .


RUN mkdir -p \
    temp/raw \
    output


# ------------------------------------------------------------
# Render
# ------------------------------------------------------------

EXPOSE 8000


CMD ["sh", "-c", "cd /opt/bgutil-ytdlp-pot-provider/server && node build/main.js --port 4416 & exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]