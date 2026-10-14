ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates git cmake python3 make g++ build-essential libblas-dev liblapack-dev \
    libcairo2-dev libpango1.0-dev libvips-dev libglib2.0-dev pkg-config \
    && rm -rf /var/lib/apt/lists/*
ENV PUPPETEER_SKIP_DOWNLOAD=true SHARP_INSTALL_TIMEOUT=600000 \
    npm_config_fetch_retries=5 npm_config_fetch_timeout=600000 \
    NODE_OPTIONS=--max-old-space-size=8192
WORKDIR /usr/src/flowise
RUN corepack enable && corepack prepare pnpm@10.26.0 --activate
COPY . .
RUN pnpm --version && pnpm install --no-frozen-lockfile && pnpm build:docker

FROM node:${NODE_VERSION}-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium git python3 make g++ build-essential libblas-dev liblapack-dev \
    libcairo2-dev libpango1.0-dev libvips-dev curl \
    && rm -rf /var/lib/apt/lists/*
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
WORKDIR /usr/src/flowise/packages/server/bin
COPY --from=build --chown=node:node /usr/src/flowise /usr/src/flowise
USER node
EXPOSE 3000
ENTRYPOINT ["node", "./run", "start"]
