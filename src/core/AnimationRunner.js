define(['src/core/Easing'],
    function (Easing) {
        'use strict';

        /**
         * @class AnimationRunner
         */
        function AnimationRunner() {
            /**
             * @brief Update timeout value
             * @type {number}
             */
            this.updateTimeout = 15;

            /**
             * @brief Last update time
             * @type {Date}
             */
            this.lastUpdateTime = new Date();

            /**
             * @brief Update function
             * @type {undefined}
             */
            this.updateFunction = undefined;

            /**
             * @biref Flag to keep track of update requests
             * @type {boolean}
             */
            this.updateRequested = false;

            /**
             * @brief Current animation list
             * @type {Array}
             */
            this.animationList = [];

            /**
             * @brief Iteratable property list. These are the supported node properties for animation
             * @type {string[]}
             */
            var props = ['top', 'left', 'width', 'height', 'rotation', 'opacity', 'borderOpacity'];

            /**
             * @brief Initializes animation runner
             */
            this.init = function() {
                this.updateFunction = this.update.bind(this);
                this.requestUpdate();
            };

            /**
             * @brief Function for requesting an update
             */
            this.requestUpdate = function()
            {
                if(this.updateRequested)
                {
                    return;
                }

                this.lastUpdateTime = new Date();
                this.updateRequested = true;
                setTimeout(this.updateFunction, this.updateTimeout);
            };

            /**
             * @brief Update start function
             */
            this.update = function() {
                this.updateRequested = false;
                var currentDate = new Date();
                this.updateIteration(currentDate - this.lastUpdateTime);
                this.lastUpdateTime = currentDate;
                if(this.animationList.length > 0)
                {
                    this.requestUpdate();
                }
            };

            /**
             * @brief Iterates an update
             * @param deltaTime
             */
            this.updateIteration = function(deltaTime) {
                for(var i=0; i<this.animationList.length; i++) {
                    var anim = this.animationList[i];
                    anim.progress += deltaTime;

                    this.iterate(anim);

                    if(anim.progress > anim.duration) {
                        if(anim.loop) {
                            if(anim.loopReverse) {
                                anim.progress = -anim.duration;
                            } else {
                                anim.progress = 0;
                            }
                        } else {
                            this.animationList.splice(i, 1);
                        }
                    }
                }
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
                options.progress = 0;
                if(options.easing === undefined) {
                    options.easing = 'linear';
                }

                if(options.duration === undefined) {
                    options.duration = 100;
                }

                this.checkPresetAnimations(options);

                this.animationList.push(options);

                this.requestUpdate();
            };

            /**
             * @brief Finalizes all animations for a specific node
             * @param node
             */
            this.finalizeAnimation = function(node) {
                for(var i=0; i<this.animationList.length; i++) {
                    var anim = this.animationList[i];
                    if(anim.node !== node) {
                        continue;
                    }

                    this.iteratePropsToUniform(anim, 1);

                    this.animationList.splice(i, 1);
                }
            };

            /**
             * @brief Cancels/stops animation for a specific node
             * @param node
             */
            this.cancelAnimation = function(node) {
                for(var i=0; i<this.animationList.length; i++) {
                    var anim = this.animationList[i];
                    if(anim.node !== node) {
                        continue;
                    }

                    this.animationList.splice(i, 1);
                }
            };

            /**
             * @brief Iterate animation for an animation entry
             * @param anim
             */
            this.iterate = function(anim) {
                var t = Math.min(Math.abs(anim.progress/anim.duration), 1.0);
                t = Easing[anim.easing](t);

                this.iteratePropsToUniform(anim, t);
            };

            /**
             * @brief Iterates an animation entry for the given uniform t (0-1)
             * @param anim
             * @param t
             */
            this.iteratePropsToUniform = function(anim, t) {
                var updateData = {};
                for(var i=0; i<props.length; i++) {
                    var prop = props[i];

                    if(anim.from[prop] === undefined) {
                        continue;
                    }

                    updateData[prop] = anim.from[prop]*(1-t) + anim.to[prop]*t;
                }

                anim.node.setProp(updateData);
            };

            /**
             * @brief Checks preset animations and generated 'from' and 'to' values.
             * @param anim
             */
            this.checkPresetAnimations = function(anim) {
                if(anim.animation === undefined) {
                    return;
                }

                switch(anim.animation.name) {
                    case 'grow':
                        var percent = anim.animation.value;
                        anim.from = {width: anim.node.getProp('width'),
                                    height: anim.node.getProp('height'),
                                    top: anim.node.getProp('top'),
                                    left: anim.node.getProp('left')};

                        anim.to = {width: anim.node.getProp('width')*(1+(percent/100)),
                                height: anim.node.getProp('height')*(1+(percent/100)),
                                top: anim.node.getProp('top') - (anim.node.getProp('width')*percent/200),
                                left: anim.node.getProp('left') - (anim.node.getProp('height')*percent/200)};
                        break;
                    case 'rotate':
                        var degree = anim.animation.value;
                        if(anim.node.getProp('rotation') === undefined) {
                            anim.node.setProp({'rotation': 0});
                        }
                        anim.from = {rotation: anim.node.getProp('rotation')};
                        anim.to = {rotation: anim.node.getProp('rotation') + degree};
                        break;
                    case 'fadein':
                        anim.node.setProp({'opacity': 0});
                        anim.from = {opacity: 0};
                        anim.to = {opacity: 1};
                        break;
                    default:
                        break;


                }
            };
        }

        return AnimationRunner;
    });
