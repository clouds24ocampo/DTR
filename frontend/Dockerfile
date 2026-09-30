# ---------- frontend build ----------
# VITE_* values are baked in at build time. Provide them via
# frontend/.env.production (see .env.example) — no build args needed.
FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
# npm install (not ci): tolerates lockfile drift and self-heals inside a clean image.
RUN npm install --no-audit --no-fund
COPY . .
# Produces build/release/ (tsc + vite build --outDir build/release)
RUN npm run build:release

# ---------- static hosting + api proxy ----------
FROM nginx:alpine AS runtime
COPY --from=builder /app/build/release /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
