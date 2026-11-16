# Build local monorepo image
# docker build --no-cache -t  flowise .

# Run image
# docker run -d -p 3000:3000 flowise

FROM node:24-alpine

# Install system dependencies and build tools
RUN apk update && \
    apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    build-base \
    cairo-dev \
    pango-dev \
    chromium \
    curl && \
    npm install -g pnpm@10.26.0

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

ENV NODE_OPTIONS=--max-old-space-size=8192

WORKDIR /usr/src/flowise
RUN chown node:node /usr/src/flowise

# Copy app source
COPY --chown=node:node . .

# Switch to non-root user before install so build output is owned by node
USER node

# Install dependencies and build (excluding sdk packages not needed for Docker)
RUN pnpm install && \
    pnpm build:docker

EXPOSE 3000

CMD [ "pnpm", "start" ]
