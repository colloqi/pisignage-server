FROM node:14.9.0

ENV NODE_ENV=production

WORKDIR /pisignage-server

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install --production

COPY . .

CMD [ "node", "server.js" ]