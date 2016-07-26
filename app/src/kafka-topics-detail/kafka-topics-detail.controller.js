kafkaTopicsUIApp.controller('ViewTopicCtrl', function ($scope, $rootScope, $filter, $routeParams, $log, $mdToast, $http, $base64, kafkaZooFactory) {

  $log.info("ViewTopicCtrl - initializing for topic : " + $routeParams.topicName);
  $scope.topicName = $routeParams.topicName;
  $scope.showSpinner = true;

  $scope.topicType = kafkaZooFactory.getDataType($scope.topicName);

  $scope.editor;

  $scope.aceLoaded = function (_editor) {
    $scope.editor = _editor;
    $scope.editor.$blockScrolling = Infinity;
  };

  $log.debug("topicType=" + JSON.stringify($scope.topicType));
  // If value exists in an array
  function isInArray(value, array) {
    return array.indexOf(value) > -1;
  }

  // At start-up this controller consumes data
  var start = new Date().getTime();
  if (($scope.topicType == "json") || ($scope.topicType == "binary") || ($scope.topicType == "avro")) {
    var dataPromise = kafkaZooFactory.consumeKafkaRest($scope.topicType, $scope.topicName);
    dataPromise.then(function (allData) {
      var end = new Date().getTime();
      $scope.aceString = allData;
      $log.info("[" + (end - start) + "] msec - to get " + angular.fromJson(allData).length + " " + $scope.topicType + " rows from topic " + $scope.topicName); //  + JSON.stringify(allSchemas)
      $scope.showSpinner = false;
    }, function (reason) {
      $log.error('Failed: ' + reason);
    }, function (update) {
      $log.info('Got notification: ' + update);
    });
  } else {
    $log.warn("We don't really know the data type of topic" + $scope.topicName + " so we will attempt all options..");
    // If we don't know we need to guess by trying Avro -> JSon -> Binary
    var dataPromiseAvro = kafkaZooFactory.consumeKafkaRest("avro", $scope.topicName);
    dataPromiseAvro.then(function (allData) {
      if (JSON.stringify(allData).indexOf("error_code") > 0) {
        $log.warn('Failed with Avro - going to try with Json this time (' + allData + ')');
        var dataPromiseAvro = kafkaZooFactory.consumeKafkaRest("json", $scope.topicName);
        dataPromiseAvro.then(
          function (allData) {
            if (JSON.stringify(allData).indexOf("error_code") > 0) {
              $log.error('Failed with JSon as well - going to try with Binary this time (' + allData + ')');
              var dataPromiseAvro = kafkaZooFactory.consumeKafkaRest("binary", $scope.topicName);
              dataPromiseAvro.then(function (allData) {
                $log.info("Binary detected");
                var end = new Date().getTime();
                $scope.topicType = "binary";
                $scope.aceString = allData;
                $log.info("[" + (end - start) + "] msec - to get " + angular.fromJson(allData).length + " " + $scope.topicType + " rows from topic " + $scope.topicName); //  + JSON.stringify(allSchemas)
                $scope.showSpinner = false;
              }, function (reason) {
                $log.error('Failed with Binary as well ?! :(  (' + reason + ')');
              });
            } else {
              $log.info("JSon detected");
              var end = new Date().getTime();
              $scope.topicType = "json";
              $scope.aceString = allData;
              $log.info("[" + (end - start) + "] msec - to get " + angular.fromJson(allData).length + " " + $scope.topicType + " rows from topic " + $scope.topicName); //  + JSON.stringify(allSchemas)
              $scope.showSpinner = false;
            }
          }, function (reason) {
          });
      } else {
        $log.info("Avro detected" + allData);
        var end = new Date().getTime();
        $scope.topicType = "avro";
        $scope.aceString = allData;
        $log.info("[" + (end - start) + "] msec - to get " + angular.fromJson(allData).length + " " + $scope.topicType + " rows from topic " + $scope.topicName); //  + JSON.stringify(allSchemas)
        $scope.showSpinner = false;
      }
    }, function (reason) {
    });
  }

  //tODO
  $scope.myTopic = $filter('filter')($rootScope.topicsCache, {name: $scope.topicName}, true);

  ///////////////////////////////////////////
  $mdToast.hide();
  $scope.kafkaDefaults = KAFKA_DEFAULTS; //TODO
  $scope.topicsOn = true;
  $scope.zookeeperInfo = "zookeeper.landoop.com.info.goes.here";
  $scope.brokers = ENV.BROKERS;

  $scope.changeView = function () {
    $scope.topicsOn = !$scope.topicsOn;
  };

  // 1. Create a consumer for Avro data, starting at the beginning of the topic's log.
  // 2. Then consume some data from a topic, which is decoded, translated to JSON, and included in the response.
  // The schema used for deserialization is fetched automatically from the schema registry.
  // 3. Finally, clean up.
  // [ avro | json | binary ]
  $scope.consumeKafkaRest = function (messagetype, topicName) {
    $scope.showSpinner = true;
    var dataPromise = kafkaZooFactory.consumeKafkaRest(messagetype, topicName);
    dataPromise.then(function (data) {
      $scope.aceString = data;
      $rootScope.rows = angular.toJson(JSON.stringify(data));
      $scope.showSpinner = false;
    }, function (reason) {
      $log.error('Failed: ' + reason);
    }, function (update) {
      $log.info('Got notification: ' + update);
    });
  };

  // TOPICS
  $scope.selectedTopic;
  $scope.selectTopic = function (topicObj) {
    $scope.selectedTopic = topicObj
  };

  $scope.getLeader = function (partitions) {
    if (partitions.length > 0) return partitions[0];
  };

  $scope.getTailPartitions = function (partitions) {
    return partitions.slice(1);
  };

  $scope.getKafkaDefaultValue = function (key) {
    var defaultValue;
    angular.forEach(KAFKA_DEFAULTS, function (item) {
      if (item.property == key) {
        defaultValue = item.default;
      }
    });
    return defaultValue;
  };

  $scope.getKafkaDefaultDescription = function (key) {
    var defaultValue;
    angular.forEach(KAFKA_DEFAULTS, function (item) {
      if (item.property == key) {
        defaultValue = item.description;
      }
    });
    return defaultValue;
  };

  // BROKERS
  $scope.selectedBroker;
  $scope.selectBroker = function (brokerObj) {
    $scope.selectedBroker = brokerObj
  }

});