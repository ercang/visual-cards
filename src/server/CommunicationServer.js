/*
 * CommuncationServer.js
 * This file implements a simple server to synchronize application trees between browsers.
 *
 * WorkFlow
 * =========
 * An application tries to connect to the server.
 * Application sends events about nodeAdded/nodeRemoved/propertyUpdated.
 * Server propagates these events to the other clients.
 * Also server stores these messages. If a client tries to connect, server sends these stored messages to the client in order to sync tree.
 */
var express = require('express');
var app = express();

var server_port = 8080;

var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');

app.use(express.static(__dirname + "/../../"));

var applicationMessageQueue = [];

io.on('connection', function(socket){
    var address = socket.handshake.address;
    console.log('Client is connected. | ' + address);

    socket.on('disconnect', function(){
        console.log('Client disconnected. | ' + address);
    });

    socket.on('applicationId', function(appId){
        console.log('applicationId is set to ' + appId);
    });

    socket.on('clearMessageQueue', function(){
        console.log('Clear server message queue!');
        applicationMessageQueue = [];
        socket.broadcast.emit('clearMessageQueue');
    });

    socket.on('getMessageQueue', function(appId){
        // client is newly connected! So push all messages in the queue
        for(var i=0; i<applicationMessageQueue.length; i++)
        {
            var msg = applicationMessageQueue[i];
            socket.emit(msg[0], msg[1], msg[2]);
        }
    });

    socket.on('onNodePropertyUpdate', function(id, updateDataString){
        console.log('onNodePropertyUpdate: Node[' + id + '] updateData: ' + updateDataString);
        socket.broadcast.emit('onNodePropertyUpdate', id, updateDataString);

        // add to queue
        applicationMessageQueue.push(['onNodePropertyUpdate', id, updateDataString]);
    });

    socket.on('onNodeAdded', function(parentId, childNode){
        console.log('onNodeAdded: ParentNode[' + parentId + '] childNode: ' + childNode);
        socket.broadcast.emit('onNodeAdded', parentId, childNode);

        // add to queue
        applicationMessageQueue.push(['onNodeAdded', parentId, childNode]);
    });

    socket.on('onNodeRemoved', function(nodeId){
        console.log('onNodeRemoved: RemovedNode[' + nodeId + ']');
        socket.broadcast.emit('onNodeRemoved', nodeId);

        // add to queue
        applicationMessageQueue.push(['onNodeRemoved', nodeId, undefined]);
    });

    socket.on('log', function(str){
        console.log(str);
        var logStream = fs.createWriteStream('platform_test_log.txt', {'flags': 'a'});
        logStream.end(str + '\r\n');
    });
});

http.listen(server_port, function(){
    console.log("CommunicationServer is running on: http://localhost:" + server_port);
});