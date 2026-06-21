# syntax=docker/dockerfile:1
# ============================================================================
# CAR-BIZ FRONTEND — Next.js standalone (multi-stage)
# Emulates the FX microservices/frontend-next pattern: hardened npm install
# (kaniko-safe), standalone output, non-root runner, trailing-slash COPY.
# Port 3000 (matches the deployment/service/HTTPRoute).
# ============================================================================

# ---- Build Stage ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./

# Hardened install — same pattern as FX frontend; avoids the kaniko
# "Exit handler never called!" failure mode on Node 20.
RUN NODE_OPTIONS="--dns-result-order=ipv4first --max-old-space-size=4096" \
    npm install --legacy-peer-deps --no-audit --no-fund --prefer-offline \
    && test -x node_modules/.bin/next \
    || (echo "FAIL: npm did not install next" && exit 1)

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

ARG CACHE_BUST
RUN echo "cache-bust: $CACHE_BUST"  # busts the source COPY below per build
COPY . .

RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine AS runner
LABEL org.opencontainers.image.title="Car-Biz Frontend (Next.js)"
LABEL org.opencontainers.image.vendor="StrategyBase"
LABEL service="car-biz-frontend"

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user; UID 1000 matches the deployment's runAsUser/fsGroup.
RUN addgroup -g 1000 -S nodejs && adduser -S -u 1000 -G nodejs nextjs

# Standalone output bundles public/ already. COPY directory destinations MUST
# end in '/' (kaniko multi-source rule), else the build fails.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone/ ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static/ ./.next/static/

USER 1000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -q --spider http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
