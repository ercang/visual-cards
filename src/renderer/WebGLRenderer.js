define(['third_party/glMatrix-0.9.5.min',
        'src/renderer/TextUtility',
        'src/renderer/WebGLTextUtility'],
    function (glMatrix,
              TextUtility,
              WebGLTextUtility) {
        'use strict';

        /**
         * @class WebGLRenderer
         */
        function WebGLRenderer(canvasEl, imageCache, fontBank) {

            /**
             * @brief Canvas Element
             */
            this.canvas = canvasEl;

            /**
             * @brief Image cache
             */
            this.imageCache = imageCache;

            /**
             * @brief GL context
             * @type {undefined}
             */
            this.gl = undefined;

            /**
             * @brief Shader program handle
             * @type {null}
             */
            this.shaderProgram = null;

            /**
             * @brief model view matrix
             */
            this.mvMatrix = glMatrix.mat4.create();

            /**
             * @brief projection matrix
             */
            this.pMatrix = glMatrix.mat4.create();

            /**
             * @brief Square vertex buffer
             * @type {null}
             */
            this.squareVertexPositionBuffer = null;

            /**
             * @brief Square vertex color buffer
             * @type {null}
             */
            this.squareVertexColorBuffer = null;

            /**
             * @brief Square vertex texture coordinates buffer
             * @type {null}
             */
            this.squareTextureCoordBuffer = null;

            /**
             * @brief Texture array
             * @type Array
             */
            this.textures = [];

            /**
             * @brief Text utility class for text rendering
             * @type {TextUtility}
             */
            this.textUtility = new TextUtility();

            /**
             * @brief Text textures
             * @type {Array}
             */
            this.textTextures = [];

            /**
             * @brief Font bank
             */
            this.fontBank = fontBank;

            /**
             * @brief Text utility for webgl
             * @type {undefined}
             */
            this.webGLTextUtility = undefined;

            /**
             * @brief Initializes webgl renderer
             */
            this.init = function()
            {
                // try to get webgl context
                try {
                    this.gl = this.canvas.getContext("experimental-webgl");
                    this.gl.viewportWidth = this.canvas.width;
                    this.gl.viewportHeight = this.canvas.height;
                } catch (e) {
                    console.error('initialize: Can not get webgl context! Exception:' + e.message);
                    return false;
                }

                if(this.initShaders() === false)
                {
                    return false;
                }

                if(this.initBuffers() === false)
                {
                    return false;
                }

                this.webGLTextUtility = new WebGLTextUtility(this.fontBank, this.gl);
                this.webGLTextUtility.init();

                this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
                this.gl.disable(this.gl.DEPTH_TEST);

                this.gl.enable(this.gl.BLEND);
                this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

                // initialize viewport
                this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
                this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
                glMatrix.mat4.ortho(0.0, this.canvas.width, this.canvas.height, 0.0, 0.1, 100, this.pMatrix);

                // enable scissor test
                this.gl.enable(this.gl.SCISSOR_TEST);
                this.gl.scissor(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);

                return true;
            };

            /**
             * @brief Creates shader object from string
             * @param src
             * @param isFragmentShader
             * @returns {null}
             */
            this.createShader = function(src, isFragmentShader) {
                var shader = this.gl.createShader(isFragmentShader ? this.gl.FRAGMENT_SHADER : this.gl.VERTEX_SHADER);
                this.gl.shaderSource(shader, src);
                this.gl.compileShader(shader);

                if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
                    console.error('Can not compile shader! : ' + this.gl.getShaderInfoLog(shader));
                    return null;
                }

                return shader;
            };

            /**
             * @brief Initalize webgl shaders
             */
            this.initShaders = function()
            {
                var fragmentShader = this.createShader(
                                        'precision mediump float;\n' +
                                        'varying vec2 vTextureCoord;\n' +
                                        'uniform sampler2D uSampler;\n' +
                                        'uniform float uAlpha;\n' +
                                        'uniform vec4 uColor;\n' +
                                        'uniform bool uColorOnly;\n' +
                                        'void main(void) {\n' +
                                        '    if(uColorOnly) {\n' +
                                        '        gl_FragColor = uColor;\n' +
                                        '    } else {\n' +
                                        '        vec4 textureColor = texture2D(uSampler, vec2(vTextureCoord.s, vTextureCoord.t));\n' +
                                        '        gl_FragColor = vec4(textureColor.rgb, textureColor.a * uAlpha) * uColor;\n' +
                                        '    }\n' +
                                        '}', true);

                var vertexShader = this.createShader(
                                        'attribute vec3 aVertexPosition;\n' +
                                        'attribute vec2 aTextureCoord;\n' +
                                        'uniform mat4 uMVMatrix;\n' +
                                        'uniform mat4 uPMatrix;\n' +
                                        'varying vec2 vTextureCoord;\n' +
                                        'void main(void) {\n' +
                                        '    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);\n' +
                                        '    vTextureCoord = aTextureCoord;\n' +
                                        '}', false);

                if(fragmentShader === null || vertexShader === null)
                {
                    return false;
                }

                // create shader program
                this.shaderProgram = this.gl.createProgram();
                this.gl.attachShader(this.shaderProgram, vertexShader);
                this.gl.attachShader(this.shaderProgram, fragmentShader);
                this.gl.linkProgram(this.shaderProgram);

                if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
                    console.error("Could not initialise shaders");
                    return false;
                }

                this.gl.useProgram(this.shaderProgram);

                this.shaderProgram.vertexPositionAttribute = this.gl.getAttribLocation(this.shaderProgram, "aVertexPosition");
                this.gl.enableVertexAttribArray(this.shaderProgram.vertexPositionAttribute);

                this.shaderProgram.textureCoordAttribute = this.gl.getAttribLocation(this.shaderProgram, "aTextureCoord");
                this.gl.enableVertexAttribArray(this.shaderProgram.textureCoordAttribute);

                this.shaderProgram.pMatrixUniform = this.gl.getUniformLocation(this.shaderProgram, "uPMatrix");
                this.shaderProgram.mvMatrixUniform = this.gl.getUniformLocation(this.shaderProgram, "uMVMatrix");
                this.shaderProgram.samplerUniform = this.gl.getUniformLocation(this.shaderProgram, "uSampler");
                this.shaderProgram.alphaUniform = this.gl.getUniformLocation(this.shaderProgram, "uAlpha");
                this.shaderProgram.colorUniform = this.gl.getUniformLocation(this.shaderProgram, "uColor");
                this.shaderProgram.colorOnlyUniform = this.gl.getUniformLocation(this.shaderProgram, "uColorOnly");

                this.gl.uniform1f(this.shaderProgram.alphaUniform, 1.0);
                this.gl.uniform4f(this.shaderProgram.colorUniform, 0, 0, 0, 1.0);
                this.gl.uniform1i(this.shaderProgram.colorOnlyUniform, false);

                return true;
            };

            /**
             * @brief sets/updates matrix uniforms
             */
            this.setMatrixUniforms = function() {
                this.gl.uniformMatrix4fv(this.shaderProgram.pMatrixUniform, false, this.pMatrix);
                this.gl.uniformMatrix4fv(this.shaderProgram.mvMatrixUniform, false, this.mvMatrix);
            };

            /**
             * @brief Initialize buffers
             */
            this.initBuffers = function()
            {
                this.squareVertexPositionBuffer = this.gl.createBuffer();
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareVertexPositionBuffer);
                var vertices = [
                    1.0,  1.0,  0.0,
                    0.0,  1.0,  0.0,
                    1.0, 0.0,  0.0,
                    0.0, 0.0,  0.0
                ];
                this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
                this.squareVertexPositionBuffer.itemSize = 3;
                this.squareVertexPositionBuffer.numItems = 4;

                this.squareTextureCoordBuffer = this.gl.createBuffer();
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareTextureCoordBuffer);
                var textureCoords = [
                    // Front face
                    1.0, 0.0,
                    0.0, 0.0,
                    1.0, 1.0,
                    0.0, 1.0,
                ];
                this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(textureCoords), this.gl.STATIC_DRAW);
                this.squareTextureCoordBuffer.itemSize = 2;
                this.squareTextureCoordBuffer.numItems = 4;

                return true;
            };

            /**
             * @brief Returns texture from cache
             * @param src
             * @returns {*}
             */
            this.getTexture = function(imageSource) {
                var imageEntry = this.imageCache[imageSource];
                if(imageEntry === undefined)
                {
                    return undefined;
                }

                if(imageEntry.isLoaded === false)
                {
                    return undefined;
                }

                if(this.textures[imageSource] !== undefined) {
                    return this.textures[imageSource];
                }

                var textureObject = this.gl.createTexture();
                this.generateTexture(textureObject, imageEntry.image);
                this.textures[imageSource] = textureObject;

                return textureObject;
            };

            /**
             * @brief generates texture from loaded image
             */
            this.generateTexture = function(texture, image)
            {
                this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
                this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
                this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
                this.gl.bindTexture(this.gl.TEXTURE_2D, null);
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
             * @brief Render routine
             */
            this.renderNode = function(node, clipRects, parentX, parentY)
            {
                for(var i=0; i<clipRects.length; i++)
                {
                    this.renderNodeForRect(node, clipRects[i], parentX, parentY);
                }
            };

            /**
             * @brief Renders a node for one rect
             * @param node
             * @param clipRect
             * @param parentX
             * @param parentY
             */
            this.renderNodeForRect = function(node, clipRect, parentX, parentY)
            {
                var lower_x = clipRect.x;
                var lower_y = this.canvas.height - clipRect.y - clipRect.h;
                this.gl.scissor(lower_x, lower_y, clipRect.w, clipRect.h);

                var rotation = node.getProp('rotation');
                var top = node.getProp('top');
                var left = node.getProp('left');
                var width = node.getProp('width');
                var height = node.getProp('height');
                var opacity = node.getProp('opacity');
                var borderWidth = node.getProp('borderWidth');
                var borderColor = node.getProp('borderColor');
                var borderOpacity = node.getProp('borderOpacity');

                var backgroundColor = node.getProp('backgroundColor');
                var imageSource = node.getProp('backgroundImage');
                var texture; // undefined
                if(imageSource !== undefined)
                {
                    texture = this.getTexture(imageSource);
                }

                var positionX = left + parentX;
                var positionY = top + parentY;

                // draw border card
                if(borderWidth > 0 && borderColor !== undefined && borderColor !== '' && borderOpacity > 0)
                {
                    // draw border rectangle
                    this.drawQuad(positionX - borderWidth,
                        positionY - borderWidth,
                        width + 2*borderWidth,
                        height + 2*borderWidth,
                        rotation,
                        undefined,
                        borderOpacity,
                        node.getBorderColorRGB());
                }

                // draw card
                if(texture !== undefined || backgroundColor !== undefined)
                {
                    // do not draw if texture or backgroundColor is not specified
                    this.drawQuad(positionX,
                                  positionY,
                                  width,
                                  height,
                                  rotation,
                                  texture,
                                  opacity,
                                  node.getBackgroundColorRGB());
                }

                var textType = node.getProp('textType');
                if(textType === 'dynamic')
                {
                    var text = node.getProp('text');
                    if(text === undefined || text === '')
                    {
                        return;
                    }

                    var bufferObject = this.webGLTextUtility.getTextBufferObjects(node);
                    if(bufferObject !== undefined)
                    {
                        this.renderTextBufferObjects(bufferObject,
                            width,
                            height,
                            positionX,
                            positionY,
                            rotation,
                            node.getTextColorRGB());
                    }
                }
                else
                {
                    // update or create text texture
                    var textTexture = this.getTextTextureOfNode(node);
                    if (textTexture !== undefined) {
                        // draw text
                        this.drawQuad(positionX,
                            positionY,
                            textTexture.width,
                            textTexture.height,
                            rotation,
                            textTexture.texture,
                            1.0);
                    }
                }
            };

            /**
             * @brief Generates text texture for the given node
             * @param node
             * @returns {{texture: *, width: number, height: number, text: string}}
             */
            this.generateTextTexture = function(node) {

                var color = node.getProp('color');
                var fontSize = node.getProp('fontSize');
                var fontFamily = node.getProp('fontFamily');
                var text = node.getProp('text');
                var whiteSpace = node.getProp('whiteSpace');
                var fontWeight = node.getProp('fontWeight');

                var lineWidth = node.getProp('width');
                if(whiteSpace === 'nowrap')
                {
                    lineWidth = 0;
                }

                var offScreenCanvas = this.textUtility.createTextCanvas(text, color, fontSize, fontFamily, true, lineWidth, fontWeight);

                // calculate text width and height
                var textWidth = offScreenCanvas.width;
                var textHeight = offScreenCanvas.height;

                var canvasTexture = this.gl.createTexture();
                this.generateTexture(canvasTexture, offScreenCanvas);

                return {'texture': canvasTexture, 'width': textWidth, 'height': textHeight, 'text': text};
            };

            /**
             * Returns or generated texture for the given node's text
             * @param node
             * @returns {*}
             */
            this.getTextTextureOfNode = function(node)
            {
                var text = node.getProp('text');
                if(text === undefined || text === '')
                {
                    return;
                }

                var id = node.getId();
                var textEntry = this.textTextures[id];
                if(textEntry !== undefined)
                {
                    if(node.isTextInvalidated())
                    {
                        // text is updated, delete the old one
                        this.gl.deleteTexture(textEntry.texture);
                        this.textTextures[id] = undefined;
                    }
                    else
                    {
                        // cache is up-to-date
                        return textEntry;
                    }
                }

                textEntry = this.generateTextTexture(node);
                this.textTextures[id] = textEntry;
                node.markTextValidated();

                return textEntry;
            };

            /**
             * @brief Draws a quad for the given positionX and positionY
             * @param positionX x position of the quad
             * @param positionY y position of the quad
             * @param width width of the quad
             * @param height height of the quad
             * @param rotation rotation value
             * @param texture texture handle
             * @param opacity opacity value
             */
            this.drawQuad = function(positionX, positionY, width, height, rotation, texture, opacity, backgroundColor)
            {
                glMatrix.mat4.identity(this.mvMatrix);
                glMatrix.mat4.translate(this.mvMatrix, [positionX, positionY, -5]);
                if(rotation !== undefined && rotation !== 0) {
                    glMatrix.mat4.translate(this.mvMatrix, [(width/2), (height/2) , 0]);
                    glMatrix.mat4.rotate(this.mvMatrix, rotation, [0, 0, 1]);
                    glMatrix.mat4.translate(this.mvMatrix, [-(width/2), -(height/2) , 0]);
                }
                glMatrix.mat4.scale(this.mvMatrix, [width, height, 1.0]);
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareVertexPositionBuffer);
                this.gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute, this.squareVertexPositionBuffer.itemSize, this.gl.FLOAT, false, 0, 0);
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.squareTextureCoordBuffer);
                this.gl.vertexAttribPointer(this.shaderProgram.textureCoordAttribute, this.squareTextureCoordBuffer.itemSize, this.gl.FLOAT, false, 0, 0);
                this.gl.activeTexture(this.gl.TEXTURE0);
                this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
                this.gl.uniform1i(this.shaderProgram.samplerUniform, 0);
                if(opacity !== undefined) {
                    this.gl.uniform1f(this.shaderProgram.alphaUniform, opacity);
                } else {
                    this.gl.uniform1f(this.shaderProgram.alphaUniform, 1.0);
                }
                // send color
                if(texture === undefined && backgroundColor !== undefined) {
                    this.gl.uniform1i(this.shaderProgram.colorOnlyUniform, true);
                    this.gl.uniform4f(this.shaderProgram.colorUniform, backgroundColor.r, backgroundColor.g, backgroundColor.b, opacity);
                } else {
                    this.gl.uniform1i(this.shaderProgram.colorOnlyUniform, false);
                    this.gl.uniform4f(this.shaderProgram.colorUniform, 1, 1, 1, 1);
                }
                this.setMatrixUniforms();
                this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.squareVertexPositionBuffer.numItems);
            };

            /**
             * @brief Renders text buffer object which is generated by WebGLTextUtility class.
             * @param bufferObject
             * @param width
             * @param height
             * @param positionX
             * @param positionY
             * @param rotation
             * @param color
             */
            this.renderTextBufferObjects = function(bufferObject, width, height, positionX, positionY, rotation, color)
            {
                glMatrix.mat4.identity(this.mvMatrix);
                glMatrix.mat4.translate(this.mvMatrix, [positionX, positionY, -5]);
                if(rotation !== undefined && rotation !== 0) {
                    glMatrix.mat4.translate(this.mvMatrix, [(width/2), (height/2) , 0]);
                    glMatrix.mat4.rotate(this.mvMatrix, rotation, [0, 0, 1]);
                    glMatrix.mat4.translate(this.mvMatrix, [-(width/2), -(height/2) , 0]);
                }
                glMatrix.mat4.scale(this.mvMatrix, [bufferObject.scale, bufferObject.scale, 1.0]);
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, bufferObject.vertexBuffer);
                this.gl.vertexAttribPointer(this.shaderProgram.vertexPositionAttribute, bufferObject.vertexBuffer.itemSize, this.gl.FLOAT, false, 0, 0);
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, bufferObject.textureBuffer);
                this.gl.vertexAttribPointer(this.shaderProgram.textureCoordAttribute, bufferObject.textureBuffer.itemSize, this.gl.FLOAT, false, 0, 0);
                this.gl.activeTexture(this.gl.TEXTURE0);
                this.gl.bindTexture(this.gl.TEXTURE_2D, bufferObject.texture);
                this.gl.uniform1i(this.shaderProgram.samplerUniform, 0);
                this.gl.uniform1f(this.shaderProgram.alphaUniform, 1.0);
                this.gl.uniform1i(this.shaderProgram.colorOnlyUniform, false);
                this.gl.uniform4f(this.shaderProgram.colorUniform, color.r, color.g, color.b, 1);

                this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, bufferObject.indexBuffer);
                this.setMatrixUniforms();
                //this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this.squareVertexPositionBuffer.numItems);
                this.gl.drawElements(this.gl.TRIANGLES, bufferObject.indexBuffer.numItems, this.gl.UNSIGNED_SHORT, 0);
            };
        }

        return WebGLRenderer;
    });
