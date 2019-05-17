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

**2.3.0**

1. Inline with pisignage.com release 2.3.0 (**46f2de9**)
1. Kiosk UI (either in-built or provide url/zip of your UI app) - under group settings
1. Gapless video play (BETA)  - under group settings
1. Player-server communication interval under settings
1. Programmable delay for sending keystrokes to webpage link screen instead of fixed 10 seconds - under weblink 




**2.4.0**

1. Local folder/file play support 
2. Option for Random shuffle of assets in the player before start of play
3. Default resolution of new groups changed to 1080p
4. Display CPU temperature both in Centigrade and Fahrenheit
5. Option to interleave assets from different playlists while combining assets from multiple scheduled    playlists(instead of sequential add)
6. Group
    - Selection of playlist which is to be added as default for scheduling rows
    - Auto adjustment of end-date when start-date is changed to the same date if not later
7. Upload limit enhanced to 5GB for a file
8. USB export and import (for offline players)
    Deploy under Group and export asset repository to USB stick.
    Connect the USB stick to Pi player to import and deploy automatically
    player will reboot after copying assets and settings from USB
9. Bulk assigning of categories for assets, playlists and groups added
   Bulk deleting of assets added.
10. Dashboard added.

