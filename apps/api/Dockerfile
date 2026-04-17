FROM node:24-alpine AS base

FROM base AS builder
WORKDIR /app

# Copy root configurations
COPY package.json package-lock.json ./

# Copy API and shared packages
COPY apps/api ./apps/api
COPY packages ./packages

# Install dependencies cleanly
RUN npm ci

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy node modules and sources
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/packages ./packages

EXPOSE 4000
ENV PORT=4000

# Run migrations and start the server
CMD ["sh", "-c", "npm run db:migrate && npm start --workspace @blocknote/api"]
