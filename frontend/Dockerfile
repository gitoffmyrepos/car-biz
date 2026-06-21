# Weekly Vehicle Leasing Platform — Frontend (Next.js) PRODUCTION image.
# Multi-stage standalone build (next.config.js has output:'standalone').
# Runs `node server.js` as non-root, writes nothing to the root FS, so it's
# compatible with readOnlyRootFilesystem (cache/tmp come from emptyDir mounts).

# ---- deps ----
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package*.json ./
RUN npm ci

# ---- build ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runner ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Numeric UID/GID (Kaniko can't resolve usernames; matches deployment runAsUser).
RUN addgroup -g 1000 nodejs && adduser -u 1000 -G nodejs -S -H nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=1000:1000 /app/.next/standalone ./
COPY --from=builder --chown=1000:1000 /app/.next/static ./.next/static
USER 1000
EXPOSE 3000
CMD ["node", "server.js"]
