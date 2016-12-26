define(['src/core/DocumentContainer',
        'src/core/AnimationRunner'],
    function (DocumentContainer,
              AnimationRunner) {
        'use strict';

        /**
         * @class VisualCards
         */
        function VisualCards(options) {

            /**
             * @brief Options parameter is used for configuration.
             * An example of options data
             * {
             *     'container': document.getElementById('rendererContainer'),
             *     'renderer': 'canvas', // 'dom', 'webgl'
             *     'connectToServer': false,
             *     'clearServerQueue': false,
             *     'serverAppId': 'testApplication1',
             *
             * };
             */
            this.options = options;

            /**
             * @brief DocumentContainer
             * @type {undefined}
             */
            this.documentContainer = undefined;

            /**
             * @brief AnimationRunner
             * @type {undefined}
             */
            this.animationRunner = undefined;

            /**
             * @brief Initalizes visual cards js
             * @returns {boolean}
             */
            this.init = function()
            {
                if(this.options.container === undefined)
                {
                    console.log("Error: Container can not be undefined!");
                    return false;
                }

                this.documentContainer = new DocumentContainer({
                    connectToServer: this.options.connectToServer === undefined ? false : this.options.connectToServer,
                    clearServerQueue: this.options.clearServerQueue === undefined ? false : this.options.clearServerQueue,
                    serverAppId: this.options.serverAppId === undefined ? 'DefaultApplicationID' : this.options.serverAppId,
                    renderer: this.options.renderer === undefined ? 'canvas' : this.options.renderer,
                    container: this.options.container,
                    width: this.options.width === undefined ? 1920 : this.options.width,
                    height: this.options.height === undefined ? 1080 : this.options.height});
                this.documentContainer.init();

                this.animationRunner = new AnimationRunner();
                this.animationRunner.init();

                return true;
            };

            /**
             * @brief API function for starting an animation for a specific node element
             * Example animation options
             {node: firstItem,
              from: {width: 235,
                     height: 235,
                     top: firstItem.layout.top,
                     left: firstItem.layout.left,
                     opacity: 0},
              to: {width: 315,
                     height: 315,
                     top: firstItem.layout.top - 40,
                     left: firstItem.layout.left - 40,
                     opacity: 1},
              easing: 'easeOutCubic',
              animation: {name: 'grow',
                          value: 10},
              loop: true,
              loopReverse: true,
              duration: 1000}
             * @param options
             */
            this.animate = function(options) {
                return this.animationRunner.animate(options);
            };

            /**
             * @brief Finalizes all animations for a specific node
             * @param node
             */
            this.finalizeAnimation = function(node) {
                this.animationRunner.finalizeAnimation(node);
            };

            /**
             * @brief Cancels/stops animation for a specific node
             * @param node
             */
            this.cancelAnimation = function(node) {
                this.animationRunner.cancelAnimation(node);
            };

            /**
             * @brief Returns root node of the document
             */
            this.getRootNode = function() {
                return this.documentContainer.getRootNode();
            };

            /**
             * @brief Creates an empty node
             */
            this.createNode = function() {
                return this.documentContainer.createNode();
            };

            /**
             * @brief Returns document container object
             * @returns {undefined}
             */
            this.getDocumentContainer = function()
            {
                return this.documentContainer;
            };
        }

        return VisualCards;
    });
