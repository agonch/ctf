var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
var GameState = require('./gameState.js');
const GameLogic = require('./gameLogic.js');
const LobbyManager = require('./lobbyManager.js');


const gameState = new GameState();
const lobbyManager = new LobbyManager();

http.listen(3000, function() {
    console.log('listening on *:3000');
});

app.get('/', function (req, res) {
    console.log('serving');
    res.setHeader("Content-Type", "text/html");
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.use(express.static('../client/'));

/* (1) Upon connection, let client know we ready with ('ack'). They will then enter in their name, wall locations,
 *          turret locations, etc..
 * (2) Client sends over its user input data with ('new_game_input')
 * (3) If server approves, emit ('initialize_approved'), so client can then initialize their game
 * (4) If server denies the input, (duplicate name, illegal wall placement, etc..), emit ('initialize_denied')
 */
io.on('connection', function (socket) {
    console.log("New connection with " + socket.id);
    socket.emit('ack'); // let client know we ready

    socket.on('disconnect', function() {
        console.log( socket.name + ' has disconnected from the chat.' + socket.id);
        socket.broadcast.emit('removePlayer', gameState.getPlayerName(socket.id));
        lobbyManager.deleteName(gameState.getPlayerName(socket.id));
        gameState.removePlayer(socket.id);
    });

    socket.on('new_game_input', function (newInputData) {
        const name = newInputData.name;

        if (lobbyManager.nameAlreadyExists(name)) {
            socket.emit('initialize_denied', newInputData, 'duplicate name');
            return;
        }
        lobbyManager.addName(name);
        gameState.addPlayer(socket.id, name);

        console.log("New player: " + name, " This will be Player #", gameState.numPlayersPresent());
        const [nameToPos, nameToPlayerNum] = gameState.getAllPlayers();
        const startData = {
            spawnPoint: gameState.getPlayerPosition(socket.id), // initially is default location for new player
            boardSize: gameState.defaultBoardSize,
            playerSize: gameState.defaultPlayerSize,
            playerPositions: nameToPos,
            playerName: name,
            playerNumbers: nameToPlayerNum
        };
        console.log("startData ->", JSON.stringify(startData, null, 3));
        // for new player, send game start info
        socket.emit('initialize_approved', startData);
        // for other players, (if any), send them just new player name and position
        socket.broadcast.emit('newPlayer', name, gameState.getPlayerPosition(socket.id), gameState.numPlayersPresent());
    });

    socket.on('updateKeys', function(keysPressed) {
        var [x, y] = gameState.getPlayerPosition(socket.id);

        var [new_x, new_y] = GameLogic.calculateNewPosition(x, y, keysPressed);
        
        gameState.updatePlayerPosition(socket.id, [new_x, new_y]);
        console.log('updated position ->', socket.id, gameState.getPlayerName(socket.id), [new_x, new_y]);

        // send to all clients this players new position
        io.sockets.emit('updatePosition', gameState.getPlayerName(socket.id), [new_x, new_y], gameState.playerNums[socket.id]);
    });
});
