# syntax=docker/dockerfile:1

# ============================================================================
# Theory of Change Portal — toc-portal
# Multi-stage build producing a single self-contained image:
#   nginx (reverse proxy + static assets) → Next.js.
#
# No PostgreSQL, no WebSocket server — data lives in Supabase.
#
# NOTE ON ENV VARS:
#   NEXT_PUBLIC_* vars are read by the browser and are baked in at BUILD time,
#   so they are passed as build args below. If you change them you must rebuild.
#   Server-only secrets (ANTHROPIC_API_KEY, BREVO/RESEND, EMAIL_FROM) are read
#   at runtime and are set as environment on the running container instead.
#   With no Supabase vars set the app defaults to the hardcoded project.
# ============================================================================

# ---- 1. Dependencies --------------------------------------------------------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- 2. Build ---------------------------------------------------------------
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---- 3. Runtime (nginx + Next.js) -------------------------------------------
FROM node:20-alpine AS runner
RUN apk add --no-cache nginx supervisor libcap \
 && setcap 'cap_net_bind_service=+ep' /usr/sbin/nginx

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=127.0.0.1

# Run as a non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# ---- Next.js standalone output ----
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# ---- nginx ----
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/http.d/default.conf
RUN mkdir -p /run/nginx /var/lib/nginx/tmp /etc/nginx/ssl \
 && chown -R nextjs:nodejs /run/nginx /var/lib/nginx /var/log/nginx /etc/nginx/ssl

# ---- supervisord ----
COPY supervisord.conf /etc/supervisord.conf

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 80
# Run as root so the entrypoint can fix permissions on the persistent uploads
# volume; supervisord then drops to the nextjs user (see supervisord.conf).
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
