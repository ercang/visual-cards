/**
 * Change requrejs config to work
 */
requirejs.config({
    baseUrl: '../',
    shim: {
        'socketio': {
            exports: 'io'
        },
    },
    paths: {
        socketio: '../socket.io/socket.io',
    }
});

requirejs(['src/VisualCards',
           'benchmark_tests/TestConnector'],
          function (VisualCards,
                    TestConnector) {

              var rendererTypeString = 'dom';
              var connector = new TestConnector("DifferentImages Test");
              connector.init();

              var container = document.getElementById('rendererContainer');
              this.visualCards = new VisualCards({container: container, 'connectToServer': false, 'renderer': rendererTypeString, 'clearServerQueue': true});
              this.visualCards.init();

              var actualRenderer = this.visualCards.getDocumentContainer().getRendererType();
              if(actualRenderer !== rendererTypeString)
              {
                  setTimeout(function(){
                      connector.log('Renderer can not be created, using: ' + actualRenderer);
                  }, 1000);
              }

              var root = this.visualCards.getRootNode();
              root.setProp({'backgroundColor': '#FFFFFF'});

              // wait for some time to start first test
              var totalBoxCount = 0;
              function startTest(boxCount)
              {
                  totalBoxCount += boxCount;
                  connector.startTest('DifferentImages [renderer: ' + rendererTypeString + '] [count: ' + totalBoxCount + ']');

                  for(var i=0; i<boxCount; i++)
                  {
                      var child1 = this.visualCards.createNode();
                      child1.setProp({
                          'top': Math.floor(Math.random()*100) * 10.80,
                          'left': Math.floor(Math.random()*100) * 19.20,
                          'width': 256,
                          'height': 256,
                          'backgroundImage': 'assets/images/image' + (totalBoxCount-i) + '.png'
                      });
                      root.appendChild(child1);
                  }

                  setTimeout(endTest, 1000);

              }

              var increaseBoxStep = 10;
              function endTest()
              {
                  var avgRate = connector.endTest();
                  startTest(increaseBoxStep);
              }
              setTimeout(startTest.bind(this, increaseBoxStep), 1000);
          }
);