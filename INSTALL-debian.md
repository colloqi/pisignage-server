# Installing pisignage-server (open-source) on Debian

## 1. System packages
```bash
sudo apt-get update
sudo apt-get install -y git curl build-essential ffmpeg imagemagick
```


## 2. Node.js 20 LTS (NodeSource)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v        # v20.x
```

## 3. MongoDB 8.0

**Debian 11/12 (bullseye/bookworm) & Ubuntu** — use the signed key:
```bash
sudo apt-get install -y gnupg curl
curl -fsSL https://pgp.mongodb.com/server-8.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor

# Debian 11/12:
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/debian bookworm/mongodb-org/8.0 main" \
  | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
# Ubuntu 22.04/24.04 instead:
# echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list

sudo apt-get update && sudo apt-get install -y mongodb-org
```

**Debian 13 (trixie)** — apt's new Sequoia verifier (`sqv`) rejects MongoDB's
repo key (`Missing key …, the repository is not signed`). MongoDB has no
trixie-compatible key yet, so trust the repo over HTTPS instead of `signed-by`:
```bash
echo "deb [ arch=amd64,arm64 trusted=yes ] https://repo.mongodb.org/apt/debian bookworm/mongodb-org/8.0 main" \
  | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list

sudo apt-get update && sudo apt-get install -y mongodb-org
```
> `trusted=yes` skips only the OpenPGP repo-signature check; the download is
> still over HTTPS. It's the current workaround for MongoDB 8.0 on the
> just-released Debian 13 (officially unsupported — we use the **bookworm**
> packages, which run fine on trixie).

**Both** — start the service and verify:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mongod
sudo systemctl status mongod      # active (running)
mongod --version                  # db version v8.0.x
```
> The server connects to `mongodb://127.0.0.1:27017` (no auth) and creates the
> DB automatically on first run.

## 4. Get the code
```bash
mkdir -p ~/pisignage && cd ~/pisignage
git clone -b es6-mongodb8 https://github.com/santhoshmaderi/pisignage-server.git
cd pisignage-server
```

## 5. Create the media directory (a **sibling** of the repo)
The config uses `../media` relative to the server's working dir, so it must sit
one level **above** the repo folder:
```bash
mkdir -p ../media          # → ~/pisignage/media
```
(`data/` — sync_folders, licenses, releases — is created under the repo automatically.)

## 6. Install dependencies
```bash
npm install
```

## 7. Run the server

### Quick / development
```bash
node server.js             # or: npm start  (nodemon)
```
Expected output: `MongoDB connected successfully` … `Express server listening on port 3000 in development mode`.

### Production (recommended — pm2, auto-restart + boot)
```bash
sudo npm install -g pm2
NODE_ENV=production PORT=3000 pm2 start server.js --name pisignage
pm2 save
pm2 startup     # run the command it prints, to start on boot
```

Open the firewall if needed: `sudo ufw allow 3000`.

## 8. Access
- Browse to `http://<server-ip>:3000/` → it **redirects to the v2 React UI** and shows the login.
- Default credentials: **`pi` / `pi`** (change them under Settings → Download Access).
- Legacy AngularJS UI (still bundled): `http://<server-ip>:3000/index.html`.
- REST API: `http://<server-ip>:3000/api/...` (HTTP Basic auth).

---
