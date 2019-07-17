var {app,BrowserWindow,Tray,Menu,ipcMain,shell,crashReporter} = require('electron'),  // Module to control application life.
    server = require('./server'),
    path = require('path'),
    url=require('url');
    config = require('./config/config'),
    Settings = require('./app/models/nedb-models').Settings;

// Report crashes to our server.
crashReporter.start({companyName: "colloqi", submitURL: "https://pisignage.com"});

server.initializeServer();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is GCed.
var mainWindow = null,
loginWindow = null,
callbacksWaiting = [];

var login = function() {
    if (!loginWindow) {
        loginWindow = new BrowserWindow({width:400, height:250,
            title:'Login credentials',
            'always-on-top': true,
            webPreferences:{
                nodeIntegration:true
            },
            frame:false,
            fullscreen:false
        });
        loginWindow.on('closed', function() {
            loginWindow = null;
        });

        loginWindow.loadURL(url.format({
            pathname:path.join(`localhost:${config.port}/loginWindow`),
            protocol:'http:',
            slashes:true
        }));
    }
    loginWindow.show();
}

//Communication with the renderer process (Login screen for the credentials)
ipcMain.on('authCredentials', function(event,args) {
    loginWindow.hide();
    while (callbacksWaiting.length)
    callbacksWaiting.shift()(args.username,args.password)
    mainWindow ? mainWindow.reload() : '';
})

var startWindow = function() {
    mainWindow = new BrowserWindow({icon: path.join(__dirname,'electron/assets/icon40.png',),
        webPreferences:{
            nodeIntegration:false
    }});
    //mainWindow.openDevTools();
    mainWindow.maximize();

    // and load the index.html of the app.
    mainWindow.loadURL(url.format({
        pathname:path.join(__dirname,'/public/index.html'),
        protocol:'file:',
        slashes:true
    }));
    mainWindow.webContents.on('login', function(event, request, authInfo, callback) {
        event.preventDefault();
        console.log("login event")
        callbacksWaiting.push(callback);
        login();
        //callback(credentials.user, credentials.password);
    })

    // Emitted when the window is closed.
    mainWindow.on('closed', function() {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });

    setMenu();
}

var setMenu = function() {
    var openUrl = function(url) {
    shell.openExternal(url);
    }

    var displayInfo = function() {
        var newWindow = new BrowserWindow({
            width:400, height:256,title:'About piSignage-server',
            webPreferences:{
                nodeIntegration:true
            },
            fullscreen:false
        });
        newWindow.loadURL('http://localhost:'+config.port+'/about');
    }

    var template = [
        {
            label : 'piSignage',
            submenu : [
                        {
                            label: 'About piSignage',
                            click: displayInfo
                        },
                        {
                            label: 'Media directory : ' + config.mediaDir,
                            click: function() { shell.showItemInFolder(config.mediaDir) }
                        },
                        {
                            type: 'separator'
                        },
                        {
                            type: 'separator'
                        },
                        {
                            label: 'Quit piSignage Server',
                            accelerator: 'CmdOrCtrl+Q',
                            click: function() { app.quit(); }
                        }
                    ]
        },
        {
            label: 'Edit',
            submenu : [
                        {
                            label: 'Copy',
                            accelerator: 'CmdOrCtrl+C',
                            selector: 'copy:'
                        },
                        {
                            label: 'Paste',
                            accelerator: 'CmdOrCtrl+V',
                            selector: 'paste:'
                        }
                    ]
        },
        {
            label : 'View',
            submenu : [
                        {
                            label: 'Reload',
                            accelerator: 'CmdOrCtrl+R',
                            click: function() { BrowserWindow.getFocusedWindow().reload(); }
                        },
                        {
                            label: 'Toggle Fullscreen',
                            accelerator: 'CmdOrCtrl+F',
                            click: function() { BrowserWindow.getFocusedWindow().setFullScreen(!BrowserWindow.getFocusedWindow().isFullScreen()); }
                        }
                    ]
        },
        {
            label: 'Window',
            submenu: [
                        {
                            label: 'Minimize',
                            accelerator: 'CmdOrCtrl+M',
                            click: function() { BrowserWindow.getFocusedWindow().minimize(); }
                        },
                        {
                            label: 'Close window',
                            accelerator: 'CmdOrCtrl+W',
                            click: function() { BrowserWindow.getFocusedWindow().close(); }
                        }
                    ]
            },
            {
                label : 'Help',
                submenu: [
                            {
                                label: 'Go to our website',
                                click: function() { openUrl('http://pisignage.com'); }
                            },
                            {
                                label: 'Contact Us',
                                click: function() { openUrl('http://pisignage.com/lp/contact/') }
                            }
                        ]
            }
        ]

    var menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    //Mac OSX - stay active till user quits explicitly
    if (process.platform != 'darwin') {
        app.quit();
    }
});


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', startWindow);
app.on('activate-with-no-open-windows', startWindow);
app.on('activate', function(){
    if (!mainWindow)
    startWindow()
});

//cast.castToChromecasts();