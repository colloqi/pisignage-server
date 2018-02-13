# pisignage-server

Server code to manage piSignage players in a LAN or Private Network or to setup your own server!


## New version 1.9.5a has been released! 
     
**Upgrading to 1.9.5a from existing versions**  
1. git pull origin master and apply your code changes if any 
1. If you are upadating from before 24 Nov 2016, please change the uri variable in config/env/development.js to 'mongodb://localhost/pisignage-dev' to retain the old data
2. start the pisignage-server and go to url localhost:3000
3. Enter the username of yours at pisignage.com (not the email ID) (or change under settings, otherwise player license will not be enabled)
4. Default authentication credentials for player webUI has been changed to pi:pi
5. New settings tab has been added for settings instead of config/env/all.js file
6. New player software upgrades are automatically pulled to the server and you can upgrade from the local server itself
7. Upload new licenses bought to the local server so that they are automatically installed in the pi
8. Authentication has been added to the server UI which can be changed under settings (default pi:pi)

## Getting Started


    Note: Instructions may change, please refer to the respective package/OS websites for the latest,   
            Write to us at support@pisignage.com for help.


1. Install mongodb - open-source document database

    Refer mongodb install guides to install mongodb. 

   - Windows: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/
   - Linux: https://docs.mongodb.com/manual/administration/install-on-linux/
   - Mac OS X: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-os-x/ 
        
2. Install node.js and npm - open source server framework

   https://nodejs.org/en/download/package-manager/
         
3. Install ffmpeg - video converter

   https://www.ffmpeg.org/download.html

   
4. Install imagemagick - tool for image edit, conversion

    https://www.imagemagick.org/script/download.php
    
5. Install Git -  distributed version control system

    https://git-scm.com/downloads

5. Clone this reporsitory and run follwing commands

    - git clone https://github.com/colloqi/pisignage-server 
    - mkdir media
    - mkdir media/_thumbnails
    - cd pisignage-server
    - npm install
    
6. Currently network port is configured as 3000 in local server. Modify in the file `config/env/development.js` for the port

7. Run node server with `node server.js`

8. Open Chrome browser and check at [http://localhost:3000](http://localhost:3000) **OR** `http://[your-ip]:3000` (ex: 192.168.1.30:3000, 10.50.16.110:3000)

9. Do the following configuration before you start   
    - Under settings, configure the username to be same as that of your signin username at pisignage.com (it is **not** your email id)  
    - Download the license files either from email or from pisignage.com, upload them to your local server under settings  
    - You can upgrade your players directly from your local server 
    - authentication is pi & pi, you can change this under settings

**NOTE:** Please make sure **mongod** process is running and **/data/db** owenership is changed to regular user. If not use, ``` sudo chown -R your-username:user-group /data```
### Configure Pi

    In player settings, PORT number should be part of server name for e.g. 192.168.1.12:3000

1. Download the pisignage player software and prepare SD card as per [instructions](https://github.com/colloqi/piSignage#method-1-download-image-and-prepare-the-sd-card)

2. After player boots, configure admin and media server to your local address and port using one of the below methods  

   a. Using the webUI of the player at http://[player IP]:8000/settings
  
   b. Connect Keyboard and press Ctrl-N or F6    
      * Change config and media server to `http://[your server ip]:port` (ex: 192.168.1.30:3000, 10.50.16.110:3000)   
      * Open terminal `ctrl+Alt+ t` and delete any existing _config.json and _settings.json file from `/home/pi/piSignagePro/config` directory      
   
   c. Connect through ssh
      * Edit `/home/pi/piSignagePro/package.json` for admin and media server configuration    
      * delete any existing _config.json and _settings.json file from `/home/pi/piSignagePro/config` directory    

## Features  

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
 

### Points to remember

1. angularjs-dropdown-multiselect is taken directly from   
    https://github.com/dotansimha/angularjs-dropdown-multiselect/pull/23/files instead of bower (for close-on-select to work)  

2. Requires following programs to work  
    - ffmpeg >= 0.9  (in certain OS, these may have to be compiled since the package does not exist, 
      please see the issue #9)   
    - ffprobe associated with ffmpeg needed to convert videos    
    - imagemagick  creates thumbnails
    
3. Two directories are created by the program ../media and ../media/_thumbnails. If these directories are not created server won't work as expected (for e.g. thumbnails won't be created if _thumbnails directory does not exit). In that case create those directories manually.


4. You can also manage players using Browser(http://playerip:8000) or downloading Chrome app

5. Make sure installation under settings page is same as your username (not email) at pisignage.com  

    
***Please raise an issue for problems or send us email at support@pisignage.com***  
