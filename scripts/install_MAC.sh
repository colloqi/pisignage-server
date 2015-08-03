# Run this script as root user 'sudo install_MAC.sh'
# Please install HomeBrew if not present from  "http://brew.sh/"

DBDIR="/data/db"

#install mongo on mac
echo " installing mongodb "
brew update
brew install mongodb

#check /data/db directory present if not create
if [ ! -d "$DBDIR" ];then
	sudo mkdir -p /data/db
fi
#chagne permission
sudo chmod -R 755 /data/

# homebrew node.js package 
echo "installing node.js"
brew install node

echo "installing pisignage-server"
git clone https://github.com/colloqi/pisignage-server
cd pisignage-server
npm install

echo " pisignage-server is ready run `sudo node server.js`"