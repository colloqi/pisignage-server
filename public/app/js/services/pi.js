'use strict';

//ims Admin services

angular.module('pisignage.services',[]).

    //https://github.com/logicbomb/lvlFileUpload
    factory('fileUploader', ['$rootScope', '$q', function($rootScope, $q) {
        var xhr, completeTransferDone;
        var svc = {
            post: function(files, data, progressCb) {

                return {
                    to: function(uploadUrl)
                    {
                        var deferred = $q.defer()
                        if (!files || !files.length) {
                            deferred.reject("No files to upload");
                            return;
                        }
                        xhr = new XMLHttpRequest();
                        completeTransferDone = false;
                        xhr.upload.onprogress = function(e) {
                            $rootScope.$apply (function() {
                                var percentCompleted;
                                if (e.lengthComputable) {
                                    if (e.loaded == e.total)
                                        completeTransferDone = true;
                                    percentCompleted = Math.round(e.loaded / e.total * 100);
                                    if (progressCb) {
                                        progressCb(percentCompleted);
                                    } else if (deferred.notify) {
                                        deferred.notify(percentCompleted);
                                    }
                                }
                            });
                        };

                        xhr.onload = function(e) {
                            $rootScope.$apply (function() {
                                var ret = {
                                    files: files,
                                    data: {}
                                };
                                try {
                                    ret.data = angular.fromJson(xhr.responseText)
                                } catch (e) {
                                    ret.data = "ResponseText Parsing error"
                                }
                                deferred.resolve(ret);
                            })
                        };

                        xhr.upload.onerror = function(e) {
                            var msg = xhr.responseText ? xhr.responseText : "An unknown error occurred posting to '" + uploadUrl + "'";
                            $rootScope.$apply (function() {
                                deferred.reject(msg);
                            });
                        }
                        xhr.upload.onabort = function(e) {
                            var msg = xhr.responseText ? xhr.responseText : "Abort uploading files to '" + uploadUrl + "'";
                            deferred.reject({ type: 'USER_ABORTED', msg: msg});
                        }

                        var formData = new FormData();

                        if (data) {
                            formData.append('data', JSON.stringify(data))
                        }

                        for (var idx = 0; idx < files.length; idx++) {
                            formData.append('assets', files[idx]);
                        }

                        xhr.open("POST", uploadUrl);
                        xhr.send(formData);

                        return deferred.promise;
                    }
                };
            },
            cancel: function() {
                xhr.upload.onprogress = function() {};
                if (!completeTransferDone)
                    xhr.abort();
            }
        };

        return svc;
    }]).

    factory('onlineStatusInterceptor', ['$q','$rootScope',function($q,$rootScope) {

        var onlineStatus = false;
        return {
            'response': function(response) {
                if (!onlineStatus) {
                    onlineStatus = true;
                    $rootScope.$broadcast('onlineStatusChange',onlineStatus);
                }
                return response || $q.when(response);
            },

            'responseError': function(rejection) {
                if (onlineStatus) {
                    onlineStatus = false;
                    $rootScope.$broadcast('onlineStatusChange',onlineStatus);
                }
                return $q.reject(rejection);
            }
        };
    }]).

    factory("piPopup", ["$modal", function($modal) {

        return {
            confirm: function (objString, cb) {
                return (
                    $modal.open({
                        templateUrl: '/app/templates/confirm-popup.html',
                        controller: ['$scope', '$modalInstance', 'msg', function ($scope, $modalInstance, msg) {
                            $scope.deleteText = msg;
                            $scope.ok = function () {
                                $modalInstance.close('ok');
                                cb();
                            };
                            $scope.cancel = function () {
                                $modalInstance.dismiss('cancel');
                            };
                        }],
                        resolve: {
                            msg: function () {
                                return objString;
                            }
                        }
                    })
                )
            },
            status: function (objString) {
                return (
                    $modal.open({
                        templateUrl: '/app/templates/statusPopup.html',
                        controller: ['$scope', '$modalInstance', 'msg', function ($scope, $modalInstance, msg) {
                            $scope.msg = msg;
                            $scope.cancel = function () {
                                $modalInstance.dismiss('cancel');
                            };
                        }],
                        resolve: {
                            msg: function () {
                                return objString;
                            }
                        }
                    })
                )
            }
        }
    }]).

    factory('saveChangesPrompt', ['$rootScope',
        function($rootScope) {

            var messages = {
                navigate: "You will loose unsaved changes if you leave this page",
                reload: "You will loose unsaved changes if you reload this page"
            };

            // empty return function
            // defined here because in some instances we call this
            // as a callback when it may not be defined, so defining here prevents the
            // need for `typeof` checks later on
            //
            var removeFunction = function() {};

            // check if form is dirty
            var isFormDirty = function(form) {
                var d = (form.$dirty) ? true : false;
                //console.log('ARE FORMS DIRTY? ' + d);
                return d;
            };

            return {
                init: function(form) {
                    
                    // @todo optimse this, because this code is duplicated.
                    function confirmExit() {

                        //console.log('REFRESH / CLOSE detected');

                        // @todo this could be written a lot cleaner!
                        if (isFormDirty(form)) {
                            return messages.reload;
                        } else {
                            removeFunction();
                            window.onbeforeunload = null;
                        }
                    }

                    // bind our reload check to the window unload event
                    // which is called when a user tries to close a tab, click back button, swipe back (iOS) or refresh the page
                    window.onbeforeunload = confirmExit;

                    // calling this function later will unbind this, acting as $off()
                    removeFunction = $rootScope.$on('stateChangeStart', function(event, next, current) {

                        //console.log('ROUTE CHANGE detected');

                        // @todo this could be written a lot cleaner!
                        if (isFormDirty(form)) {
                            if (!confirm(messages.navigate)) {
                                event.preventDefault(); // user clicks cancel, wants to stay on page
                            } else {
                                removeFunction(); // unbind our `locationChangeStart` listener
                                window.onbeforeunload = null; // clear our the `refresh page` listener
                            }
                        } else {
                            removeFunction(); // unbind our `locationChangeStart` listener
                            window.onbeforeunload = null; // clear our the `refresh page` listener
                        }

                    });
                },

                // @todo need to support this somehow within the directive
                removeListener: function() {
                    //console.log('CHOOSING TO REMOVE THIS FUNCTION');
                    removeFunction();
                    window.onbeforeunload = null;
                }
            };
        }
    ]).factory('commands',function(){ // get commands 
        var storedArry =['*** Or use any bash command ***',
                            'uptime',
                            'date',
                            'ifconfig',
                            'ls ../media',
                            'tail -200 /home/pi/forever_out.log'
                            ],
            current = storedArry.length;

        return {
            previous: function(){ // get previous command
                --current;
                if(current <= 0) 
                    current = 0 ;
                return storedArry[current];
            },
            next: function(){ // get next command
                ++current;
                if(current >= storedArry.length)
                     current = storedArry.length;
                
                return storedArry[current];
            },
            save: function(cmd){ // save command
                storedArry.push(cmd);
                current = storedArry.length;
            }
        }
    });
