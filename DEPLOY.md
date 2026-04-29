# Deploiement sur DigitalOcean

Ce guide deploie l'app sur un Droplet Ubuntu avec persistance SQLite.

## 1) Prerequis

- Un domaine (ex: `radar.tondomaine.com`) pointe vers l'IP du Droplet.
- Un repo GitHub avec ce projet.
- Ubuntu 22.04+.

## 2) Installation systeme

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx certbot python3-certbot-nginx git ufw
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

Option firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## 3) Recuperer le projet

```bash
sudo mkdir -p /var/www
cd /var/www
sudo git clone <TON_REPO_GITHUB_URL> emulator-update
sudo chown -R $USER:$USER /var/www/emulator-update
cd /var/www/emulator-update
```

## 4) Configurer l'app

```bash
npm ci
cp .env.example .env
cp repos.example.json repos.json
```

Edite `.env`:

- `GITHUB_TOKEN=...`
- `DISCORD_WEBHOOK_URL=...` (optionnel)
- `REPOS_CONFIG_PATH=repos.json`

Puis:

```bash
npm run build
```

## 5) Demarrer avec PM2

Le fichier `ecosystem.config.cjs` est deja fourni.

```bash
pm2 start ecosystem.config.cjs
pm2 status
pm2 save
pm2 startup
```

`pm2 startup` va afficher une commande a relancer en sudo: execute-la.

## 6) Nginx reverse proxy

Copie le template fourni:

```bash
sudo cp deploy/nginx-emulator-radar.conf /etc/nginx/sites-available/emulator-radar
```

Edite `server_name` dans ce fichier (remplace `radar.example.com`).

Puis active:

```bash
sudo ln -s /etc/nginx/sites-available/emulator-radar /etc/nginx/sites-enabled/emulator-radar
sudo nginx -t
sudo systemctl reload nginx
```

## 7) HTTPS (Let's Encrypt)

```bash
sudo certbot --nginx -d radar.tondomaine.com
```

## 8) Maintenance / updates

Pour deployer une nouvelle version:

```bash
cd /var/www/emulator-update
git pull
npm ci
npm run build
pm2 restart emulator-radar
pm2 save
```

Logs utiles:

```bash
pm2 logs emulator-radar
pm2 status
```

## 9) Persistance SQLite et backup

La base est dans:

- `data/releases.db`

Sauvegarde manuelle:

```bash
mkdir -p backups
cp data/releases.db "backups/releases-$(date +%F-%H%M).db"
```

Tu peux automatiser avec une cron quotidienne.
