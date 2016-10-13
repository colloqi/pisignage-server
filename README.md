# pisignage-server
**Server to manage piSignage players in a LAN or Private Network**


##New version 0.9.0 has been released!      
###Upgrading to 0.9.0 from existing versions  
1. git pull origin master and apply your code changes if any 
2. start the pisignage-server and go to url localhost:3000
3. Enter the account name of yours at pisignage.com
4. Default authentication credentials for player webUI has been changed to pi:pi
5. New settings tab has been added for settings instead of config/env/all.js file
6. New software upgrades are automatically pulled to the server and you can upgrade from the local server itself
7. Upload new licenses bought to the local server so that they are automatically installed in the pi
8. Authentication has been added to the server UI which can be changed under settings (default pi:pi)

##Getting Started
1.Install mongodb

   - **Ubuntu**
     
     ```
        sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10
        
        echo "deb http://repo.mongodb.org/apt/ubuntu "$(lsb_release -sc)"/mongodb-org/3.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.0.list
        
        sudo apt-get update
        
        sudo apt-get install -y mongodb-org
     ```
        check for `/data/db` directory , If not found create using `sudo mkdir -p /data/db` and change the owner if needed using sudo chown `USERNAME` /data/db
     
   - **CentOS**
     
     ```
        
        echo -e "[mongodb-org-2.6] \nname=MongoDB 2.6 Repository \nbaseurl=http://downloads-distro.mongodb.org/repo/redhat/os/x86_64/ \ngpgcheck=0 \nenabled=1" | sudo tee /etc/yum.repos.d/mongodb-org-2.6.repo 
        
        sudo yum install -y mongodb-org
       
        
     ```
        check for `/data/db` directory , If not found create using `sudo mkdir -p /data/db` and and change the owner if needed using sudo chown `USERNAME` /data/db
     
   - **Mac**
        
        Please use Homebrew
        
     ```
        brew update
        
        brew install mongodb
     ```
        
        check for `/data/db` directory , If not found create using `sudo mkdir -p /data/db` and and change the owner if needed using sudo chown `USERNAME` /data/db
            
   - **Windows**
     
        Please refere [here](http://docs.mongodb.org/manual/tutorial/install-mongodb-on-windows/#install-mongodb-on-windows)
        
   For More info please refer [here](http://docs.mongodb.org/manual/installation/)
        
2.Install node.js and npm

   > In some installations there is another program called node, be sure to install nodejs. If other node program is laready installed you can find out by node --version command, it will not output anything. Uninstall the node program in that case 

   - **Ubuntu**
     ```
        curl -sL https://deb.nodesource.com/setup_0.12 | sudo bash -
        
        sudo apt-get install -y nodejs
     ```
        
   - **CentOS**
          
     ```
        sudo yum install -y epel-release
                
        sudo yum install -y nodejs
        
        sudo yum install -y npm
        
        sudo yum install -y git
     ````
        
   - **Mac**
     
     ```
        brew install node
     ```
        You may be asked to run above command as super user. If asked please do so.
        
   - **Windows**
        
        get .msi from [here](https://nodejs.org/download/)
        
   - For more info on node installation, please refer [here](https://github.com/joyent/node/wiki/Installation)
     
3. Install ffmpeg using below steps OR download from [here](https://www.ffmpeg.org/download.html)
   - **Ubuntu**
      
      ```
      sudo apt-get update
      
      sudo apt-get -y --force-yes install autoconf automake build-essential libass-dev libfreetype6-dev \
      libsdl1.2-dev libtheora-dev libtool libva-dev libvdpau-dev libvorbis-dev libxcb1-dev libxcb-shm0-dev \
      libxcb-xfixes0-dev pkg-config texi2html zlib1g-dev
      
      mkdir ~/ffmpeg_sources
      cd  ~/ffmpeg_sources
      
      sudo apt-get install yasm
      
      sudo apt-get install libx264-dev
      
      cd  ~/ffmpeg_sources
      wget -O fdk-aac.tar.gz https://github.com/mstorsjo/fdk-aac/tarball/master
      tar xzvf fdk-aac.tar.gz
      cd mstorsjo-fdk-aac*
      autoreconf -fiv
      ./configure --prefix="$HOME/ffmpeg_build" --disable-shared
      make
      make install
      make distclean
      
      cd  ~/ffmpeg_sources
      wget http://ffmpeg.org/releases/ffmpeg-snapshot.tar.bz2
      tar xjvf ffmpeg-snapshot.tar.bz2
      cd ffmpeg
      PATH="$HOME/bin:$PATH" PKG_CONFIG_PATH="$HOME/ffmpeg_build/lib/pkgconfig" ./configure \
      >   --prefix="$HOME/ffmpeg_build" \
      >   --pkg-config-flags="--static" \
      >   --extra-cflags="-I$HOME/ffmpeg_build/include" \
      >   --extra-ldflags="-L$HOME/ffmpeg_build/lib" \
      >   --bindir="$HOME/bin" \
      >   --enable-gpl \
      >   --enable-libass \
      >   --enable-libfdk-aac \
      >   --enable-libfreetype \
      >   --enable-libtheora \
      >   --enable-libvorbis \
      >   --enable-libx264 \
      >   --enable-nonfree
      PATH="$HOME/bin:$PATH" make
      make install
      make distclean
      hash -r
      ```
      Create a symboloic for ffprobe and ffmpeg (could be in /usr/local/bin or ~/bin) 
      ```
      
      sudo ln -s ~/bin/ffmpeg /usr/local/bin/ffmpeg  (or the directory where ffmpeg/ffprobe programs are created)
      sudo ln -s ~/bin/ffprobe /usr/local/bin/ffprobe  (or the directory where ffmpeg/ffprobe programs are created)
      
      ```
   - **Mac**
      ```
      brew install ffmpeg
      ```
      
      You may be asked to run above command as **root user**
   
4.Install imagemagik
   - **Ubuntu**
      
      ```
      sudo apt-get install imagemagick
      ```
   - **Mac**
   
      ```
      brew install imagemagick
      ```

5.Clone this reporsitory and run follwing commands

   ```
    git clone https://github.com/colloqi/pisignage-server 
    
    cd pisignage-server
    
    npm install
   ```
6.Currently network port is configured as 3000 in local server. Modify in the file `config/env/development.js` for the port

7.Run node server with `sudo node server.js`

8.Open Chrome browser and check at [http://localhost:3000](http://localhost:3000) **OR** `http://[your-ip]:3000` (ex: 192.168.1.30:3000, 10.50.16.110:3000)

9.Do the following configuration before you start( **New under 0.9.0** )    
    - Under settings, configure the username to be same as that of your signin username at pisignage.com  
    - Download the license files either from email or from pisignage.com, upload them to your local server under settings  
    - You can upgrade your players directly from your local server now
    - authentication is pi & pi, you can change this under settings

**NOTE:** Please make sure **mongod** process is running and **/data/db** owenership is changed to regular user. If not use, ``` sudo chown -R your-username:user-group /data```
###Configure Pi

***Please do not forget to give PORT number of server (default 3000)***

1. Download the pisignage player software [here](https://github.com/colloqi/piSignage#method-1-download-image-and-prepare-the-sd-card)

2. Once installed and Powered-ON Configure admin and media server to your local address and port using one of the below methods  

   a. Using the webUI of the player at http://[player IP]:8000/settings
  
   b. Connect Keyboard and press Ctrl-N or F6    
      * Change config and media server to `http://[your server ip]:port` (ex: 192.168.1.30:3000, 10.50.16.110:3000)   
      * Open terminal `ctrl+Alt+ t` and delete any existing _config.json and _settings.json file from `/home/pi/piSignagePro/config` directory      
   
   c. Connect through ssh
      * Edit `/home/pi/piSignagePro/package.json` for admin and media server configuration    
      * delete any existing _config.json and _settings.json file from `/home/pi/piSignagePro/config` directory    

##Features  

1.Player management  
    - Auto discovery of players in a network  
    - Monitor Players  

2.Group management - create groups and assign players to groups  
    - Display settings - 1080p/720p and landscape or portrait mode  
    - Deploy default playlist, scheduled playlists and advt playlist  
    - Assign Players to Groups  

3.Assets Management  
    - Upload assets (video,mp3,html/zip,images, links, google calendar feed)  
    - Videos are automatically converted to mp4 using ffmpeg  
    - Thumbnail creation for videos and video metadat extraction to store in data base  
    - Add labels to manage assets  
    - View Details of files  
    - rename or delete files  
    - view assets locally   
    - auto label creation for uploaded time (in coming releases)  

4.Playlist management  
    - Create, rename or delete playlists  
    - Assign assets & drag to change order  
    - assign duration for non-video assets  
    - select a layout to show (1,2a,2b,3a,3b,4,4b,2ab)  
    - Enable ticker & set Ticker text  
    - Make it ad playlist with configurable interval timer  

5.Reports & Logs  
    - Not planned (Feature requests welcome)  

###Points to remember

1.angularjs-dropdown-multiselect is taken directly from   
    https://github.com/dotansimha/angularjs-dropdown-multiselect/pull/23/files instead of bower (for close-on-select to work)  

2.Requires following programs to work  
    - ffmpeg >= 0.9  (in certain Os, these may have to be compiled since the package does not exist, 
      please see the issue #9, it is not that scary!)   
    - ffprobe associated with ffmpeg needed to convert videos    
    - imagemagick  creates thumbnails
    
3.Two directories are created by the program ../media and ../media/_thumbnails. If these directories are not created server won't work as expected (for e.g. thumbnails won't be created if _thumbnails directory does not exit). In that case create those directories manually.


####You can also manage players using Browser(http://playerip:8000) or downloading Chrome app  

    
####The code is still in early release, Please raise an issue for problems or send an email to info@pisignage.com  
