'use strict;'

angular.module('piAssets.controllers',[])
    .controller('AssetsCtrl',function($scope,$state,piUrls,$http,$modal, piConstants,

                                                    fileUploader, $window, Upload, PlaylistTab,Label){
    /*
        $scope.files holds all the files present in the media directory
        $scope.fileDetails contains db data for the files with $scope.files element as key
        $scope.groupWiseAssets holds object with playlist name as key
            object contains playlist and assets fields
            assets contains array with each element is an object of fileDetails, playlistDetails for that file & deleted attribute
        $scope.includedAssets contains all the included assets in all playlists
        $scope.allAseets contains all assets with fileDetails, playlistDetails attributes
     */

        $scope.selected = {
            playlist:null,
            rightWindowNeeded: ($state.current.name.slice($state.current.name.lastIndexOf('.')+1) == "playlistAddAssets")
        }


        //decide what to show in assets.jade
        $scope.setAssetParam = function(){
            if (!$scope.groupWiseAssets)        //not yet loaded
                return;

            $scope.showAssets = {};
            if (PlaylistTab.selectedPlaylist) {
                $scope.selected.playlist = $scope.groupWiseAssets[PlaylistTab.selectedPlaylist.name].playlist;
                $scope.showAssets[PlaylistTab.selectedPlaylist.name] = $scope.groupWiseAssets[PlaylistTab.selectedPlaylist.name]
            } else {
                $scope.selected.playlist = null;
                $scope.showAssets = {'All': $scope.allAssets['All']}
            }
            if ($scope.selected.rightWindowNeeded)
                $scope.showAssets = {'All':$scope.allAssets['All']}

            if ($state.current.name.indexOf("home.assets.playlist") == 0) {
                $scope.playlistState = true;
            }
        }

        //filter used by playlist-add.jade
        $scope.filterPlaylistName = function(items) {
            if ($scope.selected.playlist) {
                var result = {};
                result[$scope.selected.playlist.name] = $scope.groupWiseAssets[$scope.selected.playlist.name];
                return result;
            } else
                return $scope.groupWiseAssets;
        }

        //Label filter for assets
        $scope.labelFilter = function(asset){
            if(Label.selectedLabel){
                return (asset.fileDetails.labels && asset.fileDetails.labels.indexOf(Label.selectedLabel) >= 0)
            }
            if ((!$scope.playlistState && $scope.ngDropdown.selectedAssets.length) ||
                !$scope.ngDropdown.label.selectedLabels.length)
                return true;

            for (var i= 0,len=$scope.ngDropdown.label.selectedLabels.length;i<len;i++) {
                var selLabel = $scope.ngDropdown.label.selectedLabels[i].name;
                if (asset.fileDetails.labels && asset.fileDetails.labels.indexOf(selLabel) >= 0)
                    return true;
            }
            return false;
        }

        //arrange files and playlists with details in global structures
        $scope.assemblePlaylistAssets = function() {
            $scope.groupWiseAssets = {};
            $scope.allAssets = {};
            $scope.includedAssets = [];

            $scope.playlists.forEach(function(playlist){
                $scope.groupWiseAssets[playlist.name] = {
                    playlist:playlist,
                    assets: []
                };
                playlist.assets.forEach(function(asset){

                    var obj = {};
                    obj.fileDetails = $scope.filesDetails[asset.filename] || {name: asset.filename};
                    obj.playlistDetails = asset;
                    obj.deleted = ($scope.files.indexOf(asset.filename) == -1);
                    $scope.groupWiseAssets[playlist.name].assets.push(obj)

                    if (asset.side) {
                        var obj = {};
                        obj.fileDetails = $scope.filesDetails[asset.side] || {name: asset.side};
                        obj.playlistDetails = null;
                        obj.deleted = ($scope.files.indexOf(asset.filename) == -1);
                        $scope.groupWiseAssets[playlist.name].assets.push(obj)
                    }
                    if (asset.bottom) {
                        var obj = {};
                        obj.fileDetails = $scope.filesDetails[asset.bottom] || {name: asset.bottom};
                        obj.playlistDetails = null;
                        obj.deleted = ($scope.files.indexOf(asset.filename) == -1);
                        $scope.groupWiseAssets[playlist.name].assets.push(obj)
                    }

                    $scope.includedAssets.push(asset.filename)
                    if (asset.side)
                        $scope.includedAssets.push(asset.side)
                    if (asset.bottom)
                        $scope.includedAssets.push(asset.bottom)

                })
            });
            $scope.allAssets['All'] =  {
                playlist:null,
                assets: []
            };
            $scope.files.forEach(function(filename) {
                //if ($scope.includedAssets.indexOf(filename) == -1) {
                var obj = {};
                obj.fileDetails = $scope.filesDetails[filename] || {name: filename};
                obj.playlistDetails = {filename: filename, selected: false};
                obj.playlistDetails.isVideo = !(filename.match(piConstants.videoRegex) == null);
                if ($scope.filesDetails[filename])
                    obj.playlistDetails.duration = parseInt($scope.filesDetails[filename].duration);
                obj.playlistDetails.duration = obj.playlistDetails.duration || 10;
                $scope.allAssets['All'].assets.push(obj)
                //}
            })
            $scope.setAssetParam();
        }

        //Fetch Labels, files and playlists from server , later move as a service
        //Once done call assemblePlaylistAssets
        $http.get(piUrls.labels)
            .success(function(data, status) {
                if (data.success) {
                    $scope.labels= data.data;
                    Label.labels = $scope.labels;
                }
                $http.get(piUrls.files,{})
                    .success(function(data, status) {
                        if (data.success) {
                            $scope.files = data.data.files;
                            if (data.data.dbdata) {
                                $scope.filesDetails = {};
                                data.data.dbdata.forEach(function(dbdata){
                                    if ($scope.files.indexOf(dbdata.name) >=0){
                                        $scope.filesDetails[dbdata.name] = dbdata;
                                    }
                                })
                                Object.keys(Label.labelsCount).forEach(function(item){
                                    Label.labelsCount[item]= 0;
                                });
                                for (var filename in $scope.filesDetails) {
                                    $scope.filesDetails[filename].labels.forEach(function(item){
                                        Label.labelsCount[item] = (Label.labelsCount[item] || 0) +1;
                                    })
                                }
                                $http
                                    .get(piUrls.playlists, {})
                                    .success(function(data, status) {
                                        if (data.success) {
                                            $scope.playlists = data.data;
                                            PlaylistTab.playlists = $scope.playlists;
                                            $scope.assemblePlaylistAssets();
                                        }
                                    })
                                    .error(function(data, status) {
                                    });
                            }
                        }
                    })
                    .error(function(data, status) {
                    });
            })
            .error(function(data, status) {
            });


        //upload assets related
        $scope.selectedLabels = [];
        $scope.msg = {
            title: 'Upload',
            msg: 'Please Wait',
            buttonText: 'Uploading',
            disable: true
        }
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
                $scope.msg.msg = "Upload Complete";
                $scope.msg.buttonText = "Continue";
                $scope.msg.disable = false;
                $scope.uploadedFiles = files;
                if (data.files) {
                    data.files.forEach(function (item) {
                        if ($scope.files.indexOf(item.name) == -1)
                            $scope.files.push(item.name);
                    });
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
            modalOk: function () {
                if ($scope.msg.buttonText == "OK") {
                    $scope.modal.close();
                    $window.location.reload();
                    return;
                }
                $scope.msg.title = 'Processing in Progress...';
                $scope.msg.msg = 'Please Wait';
                $http
                    .post(piUrls.filespostupload, {files: $scope.uploadedFiles, categories: $scope.selectedLabels})
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
        Upload.functions = $scope.upload;

        //Add link releated for uploading links
        $scope.link = {
            types: [{name: 'You Tube', ext: '.tv'}, {name: 'Web Link', ext: '.link'}],
            obj: {
                name: null,
                type: '.link',
                link: null
            },
            showPopUp: function () {
                $scope.modal = $modal.open({
                    templateUrl: '/app/templates/link-popup.html',
                    scope: $scope
                });
            },
            save: function () {
                $http
                    .post(piUrls.links, {details: $scope.link.obj})
                    .success(function (data, status) {
                        if (data.success) {
                            //$scope.Filestatus = data.stat_message;
                            $scope.modal.close();
                        }
                    })
                    .error(function (data, status) {
                        $scope.errorMessage = data.stat_message;
                    })
            }
        }
        Upload.functions.link = $scope.link.showPopUp;

        Upload.functions.configureGCalendar= function() {
            $scope.gCalModal = $modal.open({
                templateUrl: '/app/templates/gcal-popup.html',
                scope: $scope
            });
        }

        //drag and drop, sort for playlist files, needs claenup
        $scope.sortable = {}
        $scope.sortable.options = {
            accept: function (sourceItemHandleScope, destSortableScope, destItemScope) {
                var srcObj = sourceItemHandleScope.itemScope.sortableScope.$parent.obj ||
                                        sourceItemHandleScope.itemScope.sortableScope.$parent.$parent.obj,
                    dstObj = destSortableScope.$parent.obj || destSortableScope.$parent.$parent.obj,
                    ok = (srcObj.playlist !=null) || (dstObj.playlist != null)

                if (!ok) return ok;
                if (destSortableScope == sourceItemHandleScope.$parent.$parent)
                    return ok;
                var assets = dstObj.assets;
                if (dstObj.playlist != null) {
                    for (var i= 0,len=assets.length;i<len;i++) {
                        if (assets[i].fileDetails.name == sourceItemHandleScope.modelValue.fileDetails.name)
                            return false;
                    }
                }
                return ok;
            },
            itemMoved: function (event) {
                //copy back to source if source playlist is null for sort purpose
                //remove from source playlist if not null
                //copy asset to destination playlist asset
                console.log("item moved");
                var srcObj = event.source.sortableScope.$parent.obj || event.source.sortableScope.$parent.$parent.obj,
                    dstObj = event.dest.sortableScope.$parent.obj || event.dest.sortableScope.$parent.$parent.obj;

                console.log(srcObj.playlist)
                console.log(dstObj.playlist)
                console.log(event.source.index);
                console.log(event.dest.index);
                var srcIndex = event.source.index,
                    destIndex = event.dest.index;

                if (dstObj.playlist) {  //copy to source
                    if (!srcObj.playlist) {
                        $scope.allAssets['All'].assets.splice(srcIndex,0,dstObj.assets[destIndex])
                    } else {
                        $scope.groupWiseAssets[srcObj.playlist.name].assets.splice(srcIndex,0,dstObj.assets[destIndex])
                    }
                } else {
                    $scope.allAssets['All'].assets.splice(destIndex, 1);   //already present do not duplicate
                }
                var playlist;
                if (!dstObj.playlist) {
                    playlist = srcObj.playlist;
                    playlist.assets.splice(srcIndex,1);
                } else {
                    playlist = dstObj.playlist;
                    playlist.assets.splice(destIndex,0,srcObj.assets[srcIndex].playlistDetails);
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
                var srcObj = event.source.sortableScope.$parent.obj || event.source.sortableScope.$parent.$parent.obj;
                console.log(srcObj.playlist)
                var srcIndex = event.source.index,
                    destIndex = event.dest.index;
                if (destIndex > srcIndex)
                    destIndex--;
                var playlist = srcObj.playlist,
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

        //dropdown selects for filter and assign selected files
        $scope.ngDropdown = {
            selectedAssets: [],
            label: {
                extraSettings: {displayProp:'name', idProp:'name', externalIdProp:'name',
                                //scrollableHeight: '200px', scrollable: true,
                                showCheckAll:false,showUncheckAll:false  },
                customTexts: {buttonDefaultText: ($state.current.name.indexOf("home.assets.playlist") == 0)?
                                                                "FilterBy Label":"AssignTo Label"},
                Label: Label,
                selectedLabels: [],
                events: {
                    onItemSelect: function(label) {
                        //add Labels to selected files
                        if (!$scope.playlistState && $scope.ngDropdown.selectedAssets.length) {
                            for (var i=0,len=$scope.ngDropdown.selectedAssets.length;i<len;i++) {
                                var asset = $scope.ngDropdown.selectedAssets[i];
                                if (asset.fileDetails.labels.indexOf(label.name) == -1)
                                    asset.fileDetails.labels.push(label.name);
                                //delete asset.selected;

                                $http.post(piUrls.files + asset.fileDetails.name, {dbdata: asset.fileDetails})
                                    .success(function(data, status) {
                                        if (data.success) {
                                            asset.fileDetails = data.data;
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

                                $http.post(piUrls.files + asset.fileDetails.name, {dbdata: asset.fileDetails})
                                    .success(function (data, status) {
                                        if (data.success) {
                                            asset.fileDetails = data.data;
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
                PlaylistTab: PlaylistTab,
                selectedPlaylists: [],
                events: {
                    //add to the playlist
                    onItemSelect: function(playlistObj) {
                        var playlist = $scope.groupWiseAssets[playlistObj.name].playlist;
                        if (playlist) {
                            var assetNames = playlist.assets.map(function (asset) {
                                return asset.filename;
                            });
                            $scope.ngDropdown.selectedAssets.forEach(function (asset) {
                                if (assetNames.indexOf(asset.playlistDetails.filename) == -1)
                                    playlist.assets.splice(0, 0, asset.playlistDetails);
                            })
                            $http.post(piUrls.playlists + playlistObj.name, {assets: playlist.assets})
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
                    onItemDeselect: function(playlist) {

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
            },
            //called from playlist details screen
            removeFromPlaylist: function () {
                if (PlaylistTab.selectedPlaylist) {
                    var playlist = $scope.groupWiseAssets[PlaylistTab.selectedPlaylist.name].playlist;
                    var assetNames = playlist.assets.map(function (asset) {
                        return asset.filename;
                    });
                    $scope.ngDropdown.selectedAssets.forEach(function (asset) {
                        var index = assetNames.indexOf(asset.playlistDetails.filename);
                        if (index >= 0) {
                            playlist.assets.splice(index, 1);
                            $scope.groupWiseAssets[PlaylistTab.selectedPlaylist.name].assets.splice(
                                $scope.groupWiseAssets[PlaylistTab.selectedPlaylist.name].assets.indexOf(asset),1
                            )
                        }
                    })
                    $http.post(piUrls.playlists + playlist.name, {assets: playlist.assets})
                        .success(function (data, status) {
                            if (data.success) {
                            }
                        })
                        .error(function (data, status) {
                            console.log(status);
                        });
                }
            }
        }
    }).

    controller('AssetsEditCtrl', function($scope,$rootScope,$state, $http, piUrls,piPopup){

            $scope.fn = {};
            $scope.fn.editMode = false;
            $scope.fn.edit = function () {
                $scope.fn.editMode = !$scope.fn.editMode;
                if ($scope.fn.editMode) {
                    $scope.names = [];
                    $scope.files.forEach(function (file) {
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
                    $scope.assemblePlaylistAssets()
                }
            }

            $scope.fn.delete= function(index){
                piPopup.confirm("File "+$scope.files[index], function() {
                    $http
                        .delete(piUrls.files+$scope.files[index])
                        .success(function(data, status) {
                            if (data.success) {
                                delete $scope.filesDetails[$scope.files[index]];
                                $scope.files.splice(index,1);
                                $scope.names.splice(index,1);
                            }
                        })
                        .error(function(data, status) {
                        });
                })
            }

            $scope.fn.rename= function(index){
                var oldname = $scope.files[index],
                    newname = $scope.names[index].name + $scope.names[index].ext;
                if (!$scope.names[index].name || $scope.files.indexOf(newname) >= 0) {
                    $scope.names[index].name = "File name exists or empty name";
                    $scope.editform.$setPristine();
                    $scope.fieldStatus = "has-error";
                } else {
                    $http
                        .post(piUrls.files + oldname, {  newname: newname })
                        .success(function (data, status) {
                            if (data.success) {
                                $scope.filesDetails[newname] = $scope.filesDetails[$scope.files[index]];
                                delete $scope.filesDetails[$scope.files[index]];
                                $scope.files[index] = newname;
                                $scope.editform.$setPristine();
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

        }).

    controller('AssetViewCtrl', function($scope, $rootScope,$window, $http, piUrls, $stateParams){

        //merge the apis for the three
        $scope.fileType;
        $scope.selectedLabels = [];
        switch($stateParams.file.slice($stateParams.file.lastIndexOf('.')+1)) {
            case 'gcal':
                $scope.fileType = 'gcal';
                $scope.calendarname = $stateParams.file;

                if($stateParams.file != "new"){
                    $http
                        .get(piUrls.calendars+$stateParams.file)
                        .success(function(data, status) {
                            if (data.success) {
                                $scope.calendar = data.data;
                            }
                        })
                        .error(function(data, status) {
                        });
                }
                break;
            case 'link':
            case 'tv':
                $scope.fileType = 'link';
                $http
                    .get(piUrls.links+$stateParams.file)
                    .success(function(data,status){
                        if(data.success){
                            $scope.urlLink = JSON.parse(data.data);
                        }
                    })
                    .error(function(data,status){
                        console.log(data,status);
                    })
                break;
            default:
                $scope.fileType = 'other';
                $http.get(piUrls.files + $stateParams.file)
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
                .post(piUrls.calendars+$stateParams.file, {email: value})
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
                $http.post(piUrls.files + $stateParams.file, {dbdata: $scope.filedetails.dbdata})
                    .success(function (data, status) {
                        if (data.success) {
                            $scope.filesDetails[data.data.name].labels = data.data.labels;
                            $window.history.back();
                        }
                    })
                    .error(function (data, status) {
                    });
            } else {
                $window.history.back();
            }
        }

    });