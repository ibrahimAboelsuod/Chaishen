angular.module('Chaishen.controllers', [])


.controller('AppCtrl', ['$scope', 'modalService', 'userService',
  function($scope, modalService, userService) {

    $scope.modalService = modalService;

    $scope.logout = function() {
      userService.logout();
    };

}])



.controller('MyStocksCtrl', ['$scope', 'myStocksArrayService', 'stockDataService', 'stockPriceCacheService', 'followStockService',
  function($scope, myStocksArrayService, stockDataService, stockPriceCacheService, followStockService) {

    $scope.$on("$ionicView.afterEnter", function() {
      $scope.getMyStocksData();
    });

    $scope.getMyStocksData = function() {

      myStocksArrayService.forEach(function(stock) {

        var promise = stockDataService.getPriceData(stock.ticker);

        $scope.myStocksData = [];

        promise.then(function(data) {
          $scope.myStocksData.push(stockPriceCacheService.get(data.symbol));
        });
      });

      $scope.$broadcast('scroll.refreshComplete');
    };

    $scope.unfollowStock = function(ticker) {
      followStockService.unfollow(ticker);
      $scope.getMyStocksData();
    };
}])



.controller('StockCtrl', ['$scope', '$stateParams', '$window', '$ionicPopup', '$cordovaInAppBrowser', 'followStockService', 'stockDataService', 'chartDataService', 'dateService', 'notesService', 'newsService',
  function($scope, $stateParams, $window, $ionicPopup, $cordovaInAppBrowser, followStockService, stockDataService, chartDataService, dateService, notesService, newsService) {

    $scope.ticker = $stateParams.stockTicker;
    $scope.stockNotes = [];

    $scope.following = followStockService.checkFollowing($scope.ticker);
    $scope.oneYearAgoDate = dateService.oneYearAgoDate();
    $scope.todayDate = dateService.currentDate();

    // default chart setting
    $scope.chartView = 4;


    $scope.$on("$ionicView.afterEnter", function() {
      getPriceData();
      getDetailsData();
      getChartData();
      getNews();
      $scope.stockNotes = notesService.getNotes($scope.ticker);
    });


    $scope.chartViewFunc = function(n) {
      $scope.chartView = n;
    };

    $scope.toggleFollow = function() {
      if($scope.following) {
        followStockService.unfollow($scope.ticker);
        $scope.following = false;
      }
      else {
        followStockService.follow($scope.ticker);
        $scope.following = true;
      }
    };

    $scope.openWindow = function(link) {
      var inAppBrowserOptions = {
        location: 'yes',
        clearcache: 'yes',
        toolbar: 'yes'
      };

      $cordovaInAppBrowser.open(link, '_blank', inAppBrowserOptions);
    };

    $scope.addNote = function() {
      $scope.note = {title: 'Note', body: '', date: $scope.todayDate, ticker: $scope.ticker};

      var note = $ionicPopup.show({
        template: '<input type="text" ng-model="note.title" id="stock-note-title"><textarea type="text" ng-model="note.body" id="stock-note-body"></textarea>',
        title: 'New Note for ' + $scope.ticker,
        scope: $scope,
        buttons: [
          {
            text: 'Cancel',
            onTap: function(e) {
              return;
            }
           },
          {
            text: '<b>Save</b>',
            type: 'button-balanced',
            onTap: function(e) {
              notesService.addNote($scope.ticker, $scope.note);
            }
          }
        ]
      });

      note.then(function(res) {
        $scope.stockNotes = notesService.getNotes($scope.ticker);
      });
    };

    $scope.openNote = function(index, title, body) {
      $scope.note = {title: title, body: body, date: $scope.todayDate, ticker: $scope.ticker};

      var note = $ionicPopup.show({
        template: '<input type="text" ng-model="note.title" id="stock-note-title"><textarea type="text" ng-model="note.body" id="stock-note-body"></textarea>',
        title: $scope.note.title,
        scope: $scope,
        buttons: [
          {
            text: 'Delete',
            type: 'button-assertive button-small',
            onTap: function(e) {
              notesService.deleteNote($scope.ticker, index);
            }
          },
          {
            text: 'Cancel',
            type: 'button-small',
            onTap: function(e) {
              return;
            }
           },
          {
            text: '<b>Save</b>',
            type: 'button-balanced button-small',
            onTap: function(e) {
              notesService.deleteNote($scope.ticker, index);
              notesService.addNote($scope.ticker, $scope.note);
            }
          }
        ]
      });

      note.then(function(res) {
        $scope.stockNotes = notesService.getNotes($scope.ticker);
      });
    };


    function getPriceData() {

      var promise = stockDataService.getPriceData($scope.ticker);

      promise.then(function(data) {
        $scope.stockPriceData = data;

        if(data.chg_percent >= 0 && data !== null) {
          $scope.reactiveColor = {'background-color': '#33cd5f', 'border-color': 'rgba(255,255,255,.3)'};
        }
        else if(data.chg_percent < 0 && data !== null) {
          $scope.reactiveColor = {'background-color' : '#ef473a', 'border-color': 'rgba(0,0,0,.2)'};
        }
      });
    }

    function getDetailsData() {

      var promise = stockDataService.getDetailsData($scope.ticker);

      promise.then(function(data) {
        $scope.stockDetailsData = data;
      });
    }

    function getChartData() {

      var promise = chartDataService.getHistoricalData($scope.ticker, $scope.oneYearAgoDate, $scope.todayDate);

      promise.then(function(data) {

        $scope.myData = JSON.parse(data)
        	.map(function(series) {
        		series.values = series.values.map(function(d) { return {x: d[0], y: d[1] }; });
        		return series;
        	});
      });
    }

    function getNews() {

      $scope.newsStories = [];

      var promise = newsService.getNews($scope.ticker);

      promise.then(function(data) {
        $scope.newsStories = data;
      });
    }


    // chart option functions
    // top chart x axis
  	var xTickFormat = function(d) {
  		var dx = $scope.myData[0].values[d] && $scope.myData[0].values[d].x || 0;
  		if (dx > 0) {
        return d3.time.format("%b %d")(new Date(dx));
  		}
  		return null;
  	};

    // bottom chart x axis
    var x2TickFormat = function(d) {
      var dx = $scope.myData[0].values[d] && $scope.myData[0].values[d].x || 0;
      return d3.time.format('%b %Y')(new Date(dx));
    };


    var y1TickFormat = function(d) {
      return d3.format(',f')(d);
    };

    // top chart y axis price
    var y2TickFormat = function(d) {
      return d3.format('s')(d);
    };

    // bottom chart y axis volume
    var y3TickFormat = function(d) {
      return d3.format(',.2s')(d);
    };

    var y4TickFormat = function(d) {
      return d3.format(',.2s')(d);
    };

    var xValueFunction = function(d, i) {
      return i;
    };

    var marginBottom = ($window.innerWidth / 100) * 10;

  	$scope.chartOptions = {
      chartType: 'linePlusBarWithFocusChart',
      data: 'myData',
      margin: {top: 15, right: 0, bottom: marginBottom, left: 0},
      interpolate: "cardinal",
      useInteractiveGuideline: false,
      yShowMaxMin: false,
      tooltips: false,
      showLegend: false,
      useVoronoi: false,
      xShowMaxMin: false,
      xValue: xValueFunction,
      xAxisTickFormat: xTickFormat,
      x2AxisTickFormat: x2TickFormat,
      y1AxisTickFormat: y1TickFormat,
      y2AxisTickFormat: y2TickFormat,
      y3AxisTickFormat: y3TickFormat,
      y4AxisTickFormat: y4TickFormat,
      transitionDuration: 500
  	};

}])



.controller('SearchCtrl', ['$scope', '$state', 'modalService', 'searchService',
  function($scope, $state, modalService, searchService) {

    $scope.closeModal = function() {
      modalService.closeModal();
    };

    $scope.search = function() {
      $scope.searchResults = '';
      startSearch($scope.searchQuery);
    };

    var startSearch = ionic.debounce(function(query) {
      searchService.search(query)
        .then(function(data) {
          $scope.searchResults = data;
        });
    }, 400);

    $scope.goToStock = function(ticker) {
      modalService.closeModal();
      $state.go('app.stock', {stockTicker: ticker});
    };
}])



.controller('LoginSignupCtrl', ['$scope', 'modalService', 'userService',
  function($scope, modalService, userService) {

    $scope.user = {email: '', password: ''};

    $scope.closeModal = function() {
      modalService.closeModal();
    };

    $scope.signup = function(user) {
      userService.signup(user);
    };

    $scope.login = function(user) {
      userService.login(user);
    };
}])

//Ibrahim
.controller('stockScreenerCtrl', ['$scope', '$webServicesFactory', '$ionicLoading', '$globalVarsFactory', '$ionicModal', '$stockMarketProvider','$colorCodeProvider',
    function ($scope, $webServicesFactory, $ionicLoading, $globalVarsFactory, $ionicModal, $stockMarketProvider, $colorCodeProvider) {


    //set url based on the drop down list option
    $scope.selectedMarketChange = function (selectedMarket) {
        $scope.loadStocks($stockMarketProvider[selectedMarket].topGetURL, {AnonymousToken: $stockMarketProvider[selectedMarket].token});
    };

    //get stocks from url
    $scope.loadStocks = function (url, headers) {
        $ionicLoading.show();
        $webServicesFactory.get(url, headers, {}).then(
            function success(data) {
                $scope.buyStocks = data.data.splice(0, 10);//first 10 is buy
                $scope.sellStocks = data.data;//second 10 is sell

                $ionicLoading.hide();
            },
            function error(err) {
                $ionicLoading.hide();
            }
        );//end of load stocks
    };

    //coloring
    $scope.marketStateClass = function (marketState) {
        return($colorCodeProvider[marketState]);
    };

    //send stock to detail page
    $scope.passStockToDetail = function (stockID, stockMarket) {
        $globalVarsFactory.stockID = stockID;
        $globalVarsFactory.stockMarket = stockMarket;
    };

/////////////////////////Search modal

        $scope.openSearchModal = function () {
            $ionicModal.fromTemplateUrl('templates/vindexSearch.html', {
                scope: $scope,
                animation: 'slide-in-up'
            }).then(function(modal) {
                $scope.searchModal = modal;
                $scope.searchModal.searchStockName = "";
                $scope.searchedStocks = [];
                $scope.searchModal.show();
            });
        };

        $scope.closeSearchModal = function () {
            $scope.searchModal.hide();
        };

        //sets market to  search
        var searchMarket="";
        $scope.selectedMarketSearchChange = function (market) {
            searchMarket = market;
        };
        //
        //submits search
        $scope.searchStocks = function () {

            if($scope.searchModal.searchStockName != "") {
                var filterParameters = [
                    {
                        "fieldName": "stock",
                        "operator": "contains",
                        "value": $scope.searchModal.searchStockName
                    }
                ];
                $scope.loadSearchStocks($stockMarketProvider[searchMarket].getURL, {AnonymousToken: $stockMarketProvider[searchMarket].token}, {'filter': filterParameters});
            }
        };
        //
        //gets searched stocks
        $scope.loadSearchStocks = function (url, headers, params) {
            $ionicLoading.show();
            $scope.searchedStocks = [];

            $webServicesFactory.get(url, headers, params).then(
                function success(data) {
                    $scope.searchedStocks = data.data;

                    $ionicLoading.hide();
                },
                function error(err) {
                    $ionicLoading.hide();
                }
            );//end of stocks get
        };

        //to be edited when the market attribute is added
        $scope.passSearchStockToDetail = function (stockID, stockMarket) {
            $globalVarsFactory.stockID = stockID;
            $globalVarsFactory.stockMarket = stockMarket;
            $scope.searchModal.hide();
        };

}])//end of stock screener ctrl

//Ibrahim
.controller('stockScreenerDetailsCtrl', ['$scope', '$globalVarsFactory',  '$webServicesFactory', '$ionicLoading', '$watcherFactory', '$stockMarketProvider', '$colorCodeProvider',
    function ($scope, $globalVarsFactory, $webServicesFactory, $ionicLoading, $watcherFactory, $stockMarketProvider, $colorCodeProvider) {


        $ionicLoading.show();

        //get stock data
        $webServicesFactory.get($stockMarketProvider[$globalVarsFactory.stockMarket].getURL+"/"+$globalVarsFactory.stockID+"?exclude=metadata", {AnonymousToken: $stockMarketProvider[$globalVarsFactory.stockMarket].token}, {}).then(
            function success(data) {
                $scope.stock = data;

                $ionicLoading.hide();
            },
            function error(error) {
                $ionicLoading.hide();
            }
        );

        //coloring
        $scope.marketStateClass = function (state) {
            return($colorCodeProvider[state]);
        };

        //to show/hide follow ctrls
        $scope.checkWatchState = function () {
            return($watcherFactory.isInWatchList($globalVarsFactory.stockIndex, $globalVarsFactory.stockMarket));
        };
        $scope.toggleWatchState = function () {
            var state = $watcherFactory.isInWatchList($globalVarsFactory.stockIndex, $globalVarsFactory.stockMarket);

            if(state){//remove
                $watcherFactory.removeFromWatchList($globalVarsFactory.stockIndex, $globalVarsFactory.stockMarket);
            }
            else //add
                $watcherFactory.addToWatchList($globalVarsFactory.stockIndex, $globalVarsFactory.stockMarket);
        };
}])//end of stock screener detail ctrl

//Ibrahim
.controller('watchListCtrl', ['$scope', '$watcherFactory', '$webServicesFactory', '$ionicLoading', '$stockMarketProvider', '$globalVarsFactory',
    function ($scope, $watcherFactory, $webServicesFactory, $ionicLoading, $stockMarketProvider, $globalVarsFactory) {

        $scope.$on("$ionicView.afterEnter", function(event, data) {

            $scope.watchedStocks = [];

            //get saved watched stocks
            var tList = $watcherFactory.getWatchList();
            //loop through it to get it from server
            for (var stock in tList) {
                $ionicLoading.show();
                if(tList[stock] != null) {

                    $webServicesFactory.get($stockMarketProvider[tList[stock].market].getURL+"/"+$globalVarsFactory.stockID+"?exclude=metadata", {AnonymousToken: $stockMarketProvider[tList[stock].market].token}, {}).then(
                        function success(data) {
                            $scope.watchedStocks.push(data);
                            $ionicLoading.hide();
                        },
                        function error() {
                            $ionicLoading.hide();
                        }
                    );

                }
                else
                    $ionicLoading.hide();
            }//end of for each loop

        });

        //
        //send stock to detail page
        $scope.passStockToDetail = function (stockID, stockMarket) {
            $globalVarsFactory.stockID = stockID;
            $globalVarsFactory.stockMarket = stockMarket;
        };


    }])//end of watch list ctrl
;
