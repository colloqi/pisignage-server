FROM node:20-alpine

# bash: wait-for-it.sh, git: the 919.socket.io dependency is installed from GitHub,
# ffmpeg/imagemagick: video conversion and thumbnails
RUN apk add --no-cache bash git ffmpeg imagemagick

# package-lock.json records the GitHub dependency as git+ssh; fetch it over
# https instead so the build needs no SSH key
RUN git config --global url."https://github.com/".insteadOf "ssh://git@github.com/"

ENV NODE_ENV=production
# "mongo" is the MongoDB service name in docker-compose; override to use another server
ENV MONGOLAB_URI=mongodb://mongo:27017/pisignage-server-prod

WORKDIR /pisignage-server

COPY package.json package-lock.json ./

RUN npm ci --omit=dev

COPY . .
RUN chmod +x ./wait-for-it.sh

# Paths used by the server (see config/env/all.js):
#   /media                   uploaded assets, thumbnails, logs
#   /pisignage-server/data   licenses, releases, sync folders
VOLUME ["/media", "/pisignage-server/data"]

EXPOSE 3000

CMD [ "./wait-for-it.sh", "mongo:27017", "--", "node", "server.js"]
