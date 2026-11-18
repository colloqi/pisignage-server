## v2-beta quick start (Node.js 20 + MongoDB 8.0)

```
git clone -b v2-beta https://github.com/colloqi/pisignage-server.git
cd pisignage-server
docker compose up -d --build          # builds the image and starts MongoDB 8.0 + the server
docker compose logs -f pisignage-server
```

Open http://localhost:3000 (default login pi / pi).

- Volumes: `media` (assets) at `/media`, `data` (licenses, releases, sync folders) at `/pisignage-server/data`, `mongodb8` / `mongodb8_config` for MongoDB.
- The server reaches MongoDB through `MONGOLAB_URI` (set in the compose files).
- `docker-compose.prod.yml` is the same stack without an image tag: `docker compose -f docker-compose.prod.yml up -d --build`
- Moving an existing Docker install: see the Docker section of [MIGRATION.md](MIGRATION.md).

## Older notes

1. cd pisignage-server    //assuming pisignage-server is already installed
2. git pull //get the latest
3. docker build --tag pisignage-server .     //build a new container image
4. docker images
5. docker run -dp 3000:3000 pisignage-server   //detached, port mapping (will not run needs mongodb)
6. docker ps
6. docker stop <the-container-id>  //Stop the old process
6. docker rm <the-container-id>  //remove the container

- Volumes: named volume and bind mounts and then mount with the app
7. docker volume create mongodb  //create a volume
8. docker volume create mongodb_config
9. docker network create mongodb

- Multi container apps (need networking, docker network create pisignage-server, network-alias, dig command)
```
521  docker run -it --rm -d -v mongodb:/Users/ravibail/data/db -v mongodb_config:/Users/ravibail/data/configdb -p 27012:27017 --network mongodb --name mongodb mongo
522  docker stop mongo
523  docker stop mongodb
524  docker run -it --rm -d -v mongodb:/Users/ravibail/data/db -v mongodb_config:/Users/ravibail/data/configdb -p 27017:27017 --network mongodb --name mongodb mongo
525  docker run -it --rm -d --network mongodb --name pisignage-server -p 3000:3000 pisignage-server
526  docker build --tag pisignage-server .
527  docker run -it --rm -d --network mongodb --name pisignage-server -p 3000:3000 pisignage-server
528  docker logs pisignage-server
529  docker ps -a
530  docker ps
531  docker run -it --rm -d --network mongodb --name pisignage-server -p 3000:3000 pisignage-server
532  docker ps
533  docker logs pisignage-server
534  docker logs -f pisignage-server
535  history
```

- Docker Compose (YAML file to run multiple container apps)

```
538  docker-compose -f docker-compose.prod.yml up --build
539  ps -ef | grep mongo
540  docker ps -a
541  docker stop mongo
542  docker stop mongodb
543  docker ps -a
544  docker stop pisignage-server_mongo_1
549  docker stop pisignage-server_mongo_1
551  docker rm pisignage-server_mongo_1

docker-compose down --volumes
```

- docker scan pisignage-server //security scanning
- docker image history pisignage-server //see the layers

docker ignore file
