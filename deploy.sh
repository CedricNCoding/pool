#!/usr/bin/env bash
# =============================================================================
# AV Pool — deploiement / mise a jour
# Usage (sur la VM, en root) :  sudo bash deploy.sh
# Aligne sur le pattern Spektalis : /opt/avpool, user dedie, systemd.
# Ne fait PAS le seed (voir DEPLOY.md, etape unique au 1er deploiement).
# =============================================================================
set -euo pipefail

APP_DIR=/opt/avpool
APP_USER=avpool

cd "$APP_DIR"

# Charger les variables (DATABASE_URL, AUTH_SECRET...) pour les etapes prisma/build
if [[ ! -f "$APP_DIR/.env.production" ]]; then
  echo "ERREUR: $APP_DIR/.env.production manquant (cf deploy/env.production.example)" >&2
  exit 1
fi
set -a; . "$APP_DIR/.env.production"; set +a
export NODE_ENV=production

# Helper : executer en tant que user applicatif en preservant l'env utile
run() {
  sudo -u "$APP_USER" --preserve-env=NODE_ENV,DATABASE_URL,AUTH_SECRET,NEXTAUTH_URL,PORT,HOSTNAME "$@"
}

echo "==> [1/6] git pull"
sudo -u "$APP_USER" git -C "$APP_DIR" pull --ff-only 2>/dev/null || echo "    (pas de remote git, on garde le code en place)"

echo "==> [2/6] npm ci"
run npm ci

echo "==> [3/6] prisma generate"
run npx prisma generate

echo "==> [4/6] prisma migrate deploy"
run npx prisma migrate deploy

echo "==> [5/6] next build"
run npm run build

echo "==> [6/6] restart service"
systemctl restart avpool
sleep 2
systemctl --no-pager --lines=0 status avpool || true

echo
echo "Termine. Verifier :  curl -sI http://127.0.0.1:3000 | head -1"
