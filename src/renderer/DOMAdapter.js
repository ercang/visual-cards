define([],
    function () {
        'use strict';

        /**
         * @class DOMAdapter
         */
        function DOMAdapter(rootNode, containerEl, width, height) {

            /**
             * @brief ID prefix for auto created DOM elements
             * @type {string}
             */
            this.idPrefix = '__node_';

            /**
             * @brief
             */
            this.container = containerEl;

            /**
             * @brief Stores matching document elements for each Node instance
             * @type {Array}
             */
            this.domElements = [];

            /**
             * @brief Root node of the document
             */
            this.rootNode = rootNode;

            /**
             * @brief Width of the root
             */
            this.width = width;

            /**
             * @brief Height of the root
             */
            this.height = height;

            /**
             * @brief Initializes dom renderer
             */
            this.init = function()
            {
                this.rootNode.setProp({'width': this.width, 'height': this.height});
            };

            /**
             * @brief Converts node properties to CSS rules to the given element
             * @param node
             * @param el
             */
            this.applyProperties = function(node, el)
            {
                if(node.getRoot() === node)
                {
                    el = this.container;
                    el.style.position = 'relative';
                }
                else
                {
                    el.style.position = 'absolute';
                }

                el.style.top = node.getProp('top') + 'px';
                el.style.left = node.getProp('left') + 'px';
                el.style.width = node.getProp('width') + 'px';
                el.style.height = node.getProp('height') + 'px';

                if(node.getChildren().length === 0)
                {
                    el.innerText = node.getProp('text');
                }

                var backgroundImage = node.getProp('backgroundImage');
                if(backgroundImage !== undefined && backgroundImage !== '')
                {
                    el.style.backgroundImage = 'url(\'' + backgroundImage + '\')';
                    el.style.backgroundSize = '100%';
                }

                var backgroundColor = node.getProp('backgroundColor');
                if(backgroundColor !== undefined && backgroundColor !== '')
                {
                    el.style.backgroundColor = backgroundColor;
                }
                else
                {
                    el.style.backgroundColor = 'transparent';
                }

                el.style.visibility = node.getProp('visibility');

                el.style.borderWidth = node.getProp('borderWidth') + 'px';
                var borderOpacity = node.getProp('borderOpacity');
                var borderColor = node.getBorderColorRGB();
                if(borderColor !== undefined && borderColor !== '')
                {
                    el.style.borderColor = 'rgba(' + (borderColor.r*255) + ', ' + (borderColor.g*255) + ', ' + (borderColor.b*255) + ', ' + borderOpacity + ')';
                    el.style.borderStyle = 'solid';
                }

                el.style.opacity = node.getProp('opacity');
                el.style.color = node.getProp('color');
                el.style.fontFamily = node.getProp('fontFamily');
                el.style.fontSize = node.getProp('fontSize') + 'px';
                el.style.fontWeight = node.getProp('fontWeight');

                var rotation = node.getProp('rotation');
                if(rotation !== 0 && rotation !== undefined)
                {
                    el.style.transform = 'rotate(' + node.getProp('rotation') + 'rad)';
                }

                el.style.overflow = 'hidden';
                var showOnTop = node.getProp('showOnTop');
                if(showOnTop)
                {
                    el.style.zIndex = '100';
                }
                else
                {
                    el.style.zIndex = '1';
                }
            };


            /**
             * @brief Called by NodeEventPublisher to inform that a node property update.
             * @param node
             * @param updateData
             * @param preUpdateData
             */
            this.onNodePropertyUpdate = function(node, updateData, preUpdateData)
            {
                var el = this.domElements[node.getId()];
                this.applyProperties(node, el);
            };

            /**
             * @brief Called by NodeEventPublisher to inform that a node is added.
             * @param node
             * @param childNode
             */
            this.onNodeAdded = function(node, childNode)
            {
                this.addNodeIfNotExists(node);
                this.addNodeIfNotExists(childNode);
            };

            /**
             * @brief Adds an HTML element for the given node if a related element is not found.
             * @param node
             */
            this.addNodeIfNotExists = function(node)
            {
                var el = this.domElements[node.getId()];
                if(el !== undefined)
                {
                    return;
                }

                el = this.createNodeElement(node);

                if(node.getParent() === undefined)
                {
                    this.container.appendChild(el);
                }
                else
                {
                    var parentEl = this.domElements[node.getParent().getId()];
                    parentEl.appendChild(el);
                }
            };

            /**
             * @brief Creates element from node. Also creates children.
             * @param node
             * @returns {Element}
             */
            this.createNodeElement = function(node)
            {
                var el = document.createElement('div');
                this.domElements[node.getId()] = el;
                el.setAttribute('id', this.idPrefix + node.getId());
                var children = node.getChildren();
                for(var i=0; i<children.length; i++)
                {
                    var child = children[i];
                    if(this.domElements[child.getId()] === undefined)
                    {
                        var childEl = this.createNodeElement(child);
                        el.appendChild(childEl);
                    }
                }
                this.applyProperties(node, el);
                return el;
            };

            /**
             * @brief Called by NodeEventPublisher to inform that a node is removed.
             * @param node
             * @param childNode
             */
            this.onNodeRemoved = function(node, childNode)
            {
                var childEl = this.domElements[childNode.getId()];
                var el = this.domElements[node.getId()];

                if(el === undefined || childEl === undefined)
                {
                    console.log('error can not remove node element!');
                }

                el.removeChild(childEl);
                this.domElements[childNode.getId()] = undefined;
            };
        }

        return DOMAdapter;
    });
