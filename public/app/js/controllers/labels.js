'use strict';

angular.module('piLabels.controllers', [])
    .controller('LabelsCtrl', function ($scope, $http,piUrls, selectedLabel,piPopup) {
        
        $scope.buttonText = 'Edit';
        $scope.editMode= false;        
        $scope.edit = function() {
            $scope.editMode = !$scope.editMode;
            selectedLabel.selectedLabel= null;
        }
        
        $http.get(piUrls.labels)
            .success(function(data, status) {
                if (data.success) {
                    $scope.labels= data.data;
                }
            })
            .error(function(data, status) {
            });

        $scope.newLabel = {
        }
        $scope.add = function(){
            if (!$scope.newLabel.name) {
                return;
            }

            for (var i=0; i <$scope.labels.length; i++) {
                if ($scope.labels[i].name == $scope.newLabel.name) {
                    $scope.newLabel.name = "Category exists";
                    return;
                }
            }

            $http
                .post(piUrls.labels, $scope.newLabel)
                .success(function(data, status) {
                    if (data.success) {
                        $scope.labels.push(data.data);
                        $scope.newLabel = {}
                    }
                })
                .error(function(data, status) {
                });
        }

        $scope.delete= function(index){
            if($scope.editMode){
                piPopup.confirm("Label", function() {

                    $http
                        .delete(piUrls.labels + $scope.labels[index]._id)
                        .success(function (data, status) {
                            if (data.success) {
                                $scope.labels.splice(index, 1);
                            }
                        })
                        .error(function (data, status) {
                        });
                })
            } else {
                selectedLabel.selectedLabel= null;
            }
        }
        
        $scope.getClass = function(label) {
            if (selectedLabel.selectedLabel == label) {
                return "active"
            } else {
                return ""
            }
        }
        
        $scope.selected= function(label){            
            if(!$scope.editMode)
                selectedLabel.selectedLabel= (selectedLabel.selectedLabel==label) ? null: label;
        }
        
        $scope.labelsCount= selectedLabel.labelsCount;
})
        