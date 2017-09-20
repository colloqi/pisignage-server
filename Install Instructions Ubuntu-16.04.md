# Install piSignage Server Software on Ubuntu 16.04
    
**Courtesy: Martyn Scott Bell**


1. **First, remove any existing repository file for MongoDB**

    `sudo rm /etc/apt/sources.list.d/mongodb*.list`

2. **Add the key: (without the key, the repository will not load)**

    `sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv EA312927`

3. **Create a new MongoDB repository list file**

    ```sudo bash -c 'echo "deb http://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.2 multiverse" > /etc/apt/sources.list.d/mongodb-org-3.2.list'```

4. **Complete the installation with update of repositories then install**

    `sudo apt update`
    
    `sudo apt install mongodb-org`

5. **Install node.js and npm**

In some installations there is another program called node, be sure to install nodejs. If other node program is already installed you can find out by node --version command, it will not output anything. Uninstall the node program in that case
Ubuntu

   `curl -sL https://deb.nodesource.com/setup_0.12 | sudo bash -`
   
   `sudo apt-get install -y nodejs`

6. **Install ffmpeg**

    `sudo apt install ffmpeg`
    
    `sudo ln -s ~/bin/ffmpeg /usr/local/bin/ffmpeg`  (or the directory where ffmpeg/ffprobe programs are created)
  
    `sudo ln -s ~/bin/ffprobe /usr/local/bin/ffprobe`  (or the directory where ffmpeg/ffprobe programs are created)

7. **Install imagemagik**

    `sudo apt-get install imagemagick`

8. **Clone this repository**
    
    Install git if needed
    
   `sudo apt install git`
    
    To pull the latest version
        
   `git clone https://github.com/colloqi/pisignage-server`
     
9. **Run following commands**
        
    `mkdir -p media/_thumbnails`
 
    `cd pisignage-server`
 
    `chown -R <user>:<group> data`
    
10. **Install NPM if needed**

    `sudo apt-get install -y npm`
    
11. **Install node modules needed**
    
    `npm install`

12. **Few more checks**

    1. Currently network port is configured as `3000` in local server. Modify in the file `config/env/development.js` for the port
    2. `sudo apt install nodejs-legacy`
    3. Check Mongo db is running

        `ps -ef|grep mongo`
        
         or
            
        `pgrep mongod`

        - If not started
            `sudo service mongod start`

13. **Start up piSignage-Server**

     `node server.js`
            
14. **Configure the settings and access the UI at http://localhost:3000**
