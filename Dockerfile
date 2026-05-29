# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — builder
# Installs all deps (incl. devDeps needed by esbuild) and compiles the bundle.
# esbuild produces dist/index.mjs — a single self-contained ESM file that
# includes all workspace libs and npm dependencies (bundle: true). No
# node_modules are needed at runtime.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Native build tools required by optional deps (bcrypt, sharp, canvas, etc.)
# Not used in this project today but keep so the image builds if they are added.
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.26.1 --activate

# Copy workspace manifests first — Docker cache is only invalidated when these
# change, not on every source edit.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

COPY artifacts/api-server/package.json   ./artifacts/api-server/
COPY lib/api-zod/package.json            ./lib/api-zod/
COPY lib/db/package.json                 ./lib/db/
COPY lib/api-spec/package.json           ./lib/api-spec/
COPY lib/api-client-react/package.json   ./lib/api-client-react/

RUN pnpm install --frozen-lockfile

# Copy full source and compile
COPY . .

RUN pnpm --filter @workspace/api-server run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — runner (production)
# Minimal image: dist/ only — no source, no devDeps, no node_modules.
#
# Why no `pnpm install --prod` here:
#   esbuild is configured with bundle: true. Every npm dependency and every
#   workspace library (@workspace/api-zod, @workspace/db, etc.) is statically
#   bundled into dist/index.mjs at build time. esbuild-plugin-pino copies
#   pino's worker files alongside index.mjs, so even pino's thread workers are
#   covered. The only externals in build.mjs are optional native modules
#   (*.node, sharp, bcrypt …) that are not installed and not used — excluding
#   them avoids build errors without affecting runtime.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV TZ=Asia/Ho_Chi_Minh

# dumb-init: proper PID-1 process manager — forwards signals to the Node
# process so Kubernetes SIGTERM/SIGKILL during rolling deploys works correctly.
# curl: used by HEALTHCHECK below.
RUN apt-get update && apt-get install -y \
    dumb-init \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Non-root user
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs

# esbuild-plugin-pino emits worker files alongside index.mjs — copy all of dist
COPY --from=builder --chown=nodejs:nodejs /app/artifacts/api-server/dist ./dist

USER nodejs

EXPOSE 3000

# Docker-level healthcheck (distinct from K8s liveness/readiness probes).
# Endpoint: GET /api/healthz — mounted at /api by app.ts, defined in routes/health.ts.
HEALTHCHECK --interval=30s \
            --timeout=5s \
            --start-period=15s \
            --retries=3 \
  CMD curl -f http://localhost:3000/api/healthz || exit 1

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
