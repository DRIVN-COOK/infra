# DRIVN-COOK — README (Guide Dev & Prod)

> multi repo : **front-office**, **back-office**, **api**, **infra**, **shared**  
> Stack : **React (Vite)**, **Express + TypeScript**, **Prisma + PostgreSQL**, **Docker + Nginx**, **Vitest**

---

## Sommaire

- [Architecture & dépôts](#architecture--dépôts)
- [Prérequis](#prérequis)
- [Variables d’environnement](#variables-denvironnement)
- [Cloner & installer](#cloner--installer)
- [Développement (local)](#développement-local)
  - [Démarrer la base (Docker)](#démarrer-la-base-docker)
  - [API (Node/TS)](#api-nodets)
  - [Front-office (Vite)](#front-office-vite)
  - [Back-office (Vite)](#back-office-vite)
- [Tests (API)](#tests-api)
- [Prod locale (simulation fidèle)](#prod-locale-simulation-fidèle)
- [CI (rappel)](#ci-rappel)
- [Commandes utiles](#commandes-utiles)
- [Troubleshooting](#troubleshooting)

---

## Architecture & dépôts

```
DRIVN-COOK/
├─ shared/          # lib partagée (utils, hooks, composants)
├─ front-office/    # app franchisés (React)
├─ back-office/     # app admin (React)
├─ api/             # API Node/Express (TS, Prisma)
└─ infra/           # Docker, Nginx, compose (dev & prod)
```

---

## Prérequis

- Node **20+**, npm **10+**
- Docker & Docker Compose
- (si `shared` est un package privé) un **PAT GitHub Packages** + `.npmrc` configuré

---

## Variables d’environnement

### 1) Fichier **`infra/.env`** 

```env
# --- Runtime ---
NODE_ENV=development
LOG_LEVEL=info

# --- API / CORS ---
PORT_API=3000
CORS_ORIGIN=http://localhost:3002,http://127.0.0.1:3002,http://localhost:3001,http://127.0.0.1:3001,http://app.localhost,http://admin.localhost

# --- Fronts (ports + base URLs) ---
PORT_FRONT=3001
PORT_BACK=3002
VITE_API_URL=/api

# --- Reverse proxy (nginx) ---
NGINX_PORT=80
NGINX_SERVER_NAME=drivncook.local
FRONT_SERVER_NAME=app.localhost
BACK_SERVER_NAME=admin.localhost
API_PREFIX=/api/
API_UPSTREAM=api:3000

# --- DB ---

DB_HOST=db
DB_PORT=5432
DB_USER=drivncook
DB_PASSWORD=change-me
DB_NAME=drivncook
DB_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}

# --- Redis (si tu l’ajoutes plus tard) ---
REDIS_HOST=redis
REDIS_PORT=6379

# --- Mail (si/plus tard) ---
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USER=change-me
MAIL_PASSWORD=change-me

JWT_ACCESS_SECRET=super-long-random-access-secret
JWT_REFRESH_SECRET=super-long-random-refresh-secret
JWT_ACCESS_EXPIRES=5m
JWT_REFRESH_EXPIRES=7d
```

> `*.localhost` (ex. `app.localhost`, `admin.localhost`) pointe automatiquement vers `127.0.0.1` dans les navigateurs → pas besoin de modifier `/etc/hosts`.

### 2) Fichier **`api/.env`** (dev local **hors Docker**)

Quand tu lances l’API **en local** (pas via compose), crée **`api/.env`** avec au minimum :

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=drivncook
DB_PASSWORD=change-me
DB_NAME=drivncook
DB_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}
```

---

## Cloner & installer

```bash
# Depuis ton dossier de travail
git clone <ORG>/shared.git
git clone <ORG>/front-office.git
git clone <ORG>/back-office.git
git clone <ORG>/api.git
git clone <ORG>/infra.git

# Dépendances
( cd shared        && npm ci && npm run build || true )
( cd front-office  && npm ci )
( cd back-office   && npm ci )
( cd api           && npm ci )
```

> Si `shared` est publié sur GitHub Packages, configure `~/.npmrc` :
>
> ```ini
> @drivn-cook:registry=https://npm.pkg.github.com
> //npm.pkg.github.com/:_authToken=${GH_TOKEN}
> ```

---

## Développement (local)

### Démarrer la base (Docker)

```bash
cd infra
docker compose -f docker-compose.dev.yml up -d db
# Attendre que le healthcheck passe
```

### API (Node/TS)

```bash
cd api
npm ci
npx prisma generate
# Si pas de migrations:
npx prisma db push
# Sinon:
# npx prisma migrate dev
npm run dev   # lance tsx watch sur :3000
```

### Front-office (Vite)

- Le client appelle **`/api/...`** ; Vite **proxy** vers `http://localhost:${PORT_API}` et **retire le préfixe** `/api`.

```bash
cd front-office
npm ci
npm run dev   # http://localhost:${PORT_FRONT} (3001 par défaut)
```

### Back-office (Vite)

```bash
cd back-office
npm ci
npm run dev   # http://localhost:${PORT_BACK} (3002 par défaut)
```

> **Pas de CORS** en dev si tu utilises le proxy Vite `/api`.  
> Si tu vises l’API en URL absolue (ex. `http://localhost:3000`), ajoute l’origin côté `CORS_ORIGIN` dans `api/.env`.

---

## Tests (API)

```bash
cd api
# S'assurer que DB_URL pointe vers une base accessible de test
npx prisma generate
# npx prisma db push  # ou migrate dev, selon ton setup
npm test              # vitest
```

> En CI, la base est lancée via un service Postgres éphémère. Les secrets `.env` sont injectés via `ENV_FILE`.

---

## Prod locale (simulation fidèle)

- Deux hôtes :  
  - **Front** → `http://app.localhost`  
  - **Back**  → `http://admin.localhost`  
- Chaque hôte proxifie **`/api/*`** vers l’API (et **strip** le préfixe `/api`).

```bash
cd infra
docker compose -f docker-compose.prod.yml up --build
```

- Vérif rapide :
  - `http://app.localhost` (SPA front)
  - `http://admin.localhost` (SPA back)
  - `http://app.localhost/api/health` → doit mapper vers l’API (`/health`)
  - `http://admin.localhost/api/health` → idem

> **Important Nginx** : le bloc `location ^~ /api/ { proxy_pass http://api:3000/; }` **doit** avoir un `/` final à `proxy_pass` pour retirer le préfixe `/api`.

---

## CI (rappel)

- Service Postgres (Docker) + **secret `ENV_FILE`** → écrit en `.env` dans le job
- Étapes : `npm ci` → `prisma generate` → `migrate deploy` → `build` → `test`

Extrait :

```yaml
- name: Create .env file from secret
  run: echo "${{ secrets.ENV_FILE }}" > .env
```

---

## Commandes utiles

```bash
# DB dev up/down
cd infra && docker compose -f docker-compose.dev.yml up -d db
cd infra && docker compose -f docker-compose.dev.yml down

# Build Prisma client
cd api && npx prisma generate

# Sync schema (dev rapide) VS migrations (prod/CI)
cd api && npx prisma db push
cd api && npx prisma migrate dev
cd api && npx prisma migrate deploy

# Lancer API dev
cd api && npm run dev

# Lancer fronts dev
cd front-office && npm run dev
cd back-office  && npm run dev

# Prod locale
cd infra && docker compose -f docker-compose.prod.yml up --build
```

---

## Troubleshooting

- **CORS** bloqué en dev :  
  - Assure-toi que le front appelle **`/api`** (proxy Vite).  
  - Si appel en URL absolue, ajoute l’origin à `CORS_ORIGIN` dans `api/.env`.
- **MIME “text/html” pour un script JS** :  
  - En mode sous-domaines, les deux builds Vite doivent avoir **`base: '/'`**.  
  - Vérifie que Nginx fait bien `try_files ... /index.html` sur le bon `root` (front vs back).
- **`/api` ne correspond pas à tes routes Express** :  
  - Nginx : `location ^~ /api/ { proxy_pass http://api:3000/; }` (le `/` final retire le préfixe).  
  - Vite proxy : `rewrite: (p) => p.replace(/^\/api/, '')`.
- **JWT refresh en erreur unique** : ajoute un `jwtid` aléatoire lors de la génération du refresh token.
- **Buildx manquant (Linux/WSL)** : installe `docker-buildx-plugin` et `docker-compose-plugin`.
```

