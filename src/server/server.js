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
const ROOMS = {
    initializing: 'initializing', ready: 'ready' // socket rooms
};

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
    socket.join(ROOMS.initializing);

    socket.emit('ack'); // let client know we ready

    socket.on('disconnect', function() {
        console.log(gameState.getPlayerName(socket.id) + ' has disconnected from the chat.' + socket.id);
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
        socket.leave(ROOMS.initializing);

        console.log("New player: " + name, " This will be Player #", gameState.numPlayersPresent());
        const [nameToPosition, nameToPlayerNumber] = gameState.getAllPlayers();
        const startData = {
            spawnPoint: gameState.getPlayerPosition(socket.id), // initially is default location for new player
            boardSize: gameState.defaultBoardSize,
            playerSize: gameState.defaultPlayerSize,
            playerPositions: nameToPosition,
            playerName: name,
            playerNumbers: nameToPlayerNumber
        };
        console.log("startData ->", JSON.stringify(startData, null, 3));
        // for new player, send game start info
        socket.emit('initialize_approved', startData);
        // for other players, (if any), send them just new player name and position
        socket.broadcast.emit('newPlayer', name, gameState.getPlayerPosition(socket.id), gameState.numPlayersPresent());
        GameLoop();
    });

    socket.on('client_ready', () => {
       socket.join(ROOMS.ready);
    });

    socket.on('updateKeys', function(keysPressed) {
        var [vel_x, vel_y] = gameState.playerVelocity[socket.id];
        var newVelocities = GameLogic.calculateVelocities(vel_x, vel_y, keysPressed);
        gameState.playerVelocity[socket.id] = newVelocities;
    });
});

function GameLoop() {
    setInterval(() => {
        GameLogic.tickPlayerPositions(gameState);

        // get updated values to send to all clients (for this game)
        const [nameToPosition, _] = gameState.getAllPlayers();
        var names = gameState.getPlayerNames();

        io.to(ROOMS.ready).emit('updatePlayerPositions', names, nameToPosition);
    },
        1000 / 40 /* 40 FPS */);
}
