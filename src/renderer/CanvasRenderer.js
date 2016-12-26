define(['src/renderer/TextUtility'],
    function (TextUtility) {
        'use strict';

        /**
         * @class CanvasRenderer
         */
        function CanvasRenderer(canvasEl, imageCache) {

            /**
             * @brief Canvas Element
             */
            this.canvas = canvasEl;

            /**
             * @brief Image cache
             */
            this.imageCache = imageCache;

            /**
             * @brief 2D drawing context
             * @type {undefined}
             */
            this.context = undefined;

            /**
             * @brief If true, helper visuals will be drawn to the canvas
             * @type {boolean}
             */
            this.debugDraw = false;

            /**
             * @brief Text utility class for text rendering
             * @type {TextUtility}
             */
            this.textUtility = new TextUtility();

            /**
             * @brief Text image buffers for nodes
             * @type {Array}
             */
            this.textBuffers = [];

            /**
             * @brief Initializes canvas renderer
             */
            this.init = function()
            {
                this.context = this.canvas.getContext("2d");
            };

            this.drawUpdateRects = function(clipRects)
            {
                this.context.lineWidth = "1";
                this.context.strokeStyle = "red";
                for(var i=0; i<clipRects.length; i++) {
                    var rect = clipRects[i];
                    this.context.strokeRect(rect.x,
                                            rect.y,
                                            rect.w,
                                            rect.h);
                    console.log("dirty rect: [" + rect.x + ',' + rect.y +',' + rect.w + ',' + rect.h + "]");
                }
            };

            /**
             * @brief Pre-render function is called when render scheduler starts rendering a new frame
             */
            this.preRender = function()
            {

            };

            /**
             * @brief Post-render function is called when render scheduler finished rendering a frame
             */
            this.postRender = function()
            {

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
             * @brief Render routine
             */
            this.renderNode = function(node, clipRects, parentX, parentY)
            {
                //console.log("render node: " + node.getId());
                if(this.debugDraw)
                {
                    this.drawUpdateRects(clipRects);
                }

                var rotation = node.getProp('rotation');
                var top = node.getProp('top');
                var left = node.getProp('left');
                var width = node.getProp('width');
                var height = node.getProp('height');
                var borderWidth = node.getProp('borderWidth');
                var borderColor = node.getProp('borderColor');
                var borderOpacity = node.getProp('borderOpacity');

                var absoluteNodeRect = {
                    'x': parentX + left,
                    'y': parentY + top,
                    'w': width,
                    'h': height
                };

                // appy rotation
                if(rotation !== 0 && rotation !== undefined) {
                    this.context.save();
                    var centerX = (left + parentX + (width/2));
                    var centerY = (top + parentY + (height/2));
                    this.context.translate(centerX, centerY);
                    this.context.rotate(rotation);
                    this.context.translate(-centerX, -centerY);
                }

                // check border
                if(borderWidth > 0 && borderColor !== undefined && borderOpacity !== '' && borderOpacity > 0) {
                    var absoluteNodeRectWithBorder = {
                        'x': parentX + left - borderWidth,
                        'y': parentY + top - borderWidth,
                        'w': width + 2*borderWidth,
                        'h': height + 2*borderWidth
                    };

                    if(borderOpacity !== 1 && borderOpacity !== undefined) {
                        this.context.globalAlpha = borderOpacity;
                    } else {
                        this.context.globalAlpha = 1;
                    }
                    this.context.fillStyle = borderColor;

                    // find border fill rect
                    for(var i=0; i<clipRects.length; i++) {
                        var fillborderRect = this.intersectRects(absoluteNodeRectWithBorder, clipRects[i]);
                        this.context.fillRect((fillborderRect.x),
                                              (fillborderRect.y),
                                              (fillborderRect.w),
                                              (fillborderRect.h));
                    }
                }

                // apply opacity
                var opacity = node.getProp('opacity');
                if(opacity !== 1 && opacity !== undefined) {
                    this.context.globalAlpha = opacity;
                } else {
                    this.context.globalAlpha = 1;
                }

                // draw background color
                var imageSource = node.getProp('backgroundImage');
                var backgroundColor = node.getProp('backgroundColor');
                if(imageSource === undefined && backgroundColor !== undefined) {
                    this.context.fillStyle = backgroundColor;
                    for(var i=0; i<clipRects.length; i++) {
                        var nodeRect = this.intersectRects(absoluteNodeRect, clipRects[i]);
                        this.context.fillRect((nodeRect.x),
                                              (nodeRect.y),
                                              (nodeRect.w),
                                              (nodeRect.h));
                    }
                }

                // draw background image
                var imageEntry = this.imageCache[imageSource];
                if(imageEntry !== undefined) {
                    var isImageLoaded = imageEntry.isLoaded;
                    var img = imageEntry.image;
                    if (img !== undefined && isImageLoaded === true) {
                        for (var i = 0; i < clipRects.length; i++) {
                            var imgWidth = Math.min(img.width, width);
                            var imgHeight = Math.min(img.height, height);
                            if (node.getProp('fitBackgroundImage') === true) {
                                imgWidth = img.width;
                                imgHeight = img.height;
                            }

                            var nodeClipRect = this.intersectRects(absoluteNodeRect, clipRects[i]);
                            var sourceX = Math.max(0, nodeClipRect.x - (left + parentX));
                            var sourceY = Math.max(0, nodeClipRect.y - (top + parentY));
                            sourceX = sourceX * imgWidth / width;
                            sourceY = sourceY * imgHeight / height;
                            imgWidth = imgWidth * nodeClipRect.w / width;
                            imgHeight = imgHeight * nodeClipRect.h / height;

                            this.context.drawImage(
                                img,
                                sourceX,
                                sourceY,
                                imgWidth,
                                imgHeight,
                                (nodeClipRect.x),
                                (nodeClipRect.y),
                                (nodeClipRect.w),
                                (nodeClipRect.h));
                        }
                    }
                }

                // draw text
                var text = node.getProp('text');
                if(text !== undefined && text !== '')
                {
                    this.drawStaticText(node, parentX, parentY, top, left, width, height, clipRects);
                }

                // revert rotation
                if(rotation !== 0 && rotation !== undefined) {
                    this.context.restore();
                }
            };

            this.drawStaticText = function(node, parentX, parentY, top, left, width, height, clipRects)
            {
                var text = node.getProp('text');
                var whiteSpace = node.getProp('whiteSpace');
                var color = node.getProp('color');
                var fontSize = node.getProp('fontSize');
                var fontFamily = node.getProp('fontFamily');
                var fontWeight = node.getProp('fontWeight');

                var textBuffer = this.textBuffers[node.getId()];

                if(textBuffer === undefined ||
                    (node.isTextInvalidated()))
                {
                    var lineWidth = width;
                    if(whiteSpace === 'nowrap')
                    {
                        // do not specify node width
                        lineWidth = 0;
                    }

                    var offscreenCanvas = this.textUtility.createTextCanvas(text, color, fontSize,
                        fontFamily, false, lineWidth, fontWeight);
                    textBuffer = {
                        'buffer': offscreenCanvas,
                        'width': offscreenCanvas.width,
                        'height': offscreenCanvas.height,
                        'text': text
                    };
                    this.textBuffers[node.getId()] = textBuffer;
                    node.markTextValidated();
                }

                // copy text buffer into canvas
                var absoluteTextRect = {
                    'x': parentX + left,
                    'y': parentY + top,
                    'w': textBuffer.width,
                    'h': textBuffer.height
                };

                for (var i = 0; i < clipRects.length; i++)
                {
                    var imgWidth = textBuffer.width;
                    var imgHeight = textBuffer.height;

                    var nodeClipRect = this.intersectRects(absoluteTextRect, clipRects[i]);
                    if(nodeClipRect.w === 0 || nodeClipRect.h === 0)
                    {
                        continue;
                    }

                    var sourceX = Math.max(0, nodeClipRect.x - (left + parentX));
                    var sourceY = Math.max(0, nodeClipRect.y - (top + parentY));
                    imgWidth = nodeClipRect.w;
                    imgHeight = nodeClipRect.h;

                    this.context.drawImage(
                        textBuffer.buffer,
                        sourceX,
                        sourceY,
                        imgWidth,
                        imgHeight,
                        (nodeClipRect.x),
                        (nodeClipRect.y),
                        (nodeClipRect.w),
                        (nodeClipRect.h));
                }
            }
        }

        return CanvasRenderer;
    });
