'use strict;'

angular.module('admin.controllers', []).

    controller('AdminCtrl', function($scope,$http,$modal,piUrls,piPopup) {
        $scope.defaultTypes = ['Free', 'Standard', 'Enterprise'];
        $http
            .get(piUrls.users, {})
            .success(function(data, status) {
                if (data.success) {
                    $scope.users = data.data;
                }
            })
            .error(function(data, status) {
            });

        $scope.updateLicenses = function(user) {
            $scope.modalUser = user;

            $scope.modal = $modal.open({
                template: "<div class='modal-header'>"+
                        "<h3 class='text-warning'>Edit License Details</h3>"+
                        "</div>"+
                        "<div class='modal-body'>"+
                            '<div class="form-group">'+
                                '<label class="control-label"> Total Number of Licenses</label>'+
                                '<input class="form-control" type="number" ng-model="modalUser.licensesPurchased"/>'+
                            '</div>'+
                            "<textarea placeholder='Enter Additional Notes Here' class='form-control' rows='3' ng-model='modalUser.details.note'></textarea>"+
                        '</div>'+
                        "<div class='modal-footer'>"+
                          "<button ng-click='modal.close()' class='btn btn-warning'>Cancel</button>"+
                          "<button ng-click='save()' class='btn btn-success'>Save</button>"+
                        "</div>",
                scope: $scope
            });
        }

        $scope.save = function() {
            $http.post('/api/users/'+$scope.modalUser._id, $scope.modalUser)
                .success(function (data, status) {
                    if (data.success) {
                        console.log('Successfully updated the type');
                        //console.log(data);
                    }
                })
                .error(function (data, status) {
                });
            $scope.modal.close();
        }
    })