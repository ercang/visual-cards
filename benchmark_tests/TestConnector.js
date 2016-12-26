define(['socketio',
        'src/core/Node'],
    function (io) {
        'use strict';

        /**
         * @class TestConnector
         */
        function TestConnector(testName) {

            /**
             * @brief socket.io connection
             * @type {undefined}
             */
            this.socket = undefined;

            /**
             * @brief request animation frame function with fallback support
             */
            window.requestAnimFrame = (function(){
                return  window.requestAnimationFrame   ||
                    window.webkitRequestAnimationFrame ||
                    window.mozRequestAnimationFrame    ||
                    function(callback){
                        window.setTimeout(callback, 1000 / 60);
                    };
            })();

            this.testStarted = false;
            this.frameCounter = 0;
            this.lastFrameTime = new Date();
            this.runningTestName = '';
            this.startTime = new Date();
            this.totalFrameCount = 0;

            /**
             * @brief Initializes connector
             */
            this.init = function()
            {
                this.socket = io();
                this.socket.on('connect', function() {
                    console.log('Connected to server!');
                    this.socket.emit('clearMessageQueue');
                    this.socket.emit('log', 'New Test Started: ' + testName);
                    this.socket.emit('log', 'Agent: ' + navigator.userAgent);
                }.bind(this));
                this.socket.on('disconnect', function() {
                    console.log('Disconnected to server!');
                }.bind(this));

                window.requestAnimFrame(this.frameCallback.bind(this));
            };

            this.log = function(str)
            {
                this.socket.emit('log', str);
            };

            this.frameCallback = function()
            {
                if(this.testStarted === true)
                {
                    this.totalFrameCount++;
                    this.frameCounter++;
                    if((new Date()) - this.lastFrameTime > 1000)
                    {
                        this.lastFrameTime = new Date();
                        this.frameCounter = 0;
                    }
                }

                window.requestAnimFrame(this.frameCallback.bind(this));
            };

            this.startTest = function(str)
            {
                this.totalFrameCount = 0;
                this.testStarted = true;
                this.frameCounter = 0;
                this.lastFrameTime = new Date();
                //this.frameResults = [];
                this.runningTestName = str;
                this.startTime = new Date();
            };

            this.endTest = function()
            {
                this.testStarted = false;
                this.frameCounter = 0;
                var runTime = ((new Date()) - this.startTime)/1000;
                var avgRate = this.totalFrameCount/runTime;
                var result = 'Test Result [' + this.runningTestName + '], FrameRate: ' + avgRate + ', RunTime: ' + runTime + ' secs.';
                this.log(result);

                return avgRate;
            };
        }

        return TestConnector;
    });
