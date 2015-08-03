## script to install mongodb , node.js , pisignage-server
## for more info http://docs.mongodb.org/manual/tutorial/install-mongodb-on-ubuntu/

DBDIR="/data/db"

echo " installing mongodb"
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10

echo "deb http://repo.mongodb.org/apt/ubuntu "$(lsb_release -sc)"/mongodb-org/3.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.0.list

sudo apt-get -y update
sudo apt-get install -y mongodb-org

# check /data/db directory present if not create
if [ ! -d "$DBDIR" ];then
	sudo mkdir -p /data/db
fi
#chagne permission
sudo chmod -R 755 /data/

# From https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager
echo " installing Node.js"
curl -sL https://deb.nodesource.com/setup_0.12 | sudo bash -
sudo apt-get install -y nodejs


echo "installing pisignage-server"
git clone https://github.com/colloqi/pisignage-server
cd pisignage-server
npm install

