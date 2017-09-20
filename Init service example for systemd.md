***To start the pisignage-server on reboot in linux systems, you need to add a init service in init.d, upstart or systemd (check what is used in your server)***

*This is an example for Systemd, Courtesy: Martyn Scott Bell* 
    

1. Create startup file for pisignage at /etc/systemd/system/pisignage.service using your favorite editor


    ```
    [Unit]
    Description=pisignage Player -  Server Software
    #Include the After directive to make sure mongodb is running
    After=mogodb.service
    
    
    [Service]
    # Key `User` specifies that the server will run under the pisignage user 
    # Hash User & Group out if you want root to run it
    #User=pisignage
    #Group=pisignage 
    Restart=always
    RestartSec=10
    WorkingDirectory=/root/pisignage-server
    ExecStart=/usr/bin/node /root/pisignage-server/server.js >> /var/log/pisignage.log 2>&1
    #StandardOutput=
    #StandardError=/var/log/pisignageserver.log
    Environment=NODE_ENV=development PORT=3000
    [Install]
    WantedBy=multi-user.target
    ```

2. Update the systemd service with the command stated below.

    
    systemctl daemon-reload

3. Start the service with systemcl.


    sudo systemctl start pisignage


4. Check if the service has started properly.


    sudo systemctl status pisignage

  - The output to the above command will show `active (running)` status with the PID and Memory/CPU it is consuming.

5. Enable auto start MongoDB when system starts.


    sudo systemctl enable pisignage
    
6. To Stop the service with systemcl.


    sudo systemctl stop pisignage


