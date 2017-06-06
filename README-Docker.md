Issue the following command in the project directory to build the docker image:  
*docker build -t mravindrarao/pisignage:v1.0 .*

Following folders in the container need to be mapped to folders in the host system:  
* /data  (folder for mongodb database)  
* /media (folder for uploaded assets)  
* /pisignage-server/data/releases (folder for storing the piimage)  
* /pisignage-server/data/licenses (folder for storing licenses)

In the host system, create folders that can be mapped to the above folders.

After creating the folders, you can start a docker container using the image, by using a command similar to the following:  
*docker run -v /home/ravindra/pisignage/projects/workspace/media:/media -v /home/ravindra/pisignage/projects/workspace/data:/data -v /home/ravindra/pisignage/projects/workspace/releases:/pisignage-server/data/releases -v /home/ravindra/pisignage/projects/workspace/licenses:/pisignage-server/data/licenses -p 3000:3000 -p 29017:27017 --name piserver mravindrarao/pisignage:v1.0*

**Note:** You need to specify absolute paths for the host system folders.

With the above command, pisignage-server can be accessed on port 3000 of the host system, and the MongoDB database running in the container can be accessed on port 29017.  
To stop the above container, use:  
*docker stop piserver*  
and, to remove the container, use:  
*docker rm piserver*

Instead of mapping folders as shown above, it is also possible to create a Data Volume Container and mount data from it.  
E.g. if you create a data volume container *pidata*, you can use the following command to run the pisignage-server container:  
*docker run --volumes-from pidata -p 3000:3000 -p 29017:27017 --name piserver mravindrarao/pisignage:v1.0*

Following is information from the [mongo official repository](https://hub.docker.com/_/mongo/) under the Section **Where to Store Data**:  
WARNING (Windows & OS X): The default Docker setup on Windows and OS X uses a VirtualBox VM to host the Docker daemon. Unfortunately, the mechanism VirtualBox uses to share folders between the host system and the Docker container is not compatible with the memory mapped files used by MongoDB (see vbox bug, docs.mongodb.org and related jira.mongodb.org bug). This means that it is not possible to run a MongoDB container with the data directory mapped to the host.
