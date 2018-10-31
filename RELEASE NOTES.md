##Features not available from pisignage.com
 
1. User management
1. Reports module
1. Notice Creation
1. IP Location of players 
1. Option to set name & location for each player
1. Auto deploy when group config screen is exited
1. Calendar view for multiple playlists scheduling under Group
1. Link edit
1. Availability of beta version
1. System Notice as part of playlist

**1.6.0**    
1. customized logo and url (directly change at public/app/img/pisignage-logo.png and public/app/partials/menu.jade)    
2. UI changes (specific to pisignage.com)    
3. editing of links    
4. Showing playlists associated with Asset in Asset List and Edit screens, thumbnail in Edit assets    
5. License Status, player name change, location display    

**1.7.0**    
1. Assign asset directly to multiple playlists in asset details screen and assets list screen    
2. Deploy All button    
3. warn user to deploy in playlist   
4. deploy to groups from playlist    
5. Player MAC address display on the server page    
6. font download from Google for offline use    
7. tooltips    

**1.8.5**
1. drag and drop of assets to upload

**1.9.5a**
1. Randomising assets order in a playlist


**2.0.0**
1. In line with player version 2.0.0

**2.2.1**

1. Inline with pisignage.com release 2.2.1 (**074d2b4**)
1. Deprecate warnings removed for req.param, Buffer and mongoose promises
1. Support for new socket.io and faster disconnection
    - for the new socket.io version to be used specify the http protocol in server name if server does not support https protocol
1. Support for player configuration
    - Specify reboot of player everyday
    - mainzoneOnly flag in videoWindow to support full screen video in custom layouts
    - Online only playlist which is scheduled only when player is online
    - Audio playlist on HDMI port configuration
1. OpenVG (beta) ticker support
1. Show player uptime, processor temperature and space available in player (in player screen)
1. Alphabetical listing of players and all assets, groups, labels and playlists
1. Single button to deploy to all groups
1. Last sync, last reported format change to time ago
1. Auto orientation of image based on image header
1. Snapshot orientation corrected for portrait modes
1. Remove spaces from zipfile names


