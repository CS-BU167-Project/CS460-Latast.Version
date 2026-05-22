# ============================================
# Frontend Dockerfile (Vite + Bun)
# ============================================

# ---- Dev Stage ----
FROM oven/bun:1 AS development

WORKDIR /app

# Copy lockfile and manifest first for layer caching
COPY frontend/package.json frontend/bun.lock* ./

# Install dependencies
RUN bun install

# Don't copy source — it's mounted as a volume in dev
EXPOSE 3000

# Vite dev server, bind to all interfaces so Docker can forward the port
CMD ["bun", "run", "frontend", "--", "--host", "0.0.0.0"]


# ---- Build Stage ----
FROM oven/bun:1 AS builder

WORKDIR /app

COPY frontend/package.json frontend/bun.lock* ./
RUN bun install --frozen-lockfile

COPY frontend/ .
RUN bun run build


# ---- Production Runtime ----
FROM node:20-alpine AS production

RUN npm install -g serve

WORKDIR /app
COPY --from=builder /app/dist ./dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

CMD ["serve", "-s", "dist", "-l", "3000"]