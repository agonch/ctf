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
    socket.emit('ack', gameState.defaultSpawnPoint, gameState.defaultBoardSize, gameState.defaultPlayerSize, gameState.getPlayerPositions());

    socket.on('disconnect', function() {
        console.log( socket.name + ' has disconnected from the chat.' + socket.id);
        socket.broadcast.emit('removePlayer', gameState.getPlayerName(socket.id));
        gameState.removePlayer(socket.id);
    });

    socket.on('name', function (name) {
        gameState.addPlayer(socket.id, name);
        console.log("New player: " + name);
        socket.broadcast.emit('newPlayer', name, gameState.getPlayerPosition(socket.id));
    });

    socket.on('updateKeys', function(keysPressed) {
        var [x, y] = gameState.getPlayerPosition(socket.id);
        if (keysPressed['W']) {
            y-=3;
        }
        if (keysPressed['A']) {
            x-=3;
        }
        if (keysPressed['S']) {
            y+=3;
        }
        if (keysPressed['D']) {
            x+=3;
        }
        var pos = [x, y];
        gameState.updatePlayerPosition(socket.id, pos);
        console.log(socket.id);
        console.log(gameState.getPlayerName(socket.id));
        socket.broadcast.emit('updatePosition', gameState.getPlayerName(socket.id), pos);
        socket.emit('updatePosition', gameState.getPlayerName(socket.id), pos);
    });
});
