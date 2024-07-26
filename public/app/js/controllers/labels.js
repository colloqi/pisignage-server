'use strict';

angular.module('piLabels.controllers', [])
    .controller('LabelsCtrl', function ($scope,$state, $http,$location,piUrls, assetLoader,piPopup, $window) {

        $scope.label = assetLoader.label;

        //var options = {}
        if ($state.current.data && $state.current.data.labelMode)
            $scope.labelMode = $state.current.data.labelMode;

        // if ($scope.labelMode == "players")  {
        //     options = {params: {mode: "players"}}
        // }

        $scope.modeFilter = function(label) {
            if ($scope.labelMode == "players")
                return (label.mode && label.mode === "players")
            else
                return (!label.mode || label.mode !== "players")
        }


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
            if ($scope.labelMode == "players")
                $scope.newLabel.mode = $scope.labelMode;


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

        $scope.fn.delete= function(label){
            if($scope.fn.editMode){
                piPopup.confirm("Label "+label.name, function() {

                    $http
                        .delete(piUrls.labels + label._id)
                        .success(function (data, status) {
                            if (data.success) {
                                $scope.label.labels.splice($scope.label.labels.indexOf(label), 1);
                                $window.location.reload();
                            }
                        })
                        .error(function (data, status) {
                        });
                })
            } else {
                $scope.fn.selected(label.name)
                if ($scope.labelModal) $scope.labelModal.close()
            }
        }
        
        $scope.fn.getClass = function(label) {
            if ($scope.label.selectedLabel == label || $scope.label.selectedPlayerLabel == label) {
                return "bg-info"
            } else {
                return ""
            }
        }
        
        $scope.fn.selected= function(label){
            if(!$scope.fn.editMode) {
                if ($scope.labelMode == "players")
                    assetLoader.selectPlayerLabel(($scope.label.selectedPlayerLabel == label) ? null : label);
                else
                    assetLoader.selectLabel(($scope.label.selectedLabel == label) ? null : label);
            }
            if ($scope.labelModal) $scope.labelModal.close()
        }

})
        