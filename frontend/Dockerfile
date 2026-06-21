# syntax=docker/dockerfile:1
# ============================================================================
# GIGWHEELS FRONTEND — Next.js standalone (multi-stage)
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

# NEXT_PUBLIC_* are inlined into the client bundle at build time, so they must
# be present BEFORE `next build`. Single-level api subdomain (CF Universal SSL
# covers *.strategybase.io but not the 2-level gigwheels-api).
ARG NEXT_PUBLIC_API_URL=https://gigwheels-api.strategybase.io
ARG NEXT_PUBLIC_API_BASE_URL=https://gigwheels-api.strategybase.io/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

ARG CACHE_BUST
RUN echo "cache-bust: $CACHE_BUST"  # busts the source COPY below per build
COPY . .

RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine AS runner
LABEL org.opencontainers.image.title="GigWheels Frontend (Next.js)"
LABEL org.opencontainers.image.vendor="StrategyBase"
LABEL service="gigwheels-frontend"

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# node:20-alpine already provides the non-root node user/group at UID/GID 1000,
# matching the deployment's runAsUser/fsGroup.

# Standalone output bundles public/ already. COPY directory destinations MUST
# end in '/' (kaniko multi-source rule), else the build fails.
COPY --from=build --chown=node:node /app/.next/standalone/ ./
COPY --from=build --chown=node:node /app/.next/static/ ./.next/static/

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -q --spider http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
