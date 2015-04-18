# pisignage-server
##Server to manage piSignage players in a LAN or Private Network

1. Supports one installation per instance
2. User Module - Plan to develop allow single or few users to manage (can submit your feature requests)
3. Player management
    - Auto discovery of players in a network
4. Group management - create groups and assign players to groups
    - Display settings - 1080p/720p and landscape or portrait mode
    - Deploy default playlist, scheduled playlists and advt playlist
    - Assign Players and Monitor
5. Assets Management
    - Upload assets (mp4,mp3,html/zip,jpg/png/gif)
    - Create simple notice  (v2)
    - Create Google Calendar feed (v2)
    - Add labels
    - View Details of files
    - Auto conversion of video formats to mp4 (v2)
    - Thumbnail creation (v2)
    - rename or delete files
    - view locally and change labels
    - filters based on labels or type or playlist
    - auto label creation for uploaded time
6. Playlist management
    - Create, rename or delete playlists
    - Assign assets & drag to change order
    - duration for non-video assets
    - select a layout to show (1,2a,2b,3a,3b,4,4b,2ab)
    - Enable ticker & set Ticker text
    - Make it ad playlist with configurable interval timer
7. Settings
    - De-Register a player
    - Add a collaborator (v2+)
    - Set Username/password for download
8. Reports
    - Not planned (Feature requests welcome)

##Configurable from player web interface (http://playerip:8000)
1. Settings
    - Selection of Admin & Content Server (v2)
    - Network Settings(LAN,Wifi)
    - Display settings (size, orientation)
2. Assets and Playlist management

##Connect Keyboard and press Ctrl-N or F6
1. Selection of Admin & Content Server
2. LAN and Wifi settings



Points to remember
--------------------
1. Close on select took min.js file from https://github.com/dotansimha/angularjs-dropdown-multiselect/pull/23/files
2. fluent-ffmpeg requires ffmpeg >= 0.9 to work.
