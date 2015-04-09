'use strict;'

angular.module('piAssets.controllers',[])
    .controller('AssetsCtrl',function($scope,$state,piUrls,$http,$modal, piConstants,
                                      fileUploader, $window,piPopup, Upload, PlaylistTab,Label){

        $scope.selected = {playlist:null}

        $scope.setAssetParam = function(){
            if (!$scope.groupWiseAssets)
                return;

            $scope.showAssets = {};
            if (PlaylistTab.selectedPlaylist) {
                $scope.selected.playlist = $scope.groupWiseAssets[PlaylistTab.selectedPlaylist.name].playlist;
                $scope.showAssets[PlaylistTab.selectedPlaylist.name] = $scope.groupWiseAssets[PlaylistTab.selectedPlaylist.name]
            } else if (Label.selectedLabel) {
                $scope.showAssets[Label.selectedLabel] = $scope.groupWiseAssets[Label.selectedLabel]
            } else {
                $scope.selected.playlist = null;
                $scope.showAssets = {'All': $scope.allAssets['All']}
            }
            if ($scope.selected.rightWindowNeeded )
                $scope.showAssets = {'All':$scope.allAssets['All']}
        }

        $scope.filterPlaylistName = function(items) {
            if ($scope.selected.playlist) {
                var result = {};
                result[$scope.selected.playlist.name] = $scope.groupWiseAssets[$scope.selected.playlist.name];
                return result;
            } else
                return $scope.groupWiseAssets;
        }

        var assemblePlaylistAssets = function() {
            $scope.groupWiseAssets = {};
            $scope.allAssets = {};
            $scope.includedAssets = [];

            $scope.playlists.forEach(function(playlist){
                $scope.groupWiseAssets[playlist.name] = {
                    playlist:playlist,
                    assets: []
                };
                playlist.assets.forEach(function(asset){

                    if ($scope.files.indexOf(asset.filename) != -1) {
                        var obj = {};
                        obj.fileDetails = $scope.filesDetails[asset.filename] || {name: asset.filename};
                        obj.playlistDetails = asset;
                        obj.deleted = ($scope.files.indexOf(asset.filename) == -1);
                        $scope.groupWiseAssets[playlist.name].assets.push(obj)
                    }
                    if (asset.side && $scope.files.indexOf(asset.side) != -1) {
                        var obj = {};
                        obj.fileDetails = $scope.filesDetails[asset.side] || {name: asset.side};
                        obj.playlistDetails = null;
                        obj.deleted = ($scope.files.indexOf(asset.filename) == -1);
                        $scope.groupWiseAssets[playlist.name].assets.push(obj)
                    }
                    if (asset.bottom && $scope.files.indexOf(asset.bottom) != -1) {
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
                                    assemblePlaylistAssets();
                                }
                            })
                            .error(function(data, status) {
                            });
                    }
                }
            })
            .error(function(data, status) {
            });

        $scope.groupByOptions = ["playlist","label","type","none"]
        $scope.groupType = "playlist"
        $scope.groupBy = function(attribute) {               //attribute could be playlist, label, type, date
            $scope.groupWiseAssets = {};
            $scope.allAssets = {};
            $scope.includedAssets = [];
            switch(attribute) {
                case 'playlist':
                    $scope.playlists.forEach(function(playlist){
                        $scope.groupWiseAssets[playlist.name] = {
                            playlist:playlist,
                            assets: []
                        };
                        playlist.assets.forEach(function(asset){

                            if ($scope.files.indexOf(asset.filename) != -1) {
                                var obj = {};
                                obj.fileDetails = $scope.filesDetails[asset.filename] || {name: asset.filename};
                                obj.playlistDetails = asset;
                                obj.deleted = ($scope.files.indexOf(asset.filename) == -1);
                                $scope.groupWiseAssets[playlist.name].assets.push(obj)
                            }
                            if (asset.side && $scope.files.indexOf(asset.side) != -1) {
                                var obj = {};
                                obj.fileDetails = $scope.filesDetails[asset.side] || {name: asset.side};
                                obj.playlistDetails = null;
                                obj.deleted = ($scope.files.indexOf(asset.filename) == -1);
                                $scope.groupWiseAssets[playlist.name].assets.push(obj)
                            }
                            if (asset.bottom && $scope.files.indexOf(asset.bottom) != -1) {
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
                    $scope.allAssets['Unassigned'] =  {
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
                            $scope.allAssets['Unassigned'].assets.push(obj)
                        //}
                    })
                    break;
                case 'label':
                    break;
                case 'type':
                    break;
                default:
                    $scope.groupWiseAssets['All'] = [];
                    $scope.files.forEach(function(filename) {
                        $scope.groupWiseAssets['All'].push($scope.filesDetails[filename] || {name: filename})
                    })
                    break;
            }
        }


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
                if (data.data) {
                    data.data.forEach(function (item) {
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

        $scope.selectedLabels = [];

        $scope.label_search= function(obj){
            if(Label.Label){
                return ($scope.filesDetails[obj.filename || obj] && $scope.filesDetails[obj.filename || obj].labels.indexOf(Label.selectedLabel) >= 0)
            }else{
                return true;
            }
        }

        $scope.configureGCalendar= function() {
            $scope.gCalModal = $modal.open({
                templateUrl: '/app/templates/gCalPopup.html',
                scope: $scope
            });
        }

        $scope.extension = function(val) {
            val = val.filename || val;
            switch($scope.ext) {
                case 'v':
                    return val.match(piConstants.videoRegex);
                    break;
                case 'i':
                    return val.match(piConstants.imageRegex);
                    break;
                case 'n':
                    return val.match(piConstants.noticeRegex);
                    break;
                default:
                    return val;
                    break;
            }
        }

        $scope.link = {
            types: [{name: 'You Tube', ext: '.tv'}, {name: 'Web Link', ext: '.link'}],
            obj: {
                name: null,
                type: null,
                link: null
            },
            showPopUp: function () {
                $scope.link.obj.type = $scope.link.types[1];
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


    }).

    controller('AssetViewCtrl', function($scope, $rootScope, $http, piUrls, $stateParams, $location){
            $http.get(piUrls.files + $stateParams.file)
                .success(function(data, status) {
                    if (data.success) {
                        $scope.filedetails = data.data;
                    }
                })
                .error(function(data, status) {
                });

            $scope.save = function() {
                $http.post(piUrls.files + $stateParams.file, {dbdata: $scope.filedetails.dbdata})
                    .success(function(data, status) {
                        if (data.success) {
                            $scope.filedetails.dbdata = data.data;
                            $location.path('/assets');
                        }
                    })
                    .error(function(data, status) {
                    });
            }

    }).
    controller('AssetsEditCtrl', function($scope,$rootScope, $http, piUrls,piPopup){

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
                }
            }

            $scope.fn.delete= function(index){
                piPopup.confirm("File "+$scope.files[index], function() {
                    $http
                        .delete(piUrls.files+$scope.files[index])
                        .success(function(data, status) {
                            if (data.success) {
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
                                $scope.files[index] = newname;
                                $scope.editform.$setPristine();
                                $scope.fieldStatus = "has-success";
                            }
                        })
                        .error(function (data, status) {
                        });
                }
            }

        })