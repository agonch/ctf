var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
var GameState = require('./gameState.js');
const GameLogic = require('./gameLogic.js');
const LobbyManager = require('./lobbyManager.js');

const lobbyManager = new LobbyManager();

var GameLoopInterval = null;

http.listen(3000, function() {
    console.log('listening on :3000');
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
        var [gameState, gameId] = lobbyManager.getGameState(socket.id);
        console.log(gameState.getPlayerName(socket.id) + ' has disconnected from the chat.' + socket.id);
        io.to(gameId).emit('removePlayer', gameState.getPlayerName(socket.id));
        lobbyManager.deletePlayer(socket.id);
    });

    socket.on('new_game_input', function (newInputData) {
        const name = newInputData.name;

        if (lobbyManager.nameAlreadyExists(name)) {
            socket.emit('initialize_denied', newInputData, 'duplicate name');
            return;
        }
        var [gameState, gameId] = lobbyManager.addPlayer(socket.id, name);
        console.log("New player: " + name, " This will be Player #", gameState.numPlayersPresent());
        const [namesToPositions, namesToTeam] = gameState.getAllPlayers();
        const startData = {
            spawnPoint: gameState.getPlayerPosition(socket.id), // initially is default location for new player
            boardSize: gameState.boardSize,
            gridSize: gameState.gameBlockSize,
            playerPositions: namesToPositions,
            playerName: name,
            namesToTeams: namesToTeam
        };
        console.log("startData ->", JSON.stringify(startData, null, 3));
        // for new player, send game start info
        socket.emit('initialize_approved', startData);

        // for other players, (if any), send them just new player name and position
        io.to(gameId).emit('newPlayer', name, gameState.getPlayerPosition(socket.id), namesToTeam[name]);
    });

    socket.on('client_ready', () => {
        var [gameState, gameId] = lobbyManager.getGameState(socket.id);
        socket.join(gameId);
        if (GameLoopInterval === null)
            GameLoop();
    });

    socket.on('updateKeys', function(keysPressed) {
        var [gameState, gameId] = lobbyManager.getGameState(socket.id);
        var [vel_x, vel_y] = gameState.playerVelocity[socket.id];
        var newVelocities = GameLogic.calculateVelocities(vel_x, vel_y, keysPressed);
        gameState.playerVelocity[socket.id] = newVelocities;
    });

    socket.on('selectWallLocation', wallLocations => {
        console.log(wallLocations);
        
    });
});


function GameLoop() {
    GameLoopInterval = setInterval(() => {
        for(var i = 0; i < lobbyManager.games.length; i++)
        {
            var gameState = lobbyManager.games[i];
            GameLogic.tickPlayerPositions(gameState);

            // get updated values to send to all clients (for this game)
            const [nameToPosition, _] = gameState.getAllPlayers();
            var names = gameState.getPlayerNames();
            io.to(i.toString()).emit('updatePlayerPositions', names, nameToPosition);
        }
    },
        1000 / 40 /* 40 FPS */);
}

