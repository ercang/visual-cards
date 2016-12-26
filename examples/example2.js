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

              var totalItemCount = 50;
              var centerX = width/2;
              var centerY = height/2;
              var radius = 200;
              var rectLen = 50;

              function getRandomColor() {
                  var letters = '0123456789ABCDEF';
                  var color = '#';
                  for (var i = 0; i < 6; i++ ) {
                      color += letters[Math.floor(Math.random() * 16)];
                  }
                  return color;
              }

              for(var i=0; i<totalItemCount; i++){

                  var rad = (2*Math.PI*(i+1)/totalItemCount);
                  var left_offset = radius*Math.sin(rad);
                  var left = centerX + left_offset;
                  var top_offset = radius*Math.cos(rad);
                  var top = centerY - top_offset;
                  var angle = i/totalItemCount;
                  var item = this.visualCards.createNode();
                  item.setProp({
                      'top': top,
                      'left': left,
                      'width': rectLen,
                      'height': rectLen,
                      'backgroundColor': getRandomColor()
                  });
                  root.appendChild(item);

                  this.visualCards.animate({node: item,
                      animation: {name: 'rotate', value: 2*Math.PI},
                      easing: 'linear',
                      duration: 5000,
                      loop: true});

                  this.visualCards.animate({node: item,
                      from: {width: rectLen,
                          height: rectLen,
                          top: top + top_offset,
                          left: left - left_offset,
                          opacity: 0},
                      to: {width: rectLen*1.3,
                          height: rectLen*1.3,
                          top: top - top_offset/2,
                          left: left + left_offset/2,
                          opacity: 1},
                      easing: 'easeOutCubic',
                      loop: true,
                      loopReverse: true,
                      duration: 1000});
              }


          }
);