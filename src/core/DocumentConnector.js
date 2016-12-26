define(['socketio',
        'src/core/Node'],
    function (io,
              Node) {
        'use strict';

        /**
         * @class DocumentConnector
         */
        function DocumentConnector(rootNode, appId, clearServerQueue) {

            /**
             * @brief socket.io connection
             * @type {undefined}
             */
            this.socket = undefined;

            /**
             * @brief Root node of the document
             * @type {undefined}
             */
            this.rootNode = rootNode;

            /**
             * @brief Application Identifier for server
             */
            this.appId = appId;

            /**
             * @brief Sends a clear queue request to the server if this is set to true
             */
            this.clearServerQueue = clearServerQueue;

            /**
             * @brief isConnected flag
             * @type {boolean}
             */
            this.isConnected = false;

            /**
             * @brief Update messages are stored here until connection is established
             * @type {Array}
             */
            this.messageQueue = [];

            /**
             * @brief This flag is set to true if an update is being processed.
             * Update will not be sent to server if this flag is set to true;
             * @type {boolean}
             */
            this.receivingUpdates = false;

            /**
             * @brief Enables extra prints for incoming events.
             * @type {boolean}
             */
            this.showDebugPrints = false;

            /**
             * @brief Listener array for connection events
             * @type {Array}
             */
            this.listeners = [];

            /**
             * @brief Initializes connector
             */
            this.init = function()
            {
                this.socket = io();
                this.socket.on('connect', function() {
                    console.log('Connected to server!');
                    this.connectionStatusChanged(true);
                    this.socket.emit('applicationId', this.appId);

                    if(this.clearServerQueue === true)
                    {
                        this.socket.emit('clearMessageQueue');
                    }
                    else
                    {
                        this.socket.emit('getMessageQueue');
                    }

                    // run through message queue
                    for(var i=0; i<this.messageQueue.length; i++)
                    {
                        var m = this.messageQueue[i];
                        this.socket.emit(m[0], m[1], m[2]);
                    }

                    // clear message queue
                    this.messageQueue = [];
                }.bind(this));
                this.socket.on('disconnect', function() {
                    console.log('Disconnected to server!');

                    this.connectionStatusChanged(false);
                }.bind(this));

                // register event handlers
                this.socket.on('onNodePropertyUpdate', this.serverOnNodePropertyUpdate.bind(this));
                this.socket.on('onNodeAdded', this.serverOnNodeAdded.bind(this));
                this.socket.on('onNodeRemoved', this.serverOnNodeRemoved.bind(this));
                this.socket.on('clearMessageQueue', this.serverClearMessageQueue.bind(this));
            };

            /**
             * @brief Adds listener to connection status event. Listener class should implement the following function.
             * onConnectionStatusChanged(isConnected : boolean)
             * @param listener
             */
            this.addListener = function(listener)
            {
                this.listeners.push(listener);
            };

            /**
             * @brief Removes listener from connection status event. Listener class should implement the following function.
             * @param listener
             */
            this.removeListener = function(listener)
            {
                var index = this.listeners.indexOf(listener);
                if(index === -1)
                {
                    console.log('can not remove listener!');
                    return;
                }

                this.listeners.splice(index,1);
            };

            /**
             * @brief Called by this class to update connect status
             * @param isConnected
             */
            this.connectionStatusChanged = function(isConnected)
            {
                this.isConnected = isConnected;

                for(var i=0; i<this.listeners.length; i++)
                {
                    var callback = this.listeners[i].onConnectionStatusChanged;
                    if(callback !== undefined)
                    {
                        callback(isConnected);
                    }
                }
            };

            /**
             * @brief Called when an node property update is received from server. DocumentConnector stops listening to
             * node events and modifies the tree.
             * @param id
             * @param updateData
             */
            this.serverOnNodePropertyUpdate = function(id, updateData)
            {
                this.receivingUpdates = true;
                if(this.showDebugPrints) {
                    console.log('serverOnNodePropertyUpdate: id:' + id + ', updateData:' + updateData);
                }

                var node = this.rootNode.findById(id);
                if(node === undefined)
                {
                    // sync error
                    console.log("Sync Error: can not find node with id: " + id);
                    return;
                }

                node.setProp(JSON.parse(updateData));

                this.receivingUpdates = false;
            };

            /**
             * @brief Called when a node added event is received from server. DocumentConnector stops listening to
             * node events and modifies the tree.
             * @param parentId
             * @param childNodeData
             */
            this.serverOnNodeAdded = function(parentId, childNodeData)
            {
                this.receivingUpdates = true;
                if(this.showDebugPrints) {
                    console.log('serverOnNodeAdded: parentId:' + parentId + ', childNodeData:' + childNodeData);
                }

                var parentNode = this.rootNode.findById(parentId);
                if(parentNode === undefined)
                {
                    // sync error
                    console.log("Sync Error: can not find node with id: " + parentId);
                    return;
                }

                var node = new Node();
                node.deserialize(JSON.parse(childNodeData));

                parentNode.appendChild(node);

                this.receivingUpdates = false;
            };

            /**
             * @brief Called when a node removed event is received from server. DocumentConnector stops listening to
             * node events and modifies the tree.
             * @param nodeId
             */
            this.serverOnNodeRemoved = function(nodeId)
            {
                this.receivingUpdates = true;

                if(this.showDebugPrints) {
                    console.log('serverOnNodeRemoved: nodeId:' + nodeId);
                }

                var node = this.rootNode.findById(nodeId);
                if(node === undefined)
                {
                    // sync error
                    console.log("Sync Error: can not remove node with id: " + nodeId);
                    return;
                }

                if(node.parent === undefined)
                {
                    // sync error
                    console.log("Sync Error: can not remove node with id: " + nodeId);
                    return;
                }

                node.getParent().removeChild(node);
                this.receivingUpdates = false;
            };

            /**
             * @brief Called when a client makes a clear message request to the server. DocumentConnector stops
             * listening to node events and modifies the tree.
             */
            this.serverClearMessageQueue = function()
            {
                this.receivingUpdates = true;
                console.log('serverClearMessageQueue: cleared!');

                this.rootNode.removeChildren();

                this.receivingUpdates = false;
            };

            /**
             * @brief Called by NodeEventPublisher to inform that a node property update. This event is propagated
             * to the server.
             * @param node
             * @param updateData
             * @param preUpdateData
             */
            this.onNodePropertyUpdate = function(node, updateData, preUpdateData)
            {
                if(this.receivingUpdates === true)
                {
                    // discard update while processing server updates
                    return;
                }

                if(this.isConnected === false)
                {
                    this.messageQueue.push(['onNodePropertyUpdate', node.getId(), JSON.stringify(updateData)]);
                    return;
                }

                this.socket.emit('onNodePropertyUpdate', node.getId(), JSON.stringify(updateData));
            };

            /**
             * @brief Called by NodeEventPublisher to inform that a node is added. This event is propagated to
             * the server.
             * @param node
             * @param childNode
             */
            this.onNodeAdded = function(node, childNode)
            {
                if(this.receivingUpdates === true)
                {
                    // discard update while processing server updates
                    return;
                }

                if(this.isConnected === false)
                {
                    this.messageQueue.push(['onNodeAdded', node.getId(), JSON.stringify(childNode.serialize())]);
                    return;
                }

                this.socket.emit('onNodeAdded', node.getId(), JSON.stringify(childNode.serialize()));
            };

            /**
             * @brief Called by NodeEventPublisher to inform that a node is removed. This event is propagated
             * to the server.
             * @param node
             * @param childNode
             */
            this.onNodeRemoved = function(node, childNode)
            {
                if(this.receivingUpdates === true)
                {
                    // discard update while processing server updates
                    return;
                }

                if(this.isConnected === false)
                {
                    this.messageQueue.push(['onNodeRemoved', childNode.getId(), undefined]);
                    return;
                }

                this.socket.emit('onNodeRemoved', childNode.getId());
            };
        }

        return DocumentConnector;
    });
