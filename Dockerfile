FROM node:18-alpine3.18
LABEL org.opencontainers.image.authors="info@pisignage.com"

RUN apk update && apk add --no-cache bash git ffmpeg imagemagick
ENV NODE_ENV=production

WORKDIR /pisignage-server

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install --production

COPY . .
RUN chmod +x ./wait-for-it.sh

CMD [ "./wait-for-it.sh", "mongo:27017", "--", "node", "server.js"]
EXPOSE 3000
