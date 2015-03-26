'use strict;'

angular.module('piassets.controllers',[])
    .controller('AssetsCtrl',['$scope','$rootScope','$location','Navbar','piUrls','$http','$modal', 'selectedLabel', 'piConstants','fileUploader','$window',
        function($scope,$rootScope,$location, Navbar,piUrls,$http,$modal,selectedLabel, piConstants, fileUploader, $window){
            $scope.navbar = Navbar;

            Navbar.showPrimaryButton= true;
            Navbar.primaryButtonText= "EDIT";
            Navbar.primaryButtonTypeClass= "btn-info";
            
            $scope.hideGcal = false; //temporary fix for gcal
            if($location.$$port == 8000) {
                $scope.hideGcal = true;
            }
            $scope.status = {
                plainView : true,
                unassignedView : true
            }
            $http.get(piUrls.files,{})
                .success(function(data, status) {
                    if (data.success) {
                        $scope.files = data.data.files;
                        setUpPlaylistWise();                        
                        if (data.data.dbdata) {
                            $scope.filesDetails = {};
                            Object.keys(selectedLabel.labelsCount).forEach(function(item){
                                selectedLabel.labelsCount[item]= 0;
                            });
                            data.data.dbdata.forEach(function(dbdata){
                                if ($scope.files.indexOf(dbdata.name) >=0){
                                    $scope.filesDetails[dbdata.name] = dbdata;
                                }
                            })
                            for (var filename in $scope.filesDetails) {
                                $scope.filesDetails[filename].labels.forEach(function(item){
                                    selectedLabel.labelsCount[item]=(selectedLabel.labelsCount[item] || 0)+1;
                                })
                            }
                        }
                    }                   
                })
                .error(function(data, status) {
                });


            $scope.upload = {}
            $scope.upload.started = function(files) {
                $scope.msg = {title:'Upload',msg:'Please Wait',disable:true,btnTxt: 'Uploading', dismiss: true};
                $scope.modal = $modal.open({
                    templateUrl: '/app/templates/uploadPopup.html',
                    scope: $scope,
                    backdrop: 'static',
                    keyboard: false
                });
            };

            $scope.upload.progress = function(percentDone) {
                $scope.msg.msg = percentDone + "% done";
            };

            $scope.upload.done = function(files, data) {           //called when upload is done
                $scope.uploadedFiles = files;
                if(data.data) {
                    data.data.forEach(function(item){
                        if($scope.files.indexOf(item.name) == -1)
                            $scope.files.push(item.name);
                    });
                };
                $scope.msg = {title:'Upload',msg:"Upload Complete",disable:false,btnTxt: 'Continue', dismiss: false};            }

            $scope.selectedLabels = [];
            $scope.upload.modalOk = function() {
                if($scope.msg.dismiss){
                    $scope.modal.close();
                    $window.location.reload();
                    return;
                }
                $scope.msg = {title:'Upload',msg:'Processing in Progress...',disable:true,btnTxt: 'Please Wait', dismiss: true};
                $http
                    .post(piUrls.filespostupload, { files: $scope.uploadedFiles, categories: $scope.selectedLabels })
                    .success(function (data, status) {                        
                        if (data.success) {
                            $scope.msg = {title:'Queued in for Processing',
                                msg:'If there is a need for conversion, it will take few minutes to appear in assets',
                                disable:false, btnTxt: 'OK', dismiss: true
                            };
                        } else {
                            $scope.msg = {title:'Upload',msg:'Processing Error...', disable:false, btnTxt: 'Dismiss',error: data.stat_message, dismiss: true};
                        }
                    })
                    .error(function (data, status) {
                        $scope.msg = {title:'Upload',msg:'HTTP Post Error', disable:false, btnTxt: 'Dismiss', dismiss: true};
                    });
            }            

            $scope.upload.error = function(files, type, msg) {
                if (!$scope.modal)
                    $scope.upload.started();
                $scope.msg = {title:'Upload',msg: 'Upload Error',disable:false, btnTxt: 'Dismiss', error: type+': '+ msg, dismiss: true};             
            }
            $scope.upload.abort = function() {
                //$scope.msg = {title:'Upload',msg: 'Upload Cancelled',disable:false, btnTxt: 'Dismiss', error: type+': '+ msg, dismiss: true};
                fileUploader.cancel();
            }

            $scope.loadAsset = function(file) {
                if (file.indexOf(".gcal") != -1 && $scope.hideGcal) //temporary fix for gcal
                    return;

                if (file.indexOf(".html") != -1)
                    $location.path("/assets/notices/"+file);
                else if (file.indexOf(".gcal") != -1)
                    $location.path("/assets/calendars/"+file);
                else if(file.indexOf(".tv") >= 0 ||  file.indexOf(".link") >= 0)
                    $location.path("assets/links/"+file);
                else
                    $location.path("/assets/details/"+file);
            }

            $scope.pbHandler = function(buttonText){
                if (buttonText == "EDIT") {
                    $location.path('/assets/edit');
                }
            }
            Navbar.primaryButtonHandler = $scope.pbHandler;
            
            $scope.label_search= function(obj){
                if(selectedLabel.selectedLabel){
                    return ($scope.filesDetails[obj.filename || obj] && $scope.filesDetails[obj.filename || obj].labels.indexOf(selectedLabel.selectedLabel) >= 0)
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
            
            var setUpPlaylistWise = function() {
                $http
                    .get(piUrls.playlists, {})
                    .success(function(data, status) {
                        if (data.success) {
                            $scope.unassigned = [];
                            $scope.customPl = {plfiles: [], playlist: data.data};
                            
                            data.data.forEach(function(item, index) {
                                var dest = $scope.customPl.playlist[index],
                                    pl = $scope.customPl.plfiles;
                                pl.push.apply(pl, dest.assets.map(function(file) {
                                    file.deleted = ($scope.files.indexOf(file.filename) < 0) ? true: false;
                                    if(pl.indexOf(file.filename) < 0)
                                        return file.filename;                                    
                                }))
                            })
                            $scope.files.forEach(function(asset) {
                                if($scope.customPl.plfiles.indexOf(asset) < 0) {
                                    $scope.unassigned.push(asset);
                                }
                            })                        
                        }
                    })
                    .error(function(data, status) {
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

    }]).
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


            $scope.delete= function(index){
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



            $scope.pbHandler = function(buttonText){
                if (buttonText == "DONE") {
                    $location.path('/assets');
                }
            }
            Navbar.primaryButtonHandler = $scope.pbHandler;
        }]).
    controller('AssetsItemCtrl',['$scope','$http', 'piUrls',function($scope,$http,piUrls){
        $scope.rename= function(index){
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
    }])