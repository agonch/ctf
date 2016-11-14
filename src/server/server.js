var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
var SingleGameState = require('./SingleGameState.js');


const gameState = new SingleGameState(2);
const socketIdToNames = {};

http.listen(3000, function() {
    console.log('listening on *:3000');
});

app.get('/', function (req, res) {
    console.log('serving');
    res.setHeader("Content-Type", "text/html");
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.use(express.static('../client/'));


io.on('connection', function (socket) {
    console.log("New connection with " + socket.id);
    socket.emit('ack');

    socket.on('disconnect', function() {
        console.log( socket.name + ' has disconnected from the chat.' + socket.id);
        io.emit('removePlayer', socketIdToNames[socket.id]);
        delete socketIdToNames[socket.id];
        gameState.removePlayer(socketIdToNames[socket.id]);
    });

    socket.on('name', function (name) {
        socketIdToNames[socket.id] = name;
        gameState.addPlayer(name);
        console.log("New name: " + name);
        console.log("Names: " + getValues(socketIdToNames));
        socket.emit('gameStateNames', gameState.getPlayerNames());
        socket.broadcast.emit('newPlayer', name);
    });
});

function getValues(o) {
    var values = [];
    for (var key in o) {
        if (o.hasOwnProperty(key)) {
            values.push(o[key]);
        }
    }
    return values;
}