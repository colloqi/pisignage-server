FROM ubuntu:16.04
COPY nodesource_setup.sh /
COPY . /pisignage-server
WORKDIR /pisignage-server
RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 0C49F3730359A14518585931BC711F9BA15703C6 \
    && echo "deb [ arch=amd64,arm64 ] http://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.4 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-3.4.list \
    && bash /nodesource_setup.sh && apt-get update \
    && apt-get install -y sudo mongodb-org nodejs apt-transport-https lsb-release curl \
    && apt-get install ffmpeg imagemagick -y --no-install-recommends && npm install
CMD sudo mongod --dbpath=/data/ > /dev/null 2>&1 & sleep 5; sudo node server.js & tail -f /dev/null
EXPOSE 3000 27017
