# Déploiement AV Pool — sous-domaine démo `avpool.spektalis.net`

Cible : **VM Proxmox** derrière le **LXC Traefik** (`192.168.1.2`) + **Cloudflare**,
aligné sur le pattern des 4 apps Spektalis (`/opt/<app>`, user dédié, systemd, Node 22).

> **Contrainte clé** — base **SQLite** (fichier + module natif `better-sqlite3`) :
> une seule instance, sur un disque persistant. Parfait pour la volumétrie visée
> (500 techs / 20 users simultanés). Pas de scale horizontal sans migrer vers Postgres.

Variables utilisées ci-dessous (à adapter) :

| Variable | Valeur exemple |
|---|---|
| `DOMAIN` | `avpool.spektalis.net` |
| `VM_IP` | `192.168.1.40` (IP LAN de la VM avpool) |
| `TRAEFIK` | `192.168.1.2` (LXC Traefik) |

---

## Installation express (recommandé) — `bootstrap.sh`

Sur une VM Debian 12 fraîche, **un seul script** installe tout (Node 22, build tools,
dépendances npm, base + migrations), **demande la création du compte admin**, build
l'app et installe le service systemd :

```bash
sudo apt-get update && sudo apt-get install -y git
sudo git clone https://github.com/CedricNCoding/pool.git /opt/avpool
cd /opt/avpool
sudo bash bootstrap.sh
```

Le script est interactif (domaine, email + mot de passe admin) puis tourne seul.
Idempotent : rejouable sans casse. Il ne reste que **Traefik + Cloudflare + dnsmasq**
(sections 8 → 10). Pour les mises à jour : `sudo bash deploy.sh`.

Les sections 1 à 7 ci-dessous détaillent ce que `bootstrap.sh` fait (référence /
dépannage / install manuelle).

---

## 1. Provisionner la VM (Proxmox)

- Debian 12, 1 vCPU / 2 Go RAM / 10 Go disque suffisent largement.
- IP LAN fixe = `VM_IP`.
- Egress via le Squid du LAN (`192.168.1.2:3128`) si tu appliques l'allowlist sortante
  comme sur Vigie/Sentinel (npm/nodesource déjà autorisés).

## 2. Socle système

```bash
# Node 22 (NodeSource) + outils de build pour better-sqlite3
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential python3 git ufw

# User applicatif dédié + arborescence
sudo useradd --system --create-home --home-dir /opt/avpool --shell /usr/sbin/nologin avpool
sudo mkdir -p /opt/avpool/data /opt/avpool/backups
```

## 3. Déposer le code

Depuis ton poste (le repo `av-pool`) :

```bash
rsync -az --delete \
  --exclude node_modules --exclude .next --exclude 'dev.db*' --exclude '.env*' \
  ./  root@VM_IP:/opt/avpool/
ssh root@VM_IP 'chown -R avpool:avpool /opt/avpool'
```

(ou `git clone` si tu pousses le repo sur un remote privé.)

## 4. Configurer l'environnement

```bash
sudo -u avpool cp /opt/avpool/deploy/env.production.example /opt/avpool/.env.production
sudo -u avpool nano /opt/avpool/.env.production     # remplir AUTH_SECRET, ADMIN_PASSWORD, DOMAIN
sudo chmod 600 /opt/avpool/.env.production
```

Générer les secrets :

```bash
openssl rand -base64 48                              # -> AUTH_SECRET
openssl rand -base64 18 | tr -d '/+=' | cut -c1-20   # -> ADMIN_PASSWORD
```

## 5. Premier déploiement (install + migrate + seed)

```bash
cd /opt/avpool
set -a; . ./.env.production; set +a; export NODE_ENV=production

sudo -u avpool npm ci --include=dev    # devDeps (@tailwindcss/postcss, tsx...) requis par le build
sudo -u avpool --preserve-env=NODE_ENV,DATABASE_URL npx prisma generate
sudo -u avpool --preserve-env=NODE_ENV,DATABASE_URL npx prisma migrate deploy

# Seed UNIQUE (catalogue certifs, compétences, admin). ADMIN_PASSWORD obligatoire en prod.
sudo -u avpool --preserve-env=NODE_ENV,DATABASE_URL,ADMIN_EMAIL,ADMIN_PASSWORD,ADMIN_NAME \
  npx tsx prisma/seed.ts

sudo -u avpool --preserve-env=NODE_ENV,DATABASE_URL npm run build
```

> Pour les mises à jour suivantes : `sudo bash /opt/avpool/deploy.sh` (sans re-seed).

## 6. Service systemd

```bash
sudo cp /opt/avpool/deploy/avpool.service /etc/systemd/system/avpool.service
sudo systemctl daemon-reload
sudo systemctl enable --now avpool
sudo systemctl status avpool --no-pager

# L'app doit écouter sur VM_IP:3000
curl -sI http://127.0.0.1:3000 | head -1     # HTTP/1.1 307 (redirige /login)
```

## 7. Pare-feu (UFW) sur la VM

L'app ne doit être joignable QUE depuis Traefik.

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from 192.168.1.0/24 to any port 22 proto tcp   # SSH LAN
sudo ufw allow from 192.168.1.2  to any port 3000 proto tcp   # Traefik -> app
sudo ufw enable
```

## 8. Traefik (sur le LXC `192.168.1.2`)

```bash
# Copier la config dynamique (adapter VM_LAN_IP + certResolver dans le fichier)
scp deploy/traefik/avpool.yml root@192.168.1.2:/etc/traefik/dynamic/avpool.yml
```

- Vérifie le router dans le dashboard Traefik (`avpool@file` → service `avpool`).
- Si tu as déjà des middlewares globaux (headers/rate-limit), tu peux les substituer —
  **mais garde la CSP fournie** (compatible Leaflet/tuiles OSM) et **n'ajoute pas
  `require-trusted-types-for`** à ce sous-domaine.

## 9. Cloudflare

- DNS : enregistrement `avpool` → IP publique de ta box, **Proxied** (nuage orange).
- SSL/TLS : mode **Full (strict)**.
- Si ton ingress est verrouillé Cloudflare-only (UFW Origin Pull), lance ton
  `cloudflare-ufw-sync.sh` pour que la nouvelle entrée soit couverte.

## 10. Split-DNS interne (dnsmasq sur le LXC Traefik)

Pour que la résolution LAN court-circuite le NAT loopback Freebox :

```bash
echo 'address=/avpool.spektalis.net/192.168.1.2' | sudo tee -a /etc/dnsmasq.d/spektalis.conf
sudo systemctl restart dnsmasq
```

## 11. Tests de fumée

```bash
# Depuis le LAN
curl -sI https://avpool.spektalis.net | head -5
```

Puis dans le navigateur : `https://avpool.spektalis.net` → page de login →
connexion avec `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
**Changer le mot de passe admin** immédiatement (Administration → Utilisateurs).

Vérifier la carte (onglet *Zone d'intervention* d'une fiche) : si les tuiles
ne s'affichent pas, c'est la CSP → confirmer `img-src ... *.tile.openstreetmap.org`.

## 12. Sauvegarde de la base (RGPD)

```bash
sudo tee /etc/cron.daily/avpool-backup >/dev/null <<'EOF'
#!/bin/sh
ts=$(date +%Y%m%d)
sqlite3 /opt/avpool/data/avpool.db ".backup '/opt/avpool/backups/avpool-$ts.db'"
find /opt/avpool/backups -name 'avpool-*.db' -mtime +30 -delete
EOF
sudo chmod +x /etc/cron.daily/avpool-backup
sudo apt-get install -y sqlite3
```

(Pousser ensuite vers l'Object Storage OVH comme pour les autres apps.)

## 13. Email (rappels de certification) — quand tu l'activeras

- Configurer le SMTP dans **Administration → Email / SMTP**.
- Ajouter l'hôte SMTP à l'allowlist Squid egress, sinon les envois sortants seront bloqués.

---

## Démontage (sous-domaine temporaire)

```bash
ssh root@VM_IP 'systemctl disable --now avpool'
# Retirer /etc/traefik/dynamic/avpool.yml sur le LXC Traefik
# Retirer l'enregistrement DNS Cloudflare + la ligne dnsmasq
# Sauvegarder /opt/avpool/data/avpool.db puis détruire la VM
```

## Checklist sécurité avant ouverture publique

- [ ] `AUTH_SECRET` unique généré (jamais le placeholder)
- [ ] Mot de passe admin changé après le 1er login
- [ ] `.env.production` en `chmod 600`, owner `avpool`
- [ ] UFW : seul `192.168.1.2` joint le port 3000
- [ ] Cloudflare Proxied + Full (strict)
- [ ] HTTPS effectif (cookie de session en `Secure`)
- [ ] Sauvegarde quotidienne active
