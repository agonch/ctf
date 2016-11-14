var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
var SingleGameState = require('./SingleGameState.js');


const gameState = new SingleGameState(2);

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
        io.emit('removePlayer', gameState.getPlayerName(socket.id));
        gameState.removePlayer(socket.id);
    });

    socket.on('name', function (name) {
        gameState.addPlayer(socket.id, name);
        console.log("New name: " + name);
        console.log("Names: " + gameState.getPlayerNames());
        socket.emit('gameStateNames', gameState.getPlayerNames());
        socket.broadcast.emit('newPlayer', name);
    });

    socket.on('updateKeys', function(keysPressed) {
        var [x, y] = gameState.getPlayerPosition(socket.id);
        if (keysPressed['W']) {
            y--;
        }
        if (keysPressed['A']) {
            x--;
        }
        if (keysPressed['S']) {
            y++;
        }
        if (keysPressed['D']) {
            x++;
        }
        var pos = [x, y];
        gameState.updatePlayerPosition(socket.id, pos);
        socket.emit('updatePosition', pos);
    });
});
