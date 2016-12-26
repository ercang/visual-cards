define(['assets/FreeSans'],
       function (FreeSansData) {
           'use strict';

           /**
            * @class WebGL Text Utility Class
            */
           function WebGLTextUtility(fontBank, gl) {

               /**
                * @brief WebGL context which is passed by WebGLRenderer
                */
               this.gl = gl;

               /**
                * @brief Font bank
                */
               this.fontBank = fontBank;

               /**
                * @brief Font textures are stored in this array with font.name
                * @type {Array}
                */
               this.fontTexture = [];

               /**
                * @brief Font which is used for rendering a specific node is stored in this map. This map can point to
                * a fallback font if node's font is not found.
                * fontNodeMap[nodeId] = font;
                * @type {Array}
                */
               this.fontNodeMap = [];

               /**
                * @brief Generated buffer objects are stored in this map. These buffers are re-generated when node's text
                * is invalidated.
                * this.bufferObjectMap[nodeId] = {
                       'vertexBuffer': vertexPositionBuffer,
                       'textureBuffer': textureCoordsBuffer,
                       'indexBuffer': vertexIndexBuffer,
                       'texture': this.fontTexture[nodeFont.name],
                       'scale': scale
                   };
                * @type {Array}
                */
               this.bufferObjectMap = [];

               /**
                * @brief Initalizes object
                */
               this.init = function()
               {

               };

               /**
                * @brief This is the API function for this class. WebGL renderer calls this function get generated
                * webgl buffer for rendering.
                * @param node
                * @returns {*}
                */
               this.getTextBufferObjects = function(node)
               {
                   if(this.checkFontTexture(node) === false)
                   {
                       // font texture is not ready!
                       return undefined;
                   }

                   // font is ready draw text
                   return this.getBufferForNode(node);
               };

               /**
                * @brief Checks node's font and loads font's texture is it was not loaded already.
                * @param node
                * @returns {boolean}
                */
               this.checkFontTexture = function(node)
               {
                   var font;
                   if(node.isTextInvalidated() || this.fontNodeMap[node.getId()] === undefined)
                   {
                       font = this.fontBank.getFont(node);
                       this.fontNodeMap[node.getId()] = font;
                   }
                   else
                   {
                       font = this.fontNodeMap[node.getId()];
                   }

                   if(this.fontTexture[font.name] !== undefined)
                   {
                       return true;
                   }

                   if(font.isLoaded === false)
                   {
                       return false;
                   }

                   // create texture
                   this.fontTexture[font.name] = this.gl.createTexture();
                   this.generateTexture(this.fontTexture[font.name], font.image);

                   return true;
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
                   this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_NEAREST/*this.gl.LINEAR*/);
                   // enable mip mapping
                   this.gl.generateMipmap(this.gl.TEXTURE_2D);
                   this.gl.bindTexture(this.gl.TEXTURE_2D, null);
               };

               /**
                * This function generates webgl buffers for the given node's text
                * @param node
                * @returns {*}
                */
               this.getBufferForNode = function(node)
               {
                   var nodeFont = this.fontNodeMap[node.getId()];
                   var bufferObject = this.bufferObjectMap[node.getId()];
                   if(bufferObject !== undefined)
                   {
                       if(node.isTextInvalidated())
                       {
                           // delete buffers and update
                           this.gl.deleteBuffer(bufferObject.vertexBuffer);
                           this.gl.deleteBuffer(bufferObject.textureBuffer);
                           this.gl.deleteBuffer(bufferObject.indexBuffer);
                       }
                       else
                       {
                           return bufferObject;
                       }
                   }

                   var scale = node.getProp('fontSize') / nodeFont.size;
                   var verticesBuffer = [];
                   var textureCoordBuffer = [];
                   var bufferIndices = [];
                   var charCount =  node.getProp('text').length;

                   // generate buffers
                   var text = node.getProp('text');
                   var containerWidth = node.getProp('width');
                   var whiteSpace = node.getProp('whiteSpace');
                   var breakLines = whiteSpace !== 'nowrap' ? true : false;
                   var xPosition = 0;
                   var yPosition = 0;
                   var indexPosition = 0;
                   var nextBreakIndex = -1;
                   var textLength = text.length;
                   for(var i=0; i<textLength; i++)
                   {
                       var charCode = text.charCodeAt(i);
                       var char = nodeFont.getChar(charCode);

                       if(breakLines === true) {
                           if(i>nextBreakIndex){
                               var currentXPosition = xPosition;
                               var lastSpacePos = i;
                               // calculate next break index
                               for(var j=i; j<textLength; j++) {
                                   var currentCharCode = text.charCodeAt(j);
                                   var currentChar = text.charAt(j);
                                   var currentCharProps = nodeFont.getChar(currentCharCode);
                                   currentXPosition += currentCharProps.xAdvance;
                                   if(currentXPosition*scale > containerWidth &&
                                      (currentChar == ' ' || j==textLength-1))
                                   {
                                       nextBreakIndex = lastSpacePos;
                                       break;
                                   } else if(currentChar == ' ') {
                                       lastSpacePos = j;
                                   }
                               }
                           }

                           if(i == nextBreakIndex) {
                               // break line!
                               yPosition += nodeFont.lineHeight;
                               xPosition = 0;
                               //continue;
                           }
                       }

                       // check kerning
                       var kerningAmount = 0;
                       if(i>0 && xPosition !== 0)
                       {
                           var prevCharCode = text.charCodeAt(i-1);
                           if(char.kernings !== undefined)
                           {
                               var kerning = char.kernings[prevCharCode];
                               if (kerning !== undefined) {
                                   kerningAmount = kerning*2;
                               }
                           }
                       }

                       if(i != nextBreakIndex){
                           xPosition += kerningAmount;
                       }


                       var bottomY = yPosition + char.height + char.yOffset;
                       var topY = yPosition + char.yOffset;
                       var leftX = xPosition + char.xOffset;
                       var rightX = xPosition + char.width + char.xOffset;

                       // add vertex positions
                       verticesBuffer = verticesBuffer.concat([
                           rightX, bottomY, 0.0,
                           rightX, topY, 0.0,
                           leftX, bottomY, 0.0,
                           leftX, topY, 0.0
                       ]);

                       // add char uv
                       textureCoordBuffer = textureCoordBuffer.concat(char.uv);

                       // add indices
                       bufferIndices = bufferIndices.concat([
                           indexPosition, indexPosition+1, indexPosition+3, // first triangle
                           indexPosition, indexPosition+3, indexPosition+2 // second triangle
                       ]);

                       if(i != nextBreakIndex){
                           xPosition += char.xAdvance;
                       }

                       indexPosition += 4;
                   }

                   // upload vertex position buffer
                   var vertexPositionBuffer = this.gl.createBuffer();
                   this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexPositionBuffer);
                   this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(verticesBuffer), this.gl.STATIC_DRAW);
                   vertexPositionBuffer.itemSize = 3;
                   vertexPositionBuffer.numItems = charCount * 4;

                   // upload texture coords buffer
                   var textureCoordsBuffer = this.gl.createBuffer();
                   this.gl.bindBuffer(this.gl.ARRAY_BUFFER, textureCoordsBuffer);
                   this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(textureCoordBuffer), this.gl.STATIC_DRAW);
                   textureCoordsBuffer.itemSize = 2;
                   textureCoordsBuffer.numItems = charCount * 4;

                   var vertexIndexBuffer = this.gl.createBuffer();
                   this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, vertexIndexBuffer);
                   this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(bufferIndices), this.gl.STATIC_DRAW);
                   vertexIndexBuffer.itemSize = 1;
                   vertexIndexBuffer.numItems = charCount * 6;

                   bufferObject = {
                       'vertexBuffer': vertexPositionBuffer,
                       'textureBuffer': textureCoordsBuffer,
                       'indexBuffer': vertexIndexBuffer,
                       'texture': this.fontTexture[nodeFont.name],
                       'scale': scale
                   };

                   this.bufferObjectMap[node.getId()] = bufferObject;
                   node.markTextValidated();
                   return bufferObject;
               };
           }

           return WebGLTextUtility;
       });
