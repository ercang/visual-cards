define(
    function () {
        'use strict';

        /**
         * @class NodeEventPublisher
         */
        function NodeEventPublisher() {

            /**
             * @brief Listener list.
             * @type {Array}
             * @private
             */
            this.listeners = [];

            /**
             * @brief Adds a listener. Listener class should implement the following functions in order to receive
             * node updates.
             * listener.onNodePropertyUpdate(node, updateData, preUpdateData);
             * listener.onNodeAdded(node, childNode);
             * listener.onNodeRemoved(node, childNode);
             * @param listener
             */
            this.addListener = function(listener)
            {
                this.listeners.push(listener);
            };

            /**
             * @brief Removes listener
             * @param listener
             */
            this.removeListener = function(listener)
            {
                var listenerIndex = this.listeners.indexOf(listener);
                if(listenerIndex === -1)
                {
                    console.log('Can not removeListener(). listener is not in the list!');
                    return;
                }

                this.listeners.splice(listenerIndex, 1);
            };

            /**
             * @brief This function is called by a node to publish this event (one or more of its property
             * has been updated).
             * @param node
             * @param updateData
             * @param preUpdateData
             */
            this.nodePropertyUpdated = function(node, updateData, preUpdateData)
            {
                for(var i=0; i<this.listeners.length; i++)
                {
                    var listener = this.listeners[i];
                    if(typeof listener.onNodePropertyUpdate === "function")
                    {
                        listener.onNodePropertyUpdate(node, updateData, preUpdateData);
                    }
                }
            };

            /**
             * @brief This function is called by a node to publish this event (node added).
             * @param node
             * @param childNode
             */
            this.nodeAdded = function(node, childNode)
            {
                for(var i=0; i<this.listeners.length; i++)
                {
                    var listener = this.listeners[i];
                    if(typeof listener.onNodeAdded === "function")
                    {
                        listener.onNodeAdded(node, childNode);
                    }
                }
            };

            /**
             * @brief This function is called by a node to publish this event (node removed).
             * @param node
             * @param childNode
             */
            this.nodeRemoved = function(node, childNode)
            {
                for(var i=0; i<this.listeners.length; i++)
                {
                    var listener = this.listeners[i];
                    if(typeof listener.onNodeRemoved === "function")
                    {
                        listener.onNodeRemoved(node, childNode);
                    }
                }
            };
        }

        return NodeEventPublisher;
    });
