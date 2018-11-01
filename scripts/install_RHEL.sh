## script to install mongodb , node.js , pisignage-server
## for more info http://docs.mongodb.org/manual/tutorial/install-mongodb-on-ubuntu/

DBDIR="/data/db"

echo " installing mongodb"
sudo yum-config-manager --add-repo https://repo.mongodb.org/yum/redhat/mongodb-org-3.1.repo
sudo yum-config-manager --enable mongodb-org-3.1

sudo yum -y update
sudo yum install -y mongodb-org

# check /data/db directory present if not create
if [ ! -d "$DBDIR" ];then
	sudo mkdir -p /data/db
fi
#chagne permission
sudo chmod -R 755 /data/

# From https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager
echo " installing Node.js"
curl -sL https://rpm.nodesource.com/setup_0.12 | sudo bash -
sudo yum install -y nodejs


echo "installing pisignage-server"
git clone https://github.com/colloqi/pisignage-server
cd pisignage-server
npm install

#create media and thumbnail directory
cd ..
mkdir media
sudo chmod 755 -R ./media
