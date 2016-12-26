define(
    function () {
        'use strict';

        /**
         * @class Node
         */
        function Node(nodeEventPublisher) {

            /**
             * @brief ID of this node.
             * @type {number}
             * @private
             */
            this.id = ++Node.prototype.lastId;

            /**
             * @brief Returns node id
             * @returns {number}
             */
            this.getId = function()
            {
                return this.id;
            };

            /**
             * @brief NodeEventPublisher instance
             * @private
             */
            this.nodeEventPublisher = nodeEventPublisher;

            /**
             * @brief Visual properties of a node. Should not be accessed directly.
             * @private
             */
            this.properties = {
                /**
                 * @brief text content of the node
                 */
                'text': '',

                /**
                 * @brief  text type ('dynamic' or 'static'). This changes the rendering method.
                 * dynamic -> bitmap fonts
                 * static -> text textures
                 */
                'textType': 'dynamic',

                /**
                 * @brief If whitespace attribute is 'normal' then text will wrap inside that node
                 * If 'nowrap' value is specified then text will be clipped.
                 */
                'whiteSpace': 'normal',

                /**
                 * @brief Position from top side of the screen in pixels.
                 */
                'top': 0,

                /**
                 * @brief Position from left side of the screen in pixels.
                 */
                'left': 0,

                /**
                 * @brief Node width in pixels
                 */
                'width': 0,

                /**
                 * @brief Node height in pixels
                 */
                'height': 0,

                /**
                 * @brief Background image url
                 */
                'backgroundImage': undefined,

                /**
                 * @brief Fits background image if true
                 */
                'fitBackgroundImage': false,

                /**
                 * @brief Background color of the node. Color format should be string #000000
                 */
                'backgroundColor': undefined,

                /**
                 * @brief Node visibility. This value can be 'visible' or 'hidden'
                 */
                'visibility': 'visible',

                /**
                 * @brief border opacity, default value is 1
                 */
                'borderOpacity': 1,

                /**
                 * @brief border with in pixels
                 */
                'borderWidth': 0,

                /**
                 * @brief Border color. It is invisible if color is undefined. Color format
                 * should be string '#000000'
                 */
                'borderColor': undefined,

                /**
                 * @brief opacity value, default is 1
                 */
                'opacity': 1,

                /**
                 * Font color for the node text
                 */
                'color': '#000000',

                /**
                 * @brief font family
                 */
                'fontFamily': 'sans-serif',

                /**
                 * @brief font size in pixels
                 */
                'fontSize': 24,

                /**
                 * @brief Font weight property 'normal' or 'bold'
                 */
                'fontWeight': 'normal',

                /**
                 * @brief Child positions are calculated according to this value.
                 * Value can be none, horizontal, vertical and grid
                 */
                'childrenLayout': 'none',

                /**
                 * @brief Rotation amount in degrees
                 */
                'rotation': 0,

                /**
                 * @brief if focusable is true then this node will receive focus, blur and click events.
                 */
                'focusable': false,

                /**
                 * @brief If a node is marked as showInTop then
                 * @type {boolean}
                 */
                'showOnTop': false,

                /**
                 * @brief True if focus is currently set for this node
                 */
                'focused': false
            };

            /**
             * @brief Event handlers for this node.
             * @private
             */
            this.eventHandlers = {
                'focus': [],
                'blur': [],
                'click': []
            };

            /**
             * @bried root node of this tree
             * @type {undefined}
             */
            this.root = this;

            /**
             * @brief Returns root node
             * @returns {undefined}
             */
            this.getRoot = function()
            {
                return this.root;
            };

            /**
             * @brief Parent of this node.
             * @type {undefined}
             * @private
             */
            this.parent = undefined;

            /**
             * @brief Returns parent node
             * @returns {undefined}
             */
            this.getParent = function()
            {
                return this.parent;
            };

            /**
             * @brief Children of this node
             * @private
             */
            this.children = [];

            /**
             * @brief Flag to keep tracking of text information
             * @type {boolean}
             */
            this.isTextUpdated = false;

            /**
             * @brief Set function for visual properties. All node updates should be done by calling this function.
             * @param params
             */
            this.setProp = function(params)
            {
                var isUpdated = false;
                var updateData = {};
                var preUpdateData = {};
                for(var key in params)
                {
                    if(params.hasOwnProperty(key) && this.properties.hasOwnProperty(key) &&
                        this.properties[key] !== params[key])
                    {
                        preUpdateData[key] = this.properties[key];
                        this.properties[key] = params[key];
                        updateData[key] = params[key];
                        isUpdated = true;

                        if(this.isTextUpdated === false &&
                            (key === 'text' || key === 'color' || key === 'fontFamily' ||
                             key === 'fontSize' || key === 'fontWeight' || key === 'whiteSpace' ||
                            (key === 'width' && this.getProp('whiteSpace') === 'normal')))
                        {
                            this.isTextUpdated = true;
                        }
                    }
                }

                if(isUpdated && this.root.nodeEventPublisher !== undefined)
                {
                    this.root.nodeEventPublisher.nodePropertyUpdated(this, updateData, preUpdateData);
                }
            };

            /**
             * @brief If text is updated that means renderer should update its buffer
             * @returns {boolean}
             */
            this.isTextInvalidated = function()
            {
                return this.isTextUpdated;
            };

            this.markTextValidated = function()
            {
                this.isTextUpdated = false;
            };

            /**
             * @brief Returns the requested visual property
             * @param propName
             * @returns {*}
             */
            this.getProp = function(propName)
            {
                return this.properties[propName];
            };

            /**
             * @brief Returns children array
             * @returns {Array}
             */
            this.getChildren = function()
            {
                return this.children;
            };

            /**
             * @brief Adds the given node as a child of this node
             * @param node
             */
            this.appendChild = function(node)
            {
                if(node.parent !== undefined)
                {
                    console.log('Can not appendChild(). node.parent is set before!');
                    return;
                }

                node.parent = this;
                this.children.push(node);
                node.setRootNode(this.root);

                if(this.root.nodeEventPublisher !== undefined)
                {
                    this.root.nodeEventPublisher.nodeAdded(this, node);
                }
            };

            /**
             * @brief Removes child node if it exists on the children list.
             * @param node
             */
            this.removeChild = function(node)
            {
                var nodeIndex = this.children.indexOf(node);
                if(nodeIndex === -1)
                {
                    console.log('Can not removeChild(). node is not a child!');
                    return;
                }

                this.children.splice(nodeIndex, 1);
                node.parent = undefined;

                if(this.root.nodeEventPublisher !== undefined)
                {
                    this.root.nodeEventPublisher.nodeRemoved(this, node);
                }

                node.setRootNode(node);
            };

            /**
             * @brief Removes all children
             */
            this.removeChildren = function()
            {
                this.children = [];

                for(var i=0; i<this.children.length; i++)
                {
                    var node = this.children[i];
                    node.parent = undefined;

                    if(this.root.nodeEventPublisher !== undefined)
                    {
                        this.root.nodeEventPublisher.nodeRemoved(this, node);
                    }

                    node.setRootNode(node);
                }
            };

            /**
             * @brief Sets root node of this node recursively.
             * @param rootNode
             */
            this.setRootNode = function(rootNode)
            {
                this.root = rootNode;
                for(var i=0; i<this.children.length; i++)
                {
                    this.children[i].setRootNode(rootNode);
                }
            };

            /**
             * @brief Adds event listener
             * @param event
             * @param handlerFunction
             */
            this.addEventListener = function(event, handlerFunction)
            {
                if(this.eventHandlers.hasOwnProperty(event) === false)
                {
                    console.log('Can not addEventListener, event(' + event + ') is not supported.');
                    return;
                }

                this.eventHandlers[event].push(handlerFunction);
            };

            /**
             * @brief Removes event listener
             * @param event
             * @param handlerFunction
             */
            this.removeEventListener = function(event, handlerFunction)
            {
                if(this.eventHandlers.hasOwnProperty(event) === false)
                {
                    console.log('Can not removeEventListener, event(' + event + ') is not supported.');
                    return;
                }

                var eventIndex = this.eventHandlers[event].indexOf(handlerFunction);
                if(eventIndex !== -1)
                {
                    this.eventHandlers[event].splice(eventIndex,1);
                }
            };

            /**
             * Removes all event listeners for the given event name. If no event name is specified, then all event
             * listeners will be removed.
             * @param event
             */
            this.removeAllEventListeners = function(event)
            {
                if(event === undefined)
                {
                    for(var key in this.eventHandlers)
                    {
                        if(this.eventHandlers.hasOwnProperty(key))
                        {
                            // clear all event listeners
                            this.eventHandlers[key] = [];
                        }
                    }
                }
                else
                {
                    if(this.eventHandlers.hasOwnProperty(event))
                    {
                        // clear all event listeners
                        this.eventHandlers[event] = [];
                    }
                }
            };

            /**
             * @brief Serializes node data to JSON format.
             * @returns {{id: *, parentId: (*|string|number|string), properties: *, children: Array}}
             */
            this.serialize = function()
            {
                var childrenData = [];

                for(var i=0; i<this.children.length; i++)
                {
                    var child = this.children[i];
                    var childData = child.serialize();
                    childrenData.push(childData);
                }

                var data = {
                    'id': this.id,
                    'parentId': this.parent.id,
                    'properties': this.properties,
                    'children': childrenData
                };

                return data;
            };

            /**
             * @brief Deserializes JSON data to Node
             */
            this.deserialize = function(serializedData)
            {
                this.id = serializedData.id;
                this.setProp(serializedData.properties);

                for(var i=0; i<serializedData.children.length; i++)
                {
                    var child = new Node();
                    child.deserialize(serializedData.children[i]);
                    this.appendChild(child);
                }
            };

            /**
             * @brief Returns node with the requested id
             * @param id
             */
            this.findById = function(id)
            {
                if(this.id === id)
                {
                    return this;
                }

                var requestedNode;
                for(var i=0; i<this.children.length; i++)
                {
                    requestedNode = this.children[i].findById(id);
                    if(requestedNode !== undefined)
                    {
                        break;
                    }
                }

                return requestedNode;
            };

            /**
             * @brief Returns absolute rect of the node
             * @returns {{x: number, y: number, w: number, h: number}}
             */
            this.calculateAbsoluteRect = function()
            {
                var rect = {'x': 0, 'y':0, 'w': this.getProp('width'), 'h': this.getProp('height')};
                var walkerNode = this;
                while(walkerNode !== undefined)
                {
                    rect.x += walkerNode.getProp('left');
                    rect.y += walkerNode.getProp('top');

                    walkerNode = walkerNode.parent;
                }

                return rect;
            };

            /**
             * @brief Private function to convert hex color string to RGB values
             * @param hex
             * @returns {*}
             */
            function hexToRgb(hex) {
                // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
                var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
                hex = hex.replace(shorthandRegex, function(m, r, g, b) {
                    return r + r + g + g + b + b;
                });

                var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result ? {
                    r: parseInt(result[1], 16),
                    g: parseInt(result[2], 16),
                    b: parseInt(result[3], 16)
                } : null;
            }

            /**
             * @brief Returns background color in RGB (0-1) for WebGL
             * @returns {{r: number, g: number, b: number}}
             */
            var lastColorString;
            var lastRGB = {'r': 0, 'g': 0, 'b': 0};
            this.getBackgroundColorRGB = function()
            {
                var color = this.getProp('backgroundColor');
                if(color === undefined || color === '')
                {
                    return {'r': 0, 'g': 0, 'b': 0};
                }

                if(color === lastColorString)
                {
                    return lastRGB;
                }

                var rgbColor = hexToRgb(color);
                var unifiedRgbColor = {'r': rgbColor.r/255, 'g': rgbColor.g/255, 'b': rgbColor.b/255};
                lastColorString = color;
                lastRGB = unifiedRgbColor;
                return unifiedRgbColor;
            };

            /**
             * @brief Returns background color in RGB (0-1) for WebGL
             * @returns {{r: number, g: number, b: number}}
             */
            var lastBorderColorString;
            var lastBorderRGB = {'r': 0, 'g': 0, 'b': 0};
            this.getBorderColorRGB = function()
            {
                var color = this.getProp('borderColor');
                if(color === undefined || color === '')
                {
                    return {'r': 0, 'g': 0, 'b': 0};
                }

                if(color === lastBorderColorString)
                {
                    return lastBorderRGB;
                }

                var rgbColor = hexToRgb(color);
                var unifiedRgbColor = {'r': rgbColor.r/255, 'g': rgbColor.g/255, 'b': rgbColor.b/255};
                lastBorderColorString = color;
                lastBorderRGB = unifiedRgbColor;
                return unifiedRgbColor;
            };

            /**
             * @brief Returns background color in RGB (0-1) for WebGL
             * @returns {{r: number, g: number, b: number}}
             */
            var lastTextColorString;
            var lastTextRGB = {'r': 0, 'g': 0, 'b': 0};
            this.getTextColorRGB = function()
            {
                var color = this.getProp('color');
                if(color === undefined || color === '')
                {
                    return {'r': 0, 'g': 0, 'b': 0};
                }

                if(color === lastTextColorString)
                {
                    return lastTextRGB;
                }

                var rgbColor = hexToRgb(color);
                var unifiedRgbColor = {'r': rgbColor.r/255, 'g': rgbColor.g/255, 'b': rgbColor.b/255};
                lastTextColorString = color;
                lastTextRGB = unifiedRgbColor;
                return unifiedRgbColor;
            };
        }

        // Define lastId property
        if(Node.lastId === undefined)
        {
            Node.prototype.lastId = 0;
        }

        return Node;
    });
