# Migrating an existing pisignage-server to v2-beta (MongoDB 8.0)

This guide moves an existing install (the `master` branch) to the
[`v2-beta`](https://github.com/colloqi/pisignage-server/tree/v2-beta) branch.

> **Beta:** a few installations have already migrated, but v2-beta is still
> being tested. Keep the old install and the backup untouched until the new
> server is verified.

## What changes

| | `master` | `v2-beta` |
|---|---|---|
| Node.js | 8+ | 20 LTS |
| MongoDB | 4.4 / 5.0 | 8.0 |
| Database in production mode | `pisignage-server-dev` | `pisignage-server-prod` |
| Database in development mode | `pisignage-server-dev` | `pisignage-server-dev` |
| UI at `/` | AngularJS UI | v2 React UI (old UI at `/index.html`) |

- Data is moved with `mongodump` / `mongorestore`. This works from an older
  MongoDB (for example 5.0) straight to 8.0, with no need to upgrade MongoDB
  one major version at a time.
- The old server stored its data in `pisignage-server-dev` in every mode. The
  new server uses `pisignage-server-prod` when started with
  `NODE_ENV=production`, so the database is renamed during restore (step 5).

## Steps

### 1. Stop the old server and take a backup (old machine)

Confirm the database name first with `show dbs` in the mongo shell. Installs
from before Nov 2016 may use `pisignage-dev`.

```bash
mongodump --db pisignage-server-dev --out ~/pisignage-backup/db
tar czf ~/pisignage-backup/media.tgz -C ~/pisignage media
tar czf ~/pisignage-backup/data.tgz  -C ~/pisignage/pisignage-server data
```

Adjust `~/pisignage` to your install location. `media` is the folder next to
the repo (assets, thumbnails, logs); `data` holds licenses and sync folders.
Dump only the app database, not `admin`, `local` or `config`.

### 2. Install Node.js 20 and MongoDB 8.0 (target machine)

Follow sections 1–3 of [INSTALL-debian.md](INSTALL-debian.md).

If you are reusing the same machine, remove the old MongoDB packages and move
the old `/var/lib/mongodb` aside first. MongoDB 8.0 will not start on data
files written by an older version.

### 3. Get the new code and install dependencies

```bash
mkdir -p ~/pisignage && cd ~/pisignage
git clone -b v2-beta https://github.com/colloqi/pisignage-server.git
cd pisignage-server
npm install
```

If you reuse an existing checkout instead (`git fetch && git checkout v2-beta`),
delete `node_modules` before running `npm install`.

### 4. Restore media and data

```bash
tar xzf ~/pisignage-backup/media.tgz -C ~/pisignage
tar xzf ~/pisignage-backup/data.tgz  -C ~/pisignage/pisignage-server
```

### 5. Restore the database

**Production mode** (the pm2 command below and `pisignage-install.yml` both use
it) — rename the database on restore:

```bash
mongorestore --nsFrom 'pisignage-server-dev.*' --nsTo 'pisignage-server-prod.*' ~/pisignage-backup/db
```

**Development mode** (plain `node server.js`) — keep the old name:

```bash
mongorestore ~/pisignage-backup/db
```

If the restore reports an index error, add `--noIndexRestore`; the server
recreates its indexes on startup. To use a different database altogether, set
the `MONGOLAB_URI` environment variable to its connection string.

### 6. Start the server

```bash
sudo npm install -g pm2
NODE_ENV=production PORT=3000 pm2 start server.js --name pisignage
pm2 save
pm2 startup     # run the command it prints, to start on boot
```

The log should show `MongoDB connected successfully` followed by
`Express server listening on port 3000 in production mode`.

### 7. Verify

- Open `http://<server-ip>:3000/` and log in with your existing credentials
  (they are stored in the database).
- Check that groups, playlists, assets and players are all listed.
- Compare record counts with the old server, for example
  `db.players.countDocuments()`, and the same for `groups` and `assets`.
- Deploy to one group and confirm a player picks it up.

## Docker installs

The compose files on this branch run Node.js 20 and MongoDB 8.0. MongoDB 8.0
uses new volumes (`mongodb8`, `mongodb8_config`), so the old `mongodb` volume
is left untouched and remains available for rollback. The `media` and `data`
volumes are reused as they are.

Run these from the directory that holds your compose file, so the same compose
project (and its volumes) is used throughout.

```bash
# 1. With the OLD stack still running, dump the database to a file
docker compose exec -T mongo mongodump --archive --db pisignage-server-dev > pisignage-dump.archive

# 2. Stop the old stack (volumes are kept)
docker compose down

# 3. Switch to v2-beta
git fetch && git checkout v2-beta

# 4. Start only MongoDB 8.0 and restore into the new database name
docker compose up -d mongo
docker compose exec -T mongo mongorestore --archive \
    --nsFrom 'pisignage-server-dev.*' --nsTo 'pisignage-server-prod.*' < pisignage-dump.archive

# 5. Build and start the server
docker compose up -d --build
docker compose logs -f pisignage-server
```

Then verify as in step 7 above.

Inside the container the server reads media from `/media` and data from
`/pisignage-server/data` (the old image used `/data`); the compose files mount
the existing `media` and `data` volumes at those paths. The MongoDB connection
string comes from the `MONGOLAB_URI` environment variable in the compose file.

## Notes

- **Keep the same server IP and port** so players reconnect without being
  reconfigured.
- **Stricter validation:** players need a 16-character `cpuSerialNumber`, and
  group and label names are required. Older records that break these rules
  still load but fail when saved.
- **Rollback:** stop the new server and start the old install again. On a
  separate machine the old install is untouched. On the same machine, reinstall
  the old MongoDB version and put the old `/var/lib/mongodb` back first.
