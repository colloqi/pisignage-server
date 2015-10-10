'use strict';

angular.module('piLabels.controllers', [])
    .factory('Label', function() {
        return({selectedLabel:null, labelsCount: {}, labels:[]})
    })
    .controller('LabelsCtrl', function ($scope,$stateParams, $http,$location,piUrls, Label,PlaylistTab,piPopup) {

/*
        if ($stateParams.label)
            Label.selectedLabel = $stateParams.label;
        else
            Label.selectedLabel = null;
        PlaylistTab.selectedPlaylist = null;         //clear all selected Labels

        $scope.setAssetParam();
*/

        $scope.fn = {};
        $scope.fn.editMode = false;
        $scope.fn.edit = function () {
            $scope.fn.editMode = !$scope.fn.editMode;
            Label.selectedLabel = null;
        }

        $scope.newLabel = {}
        $scope.fn.add = function(){
            if (!$scope.newLabel.name) {
                return;
            }

            for (var i=0; i <$scope.labels.length; i++) {
                if ($scope.labels[i].name == $scope.newLabel.name) {
                    $scope.newLabel.name = "Label exists";
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

        $scope.fn.delete= function(index){
            if($scope.fn.editMode){
                piPopup.confirm("Label "+$scope.labels[index].name, function() {

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
                $scope.fn.selected($scope.labels[index].name)
            }
        }
        
        $scope.fn.getClass = function(label) {
            if (Label.selectedLabel == label) {
                return "bg-info"
            } else {
                return ""
            }
        }
        
        $scope.fn.selected= function(label){
            if(!$scope.fn.editMode)
                Label.selectedLabel= (Label.selectedLabel==label) ? null: label;
/*
            if (Label.selectedLabel)
                $location.path("/assets/assets/" + label);
            else
                $location.path("/assets/assets");
*/
        }

        $scope.labelsCount= Label.labelsCount;
})
        