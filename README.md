# pisignage-server
##Server to manage piSignage players in a LAN or Private Network

##Getting Started
1. Install mongodb
2. Install node.js and npm
3. close this reporsitory
4. npm install


##Connect Keyboard and press Ctrl-N or F6
1. Selection of Admin & Content Server
2. LAN and Wifi settings
3. delete any existing _config.json and _settings.json file from /home/pi/piSignagePro/config directory

##Features
1. Player management
    - Auto discovery of players in a network
    - Monitor Players
2. Group management - create groups and assign players to groups
    - Display settings - 1080p/720p and landscape or portrait mode
    - Deploy default playlist, scheduled playlists and advt playlist
    - Assign Players to Groups
3. Assets Management
    - Upload assets (video,mp3,html/zip,images, links, google calendar feed)
    - Videos are automatically converted to mp4 using ffmpeg
    - Thumbnail creation for videos and video metadat extraction to store in data base
    - Add labels to manage assets
    - View Details of files
    - rename or delete files
    - view assets locally 
    - auto label creation for uploaded time (in coming releases)
4. Playlist management
    - Create, rename or delete playlists
    - Assign assets & drag to change order
    - assign duration for non-video assets
    - select a layout to show (1,2a,2b,3a,3b,4,4b,2ab)
    - Enable ticker & set Ticker text
    - Make it ad playlist with configurable interval timer
5. Reports & Logs
    - Not planned (Feature requests welcome)

##Points to remember
1. angularjs-dropdown-multiselect is taken directly from 
    https://github.com/dotansimha/angularjs-dropdown-multiselect/pull/23/files instead of bower (for close-on-select to work)
2. Requires following programs to work
    - ffmpeg >= 0.9
    - ffprobe associated with ffmpeg
    - imagemagick


##You can also manage players using Browser(http://playerip:8000) or downloading Chrome app
1. Currently it is not possible to change admin and media server from this interface, 
    you can either edit /home/pi/piSignagePro/package.json manually or connect a keyboard to Pi and press F6 or Ctrl-N