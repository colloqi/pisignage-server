'use strict'; // REMOVE AFTER MIGRATING require TO import statements

const config = require("../../config/config"),
    rest = require("../others/restware"),
    fs = require("fs").promises,
    path = require("path");

const systemPlaylists = [
    {
        name: "TV_OFF",
        settings: {},
        assets: [],
        layout: "1",
        schedule: {},
    },
];

const isPlaylist = (file) => {
    return file.startsWith("__") && file.endsWith(".json");
};

exports.newPlaylist = async (playlist) => {
    const file = path.join(config.mediaDir, `__${playlist}.json`),
        data = {
            name: playlist,
            settings: {
                ticker: {
                    enable: false,
                    behavior: "scroll",
                    textSpeed: 3,
                    rss: { enable: false, link: null, feedDelay: 10 },
                },
                ads: { adPlaylist: false, adCount: 1, adInterval: 60 },
                audio: { enable: false, random: false, volume: 50 },
            },
            assets: [],
            layout: "1",
            templateName: "custom_layout.html",
            schedule: {},
        };

    try {
        await fs.writeFile(file, JSON.stringify(data, null, 4));
        return data;
    } catch (error) {
        throw new Error(error);
    }
};

exports.index = async (req, res) => {
    const assetDir = path.join(config.mediaDir);

    try {
        const files = await fs.readdir(assetDir);
        const playlists = files.filter(isPlaylist);

        const list = [];

        playlists.sort((str1, str2) =>
            str1.localeCompare(str2, undefined, { numeric: true })
        );

        const readFile = async (plfile) => {
            const playlist = {
                settings: {},
                assets: [],
                name: path.basename(plfile, ".json").slice(2),
            };

            try {
                const playlistFileData = await fs.readFile(
                    path.join(assetDir, plfile),
                    "utf8"
                );

                if (!playlistFileData) {
                    list.push(playlist);
                    return;
                }

                let playlistFileDataJSON = {};

                try {
                    playlistFileDataJSON = JSON.parse(playlistFileData);
                } catch (error) {
                    console.error(
                        "playlist index parsing error for: ",
                        req.installation
                    );
                }

                playlist.settings = playlistFileDataJSON.settings || {};
                playlist.assets = playlistFileDataJSON.assets || [];
                playlist.layout = playlistFileDataJSON.layout || "1";
                playlist.templateName =
                    playlistFileDataJSON.templateName || "custom_layout.html";
                playlist.videoWindow = playlistFileDataJSON.videoWindow || null;
                playlist.zoneVideoWindow =
                    playlistFileDataJSON.zoneVideoWindow || {};
                playlist.schedule = playlistFileDataJSON.schedule || {};
                list.push(playlist);

                return;
            } catch (error) {
                console.error("Error reading playlist file: ", { error });
                list.push(playlist);

                return;
            }
        };

        for (const playlist of playlists) {
            try {
                await readFile(playlist);
            } catch (error) {
                return rest.sendError(
                    res,
                    "playlist read error",
                    error.message
                );
            }
        }

        return rest.sendSuccess(
            res,
            " Sending playlist list",
            list.concat(systemPlaylists)
        );
    } catch (error) {
        return rest.sendError(res, "directory read error", error.message);
    }
};

exports.getPlaylist = async (req, res) => {
    const file = path.join(config.mediaDir, `__${req.params["file"]}.json`);

    try {
        const playlistFileData = await fs.readFile(file, "utf8");

        if (playlistFileJSON) {
            const playlistFileJSON = JSON.parse(playlistFileData);

            return rest.sendSuccess(
                res,
                " Sending playlist content",
                playlistFileJSON
            );
        } else {
            return rest.sendError(res, "Error reading playlist file!");
        }
    } catch (error) {
        return rest.sendError(res, "Playlist file read error", error.message);
    }
};

exports.createPlaylist = async (req, res) => {
    const newPlaylistName = req.body["file"];

    if (newPlaylistName === "TV_OFF") {
        console.error("Cannot create 'TV_OFF' playlist file!");
        return rest.sendError(
            res,
            "Playlist write error",
            "Cannot create 'TV_OFF' playlist file!"
        );
    }

    try {
        const newPlaylistData = await exports.newPlaylist(newPlaylistName);
        return rest.sendSuccess(res, "Playlist Created: ", newPlaylistData);
    } catch (error) {
        return rest.sendError(res, "Playlist write error", error.message);
    }
};

exports.savePlaylist = async (req, res) => {
    const file = path.join(config.mediaDir, `__${req.params["file"]}.json`);

    let playlistFileData;

    try {
        playlistFileData = await fs.readFile(file, "utf-8");
    } catch (error) {
        console.error("Error reading playlist file: ", error);

        if (error.code == "ENOENT" && req.params["file"] == "TV_OFF") {
            playlistFileData = JSON.stringify(systemPlaylists[0]);
        } else {
            return rest.sendError(
                res,
                "Playlist file read error",
                error.message
            );
        }
    }

    let fileData = {};
    let dirty = false;

    if (playlistFileData) {
        try {
            fileData = JSON.parse(playlistFileData);
        } catch (error) {
            console.error(`savePlaylist parsing error for ${file}`, { error });
        }

        fileData.version = fileData.version || 0;
        fileData.layout = fileData.layout || "1";
    }

    if (req.body.name) {
        fileData.name = req.body.name;
        dirty = true;
    }
    if (req.body.settings) {
        fileData.settings = req.body.settings;
        dirty = true;
    }

    if (req.body.assets) {
        fileData.assets = req.body.assets;
        dirty = true;
    }
    if (req.body.schedule) {
        fileData.schedule = req.body.schedule;
        dirty = true;
    }
    if (req.body.layout) {
        fileData.layout = req.body.layout;
        fileData.templateName = req.body.templateName;
        fileData.videoWindow = req.body.videoWindow || null;
        fileData.zoneVideoWindow = req.body.zoneVideoWindow || null;
        dirty = true;
    }

    if (dirty) {
        fileData.version += 1;

        try {
            await fs.writeFile(file, JSON.stringify(fileData, null, 4));

            return rest.sendSuccess(res, "Playlist Saved: ", fileData);
        } catch (error) {
            return rest.sendError(res, "Playlist save error", error.message);
        }
    } else {
        return rest.sendSuccess(res, "Nothing to Update: ", fileData);
    }
};

