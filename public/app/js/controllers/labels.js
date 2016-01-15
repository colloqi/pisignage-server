'use strict';

angular.module('piLabels.controllers', [])
    .controller('LabelsCtrl', function ($scope, $http,$location,piUrls, assetLoader,piPopup) {

        $scope.label = assetLoader.label;

        $scope.fn = {};
        $scope.fn.editMode = false;
        $scope.fn.edit = function () {
            $scope.fn.editMode = !$scope.fn.editMode;
            assetLoader.selectLabel();
        }

        $scope.newLabel = {}
        $scope.fn.add = function(){
            if (!$scope.newLabel.name) {
                return;
            }

            for (var i=0; i <$scope.label.labels.length; i++) {
                if ($scope.label.labels[i].name == $scope.newLabel.name) {
                    $scope.newLabel.name = "Label exists";
                    return;
                }
            }

            $http
                .post(piUrls.labels, $scope.newLabel)
                .success(function(data, status) {
                    if (data.success) {
                        $scope.label.labels.unshift(data.data);
                        $scope.newLabel = {}
                    }
                })
                .error(function(data, status) {
                });
        }

        $scope.fn.delete= function(index){
            if($scope.fn.editMode){
                piPopup.confirm("Label "+$scope.label.labels[index].name, function() {

                    $http
                        .delete(piUrls.labels + $scope.label.labels[index]._id)
                        .success(function (data, status) {
                            if (data.success) {
                                $scope.label.labels.splice(index, 1);
                            }
                        })
                        .error(function (data, status) {
                        });
                })
            } else {
                $scope.fn.selected($scope.label.labels[index].name)
            }
        }
        
        $scope.fn.getClass = function(label) {
            if ($scope.label.selectedLabel == label) {
                return "bg-info"
            } else {
                return ""
            }
        }
        
        $scope.fn.selected= function(label){
            if(!$scope.fn.editMode)
                assetLoader.selectLabel(($scope.label.selectedLabel==label) ? null: label);
        }

})
        