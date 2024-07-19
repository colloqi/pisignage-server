'use strict'

angular.module('piAssets.controllers',[])
    .controller('AssetsCtrl',function($scope,piUrls,$http, assetLoader) {

        $scope.asset = assetLoader.asset;
        $scope.playlist = assetLoader.playlist;

        //drag and drop, sort for playlist files, needs claenup
        $scope.sortable = {}
        $scope.sortable.options = {
            accept: function (sourceItemHandleScope, destSortableScope, destItemScope) {
                var srcScope = sourceItemHandleScope.itemScope.sortableScope.$parent,
                    dstScope = destSortableScope.$parent;

                //console.log("src: "+srcScope.sortListName+","+sourceItemHandleScope.modelValue.fileDetails.name)
                //console.log("dst: "+dstScope.sortListName)

                //atleast one list has to be playlist Assets
                if (srcScope.sortListName != "playlistAssets" && dstScope.sortListName != "playlistAssets" )
                    return false;
                if (srcScope == dstScope)
                    return true;
                if (dstScope.sortListName == "playlistAssets" && dstScope.playlist.selectedPlaylist != null) {
                    var assets = dstScope.playlist.selectedPlaylist.assets;
                    for (var i= 0,len=assets.length;i<len;i++) {
                        if (assets[i].filename == sourceItemHandleScope.modelValue.fileDetails.name)
                            return false;
                    }
                }
                return true;
            },
            itemMoved: function (event) {
                console.log("item moved");
                var srcScope = event.source.sortableScope.$parent,
                   dstScope = event.dest.sortableScope.$parent;

                var srcIndex = event.source.index,
                    destIndex = event.dest.index;

                if (dstScope.sortListName == "playlistAssets" ) {  //copy to source
                    srcScope.asset.allAssets.assets.splice(srcIndex,0,dstScope.asset.showAssets.assets[destIndex])
                } else {
                    dstScope.asset.allAssets.assets.splice(destIndex, 1);   //already present do not duplicate
                }
                var playlist;
                if (srcScope.sortListName == "playlistAssets" ) {
                    playlist = srcScope.playlist.selectedPlaylist;
                    playlist.assets.splice(srcIndex,1);
                } else {
                    playlist = dstScope.playlist.selectedPlaylist;
                    playlist.assets.splice(destIndex,0,srcScope.asset.allAssets.assets[srcIndex].playlistDetails);
                }
                $http.post(piUrls.playlists + playlist.name, {assets: playlist.assets})
                    .success(function(data, status) {
                        if (data.success) {
                        }
                    })
                    .error(function(data, status) {
                        console.log(status);
                    });
            },
            orderChanged: function(event) {
                //change the order in playlist if not null
                console.log("order changed");
                var srcScope = event.source.sortableScope.$parent;
                var srcIndex = event.source.index,
                    destIndex = event.dest.index;
                //if (destIndex > srcIndex)
                //    destIndex--;
                var playlist = srcScope.playlist.selectedPlaylist,
                    tmp;
                tmp = playlist.assets.splice(srcIndex,1)[0];
                playlist.assets.splice(destIndex,0,tmp)
                $http.post(piUrls.playlists + playlist.name, {assets: playlist.assets})
                    .success(function(data, status) {
                        if (data.success) {
                        }
                    })
                    .error(function(data, status) {
                        console.log(status);
                    });
            }
        }

    }).

    controller('AssetsEditCtrl', function($scope,$rootScope,$state, $http,$modal, fileUploader, assetLoader,piUrls,piPopup){

        $scope.sortListName = "assets"
        $scope.label = assetLoader.label

        $scope.assetConfig = {
            allAssets: false,
            assets: []
        }

        var assignAssets = function() {
            if ($state.current.data && $state.current.data.showAllAssets) {
                $scope.assetConfig.allAssets = true,
                $scope.assetConfig.assets = $scope.asset.allAssets
            } else {
                $scope.assetConfig.allAssets = false,
                $scope.assetConfig.assets = $scope.asset.showAssets
            }
        }
        assetLoader.registerObserverCallback(assignAssets,"assets");
        assignAssets();


        //Label filter for assets
        $scope.labelFilter = function(asset){
            return (assetLoader.label.selectedLabel?
                    (asset.fileDetails.labels && asset.fileDetails.labels.indexOf(assetLoader.label.selectedLabel) >= 0):
                    true
            )
        }

        $scope.fn = {};
            $scope.fn.editMode = false;
            $scope.fn.edit = function () {
                $scope.fn.editMode = !$scope.fn.editMode;
                if ($scope.fn.editMode) {
                    $scope.names = [];
                    $scope.asset.files.forEach(function (file) {
                        var name, ext;
                        if (file.lastIndexOf('.') == -1) {
                            name = file;
                            ext = ""
                        } else {
                            name = file.slice(0, file.lastIndexOf('.'));
                            ext = file.slice(file.lastIndexOf('.'));
                        }
                        $scope.names.push({
                            name: name,
                            ext: ext
                        })
                    });
                } else {
                    assetLoader.reload();
                    $state.reload();
                }
            }

            $scope.fn.delete= function(index){
                piPopup.confirm("File "+$scope.asset.files[index], function() {
                    $http
                        .delete(piUrls.files+encodeURIComponent($scope.asset.files[index]))
                        .success(function(data, status) {
                            if (data.success) {
                                delete $scope.asset.filesDetails[$scope.asset.files[index]];
                                $scope.asset.files.splice(index,1);
                                $scope.names.splice(index,1);
                            }
                        })
                        .error(function(data, status) {
                        });
                })
            }

            $scope.fn.rename= function(index){
                var oldname = $scope.asset.files[index],
                    newname = $scope.names[index].name + $scope.names[index].ext;
                if (!$scope.names[index].name || $scope.asset.files.indexOf(newname) >= 0) {
                    $scope.names[index].name = "File name exists or empty name";
                    $scope.fieldStatus = "has-error";
                } else {
                    $http
                        .post(piUrls.files + encodeURIComponent(oldname), {  newname: newname })
                        .success(function (data, status) {
                            if (data.success) {
                                $scope.asset.filesDetails[newname] = $scope.asset.filesDetails[$scope.asset.files[index]];
                                delete $scope.asset.filesDetails[$scope.asset.files[index]];
                                $scope.asset.files[index] = newname;
                                $scope.fieldStatus = "has-success";
                            }
                        })
                        .error(function (data, status) {
                        });
                }
            }

            $scope.fn.showDetails = function(file) {
                $state.go("home.assets.assetDetails",{file:file})
            }

        //upload assets related
        $scope.msg = {
            title: 'Upload',
            msg: 'Please Wait',
            buttonText: 'Uploading',
            disable: true
        }
        $scope.newLabel = {}
        $scope.upload = {
            onstart: function (files) {
                $scope.modal = $modal.open({
                    templateUrl: '/app/templates/upload-popup.html',
                    scope: $scope,
                    backdrop: 'static',
                    keyboard: false
                });
            },
            onprogress: function (percentDone) {
                $scope.msg.msg = percentDone + "% done";
            },
            ondone: function (files, data) {           //called when upload is done
                $scope.uploadedFiles = files;
                if (data.data) {
                    data.data.forEach(function (item,i) {
                        $scope.uploadedFiles[i].name = item.name;
                        if ($scope.asset.files.indexOf(item.name) == -1)
                            $scope.asset.files.push(item.name);
                    });
                }
                if (data.success) {
                    $scope.msg = {
                        msg: "Upload Complete",
                        buttonText: "Continue",
                        disable: false
                    };
                } else {
                    $scope.msg = {
                        msg: "Upload Error",
                        buttonText: "Dismiss",
                        disable: false
                    };
                }
            },
            onerror: function(files, type, msg) {
                if (!$scope.modal)
                    $scope.upload.onstart();
                $scope.msg.msg = 'Upload Error,'+type+': '+ msg;;
                $scope.msg.buttonText = 'OK';
                $scope.msg.disable = false;
            },
            abort: function() {
                fileUploader.cancel();
            },
            selectedLabels: [],
            labels: [],

            addLabel: function(){
                $http
                    .post(piUrls.labels, $scope.newLabel)
                    .success(function(data, status) {
                        if (data.success) {
                            $scope.upload.selectedLabels.push(data.data.name)
                            $scope.upload.labels.push(data.data)
                            $scope.newLabel = {};
                            $scope.msg.error = null;
                        } else {
                            $scope.msg.error = gettext("Category exists");
                        }
                    })
                    .error(function(data, status) {
                    });
            },

            modalOk: function () {
                if ($scope.msg.buttonText == "OK") {
                    $scope.modal.close();
                    //$state.reload();
                    assetLoader.reload();
                    $state.reload();
                    return;
                }
                $scope.msg.title = 'Processing in Progress...';
                $scope.msg.msg = 'Please Wait';
                $scope.msg.disable = true
                var fileArray = $scope.uploadedFiles.map(function(file){
                    return ({name:file.name,size:file.size,type:file.type})
                })
                $http
                    .post(piUrls.filespostupload, {files: fileArray, categories: $scope.upload.selectedLabels})
                    .success(function (data, status) {
                        if (data.success) {
                            $scope.msg.title = 'Queued in for Processing';
                            $scope.msg.msg = 'If there is a need for conversion, it will take few minutes to appear in assets';
                        } else {
                            $scope.msg.msg = 'Processing Error: '+data.stat_message;
                        }
                        $scope.msg.buttonText = 'OK';
                        $scope.msg.disable = false;

                    })
                    .error(function (data, status) {
                        $scope.msg.msg = 'HTTP Post Error';
                        $scope.msg.buttonText = 'OK';
                        $scope.msg.disable = false;
                    })
            }
        }

        //Add link releated for uploading links
        $scope.link = {
            types: [{name: 'Livestreaming or YouTube', ext: '.tv'},
                {name: 'Streaming', ext: '.stream'},
                {name: 'Audio Streaming', ext: '.radio'},
                {name: 'Web link (shown in iframe)', ext: '.link'},
                {name: 'Web page (supports cross origin links)', ext: '.weblink'},
                {name: 'Media RSS', ext: '.mrss'},
                {name: 'Message', ext: '.txt'},
                {name: 'Local Folder/File', ext: '.local'}
            ],
            obj: {
                name: null,
                type: '.tv',
                link: null,
                zoom: 1.0,
                duration: null, //playlist asset duration is used
                hideTitle: 'title'    //actually show Rss text type

            },
            showPopup: function (type) {
                if (type) {
                    $scope.link.obj.type = _.find($scope.link.types, function (obj) {
                        return obj.ext.slice(1) == type
                    }).ext;
                } else {
                    $scope.link.obj.type = ".tv"
                }
                $scope.linkCategories = []
                $scope.modal = $modal.open({
                    templateUrl: '/app/templates/link-popup.html',
                    scope: $scope
                });
            },
            save: function () {
                $http
                    .post(piUrls.links, {details: $scope.link.obj, categories: $scope.linkCategories})
                    .success(function (data, status) {
                        if (data.success) {
                            //$scope.Filestatus = data.stat_message;
                            $scope.modal.close();
                            assetLoader.reload();
                            $state.reload();
                        }
                    })
                    .error(function (data, status) {
                        $scope.errorMessage = data.stat_message;
                    })
            }
        }

        // $scope.configureGCalendar= function() {
        //     $scope.gCalModal = $modal.open({
        //         templateUrl: '/app/templates/gcal-popup.html',
        //         scope: $scope
        //     });
        // }

        //dropdown selects for filter and assign selected files
        $scope.ngDropdown = {
            selectedAssets: [],
            label: {
                extraSettings: {displayProp:'name', idProp:'name', externalIdProp:'name',
                    //scrollableHeight: '200px', scrollable: true,
                    showCheckAll:false,showUncheckAll:false  },
                customTexts: {buttonDefaultText: "Assign Label"},
                Label: assetLoader.label,
                selectedLabels: [],
                events: {
                    onItemSelect: function(label) {
                        //add Labels to selected files
                        if (!$scope.playlistState && $scope.ngDropdown.selectedAssets.length) {
                            for (var i=0,len=$scope.ngDropdown.selectedAssets.length;i<len;i++) {
                                var asset = $scope.ngDropdown.selectedAssets[i];
                                asset.fileDetails.labels = asset.fileDetails.labels || [];
                                if (asset.fileDetails.labels.indexOf(label.name) == -1)
                                    asset.fileDetails.labels.push(label.name);
                                //delete asset.selected;

                                $http.post(piUrls.files + encodeURIComponent(asset.fileDetails.name), {dbdata: asset.fileDetails})
                                    .success(function(data, status) {
                                        if (data.success) {
                                            asset.fileDetails = data.data;
                                            $scope.asset.filesDetails[data.data.name] = data.data;
                                            assetLoader.updateLabelsCount()
                                        }
                                    })
                                    .error(function(data, status) {
                                    });
                            }
                        }
                    },
                    onItemDeselect: function(label) {
                        //delete label for the selected files
                        if (!$scope.playlistState && $scope.ngDropdown.selectedAssets.length) {
                            for (var i = 0, len = $scope.ngDropdown.selectedAssets.length; i < len; i++) {
                                var asset = $scope.ngDropdown.selectedAssets[i],
                                    index = asset.fileDetails.labels.indexOf(label.name);
                                if (index != -1)
                                    asset.fileDetails.labels.splice(index, 1);
                                //delete asset.selected;

                                $http.post(piUrls.files + encodeURIComponent(asset.fileDetails.name), {dbdata: asset.fileDetails})
                                    .success(function (data, status) {
                                        if (data.success) {
                                            asset.fileDetails = data.data;
                                            $scope.asset.filesDetails[data.data.name] = data.data;
                                            assetLoader.updateLabelsCount()
                                        }
                                    })
                                    .error(function (data, status) {
                                    });
                            }
                        }
                    }
                }
            },
            playlist: {
                extraSettings: {displayProp:'name', idProp:'name', externalIdProp:'name',
                    closeOnSelect: true,
                    showCheckAll:false,showUncheckAll:false  },
                customTexts: {buttonDefaultText:($state.current.name.indexOf("home.assets.playlists") == 0)?"AssignTo Playlist":"RemoveFrom Playlist"},
                PlaylistTab: assetLoader.playlist,
                selectedPlaylists: [],
                events: {
                    //add to the playlist
                    onItemSelect: function() {
                        var playlist = $scope.asset.groupWiseAssets[$scope.playlist.selectedPlaylist.name].playlist;
                        if (playlist) {
                            var assetNames = playlist.assets.map(function (asset) {
                                return asset.filename;
                            });
                            $scope.ngDropdown.selectedAssets.forEach(function (asset) {
                                if (assetNames.indexOf(asset.playlistDetails.filename) == -1) {
                                    playlist.assets.push(asset.playlistDetails);
                                    $scope.asset.groupWiseAssets[$scope.playlist.selectedPlaylist.name].assets.push(asset);
                                }
                            })
                            $http.post(piUrls.playlists + $scope.playlist.selectedPlaylist.name, {assets: playlist.assets})
                                .success(function (data, status) {
                                    if (data.success) {
                                        $scope.ngDropdown.clearCheckboxes();
                                    }
                                })
                                .error(function (data, status) {
                                    console.log(status);
                                });
                        }
                    },
                    onItemDeselect: function(index) {

                    }
                }
            },
            checkbox: function(asset) {
                if (asset.selected)
                    $scope.ngDropdown.selectedAssets.push(asset);
                else
                    $scope.ngDropdown.selectedAssets.splice($scope.ngDropdown.selectedAssets.indexOf(asset), 1)
            },
            clearCheckboxes: function() {
                $scope.ngDropdown.selectedAssets.forEach(function(asset){
                    asset.selected = false;
                })
                $scope.ngDropdown.selectedAssets=[];
                $scope.ngDropdown.label.selectedLabels = [];
                $scope.ngDropdown.playlist.selectedPlaylists = [];
            }
        }

        $scope.scheduleValidity = function(asset) {
            $scope.forAsset = asset;
            var validityField = asset.fileDetails && asset.fileDetails.validity || {enable: false};
            if (validityField.startdate)
                validityField.startdate =
                    new Date(validityField.startdate)
            if (validityField.enddate)
                validityField.enddate =
                    new Date(validityField.enddate)
            $scope.today = new Date().toISOString().split("T")[0];
            $scope.$watch("forAsset.fileDetails.validity.startdate", function(value,oldvalue) {
                if (value && (!oldvalue || (value.getTime() != oldvalue.getTime()))) {
                    $scope.forAsset.fileDetails.validity.starthour = 0;
                    var endday = new Date(value);
                    $scope.endday = endday.toISOString().split("T")[0];
                    if (!$scope.forAsset.fileDetails.validity.enddate ||
                        value > $scope.forAsset.fileDetails.validity.enddate) {
                        $scope.forAsset.fileDetails.validity.enddate = endday;
                        $scope.forAsset.fileDetails.validity.endhour = 24;
                    }
                }
            });

            $scope.scheduleValidityModal = $modal.open({
                templateUrl: '/app/templates/schedule-validity.html',
                scope: $scope,
                keyboard: false
            });
        }

        $scope.saveValidity = function() {
            $http.post(piUrls.files + encodeURIComponent($scope.forAsset.fileDetails.name), {dbdata: $scope.forAsset.fileDetails})
                .then(function(response) {
                    var data = response.data;
                    if (data.success) {
                        $scope.scheduleValidityModal.close()
                    }
                },function(response) {
                });
        }



        $scope.loadCategory = function(){
            $scope.labelMode = "assets"
            $scope.labelModal = $modal.open({
                templateUrl: '/app/partials/labels.html',
                controller: 'LabelsCtrl',
                scope: $scope
            })
        }

        $scope.$on("$destroy", function() {
            $scope.ngDropdown.clearCheckboxes();
        })
    })

    .controller('AssetViewCtrl', function($scope, $rootScope,$window, $http, piUrls, $state, piPopup,assetLoader){

        //merge the apis for the three
        $scope.fileType;
        $scope.selectedLabels = [];
        switch($state.params.file.slice($state.params.file.lastIndexOf('.')+1)) {
            // case 'gcal':
            //     $scope.fileType = 'gcal';
            //     $scope.calendarname = $state.params.file;
            //
            //     if($state.params.file != "new"){
            //         $http
            //             .get(piUrls.calendars+$state.params.file)
            //             .success(function(data, status) {
            //                 if (data.success) {
            //                     $scope.calendar = data.data;
            //                     $scope.filedetails = data.data;
            //                     if ($scope.filedetails.dbdata)
            //                         $scope.selectedLabels = $scope.filedetails.dbdata.labels;
            //                 }
            //             })
            //             .error(function(data, status) {
            //             });
            //     }
            //     break;
            case 'link':
            case 'weblink':
            case 'stream':
            case 'radio':
            case 'tv':
            case 'mrss':
            case 'txt':
            case 'local':
                $scope.fileType = 'link';
                $http
                    .get(piUrls.links+$state.params.file)
                    .success(function(data,status){
                        if(data.success){
                            $scope.urlLink = JSON.parse(data.data.data);
                            $scope.urlLink.hideTitle = $scope.urlLink.hideTitle || 'title'
                            $scope.filedetails = data.data;
                            if ($scope.filedetails.dbdata)
                                $scope.selectedLabels = $scope.filedetails.dbdata.labels;
                        }
                    })
                    .error(function(data,status){
                        console.log(data,status);
                    })
                break;
            default:
                $scope.fileType = 'other';
                $http.get(piUrls.files + encodeURIComponent($state.params.file))
                    .success(function(data, status) {
                        if (data.success) {
                            $scope.filedetails = data.data;
                            if ($scope.filedetails.dbdata)
                                $scope.selectedLabels = $scope.filedetails.dbdata.labels;
                        }
                    })
                    .error(function(data, status) {
                    });
                break;


        }

        $scope.selectedCalendar = function(value) {
            $http
                .post(piUrls.calendars+$state.params.file, {email: value})
                .success(function(data, status) {
                    if (data.success) {
                        console.log(data);
                    }
                })
                .error(function(data, status) {
                });
        }

        $scope.save = function() {
            if ($scope.filedetails && $scope.filedetails.dbdata) {
                $scope.filedetails.dbdata.labels = $scope.selectedLabels;
                $http.post(piUrls.files + encodeURIComponent($state.params.file), {dbdata: $scope.filedetails.dbdata})
                    .success(function (data, status) {
                        if (data.success) {
                            $scope.asset.filesDetails[data.data.name].labels = data.data.labels;
                            $window.history.back();
                        }
                    })
                    .error(function (data, status) {
                    });
            } else {
                $window.history.back();
            }
        }

        $scope.saveNewChanges = function(){
            $http
                .post(piUrls.links ,{ details : $scope.urlLink} )
                .then(function(response) {
                    var data = response.data;
                    $scope.linkform.$setPristine();
                },function(response){
                    console.log(response);
                })
        }


        $scope.delete= function(index){
            piPopup.confirm("File "+$state.params.file, function() {
                $http
                    .delete(piUrls.files+encodeURIComponent($state.params.file))
                    .success(function(data, status) {
                        if (data.success) {
                            //delete $scope.asset.filesDetails[$state.params.file];
                            //$scope.asset.files.splice($scope.asset.files.indexOf($state.params.file),1);
                            assetLoader.reload()
                            $window.history.back();
                        }
                    })
                    .error(function(data, status) {
                    });
            })
        }

    })
