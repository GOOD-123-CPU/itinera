# --- Itinera production image (multi-stage, ~180MB) ---

# ---------- Stage 1: dependencies ----------
FROM node:26-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --ignore-scripts && npx prisma generate

# ---------- Stage 2: build ----------
FROM node:26-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:../db/custom.db"
# DATABASE_URL is only needed for `prisma generate` at build time; the actual
# SQLite file is created/migrated on first container start (see entrypoint).
RUN npx prisma generate && npx next build

# ---------- Stage 3: runtime ----------
FROM node:26-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup -S itinera && adduser -S itinera -G itinera

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh \
  && mkdir -p /app/db \
  && chown -R itinera:itinera /app

USER itinera
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
