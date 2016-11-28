var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');
var GameState = require('./gameState.js');
const GameLogic = require('./gameLogic.js');
const LobbyManager = require('./lobbyManager.js');

const lobbyManager = new LobbyManager();

const TickRate = 40;            // 40 ticks per second (virtual FPS)
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
        console.log('new player ', name);

        const [namesToPositions, namesToTeam] = gameState.getAllPlayers();
        const startData = {
            tickRate: TickRate,
            spawnPoint: gameState.getPlayerPosition(socket.id), // initially is default location for new player
            boardSize: gameState.boardSize,
            gridSize: gameState.gameBlockSize,
            playerPositions: namesToPositions,
            playerName: name,
            namesToTeams: namesToTeam,
            objectPositions: gameState.getAllObjects(),
            turretStates: gameState.turretStates,
            bulletStates: gameState.bulletStates,
            validObjectTypes: gameState.getValidObjectTypes()  // Tell the player what objects they can build
        };
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

    // Client requests to calibrate its local clock with ours
    socket.on('calibrate:start', function(clientTime) {
        // Get total offset between client's local clock and the server's clock
        // Total offset includes both latency and the difference between clocks
        var serverTime = Date.now();
        var totalOffset = serverTime - clientTime;

        // Continue the calibration response
        socket.emit('calibrate:respond', serverTime, totalOffset);
    });

    socket.on('updateKeys', function(keysPressed) {
        var [gameState, gameId] = lobbyManager.getGameState(socket.id);
        var [vel_x, vel_y] = gameState.playerVelocity[socket.id];
        var newVelocities = GameLogic.calculateVelocities(vel_x, vel_y, keysPressed);
        gameState.playerVelocity[socket.id] = newVelocities;
    });

    socket.on('selectObjectLocation', (objectType, location, action) => {
        var [gameState, gameId] = lobbyManager.getGameState(socket.id);
        location = [location.x, location.y];
        var vetoCount;
        var team;

        if (action === 'select') {
            var stateChanged = gameState.addObject(objectType, location, socket.id);
            if (!stateChanged) {
                return;
            }

            vetoCount = gameState.selectedObjects[location].vetoCount;
            team = gameState.getPlayerTeam(socket.id);
        } else if (action === 'veto') {
            if (location in gameState.selectedObjects) {
                var gotDeleted = gameState.incrementVetoCount(location, socket.id);
                if (gotDeleted) {
                    vetoCount = -1;
                } else {
                    vetoCount = gameState.selectedObjects[location].vetoCount;
                    team = gameState.getPlayerTeam(socket.id);
                }
            } else {
                return; // user touching object of different team
            }
        }

        console.log('gameState.selectedObjects = ', gameState.selectedObjects);

        var attributes = {
            x: location[0],
            y: location[1],
            objectType: objectType,
            vetoCount: vetoCount,
            team: team,
            deleted: vetoCount === -1
        };

        // Add in an additional sub-object of optional attributes
        //  if the object still exists and contains a details object
        if (gameState.selectedObjects[location] && gameState.selectedObjects[location].details) {
            attributes.details = gameState.selectedObjects[location].details;
        }

        io.to(gameId).emit('updateObjects', attributes);
    });
});


function GameLoop() {
    var tick = 0;

    GameLoopInterval = setInterval(() => {
        tick = (tick + 1) % TickRate;
        for(var i = 0; i < lobbyManager.games.length; i++)
        {
            var gameId = i.toString();
            var gameState = lobbyManager.games[i];

            /**
             * Get updated values to send to all clients (for this game):
             */
            // Update player positions
            GameLogic.tickPlayerPositions(gameState);
            const [nameToPosition, _] = gameState.getAllPlayers();
            var names = gameState.getPlayerNames();
            io.to(gameId).emit('updatePlayerPositions', names, nameToPosition);

            // Update turret states
            // Accuracy of our timing tends to degrade noticeably past about a second,
            //  due to unprecise timing on both server/client so resync all states every second
            var updatedTurretStates = GameLogic.tickTurrets(gameState);
            if (tick !== 0) {
                if (Object.keys(updatedTurretStates).length) {
                    // Send 'updateTurrets' event only if a state has been updated
                    io.to(gameId).emit('updateTurrets', updatedTurretStates);
                }
            } else {
                // Resync states completely
                io.to(gameId).emit('updateTurrets', gameState.turretStates);
            }

            // Update bullet states
            var updatedBullets = GameLogic.tickBullets(gameState);
            if (Object.keys(updatedBullets).length) {
                // Send clients updates only if bullets are created/destroyed
                io.to(gameId).emit('updateBullets', updatedBullets);
            }
        }
    },
        1000 / TickRate /* TickRate of 40 FPS */);
}

