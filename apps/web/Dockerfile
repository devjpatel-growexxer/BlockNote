FROM node:24-alpine AS base

FROM base AS builder
WORKDIR /app

# Copy root configs
COPY package.json package-lock.json ./

# Copy workspaces
COPY apps/web ./apps/web
COPY packages ./packages

# Install dependencies cleanly
RUN npm ci

# Build the web app
RUN npm run build:web

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy static assets
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Standalone output mirrors the monorepo structure 
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
