#!/usr/bin/env bash
# HRMS deploy / update script — run on the VPS inside the repo root (/opt/dtr).
# Usage: ./deploy/deploy.sh hrms.yourdomain.com [admin-email-for-certbot]
set -euo pipefail

DOMAIN="${1:?Usage: ./deploy/deploy.sh hrms.yourdomain.com [email]}"
EMAIL="${2:-admin@${DOMAIN#*.}}"
COMPOSE="docker compose --env-file .env.docker"

echo "==> [1/6] Pulling latest code"
git pull --ff-only

echo "==> [2/6] Checking env files"
if [ ! -f .env.docker ]; then
  cp .env.docker.example .env.docker
  echo "!! Created .env.docker from example — EDIT IT NOW (JWT_SECRET, CORS_ORIGINS=https://${DOMAIN}, SEED_ADMIN_PASSWORD), then re-run."
  exit 1
fi
if [ ! -f frontend/.env.production ]; then
  cp frontend/.env.production.example frontend/.env.production
  echo "!! Created frontend/.env.production from example — set VITE_API_URL=https://${DOMAIN}/ and the domain values, then re-run."
  exit 1
fi
grep -q "https://${DOMAIN}" frontend/.env.production || {
  echo "!! frontend/.env.production VITE_API_URL must be https://${DOMAIN}/ — fix it, then re-run."
  exit 1
}

echo "==> [3/6] Building + starting containers"
$COMPOSE up -d --build

echo "==> [4/6] Waiting for backend health"
for i in $(seq 1 30); do
  if $COMPOSE exec -T backend node -e "fetch('http://localhost:9001/check').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
    echo "    backend healthy"
    break
  fi
  sleep 5
  [ "$i" = 30 ] && { echo "!! backend never became healthy — see: $COMPOSE logs backend"; exit 1; }
done

echo "==> [5/6] Host nginx for ${DOMAIN}"
sudo cp deploy/host-nginx.conf /etc/nginx/sites-available/dtr
sudo sed -i "s/__DOMAIN__/${DOMAIN}/g" /etc/nginx/sites-available/dtr
sudo ln -sf /etc/nginx/sites-available/dtr /etc/nginx/sites-enabled/dtr
sudo nginx -t
sudo systemctl reload nginx

echo "==> [6/6] SSL via certbot"
if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
  sudo certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${EMAIL}" --redirect
else
  echo "    cert already exists, skipping (renewals run automatically)"
fi

echo ""
echo "Done. Open https://${DOMAIN}"
echo "First deploy? Seed the database: $COMPOSE --profile seed run --rm seed"
