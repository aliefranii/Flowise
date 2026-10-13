FROM node:24-alpine

# Native module compilation needs git (faiss-node falls back to `git clone`)
# plus cmake when prebuilt binaries cannot be downloaded.
RUN apk add --update libc6-compat python3 make g++ git cmake
# needed for pdfjs-dist
RUN apk add --no-cache build-base cairo-dev pango-dev

# Install Chromium and curl for container-level health checks
RUN apk add --no-cache chromium curl

#install PNPM globally
RUN npm install -g pnpm@10.26.0

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Prebuilt native binaries are fetched from GitHub releases, which is slow or
# blocked on some build hosts. Allow a long timeout and several retries so the
# install falls back to compiling locally instead of failing outright.
ENV npm_config_fetch_timeout=600000
ENV npm_config_fetch_retries=5
ENV npm_config_prebuild_install_timeout=600000

ENV NODE_OPTIONS=--max-old-space-size=8192

WORKDIR /usr/src

# Copy app source
COPY . .

# Retry/timeout tuning: the build host's DNS can be slow or flaky when
# resolving registry.npmjs.org, which surfaces as "EAI_AGAIN" failures.
ENV NPM_CONFIG_FETCH_RETRIES=5
ENV NPM_CONFIG_FETCH_TIMEOUT=300000

RUN pnpm config set fetch-retries 5 \
    && pnpm config set fetch-retry-maxtimeout 300000 \
    && pnpm install

RUN pnpm build

# --- Healthcheck Setup ---

WORKDIR /app/healthcheck

COPY docker/worker/healthcheck/package.json . 

RUN npm install --omit=dev

COPY docker/worker/healthcheck/healthcheck.js .

# --- End Healthcheck Setup ---

# Set the main working directory back
WORKDIR /usr/src

# Environment variables for port configuration
ENV WORKER_PORT=5566

# Expose port (can be overridden by env var)
EXPOSE ${WORKER_PORT}

# Give the node user ownership of the application files (node:*-alpine already has this user)
RUN chown -R node:node /usr/src /app

# Switch to non-root user
USER node

# Start healthcheck in background and flowise worker in foreground
CMD ["/bin/sh", "-c", "node /app/healthcheck/healthcheck.js & sleep 5 && pnpm run start-worker"]
