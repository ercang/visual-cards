define(['src/renderer/CanvasRenderer',
        'src/renderer/WebGLRenderer',
        'src/core/FontBank'],
    function (CanvasRenderer,
              WebGLRenderer,
              FontBank) {
        'use strict';

        /**
         * @class RenderScheduler
         */
        function RenderScheduler(rootNode, rendererType, container, width, height) {

            /**
             * @brief Root node of the document
             */
            this.rootNode = rootNode;

            /**
             * @brief Renderer string for initialization.
             * options: 'dom', 'canvas', 'webgl'. Canvas renderer will be used
             * if it is undefined
             */
            this.rendererType = rendererType;

            /**
             * @brief Container element for renderer
             */
            this.rendererContainer = container;

            /**
             * @brief Width of the root
             */
            this.width = width;

            /**
             * @brief Height of the root
             */
            this.height = height;

            /**
             * @brief Canvas element
             */
            this.canvas = undefined;

            /**
             * @brief Renderer backend for drawing operations.
             */
            this.renderer = undefined;

            /**
             * @brief True if animation is requested from browser
             * @type {boolean}
             */
            this.animationFrameRequested = false;

            /**
             * @brief relative dirty rectangles are added to the list with their parents.
             * These rects are stored for the next screen update
             * [ {node: node, x: 0, y: 0, w: 0, h: 0, r: 0} , ... ]
             * @type {Array}
             */
            this.relativeDirtyRects = [];

            /**
             * @brief Absolute dirty rect
             * @type {Array}
             */
            this.absoluteDirtyRects = [];

            /**
             * @brief image cache
             * @type {Array}
             */
            this.imageCache = [];

            /**
             * @brief Rendering of some nodes are deferred due to z-order. This array keeps track of them.
             * @type {Array}
             */
            this.deferredNodes = [];

            /**
             * @brief If true, only invalidates dirty areas and does not updates whole screen.
             * This opiton is used with for software renderers.
             * @type {boolean}
             */
            this.renderOnlyDirtyAreas = true;

            /**
             * @brief request animation frame function with fallback support
             */
            window.requestAnimFrame = (function(){
                return  window.requestAnimationFrame   ||
                    window.webkitRequestAnimationFrame ||
                    window.mozRequestAnimationFrame    ||
                    function(callback){
                        window.setTimeout(callback, 1000 / 60);
                    };
            })();

            /**
             * @brief Font bank property
             */
            this.fontBank = undefined;

            /**
             * @brief Font loaded callback to pass FontBank. This function will redraw the whole screen
             * after all fonts are loaded.
             */
            this.fontLoadedCallback = function()
            {
                this.invalidateRect(
                    this.rootNode,
                    this.rootNode.getProp('left'),
                    this.rootNode.getProp('top'),
                    this.rootNode.getProp('width'),
                    this.rootNode.getProp('height'),
                    this.rootNode.getProp('rotation'),
                    this.rootNode.getProp('borderWidth'));
            };

            /**
             * @brief Initializes render scheduler
             */
            this.init = function()
            {
                // create font bank
                this.fontBank = new FontBank(this.fontLoadedCallback.bind(this));
                this.fontBank.init();

                var width = this.width;
                var height = this.height;

                // create canvas element
                this.canvas = document.createElement('canvas');
                this.canvas.width = width;
                this.canvas.height = height;
                this.rendererContainer.appendChild(this.canvas);

                // update root node
                this.rootNode.setProp({'top': 0, 'left': 0, 'width': width, 'height': height});

                // create renderer backend
                switch(this.rendererType)
                {
                    case 'webgl':
                        this.renderOnlyDirtyAreas = false;
                        this.renderer = new WebGLRenderer(this.canvas, this.imageCache, this.fontBank);
                        break;
                    case 'canvas':
                        this.renderOnlyDirtyAreas = true;
                        this.renderer = new CanvasRenderer(this.canvas, this.imageCache);
                        break;
                    default:
                        this.renderOnlyDirtyAreas = true;
                        this.renderer = new CanvasRenderer(this.canvas, this.imageCache);
                        break;
                }

                if(this.renderer === undefined)
                {
                    console.log('can not create renderer object! rendererType: ' + this.rendererType);
                    return;
                }

                var result = this.renderer.init();

                if(result === false && this.rendererType === 'webgl')
                {
                    // try to initialize canvas fallback
                    console.log("No WebGL support, running with canvas fallback!");

                    this.renderOnlyDirtyAreas = true;
                    this.renderer = new CanvasRenderer(this.canvas, this.imageCache);
                    this.renderer.init();

                    this.rendererType = 'canvas';
                }
            };

            this.getRendererType = function()
            {
                return this.rendererType;
            };

            /**
             * @brief Called by NodeEventPublisher to inform that a node property update.
             * @param node
             * @param updateData
             * @param preUpdateData
             */
            this.onNodePropertyUpdate = function(node, updateData, preUpdateData)
            {
                if(node.getProp('visibility') === 'hidden' && preUpdateData.hasOwnProperty('visibility') === false)
                {
                    // visibility is not change, discard this request!
                    return;
                }


                var preX = preUpdateData['left'] === undefined ? node.getProp('left') : preUpdateData['left'];
                var preY = preUpdateData['top'] === undefined ? node.getProp('top') : preUpdateData['top'];
                var preW = preUpdateData['width'] === undefined ? node.getProp('width') : preUpdateData['width'];
                var preH = preUpdateData['height'] === undefined ? node.getProp('height') : preUpdateData['height'];
                var preR = preUpdateData['rotation'] === undefined ? node.getProp('rotation') : preUpdateData['rotation'];
                var preBW = preUpdateData['borderWidth'] === undefined ? node.getProp('borderWidth') : preUpdateData['borderWidth'];

                var postX = node.getProp('left');
                var postY = node.getProp('top');
                var postW = node.getProp('width');
                var postH = node.getProp('height');
                var postR = node.getProp('rotation');
                var postBW = node.getProp('borderWidth');

                var parentNode = node.getParent();
                if(parentNode === undefined)
                {
                    parentNode = node;
                }

                if((postX === preX && postY === preY && postW === preW && postH === preH && postR === preR && postBW === preBW)  === false)
                {
                    // rectangles are different
                    this.invalidateRect(
                        parentNode,
                        preX,
                        preY,
                        preW,
                        preH,
                        preR,
                        preBW);
                }

                this.invalidateRect(
                    parentNode,
                    postX,
                    postY,
                    postW,
                    postH,
                    postR,
                    postBW);
            };

            /**
             * @brief Called by NodeEventPublisher to inform that a node is added.
             * @param node
             * @param childNode
             */
            this.onNodeAdded = function(node, childNode)
            {
                this.invalidateRect(
                    node,
                    childNode.getProp('left'),
                    childNode.getProp('top'),
                    childNode.getProp('width'),
                    childNode.getProp('height'),
                    childNode.getProp('rotation'),
                    childNode.getProp('borderWidth'));
            };

            /**
             * @brief Called by NodeEventPublisher to inform that a node is removed.
             * @param node
             * @param childNode
             */
            this.onNodeRemoved = function(node, childNode)
            {
                this.invalidateRect(
                    node,
                    childNode.getProp('left'),
                    childNode.getProp('top'),
                    childNode.getProp('width'),
                    childNode.getProp('height'),
                    childNode.getProp('rotation'),
                    childNode.getProp('borderWidth'));
            };

            /**
             * @brief Invalidates the given rect for the node. Rect is relative
             */
            this.invalidateRect = function(node, x, y, w, h, r, bw)
            {
                if(this.renderOnlyDirtyAreas === true)
                {
                    var relativeRect = {
                        'x'   : x - bw,
                        'y'   : y - bw,
                        'w'   : w + 2*bw,
                        'h'   : h + 2*bw
                    };

                    if(r !== 0)
                    {
                        relativeRect = this.calculateRotatedBoundingBox(relativeRect, r);
                    }

                    relativeRect.node = node;
                    this.relativeDirtyRects.push(relativeRect);
                }

                this.setRequestAnimation();
            };

            /**
             * @brief Makes an animation frame request if it hasn't done already.
             */
            this.setRequestAnimation = function()
            {
                if(this.animationFrameRequested === true)
                {
                    return;
                }

                window.requestAnimFrame(this.update.bind(this));
                this.animationFrameRequested = true;
            };

            /**
             * @brief Returns the intersection rectangle of two rectangles
             * @param a Rectangle 1
             * @param b Rectangle 2
             * @returns {{x: number, y: number, w: number, h: number}}
             */
            this.intersectRects = function(a, b)
            {
                var x = Math.max(a.x, b.x);
                var num1 = Math.min(a.x + a.w, b.x + b.w);
                var y = Math.max(a.y, b.y);
                var num2 = Math.min(a.y + a.h, b.y + b.h);
                if (num1 >= x && num2 >= y) {
                    return {'x': x, 'y': y, 'w': num1 - x, 'h': num2 - y};
                } else {
                    return {'x': 0, 'y':0, 'w':0, 'h':0};
                }
            };

            /**
             * @brief This function is called by request animation frame.
             * This will call rendering backend to update dirty region and nodes.
             */
            this.update = function()
            {
                // update
                //console.log("RenderScheduler: update()!");

                this.calculateAbsoluteDirtyRects();

                // notify renderer
                this.renderer.preRender();

                // render
                this.render(this.rootNode, this.absoluteDirtyRects, 0, 0);

                // render deferred nodes
                this.renderDeferredNodes();

                // notify renderer
                this.renderer.postRender();

                // reset all temporary data
                this.animationFrameRequested = false;
                this.relativeDirtyRects = [];
                this.absoluteDirtyRects = [];
                this.deferredNodes = [];
            };

            this.calculateAbsoluteDirtyRects = function()
            {
                if(this.renderOnlyDirtyAreas === false)
                {
                    // no need to calculate dirty rectanges.
                    this.absoluteDirtyRects = [{
                        'x': this.rootNode.getProp('left') - this.rootNode.getProp('borderWidth'),
                        'y': this.rootNode.getProp('top') - this.rootNode.getProp('borderWidth'),
                        'w': this.rootNode.getProp('width') + 2*this.rootNode.getProp('borderWidth'),
                        'h': this.rootNode.getProp('height') + 2*this.rootNode.getProp('borderWidth')}];
                    return;
                }

                var minX = 5000, minY = 5000, maxX =0, maxY = 0;
                // calculate absolute positions of each rect
                for(var i=0; i<this.relativeDirtyRects.length; i++)
                {
                    // check if node is still on the tree.
                    var relativeRect = this.relativeDirtyRects[i];
                    var node = relativeRect.node;
                    if(this.rootNode !== node.getRoot())
                    {
                        // this node is not on the tree, skip this node
                        continue;
                    }

                    // get absolute rect
                    var parentRect = node.calculateAbsoluteRect();

                    var x1 = parentRect.x + relativeRect.x;
                    var x2 = x1 + relativeRect.w;
                    var y1 = parentRect.y + relativeRect.y;
                    var y2 = y1 + relativeRect.h;

                    minX = Math.min(minX, x1);
                    minY = Math.min(minY, y1);
                    maxX = Math.max(maxX, x2);
                    maxY = Math.max(maxY, y2);
                }

                var mergedRect = {'x': minX, 'y': minY, 'w': maxX - minX, 'h': maxY - minY};
                this.absoluteDirtyRects = [mergedRect];
            };

            /**
             * @brief Rotates the rect and returns the new bounding box
             * @param rect rectangle with the following properties x, y, w, h
             * @param rotation rotataion value in radians
             */
            this.calculateRotatedBoundingBox = function(rect, rotation)
            {
                function rotatePointAroundCenter(center, point, angle) {
                    var cos = Math.cos(angle),
                        sin = Math.sin(angle),
                        nx = (cos * (point.x - center.x)) + (sin * (point.y - center.y)) + center.x,
                        ny = (cos * (point.y - center.y)) - (sin * (point.x - center.x)) + center.y;
                    return {'x': nx, 'y': ny};
                }

                var points = [
                    {'x': rect.x, 'y': rect.y},
                    {'x': rect.x + rect.w, 'y': rect.y},
                    {'x': rect.x + rect.w, 'y': rect.y + rect.h},
                    {'x': rect.x, 'y': rect.y + rect.h}
                ];
                var center = {'x': rect.x + rect.w/2, 'y': rect.y + rect.h/2};
                var rect = {'x1': 999999, 'y1': 999999, 'x2': -999999, 'y2': -999999};
                for(var i=0; i<points.length; i++)
                {
                    var rotatedPoint = rotatePointAroundCenter(center, points[i], rotation);

                    rect.x1 = Math.min(rect.x1, rotatedPoint.x);
                    rect.x2 = Math.max(rect.x2, rotatedPoint.x);
                    rect.y1 = Math.min(rect.y1, rotatedPoint.y);
                    rect.y2 = Math.max(rect.y2, rotatedPoint.y);
                }

                return {'x': rect.x1, 'y': rect.y1, 'w': rect.x2 - rect.x1, 'h': rect.y2 - rect.y1};
            };

            /**
             * @brief Checks if a node should be rendered. If so, passes that to the renderer class
             * @param clipRects only clip rects will be updated on screen
             */
            this.render = function(node, clipRects, parentX, parentY)
            {
                // update image cache for this node
                this.updateImageCache(node);

                var absoluteNodeRect = {
                    'x': parentX + node.getProp('left') - node.getProp('borderWidth'),
                    'y': parentY + node.getProp('top') - node.getProp('borderWidth'),
                    'w': node.getProp('width') + 2*node.getProp('borderWidth'),
                    'h': node.getProp('height') + 2*node.getProp('borderWidth')
                };

                var rotation = node.getProp('rotation');
                if(rotation !== 0){
                    absoluteNodeRect = this.calculateRotatedBoundingBox(absoluteNodeRect, rotation);
                }

                // calculate common rect
                var commonRects = [];
                for(var i=0; i<clipRects.length; i++)
                {
                    var r = this.intersectRects(absoluteNodeRect, clipRects[i]);
                    r.x = Math.floor(r.x);
                    r.y = Math.floor(r.y);
                    r.w = Math.ceil(r.w);
                    r.h = Math.ceil(r.h);
                    if(r.w !== 0 && r.h !== 0) {
                        // round these rects to integers
                        commonRects.push(r);
                    }
                }

                if(commonRects.length === 0)
                {
                    // there is nothing to render!
                    return;
                }

                if(this.isNodeVisible(node) === false)
                {
                    return;
                }

                // node is visibile, first render it, then children
                if(this.isNodeRenderable(node))
                {
                    if(node.getProp('showOnTop') === true)
                    {
                        this.deferredNodes.push([node, commonRects, parentX, parentY]);
                    }
                    else
                    {
                        this.renderer.renderNode(node, commonRects, parentX, parentY);
                    }
                }

                var children = node.getChildren();
                for(var i=0; i<children.length; i++)
                {
                    this.render(children[i], commonRects, absoluteNodeRect.x, absoluteNodeRect.y);
                }
            };

            /**
             * @brief Render deferred nodes queue
             */
            this.renderDeferredNodes = function()
            {
                for(var i=0; i<this.deferredNodes.length; i++)
                {
                    var command = this.deferredNodes[i];
                    this.renderer.renderNode(command[0], command[1], command[2], command[3]);
                }
            };

            /**
             * @brief Returns true is node is visible
             * @param node
             * @returns {boolean}
             */
            this.isNodeVisible = function(node)
            {
                if(node.getProp('visibility') === 'hidden') {
                    return false;
                }

                return true;
            };

            /**
             * @brief Returns true if node has any content
             * @param node
             * @returns {boolean}
             */
            this.isNodeRenderable = function(node)
            {
                if((node.getProp('backgroundImage') === undefined &&
                    (node.getProp('text') === '' || node.getProp('text') === undefined) &&
                    node.getProp('backgroundColor') === undefined)) {
                    return false;
                }

                return true;
            };

            /**
             * @brief Checks if node has any image resource and starts to load them.
             * @param node
             */
            this.updateImageCache = function(node)
            {
                var imageSource = node.getProp('backgroundImage');
                if(imageSource === undefined)
                {
                    // nothing to load
                    return;
                }

                if(this.imageCache[imageSource] === undefined)
                {
                    // image source is new, try to load it
                    var img = new Image();
                    var imageEntry = {
                        'listeners': [node],
                        'isLoaded': false,
                        'image': img
                    };
                    this.imageCache[imageSource] = imageEntry;
                    img.onload = function(){
                        // when image is loaded invalidate rect
                        imageEntry.isLoaded = true;
                        for(var i=0; i<imageEntry.listeners.length; i++) {
                            var listenerNode = imageEntry.listeners[i];
                            this.invalidateRect(
                                listenerNode.getParent(),
                                listenerNode.getProp('left'),
                                listenerNode.getProp('top'),
                                listenerNode.getProp('width'),
                                listenerNode.getProp('height'),
                                listenerNode.getProp('rotation'),
                                listenerNode.getProp('borderWidth'));
                        }
                        // remove all listeners
                        imageEntry.listeners = [];
                    }.bind(this);
                    img.src = imageSource;
                }
                else
                {
                    // it was requested before!
                    var imageEntry = this.imageCache[imageSource];
                    if(imageEntry.isLoaded === false)
                    {
                        // add listener
                        var isFound = false;
                        for(var i=0; i<imageEntry.listeners.length; i++)
                        {
                            if(node === imageEntry.listeners[i])
                            {
                                isFound = true;
                                break;
                            }
                        }

                        if(isFound === false)
                        {
                            imageEntry.listeners.push(node);
                        }
                    }
                }
            };
        }

        return RenderScheduler;
    });
