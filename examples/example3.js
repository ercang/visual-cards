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

              var width = 900;
              var height = 600;
              var container = document.getElementById('rendererContainer');
              this.visualCards = new VisualCards({
                  'container': container,
                  'width': width,
                  'height': height,
                  'connectToServer': false,
                  'renderer': selectedBackend,
                  'clearServerQueue': true});
              this.visualCards.init();
              var rendererType = this.visualCards.getDocumentContainer().getRendererType().toUpperCase();

              var root = this.visualCards.getRootNode();
              root.setProp({'backgroundColor': '#9999FF'});

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

              var item = this.visualCards.createNode();
              item.setProp({
                  'top': 200,
                  'left': 50,
                  'width': 300,
                  'height': 300,
                  'backgroundImage': 'crate.jpg',
                  'fitBackgroundImage': true
              });
              root.appendChild(item);

              this.visualCards.animate({node: item,
                  from: {left: 50},
                  to: {left: 550},
                  easing: 'easeInOutCubic',
                  loop: true,
                  loopReverse: true,
                  duration: 1000});
          }
);