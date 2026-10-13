# Node.js version (overridable via build-arg from CI)
ARG NODE_VERSION=24

# Stage 1: Build stage
FROM node:${NODE_VERSION}-slim AS build

# Debian slim is used instead of Alpine because the Alpine CDN
# (dl-cdn.alpinelinux.org) is unreliable on some build hosts, which surfaces as
# "DNS: transient error" followed by "unable to select packages".
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        python3 \
        python3-pip \
        make \
        g++ \
        build-essential \
        libblas-dev \
        liblapack-dev \
        libcairo2-dev \
        libpango1.0-dev \
        libvips-dev \
        pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Skip downloading Chrome for Puppeteer (saves build time)
ENV PUPPETEER_SKIP_DOWNLOAD=true

# sharp/libvips normally downloads a prebuilt native binary from GitHub
# releases (or a mirror) at install time. Those hosts can be slow or blocked on
# some build hosts, which fails the install with
# "sharp: Installation error: Request timed out".
#
# Build sharp from source against the system libvips installed above. The
# *_binary_host values point at an invalid host so any attempt to download a
# prebuilt binary fails fast, forcing the from-source build path.
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=0
ENV SHARP_INSTALL_TIMEOUT=600000
ENV npm_config_fetch_retries=5
ENV npm_config_fetch_timeout=600000
ENV npm_config_build_from_source=true

# Install latest Flowise globally (specific version can be set: flowise@1.0.0)
# npm dedupe is required after install: npm's overrides resolver does not
# consistently collapse every duplicate of an overridden package in one pass
# on a tree this size/complexity
RUN npm install -g flowise && npm --prefix "$(npm root -g)/flowise" dedupe

# Stage 2: Runtime stage
FROM node:${NODE_VERSION}-slim

# Install runtime dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        chromium \
        git \
        python3 \
        python3-pip \
        make \
        g++ \
        build-essential \
        libblas-dev \
        liblapack-dev \
        libcairo2-dev \
        libpango1.0-dev \
        libvips-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Set the environment variable for Puppeteer to find Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copy Flowise from the build stage
COPY --from=build /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=build /usr/local/bin /usr/local/bin

# Give the node user ownership of the installed package (node:*-slim already has this user)
RUN chown -R node:node /usr/local/lib/node_modules /usr/local/bin

# Switch to non-root user
USER node

ENTRYPOINT ["flowise", "start"]
