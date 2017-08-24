'use strict';

angular.module('pisignage.directives', []).

directive('showonhoverparent', function() {
    return {
        link : function(scope, element, attrs) {
            element.parent().bind('mouseenter', function() {
                element.show();
            });
            element.parent().bind('mouseleave', function() {
                element.hide();
            });
        }
    };
}).

directive('butterbar', ['$rootScope', function($rootScope) {
    return {
        link: function(scope, element, attrs) {

            element.addClass('hide');

            $rootScope.$on('$stateChangeStart', function() {
                element.removeClass('hide');
            });

            $rootScope.$on('$stateChangeSuccess', function() {
                element.addClass('hide');
            }); }
    }
}]).

directive('focus', function() {
    return {
        link: function(scope, element, attrs) {
            element[0].focus();
        }
    }
}).

directive('ngEnter', function() {
    return function(scope, element, attrs) {
        element.bind("keydown keypress", function(event) {
            if(event.which === 13) {
                scope.$apply(function(){
                    scope.$eval(attrs.ngEnter);
                });
                event.preventDefault();
            }
        });
    };
}).

directive('notify',['$timeout', function($timeout) {
    return {       
        scope: {
            show: '='
        },
        transclude: true,
        restrict: 'E',
        replace: 'true',        
        template: '<div class="col-xs-12 text-center notify" ng-show="show">{{msg}}</div>',        
        link: function(scope, elem, attr){            
            scope.msg= "Updated!";
            if (scope.show) {
                $timeout(function(){
                    scope.show= false;
                    if(scope.$parent.$parent) scope.$parent.$parent.notify= false;
                    scope.$apply();
                }, 2500);
            }            
        }
    };
}]).

directive('nodeimsFileUpload', ['fileUploader','piUrls', function(fileUploader, piUrls) {
    return {
        restrict: 'E',
        replace: true,
        transclude: true,
        scope: {
            postPath: '@',
            maxFiles: '@',
            maxFileSizeMb: '@',
            getAdditionalData: '&',
            onstart: '&',
            onprogress: '&',
            ondone: '&',
            onerror: '&'
        },
        template: function(tElem,tAttrs){
            return (
                '<label class="btn btn-link btn-block">'+
                        '<input type="file" multiple="" style="position:absolute;top:0;left:0;opacity: 0;width:100%;height:50px;z-index: 100"/>'+
                        '<span ng-transclude></span>'+
                    '</label>'
            )
        },
        compile: function compile(tElement, tAttrs, transclude) {            
            if (!tAttrs.maxFiles) {
                tAttrs.maxFiles = 10;
                tElement.removeAttr("multiple")
            } else {
                tElement.attr("multiple", "multiple");
            }        
            if (!tAttrs.maxFileSizeMb) {
                tAttrs.maxFileSizeMb = 3000;
            }        
            return function postLink(scope, el, attrs, ctl) {                
                scope.files = [];
                scope.showUploadButton = false;
                scope.percent = 0;
                scope.progressText = "";        
                el.bind('change', function(e) {
                    //warning - this is a FileList not an array!
                    console.log('file change event');
                    if (!e.target.files.length) return;
                    
                    scope.files = [];
                    scope.maxFiles = scope.maxFiles || 10;
                    scope.maxFileSizeMb = scope.maxFileSizeMb || 3000;
                    var tooBig = [];
                    if (e.target.files.length > scope.maxFiles) {
                        raiseError(e.target.files, 'TOO_MANY_FILES', "Cannot upload " + e.target.files.length + " files, maxium allowed is " + scope.maxFiles);
                        return;
                    }
        
                    for (var i = 0; i < scope.maxFiles; i++) {
                        if (i >= e.target.files.length) break;        
                        var file = e.target.files[i];
                        scope.files.push(file);
                        if (file.size > scope.maxFileSizeMb * 1048576) {
                            tooBig.push(file);
                        }
                    }
        
                    if (tooBig.length > 0) {
                        raiseError(tooBig, 'MAX_SIZE_EXCEEDED', "Files are larger than the specified max (" + scope.maxFileSizeMb + "MB)");
                        return;
                    }
                    scope.autoUpload = 'true'; //forcing as of now
                    if (scope.autoUpload && scope.autoUpload.toLowerCase() == 'true') {                        
                        if(attrs.allow == 'imageonly') {
                            if (! (scope.files[0].type.indexOf('image') == -1) ) {
                                scope.upload();
                            }
                            else {
                                scope.onerror({file: scope.files[0].name, msg: "Upload only image files"});
                            }
                        }
                        else{
                            scope.upload();
                        }                        
                    } else {
                        scope.$apply(function() {
                            scope.showUploadButton = true;
                        })
                    }
                });
                
                scope.upload = function() {
                    scope.onstart();
        
                    var data = null,
                        uploadPath = piUrls.files;
                    if (scope.getAdditionalData) {
                        data = scope.getAdditionalData();
                    }
                    if (scope.postPath) {
                        uploadPath = piUrls.base+scope.postPath;
                    }
                    //make a copy of file in obj
                    var objFiles = [],
                        obj;
                    for (var i = 0; i < scope.files.length; i++) {
                        //copy File properties to an object
                        obj = {};
                        obj.name = scope.files[i].name;
                        obj.type = scope.files[i].type;
                        obj.lastModified = scope.files[i].lastModified;
                        obj.lastModifiedDate = scope.files[i].lastModifiedDate;
                        obj.size = scope.files[i].size;
                        objFiles.push(obj);
                    }

                    fileUploader
                        .post(scope.files, data)
                        .to(uploadPath)
                        .then(function(ret) {
                            scope.ondone({files: objFiles, data: ret.data});
                        }, function(error) {
                            scope.onerror({files: objFiles, type: error.type, msg: error.msg});
                        },  function(progress) {
                            scope.onprogress({percentDone: progress});
                            scope.percent = progress;
                            scope.progressText = progress + "%";
                            //scope.ondone({files: 'test', data: 'test'});
                        });
        
                    resetFileInput();
                };
        
                function raiseError(files, type, msg) {
                    scope.$apply(function() {
                        scope.onerror({files: files, type: type, msg: msg});
                    });
                    resetFileInput();
                }
        
                function resetFileInput() {
        
                }
            }
        }
    }
}]).

directive('categories',['$http','piUrls', function($http,piUrls,truncate) {
    return {
        scope: {
            selectedLabels: '=',
            labels: '='
        },
        restrict: 'E',
        replace: 'true',
        template:   '<form><div class="row"><div ng-repeat="category in cat.categories" class="col-sm-3">'+
                        '<label class="checkbox-inline">' +
                        '<input type="checkbox" value="{{category.name}}"'+
                                'ng-checked="selectedLabels.indexOf(category.name) &gt; -1"'+
                                'ng-click="cat.toggleSelection(category.name)"/>'+
                                '<small class="text-muted" ng-attr-title="{{category.name}}">{{category.name | truncate:18}}</small>' +
                    '</label></div></div></form>',
        link: function(scope, elem, attr){
            scope.cat = {}   //holds all the category related objects
            $http.get(piUrls.labels,{})
                .success(function(data, status) {
                    if (data.success) {
                        scope.cat.categories = data.data;
                        if (scope.labels)
                            scope.labels = scope.cat.categories;
                    }
                })
                .error(function(data, status) {
                });


            // toggle selection for a given fruit by name
            scope.cat.toggleSelection = function(category) {
                var idx = scope.selectedLabels.indexOf(category);

                // is currently selected
                if (idx > -1) {
                    scope.selectedLabels.splice(idx, 1);
                }

                // is newly selected
                else {
                    scope.selectedLabels.push(category);
                }
            };
        }
    };
}]).

directive('unsavedChangesWarning', ['saveChangesPrompt', '$parse', function(saveChangesPrompt, $parse) {
        return {
            require: 'form', // we must require form to get access to formController
            link: function(scope, formElement, attrs, formController) {

                //console.log('FORM : Linker called'); // debug
                //console.log(formController);


                // Here we pass in the formController
                // Note its critical to pass the controller, and not the form elem itself
                //     this is because the form elem doesn't contain the logic of $dirty, $valid, etc.
                //     this logic is handled by the controller.
                //     When using the form in a controller, you can access $scope.formName.$dirty
                //     because you are accessing the formController by default
                //
                saveChangesPrompt.init(formController);


                // this allows for a custom event on submit
                //
                // @todo test!
                //
                // $parse creates a function from an expression
                //     so even no `rcSubmit` attr will return a function
                //     which prevents our call below from breaking
                //
                // @todo can we use this above, in our service?
                //
                var fn = $parse(attrs.rcSubmit);


                // intercept the form submit functionality
                // and unbind our listener...
                //
                // @todo unbind when using non-traditional submit... ie: custom save function
                //
                // @todo unbind throw error if user changes location, but the `.removeListener()` has not been called
                //       this will ensure developers follow protocal with their custom save functions
                //
                formElement.bind('submit', function(event) {

                    // if form is not valid cancel it.
                    //
                    // @note we dont need to check for this, since this is handled by validation???
                    //       if (!formController.$valid) return false;
                    //
                    saveChangesPrompt.removeListener();

                    // apply our custom submit function, if any
                    scope.$apply(function() {
                        //console.log('FANCY SUBMIT');
                        fn(scope, {
                            $event: event
                        });
                    });
                });
            }
        };
    }
])

.directive('errSrc', function() {
    return {
        link: function(scope, element, attrs) {
            element.bind('error', function() {
                if (attrs.src != attrs.errSrc) {
                    attrs.$set('src', attrs.errSrc);
                }
            });
        }
    }
})
