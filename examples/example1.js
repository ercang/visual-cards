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
           'src/core/AnimationRunner'],
          function (VisualCards) {

              // find the requested backend "webgl", "canvas" or "dom"
              var selectedBackend = document.location.search.replace('?', '');
              if(selectedBackend == "") {
                  selectedBackend = "webgl";
              }
              var element = document.getElementById('backendSelectionId');
              element.value = selectedBackend;

              var container = document.getElementById('rendererContainer');
              this.visualCards = new VisualCards({
                  'container': container,
                  'width': 900,
                  'height': 600,
                  'connectToServer': false,
                  'renderer': selectedBackend,
                  'clearServerQueue': true});
              this.visualCards.init();
              var rendererType = this.visualCards.getDocumentContainer().getRendererType().toUpperCase();

              var root = this.visualCards.getRootNode();
              root.setProp({'backgroundColor': '#999999'});

              var titleNode = this.visualCards.createNode();
              titleNode.setProp({'text': rendererType + ' Renderer',
                  'top': 20,
                  'left': 250,
                  'width': 500,
                  'height': 50,
                  'color': '#000000',
                  'fontSize': 48,
                  'fontFamily': 'sans-serif'
              });
              root.appendChild(titleNode);

              var child1 = this.visualCards.createNode();
              child1.setProp({'text': 'Hello World! Dynamic text example (WebGL only). This text is written using bitmap fonts!',
                  'top': 100,
                  'left': 50,
                  'width': 350,
                  'height': 200,
                  'color': '#000000',
                  'backgroundColor': '#FF9999',
                  'fontSize': 32,
                  'fontFamily': 'serif',
                  'borderWidth': 5,
                  'borderColor': '#FF3333'
              });
              root.appendChild(child1);

              var child2 = this.visualCards.createNode();
              child2.setProp({'text': 'Hello World! Static text example. This text is written using an offscreen canvas element',
                  'top': 350,
                  'left': 50,
                  'width': 350,
                  'height': 200,
                  'color': '#000000',
                  'backgroundColor': '#99FF99',
                  'fontSize': 32,
                  'fontFamily': 'serif',
                  'textType': 'static',
                  'borderWidth': 5,
                  'borderColor': '#33FF33'
              });
              root.appendChild(child2);

              var child3 = this.visualCards.createNode();
              child3.setProp({'text': 'Nowrap text is great for long text!!!',
                  'top': 100,
                  'left': 450,
                  'width': 350,
                  'height': 200,
                  'color': '#000000',
                  'backgroundColor': '#9999FF',
                  'fontSize': 32,
                  'whiteSpace': 'nowrap',
                  'fontFamily': 'sans-serif',
                  'borderWidth': 5,
                  'borderColor': '#3333FF'
              });
              root.appendChild(child3);

              var child4 = this.visualCards.createNode();
              child4.setProp({'text': 'Writing text into cards is quite useful! But margins are not supported :(',
                  'top': 350,
                  'left': 450,
                  'width': 350,
                  'height': 200,
                  'color': '#000000',
                  'backgroundColor': '#FFFF99',
                  'fontSize': 32,
                  'fontFamily': 'sans-serif',
                  'borderWidth': 5,
                  'borderColor': '#FFFF33'
              });
              root.appendChild(child4);


          }
);