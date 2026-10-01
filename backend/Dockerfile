# ---------- backend build ----------
FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
# npm install (not ci): tolerates lockfile drift and self-heals inside a clean image.
RUN npm install --no-audit --no-fund
COPY . .
# Produces build/release/index.js (esbuild bundle, minified)
RUN npm run build:release

# ---------- backend runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV TZ=Asia/Manila
RUN apk add --no-cache tzdata
# Runtime needs the esbuild-external packages only (node-cron).
# Optionals (kerberos/snappy/...) are skipped: the mongodb driver
# runs fine without them.
COPY package.json package-lock.json ./
RUN npm install --omit=dev --omit=optional --no-audit --no-fund
# Keep the build/ layout: the bundle serves uploads from ../uploads
# relative to its own dir, i.e. /app/build/uploads (mounted volume).
COPY --from=builder /app/build/release/index.js ./build/release/index.js
EXPOSE 9001
CMD ["node", "build/release/index.js"]
