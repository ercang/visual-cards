define(['src/core/Node',
        'src/core/NodeEventPublisher',
        'src/core/DocumentConnector',
        'src/renderer/RenderScheduler',
        'src/renderer/DOMAdapter'],
    function (Node,
              NodeEventPublisher,
              DocumentConnector,
              RenderScheduler,
              DOMAdapter) {
        'use strict';

        /**
         * @class DocumentContainer
         */
        function DocumentContainer(options) {

            /**
             * @brief DocumentContainer options
             */
            this.options = options;

            /**
             * NodeEventPublisher
             * @private
             */
            this.nodeEventPublisher = undefined;

            /**
             * @brief RootNode
             * @private
             */
            this.rootNode = undefined;

            /**
             * @brief DocumentConnector instance
             * @type {undefined}
             */
            this.documentConnector = undefined;

            this.rendererType = '';

            /**
             * @brief initializes document container and connects to the server if requested.
             */
            this.init = function()
            {
                this.nodeEventPublisher = new NodeEventPublisher();
                this.rootNode = this.createRootNode();

                if(this.options.connectToServer === true)
                {
                    this.documentConnector = new DocumentConnector(this.rootNode, this.options.serverAppId, this.options.clearServerQueue);
                    this.documentConnector.init();
                    this.nodeEventPublisher.addListener(this.documentConnector);
                }

                if(this.options.renderer === 'dom')
                {
                    var domAdapter = new DOMAdapter(this.rootNode, this.options.container, this.options.width, this.options.height);
                    domAdapter.init();
                    this.nodeEventPublisher.addListener(domAdapter);
                    this.rendererType = 'dom';
                }
                else
                {
                    var renderScheduler = new RenderScheduler(this.rootNode, this.options.renderer, this.options.container,
                                                              this.options.width, this.options.height);
                    renderScheduler.init();
                    this.nodeEventPublisher.addListener(renderScheduler);
                    this.rendererType = renderScheduler.getRendererType();
                }
            };

            this.getRendererType = function()
            {
                return this.rendererType;
            };

            /**
             * @brief Creates an empty node
             * @returns {*}
             */
            this.createNode = function()
            {
                return new Node();
            };

            /**
             * @brief Creates root node. This is called internally to create root node only once.
             * @returns {*}
             * @private
             */
            this.createRootNode = function()
            {
                var node = new Node(this.nodeEventPublisher);
                return node;
            };

            /**
             * @brief Returns root node of this document
             * @returns {undefined|*}
             */
            this.getRootNode = function()
            {
                return this.rootNode;
            };

            /**
             * @brief Returns the event publisher of document tree
             */
            this.getEventPublisher = function()
            {
                return this.nodeEventPublisher;
            };

            /**
             * @brief Returns document connector
             * @returns {undefined}
             */
            this.getDocumentConnector = function()
            {
                return this.documentConnector;
            };

        }


        return DocumentContainer;
    });
