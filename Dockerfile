FROM node:14.15-alpine3.10
RUN apk add git
RUN apk add  ffmpeg
RUN apk add imagemagick

ENV NODE_ENV=production

WORKDIR /pisignage-server

COPY ["package.json", "package-lock.json*", "./"]

#RUN rm -rf node_modues package-lock.json

RUN npm install --production

COPY . .

CMD [ "node", "server.js" ]