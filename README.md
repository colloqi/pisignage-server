# pisignage-server
**Server to manage piSignage players in a LAN or Private Network**

##Getting Started
1. Install mongodb
     - **Linux**
     ```
        sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10
        
        echo "deb http://repo.mongodb.org/apt/ubuntu "$(lsb_release -sc)"/mongodb-org/3.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.0.list
        
        sudo apt-get update
        
        sudo apt-get install -y mongodb-org
    ```
        check for `/data/db` directory , If not found create using `sudo mkdir -p /data/db` and change the permission using `sudo chmod -R 755 /data`
     - **Mac**
        
        Please use Homebrew
        ```
        brew update
        
        brew install mongodb
        ```
        check for `/data/db` directory , If not found create using `sudo mkdir -p /data/db` and change the permission using `sudo chmod -R 755 /data`
            
     - **Windows**
     
        Please refere [here](http://docs.mongodb.org/manual/tutorial/install-mongodb-on-windows/#install-mongodb-on-windows)
        
    For More info please refer [here](http://docs.mongodb.org/manual/installation/)
        
2. Install node.js and npm
     - **Linux**
        ```
        curl -sL https://deb.nodesource.com/setup_0.12 | sudo bash -
        
        sudo apt-get install -y nodejs
        ```
     - **Mac**
        ```
        brew install node
        ```
        You may be asked to run above command as super user. If asked please do so.
        
     - **Windows**
        
        get .msi from [here](https://nodejs.org/download/)
        
    For more info, please refere [here](https://github.com/joyent/node/wiki/Installation)
        
3. clone this reporsitory and run follwing commands
    ```
    git clone https://github.com/ariemtech/pisignage-server 
    
    cd pisignage-server
    
    npm install
    ```
4. Currently network port is configured as 3000 in local server. Modify in the file `config/env/development.js` for the port
5. Run node server with `sudo node server.js`
6. Open Chrome browser and check at [http://localhost:3000](http://localhost:3000) **OR** `http://[your-ip]:3000`


###Configure Pi
1. Download the pisignage player software
2. Configure admin and media server to your local address and port using one the following
    a. Connect Keyboard and press Ctrl-N or F6
        - Selection of Admin & Content Server
        - LAN and Wifi settings
        - delete any existing _config.json and _settings.json file from /home/pi/piSignagePro/config directory
    b. connect through ssh
        - Edit /home/pi/piSignagePro/package.json for admin and media server configuration
        - delete any existing _config.json and _settings.json file from /home/pi/piSignagePro/config directory

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

###Points to remember
1. angularjs-dropdown-multiselect is taken directly from 
    https://github.com/dotansimha/angularjs-dropdown-multiselect/pull/23/files instead of bower (for close-on-select to work)
2. Requires following programs to work
    - ffmpeg >= 0.9
    - ffprobe associated with ffmpeg
    - imagemagick


####You can also manage players using Browser(http://playerip:8000) or downloading Chrome app
1. Currently it is not possible to change admin and media server from this interface, 
    you can either edit /home/pi/piSignagePro/package.json manually or connect a keyboard to Pi and press F6 or Ctrl-N
    
####The code is still in early release, Please raise an issue for problems or send an email to info@pisignage.com
