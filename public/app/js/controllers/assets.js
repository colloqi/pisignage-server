'use strict;'

angular.module('piAssets.controllers',[])
    .controller('AssetsCtrl',function($scope,$rootScope,$location,piUrls,$http,$modal,Label, piConstants, fileUploader, $window){

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
                                    $scope.groupBy($scope.groupType)
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
            $scope.includedAssets = [];
            switch(attribute) {
                case 'playlist':
                    $scope.playlists.forEach(function(playlist){
                        $scope.groupWiseAssets[playlist.name] = [];
                        playlist.assets.forEach(function(asset){
                            if ($scope.files.indexOf(asset.filename) != -1)
                                $scope.groupWiseAssets[playlist.name].push($scope.filesDetails[asset.filename] || {filename: asset.filename} )
                            if (asset.side && $scope.files.indexOf(asset.side) != -1)
                                $scope.groupWiseAssets[playlist.name].push($scope.filesDetails[asset.side] || {filename: asset.side} )
                            if (asset.bottom && $scope.files.indexOf(asset.bottom) != -1)
                                $scope.groupWiseAssets[playlist.name].push($scope.filesDetails[asset.bottom] || {filename: asset.bottom} )

                            $scope.includedAssets.push(asset.filename)
                            if (asset.side)
                                $scope.includedAssets.push(asset.side)
                            if (asset.bottom)
                                $scope.includedAssets.push(asset.bottom)

                        })
                    });
                    $scope.groupWiseAssets['Unassigned'] = [];
                    $scope.files.forEach(function(filename) {
                        if ($scope.includedAssets.indexOf(filename) == -1)
                            $scope.groupWiseAssets['Unassigned'].push($scope.filesDetails[filename] || {filename: filename})
                    })
                    break;
                case 'label':
                    break;
                case 'type':
                    break;
                default:
                    $scope.groupWiseAssets['All'] = [];
                    $scope.files.forEach(function(filename) {
                        $scope.groupWiseAssets['All'].push($scope.filesDetails[filename] || {filename: filename})
                    })
                    break;
            }
        }



        $scope.upload = {
            started: function (files) {
                $scope.msg = {
                    title: 'Upload',
                    msg: 'Please Wait',
                    disable: true,
                    btnTxt: 'Uploading',
                    dismiss: true
                };
                $scope.modal = $modal.open({
                    templateUrl: '/app/templates/upload-popup.html',
                    scope: $scope,
                    backdrop: 'static',
                    keyboard: false
                });
            },
            progress: function (percentDone) {
                $scope.msg.msg = percentDone + "% done";
            },
            done: function (files, data) {           //called when upload is done
                $scope.msg = {title:'Upload',msg:"Upload Complete",disable:false,btnTxt: 'Continue', dismiss: false};
                $scope.uploadedFiles = files;
                if (data.data) {
                    data.data.forEach(function (item) {
                        if ($scope.files.indexOf(item.name) == -1)
                            $scope.files.push(item.name);
                    });
                }
            },
            error: function(files, type, msg) {
                if (!$scope.modal)
                    $scope.upload.started();
                $scope.msg = {title:'Upload',msg: 'Upload Error',disable:false, btnTxt: 'Dismiss', error: type+': '+ msg, dismiss: true};
            },
            abort: function() {
                fileUploader.cancel();
            },
            modalOk: function () {
                if ($scope.msg.dismiss) {
                    $scope.modal.close();
                    $window.location.reload();
                    return;
                }
                $scope.msg = {
                    title: 'Upload',
                    msg: 'Processing in Progress...',
                    disable: true,
                    btnTxt: 'Please Wait',
                    dismiss: true
                };
                $http
                    .post(piUrls.filespostupload, {files: $scope.uploadedFiles, categories: $scope.selectedLabels})
                    .success(function (data, status) {
                        if (data.success) {
                            $scope.msg = {
                                title: 'Queued in for Processing',
                                msg: 'If there is a need for conversion, it will take few minutes to appear in assets',
                                disable: false, btnTxt: 'OK', dismiss: true
                            };
                        } else {
                            $scope.msg = {
                                title: 'Upload',
                                msg: 'Processing Error...',
                                disable: false,
                                btnTxt: 'Dismiss',
                                error: data.stat_message,
                                dismiss: true
                            };
                        }
                    })
                    .error(function (data, status) {
                        $scope.msg = {
                            title: 'Upload',
                            msg: 'HTTP Post Error',
                            disable: false,
                            btnTxt: 'Dismiss',
                            dismiss: true
                        };
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

        $scope.linkTypes = [{name:'You Tube',ext:'.tv'} ,{name:'Web Link',ext:'.link'}];

        $scope.urlLink = {
            name : '',
            type: $scope.linkTypes[0],
            link: ''
        };

        $scope.linksPopUp = function(){
            $scope.modal = $modal.open({
                templateUrl: '/app/templates/linkPopUp.html',
                scope: $scope
            });
        }

        $scope.saveDetails = function(){
            $scope.urlLink.type = $scope.urlLink.type.ext;
            $http
                .post(piUrls.links ,{ details : $scope.urlLink} )
                .success(function(data,status){
                    if(data.success){
                        //$scope.Filestatus = data.stat_message;
                        $scope.modal.close();
                    }
                })
                .error(function(data,status){
                    $scope.errorMessage = data.stat_message;
                })
        }

        $scope.fn.delete= function(index){
            piPopup.confirm("File", function() {
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

    }).

    controller('AssetViewCtrl',['$scope','$rootScope', '$http','piUrls', '$stateParams','Navbar','$location',
        function($scope, $rootScope, $http, piUrls, $stateParams, Navbar,$location){
            Navbar.showPrimaryButton= false;
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

    }]).
    controller('AssetsEditCtrl',['$scope','$rootScope', '$http', 'piUrls','$location','Navbar', 'piFeatures','piPopup',
        function($scope,$rootScope, $http, piUrls,$location,Navbar,piFeatures,piPopup){

            $scope.renameFeature  = piFeatures.assetRenameFeature;

            Navbar.showPrimaryButton= true;
            Navbar.primaryButtonText= "DONE";
            Navbar.primaryButtonTypeClass= "btn-success";
            
            $http
                .get(piUrls.files,{})
                .success(function(data, status) {
                    if (data.success) {
                        $scope.files = data.data.files;
                        $scope.names=[];
                        $scope.files.forEach(function(file){
                            $scope.names.push({name: file.slice(0,file.lastIndexOf('.')),
                                                ext: file.slice(file.lastIndexOf('.'))})
                        });
                    }
                })
                .error(function(data, status) {
                });

        }])