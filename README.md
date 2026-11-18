# pisignage-server (v2-beta)

Server code to manage piSignage players in a LAN or private network, or to set up your own server.

This is the [`v2-beta`](https://github.com/colloqi/pisignage-server/tree/v2-beta) branch: Node.js 20, MongoDB 8.0 and the new v2 web UI.
It is a beta; a few installations are already running it and testing is still in progress.

## Recommended server configuration

- Intel CPU based VM or server
- 2GB minimum memory
- 30GB+ SSD or hard disk
- Linux based OS

## Requirements

- Node.js 20 LTS
- MongoDB 8.0
- ffmpeg and ffprobe (video conversion and metadata)
- ImageMagick (thumbnails)
- Git

## Install

Pick one of the three options.

### Option 1: one-shot installer (Debian / Ubuntu / RHEL family)

[pisignage-install.yml](pisignage-install.yml) installs Node.js, MongoDB and the other packages, clones this branch, and runs the server as a systemd service.

```bash
sudo apt-get install -y ansible        # RHEL family: sudo dnf install -y ansible-core
ansible-playbook pisignage-install.yml -K
```

The options are described at the top of the file.

### Option 2: manual install

Step-by-step instructions are in [INSTALL-debian.md](INSTALL-debian.md). In short, once Node.js 20, MongoDB 8.0, ffmpeg and ImageMagick are installed:

```bash
mkdir -p ~/pisignage && cd ~/pisignage
git clone -b v2-beta https://github.com/colloqi/pisignage-server.git
mkdir -p media
cd pisignage-server
npm install
NODE_ENV=production PORT=3000 node server.js
```

For Windows and macOS, install the same requirements from their own websites
([MongoDB](https://www.mongodb.com/docs/manual/installation/), [Node.js](https://nodejs.org/en/download),
[ffmpeg](https://www.ffmpeg.org/download.html), [ImageMagick](https://imagemagick.org/script/download.php))
and then run the commands above.

To start the server on boot, use pm2 (see [INSTALL-debian.md](INSTALL-debian.md)) or a systemd service (see [Init service example for systemd.md](<Init service example for systemd.md>)).

### Option 3: Docker

```bash
git clone -b v2-beta https://github.com/colloqi/pisignage-server.git
cd pisignage-server
docker compose up -d --build
```

This builds the server image and starts it together with MongoDB 8.0. More detail is in [Creating Docker Image.md](<Creating Docker Image.md>).

## Migrating an existing server

If you already run an older pisignage-server and want to keep its data, follow [MIGRATION.md](MIGRATION.md) instead of a fresh install. Take a backup first. The guide covers both native and Docker installs.

## Updating

To pick up newer commits on this branch:

```bash
cd ~/pisignage/pisignage-server
git pull
npm install
```

Then restart the server (for example `pm2 restart pisignage` or `sudo systemctl restart pisignage`).
For Docker, run `git pull` followed by `docker compose up -d --build`.

## First-time setup

1. Open Chrome at [http://localhost:3000](http://localhost:3000) or `http://[your-ip]:3000` (for example 192.168.1.30:3000). It opens the v2 UI.
2. Log in with the default credentials `pi` / `pi`, and change them under Settings.
3. Under Settings, set the username to your sign-in username at pisignage.com (it is **not** your email id). Player licenses are not enabled otherwise.
4. Download your license files from email or from pisignage.com and upload them under Settings, so that they are installed on the players automatically.
5. New player software releases are pulled to the server automatically, and you can upgrade players from the server.

## Configuration

| Setting | How to change it | Default |
|---|---|---|
| Port | `PORT` environment variable | `3000` |
| Mode | `NODE_ENV` environment variable (`production` or `development`) | `development` |
| MongoDB connection | `MONGOLAB_URI` environment variable | `mongodb://127.0.0.1:27017/pisignage-server-prod` in production, `pisignage-server-dev` in development |
| Media folder | `media`, next to the `pisignage-server` folder | created on startup |
| Data folder (licenses, releases, sync folders) | `data`, inside the `pisignage-server` folder | created on startup |

The REST API is at `http://[your-ip]:3000/api/...` and uses HTTP Basic authentication with the same credentials as the UI.
The earlier AngularJS UI is still bundled at `http://[your-ip]:3000/index.html`.

## Configure the players

In player settings, the port number must be part of the server name, for example `192.168.1.12:3000`.

1. Download the pisignage player software and prepare the SD card as per the [instructions](https://github.com/colloqi/piSignage#method-1-download-image-and-prepare-the-sd-card).

2. After the player boots, set the admin and media server to your server address and port using one of these methods:

   a. Using the webUI of the player at `http://[player IP]:8000/settings`

   b. Connect a keyboard and press Ctrl-N or F6
      * Change config and media server to `http://[your server ip]:port` (for example 192.168.1.30:3000)
      * Open a terminal with `ctrl+Alt+t` and delete any existing `_config.json` and `_settings.json` files from the `/home/pi/piSignagePro/config` directory

   c. Connect through ssh
      * Edit `/home/pi/piSignagePro/package.json` for the admin and media server configuration
      * Delete any existing `_config.json` and `_settings.json` files from the `/home/pi/piSignagePro/config` directory

## Features

1. Player management
    - Auto discovery of players in a network
    - Monitor players

2. Group management - create groups and assign players to groups
    - Display settings - 1080p/720p and landscape or portrait mode
    - Deploy default playlist, scheduled playlists and advt playlist
    - Assign players to groups

3. Assets management
    - Upload assets (video, mp3, html/zip, images, links)
    - Videos are automatically converted to mp4 using ffmpeg
    - Thumbnail creation for videos, and video metadata extraction to store in the database
    - Add labels to manage assets
    - View details of files
    - Rename or delete files
    - View assets locally

4. Playlist management
    - Create, rename or delete playlists
    - Assign assets and drag to change order
    - Assign duration for non-video assets
    - Select a layout to show (1, 2a, 2b, 3a, 3b, 4, 4b, 2ab)
    - Enable ticker and set ticker text
    - Make it an ad playlist with a configurable interval timer

## Points to remember

1. The server needs ffmpeg, ffprobe and ImageMagick. Without them videos cannot be uploaded and thumbnails are not created. The startup log reports whether the system check passed.

2. The server creates the `media` and `media/_thumbnails` directories on startup. If it cannot (for example because of permissions), create them manually; thumbnails are not created otherwise.

3. Make sure the **mongod** process is running before starting the server.

4. You can also manage a player directly from a browser at `http://[player IP]:8000`.

5. Make sure the installation name under Settings is the same as your username (not email) at pisignage.com.

***Please raise an issue for problems or send us an email at support@pisignage.com***
