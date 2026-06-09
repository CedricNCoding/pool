#!/usr/bin/env bash
# =============================================================================
# AV Pool — installation FROM SCRATCH sur une VM Debian 12 (Proxmox).
#
#   sudo git clone https://github.com/CedricNCoding/pool.git /opt/avpool
#   cd /opt/avpool && sudo bash bootstrap.sh
#
# Installe TOUTES les dependances (systeme + npm), prepare la base, demande
# la creation du compte admin, build l'app et installe le service systemd.
# Idempotent : rejouable sans casse (le seed n'upsert que le referentiel,
# jamais les techniciens). Pour les mises a jour ulterieures : deploy.sh
# =============================================================================
set -euo pipefail

APP_DIR=/opt/avpool
APP_USER=avpool
NODE_MAJOR=22

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# --- 0. Pre-vol ------------------------------------------------------------
if [[ $EUID -ne 0 ]]; then
  echo "ERREUR : lancer en root (sudo bash bootstrap.sh)." >&2
  exit 1
fi

echo "============================================================"
echo "  AV Pool — installation"
echo "============================================================"

# --- 1. Saisie interactive (tout en amont, puis install non-interactive) ---
read -rp "Domaine public [avpool.spektalis.net] : " DOMAIN
DOMAIN=${DOMAIN:-avpool.spektalis.net}

echo
echo "--- Compte administrateur ---"
read -rp "Email admin [admin@spektalis.net] : " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@spektalis.net}
read -rp "Nom affiche [Administrateur] : " ADMIN_NAME
ADMIN_NAME=${ADMIN_NAME:-Administrateur}

ADMIN_PASSWORD=""
while true; do
  read -rsp "Mot de passe admin (vide = generer) : " ADMIN_PASSWORD; echo
  if [[ -z "$ADMIN_PASSWORD" ]]; then
    ADMIN_PASSWORD="$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-20)"
    echo "  -> genere : ${ADMIN_PASSWORD}  (NOTE-LE MAINTENANT)"
    break
  fi
  if [[ ${#ADMIN_PASSWORD} -lt 10 ]]; then
    echo "  Trop court (min. 10 caracteres)."; continue
  fi
  read -rsp "Confirmer le mot de passe : " ADMIN_PASSWORD2; echo
  if [[ "$ADMIN_PASSWORD" == "$ADMIN_PASSWORD2" ]]; then break; fi
  echo "  Les mots de passe ne correspondent pas."
done

# --- 2. Dependances systeme ------------------------------------------------
echo
echo "==> [1/9] Dependances systeme (apt)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg git build-essential python3 \
  ufw sqlite3 openssl rsync >/dev/null
echo "    ok"

echo "==> [2/9] Node.js ${NODE_MAJOR}"
NODE_OK=0
if command -v node >/dev/null 2>&1; then
  CUR=$(node -v | sed 's/^v//' | cut -d. -f1)
  [[ "$CUR" -ge "$NODE_MAJOR" ]] && NODE_OK=1
fi
if [[ "$NODE_OK" -eq 0 ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
echo "    node $(node -v) / npm $(npm -v)"

# --- 3. User + arborescence ------------------------------------------------
echo "==> [3/9] Utilisateur applicatif + repertoires"
id "$APP_USER" >/dev/null 2>&1 || \
  useradd --system --create-home --home-dir "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$APP_DIR/data" "$APP_DIR/backups"

# --- 4. Code source --------------------------------------------------------
echo "==> [4/9] Code source -> $APP_DIR"
if [[ "$SCRIPT_DIR" != "$APP_DIR" ]]; then
  rsync -a --delete \
    --exclude node_modules --exclude .next --exclude '.env*' --exclude '*.db*' \
    "$SCRIPT_DIR"/ "$APP_DIR"/
fi

# --- 5. Configuration (.env.production) ------------------------------------
echo "==> [5/9] Configuration"
ENV_FILE="$APP_DIR/.env.production"
if [[ -f "$ENV_FILE" ]]; then
  echo "    .env.production existant conserve (secret preserve)"
  # shellcheck disable=SC1090
  set -a; . "$ENV_FILE"; set +a
else
  AUTH_SECRET="$(openssl rand -base64 48)"
  cat > "$ENV_FILE" <<EOF
NODE_ENV=production
AUTH_SECRET=${AUTH_SECRET}
DATABASE_URL=file:${APP_DIR}/data/avpool.db
NEXTAUTH_URL=https://${DOMAIN}
PORT=3000
HOSTNAME=0.0.0.0
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_NAME=${ADMIN_NAME}
EOF
  echo "    .env.production cree (AUTH_SECRET genere)"
fi
DATABASE_URL="file:${APP_DIR}/data/avpool.db"
chmod 600 "$ENV_FILE"
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

# Helper : commande applicative en tant que $APP_USER avec l'env de prod
app() { sudo -u "$APP_USER" env NODE_ENV=production DATABASE_URL="$DATABASE_URL" "$@"; }

cd "$APP_DIR"

# --- 6. Dependances npm + Prisma ------------------------------------------
echo "==> [6/9] npm ci (installation des dependances)"
app npm ci

echo "==> [7/9] Prisma (generate + migrate deploy)"
app npx prisma generate
app npx prisma migrate deploy

# --- 7. Seed : referentiel + compte admin ---------------------------------
echo "==> [8/9] Seed (referentiel certifs/competences + compte admin)"
sudo -u "$APP_USER" env \
  NODE_ENV=production \
  DATABASE_URL="$DATABASE_URL" \
  ADMIN_EMAIL="$ADMIN_EMAIL" \
  ADMIN_NAME="$ADMIN_NAME" \
  ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  npx tsx prisma/seed.ts

# --- 8. Build --------------------------------------------------------------
echo "==> [9/9] Build de production"
app npm run build

# --- 9. Service systemd ----------------------------------------------------
echo "==> Service systemd"
cp "$APP_DIR/deploy/avpool.service" /etc/systemd/system/avpool.service
systemctl daemon-reload
systemctl enable --now avpool
sleep 2

echo
if curl -sf -o /dev/null http://127.0.0.1:3000/login; then
  echo "    Service avpool OK (ecoute sur 0.0.0.0:3000)"
else
  echo "    ATTENTION : l'app ne repond pas encore — verifier 'journalctl -u avpool -n 50'"
fi

# --- 10. Pare-feu (optionnel) ----------------------------------------------
echo
read -rp "Configurer UFW maintenant (autorise SSH+Traefik, refuse le reste) ? [y/N] " UFW_ANS
if [[ "${UFW_ANS,,}" == "y" ]]; then
  ufw allow from 192.168.1.0/24 to any port 22 proto tcp
  ufw allow from 192.168.1.2 to any port 3000 proto tcp
  ufw default deny incoming
  ufw default allow outgoing
  ufw --force enable
  echo "    UFW actif (port 3000 ouvert au seul 192.168.1.2)"
else
  echo "    UFW non touche. Regles manuelles dans DEPLOY.md (etape 7)."
fi

# --- Fin -------------------------------------------------------------------
cat <<EOF

============================================================
  Installation terminee.
============================================================
  App    : http://<IP_VM>:3000  (interne)
  Admin  : ${ADMIN_EMAIL}

  Reste a faire (cf DEPLOY.md) :
    1. Traefik (LXC 192.168.1.2) : deposer deploy/traefik/avpool.yml
       (adapter VM_LAN_IP + certResolver)
    2. Cloudflare : enregistrement '${DOMAIN%%.*}' Proxied + SSL Full(strict)
    3. dnsmasq    : address=/${DOMAIN}/192.168.1.2

  Puis : https://${DOMAIN} -> login ${ADMIN_EMAIL}
  Mises a jour ulterieures : sudo bash deploy.sh
============================================================
EOF
