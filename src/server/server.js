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
const TickRateAveragingFactor = 0.1; // How quickly to correct AverageTickRate (1 = immediately) per TickRate # of ticks
const TickRateAveragingCycle = 10;   // How many ticks to wait before average (too few and we can't measure precisely)
var AverageTickRate = TickRate; // True tick rate (setInterval cannot guarantee exactly the desired tick rate)
var TrueTickTime = 0;

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
        var result = lobbyManager.getGameState(socket.id);
        if (result !== undefined) {
            var [gameState, gameId] = result;
            var team = gameState.getPlayerTeam(socket.id);
            console.log(gameState.getPlayerName(socket.id) + ' has disconnected from the chat.' + socket.id);
            io.to(gameId + team).emit('removePlayer', gameState.getPlayerName(socket.id));
            lobbyManager.deletePlayer(socket.id);
        }
    });

    socket.on('new_game_input', function (newInputData) {
        const name = newInputData.name;

        if (lobbyManager.nameAlreadyExists(name)) {
            socket.emit('initialize_denied', newInputData, 'duplicate name');
            return;
        }
        var [gameState, gameId] = lobbyManager.addPlayer(socket.id, name);

        // Add the flags and flagbases
        lobbyManager.addFlags();
        lobbyManager.addFlagBases();

        console.log('new player ', name);

        const [namesToPositions, namesToTeam] = gameState.getAllTeamPlayers(socket.id);

        var resultTurretStates = {};
        for (var turretId in gameState.turretStates) {
            var curTurret = gameState.turretStates[turretId];
            if (curTurret.team === namesToTeam[name]) {
                resultTurretStates[turretId] = curTurret;
            }
        }

        var resultBulletStates = {};
        for (var bulletId in gameState.bulletStates) {
            var curBullet = gameState.bulletStates[turretId];
            if (curBullet.team === namesToTeam[name]) {
                resultBulletStates[bulletId] = curBullet;
            }
        }

        const startData = {
            spawnPoint: gameState.getPlayerPosition(socket.id), // initially is default location for new player
            boardSize: gameState.boardSize,
            gridSize: gameState.gameBlockSize,
            playerPositions: namesToPositions,
            playerName: name,
            namesToTeams: namesToTeam,
            objectPositions: gameState.getAllObjects(socket.id),
            turretStates: resultTurretStates,
            bulletStates: resultBulletStates,
            validObjectTypes: gameState.getValidObjectTypes(),  // Tell the player what objects they can build
            maxWallHealth: gameState.maxWallHealth,
            maxPlayerHealth: gameState.maxPlayerHealth,
            teamRightFlagBasePosition: gameState.getFlagBasePositions()['TeamRight'],
            teamLeftFlagBasePosition: gameState.getFlagBasePositions()['TeamLeft'],
            buildCountdown: gameState.buildCountdown
        };
        // for new player, send game start info
        socket.emit('initialize_approved', startData);

        // for other players, (if any), send them just new player name and position
        var team = namesToTeam[name];
        io.to(gameId + team).emit('newPlayer', name, gameState.getPlayerPosition(socket.id), namesToTeam[name]);
    });

    socket.on('client_ready', () => {
        var result = lobbyManager.getGameState(socket.id);
        if (result !== undefined) {
            var [gameState, gameId] = result;
            var team;
            if (gameState.teamToPlayers['TeamLeft'].has(socket.id)) {
                team = 'TeamLeft';
            } else {
                team = 'TeamRight'
            }

            socket.join(gameId + team);
            if (GameLoopInterval === null)
                GameLoop();
        }
    });

    // Client requests to calibrate its local clock with ours
    socket.on('calibrate:start', function(clientTime) {
        // Get total offset between client's local clock and the server's clock
        // Total offset includes both latency and the difference between clocks
        var serverTime = Date.now();
        var totalOffset = serverTime - clientTime;

        // Continue the calibration response
        socket.emit('calibrate:respond', serverTime, totalOffset, AverageTickRate);
    });

    socket.on('updateKeys', function(keysPressed) {
        var result = lobbyManager.getGameState(socket.id);
        if (result !== undefined) {
            var [gameState, gameId] = result;
            gameState.pressed[socket.id] = keysPressed;
        }
    });

    /* During "build" phase, this event is fired when a user places some object on the board.
     * Ex., left-clicks to place a wall. Or, right-clicks to veto a wall placement.
     */
    socket.on('selectObjectLocation', (objectType, location, action) => {
        var result = lobbyManager.getGameState(socket.id);
        if (result !== undefined) {
            var [gameState, gameId] = result;
            location = [location.x, location.y];
            var vetoCount;

            if (action === 'select') {
                var stateChanged = gameState.addObject(objectType, location, socket.id);
                if (!stateChanged) {
                    return;
                }

                vetoCount = gameState.selectedObjects[location].vetoCount;
            } else if (action === 'veto') {
                if (location in gameState.selectedObjects) {
                    var gotDeleted = gameState.incrementVetoCount(location, socket.id);
                    if (gotDeleted) {
                        vetoCount = -1;
                    } else {
                        vetoCount = gameState.selectedObjects[location].vetoCount;
                    }
                } else {
                    return; // user touching object of different team
                }
            }

            // console.log('gameState.selectedObjects = ', JSON.stringify(gameState.selectedObjects, null, 4));

            var attributes = {
                x: location[0],
                y: location[1],
                objectType: objectType,
                vetoCount: vetoCount,
                team: gameState.getPlayerTeam(socket.id),
                deleted: vetoCount === -1
            };

            // Add in an additional sub-object of optional attributes
            //  if the object still exists and contains a details object
            if (gameState.selectedObjects[location] && gameState.selectedObjects[location].details) {
                attributes.details = gameState.selectedObjects[location].details;
            }
            // broadcast selected object to its team
            io.to(gameId + attributes.team).emit('updateObjects', attributes);

            if (attributes.objectType === 'turret') {
                var leftTurretStates = {};
                var rightTurretStates = {};
                for (var turretId in gameState.turretStates) {
                    var curTurret = gameState.turretStates[turretId];
                    if (curTurret.team === 'TeamLeft') {
                        leftTurretStates[turretId] = curTurret;
                    } else {
                        rightTurretStates[turretId] = curTurret;
                    }
                }
                io.to(gameId + 'TeamLeft').emit('updateTurrets', leftTurretStates);
                io.to(gameId + 'TeamRight').emit('updateTurrets', rightTurretStates);
            }
        }
    });
});


function GameLoop() {
    var tick = 0;

    GameLoopInterval = setInterval(() => {
        tick = (tick + 1) % TickRate;

        updateAverageTickRate(tick);

        for(var i = 0; i < lobbyManager.games.length; i++) {
            var gameId = i.toString();
            var gameState = lobbyManager.games[i];
            if (gameState === undefined) {
                console.log("LOG: gameState undefined, probably because someone left tab open during server restart");
                continue;
            }

            GameLogic.tickPlayerPositions(gameState);

            if (gameState.buildPhase) {
                /* During build phase, we do not care about collision detection. Also, we only emit player
                 * positions to "their" team.
                 */
                const [namesToPositionsLeft, namesToTeamLeft] = gameState.getAllTeamPlayers(null, 'TeamLeft');
                const [namesToPositionsRight, namesToTeamRight] = gameState.getAllTeamPlayers(null, 'TeamRight');
                io.to(gameId + 'TeamLeft').emit('updatePlayerPositions', Object.keys(namesToPositionsLeft), namesToPositionsLeft);
                io.to(gameId + 'TeamRight').emit('updatePlayerPositions', Object.keys(namesToPositionsRight), namesToPositionsRight);

                continue; // the rest is only relevant outside of build mode
            }

            GameLogic.tickFlagPositions(gameState);
            GameLogic.tickScores(gameState);

            if (!gameState.buildPhase && !gameState.started) {
                const [namesToPositions, namesToTeam] = gameState.getAllPlayers();
                io.to(gameId + 'TeamLeft').emit('startGame', gameState.gameCountdown, gameState.getAllObjects(), gameState.turretStates, namesToTeam);
                io.to(gameId + 'TeamRight').emit('startGame', gameState.gameCountdown, gameState.getAllObjects(), gameState.turretStates, namesToTeam);
                gameState.started = true;
                gameState.respawnAll();
            }

            if (!gameState.buildPhase && gameState.started) {
                // Update turret states
                // Accuracy of our timing tends to degrade noticeably past about a second,
                //  due to unprecise timing on both server/client so resync all states every second
                var updatedTurretStates = GameLogic.tickTurrets(gameState);
                if (tick !== 0) {
                    if (Object.keys(updatedTurretStates).length) {
                        // Send 'updateTurrets' event only if a state has been updated
                        broadcastToGame(gameId, 'updateTurrets', updatedTurretStates);
                    }
                } else {
                    // Resync states completely
                    broadcastToGame(gameId, 'updateTurrets', gameState.turretStates);
                }

                /* Note, we first 'tick' objects and update their positions, then we do collision
                 * detection. For those objects that collided, we correct their position. */
                var [wallsToRemove, bulletsToRemove, healthUpdates] = gameState.Grid.update();
                wallsToRemove.forEach(wall => {
                    broadcastToGame(gameId, 'updateObjects', wall);
                });
                if (Object.keys(bulletsToRemove).length) {
                    broadcastToGame(gameId, 'updateBullets', bulletsToRemove);
                }

                // Update bullet states
                var updatedBullets = GameLogic.tickBullets(gameState);
                if (Object.keys(updatedBullets).length) {
                    // Send clients updates only if bullets are created/destroyed
                    broadcastToGame(gameId, 'updateBullets', updatedBullets);
                }

                if (Object.keys(healthUpdates.players).length) {
                    broadcastToGame(gameId, 'updateHealths', 'players', healthUpdates.players);
                }
                if (Object.keys(healthUpdates.walls).length) {
                    broadcastToGame(gameId, 'updateHealths', 'walls', healthUpdates.walls);
                }

                // broadcast all player positions to both teams
                var [namesToPositions, namesToTeam] = gameState.getAllPlayers();
                var namesList = Object.keys(namesToPositions);
                broadcastToGame(gameId, 'updatePlayerPositions', namesList, namesToPositions);

                broadcastToGame(gameId, 'updateFlagPositions', gameState.getFlagPositions());
                broadcastToGame(gameId, 'updateScores', gameState.getScores());
            }
        }
    },
        1000 / TickRate /* TickRate of 40 FPS */);
}

/* Emits to both teams of game the event and listed parameters */
function broadcastToGame(gameId, event, ...args) {
    io.to(gameId + 'TeamLeft').emit(event, ...args);
    io.to(gameId + 'TeamRight').emit(event, ...args);
}

// Update average tick rate given tickIndex [0, TickRate)
function updateAverageTickRate(tickIndex) {
    // Update average tick rate continuously
    if ((tickIndex % TickRateAveragingCycle) === 0) {
        if (TrueTickTime !== 0) {
            // AverageTickCycle ticks should have been processed in TickRateAveragingCycle * 1000/TickRate ms,
            // but get the true time it took:
            var currentTime = Date.now();
            var trueProcessingTime = currentTime - TrueTickTime;
            var newestMeasurement = (TickRateAveragingCycle / trueProcessingTime) * 1000;

            // Update average tick rate measurement
            if (newestMeasurement > 0 && newestMeasurement <= TickRateAveragingCycle*1000/TickRate) {
                // keep averaging rate maximum over 1 cycle of TICK_RATE ticks
                var alpha = Math.min(1, TickRateAveragingFactor / (TickRate / TickRateAveragingCycle));

                AverageTickRate = (1 - alpha) * AverageTickRate + alpha * newestMeasurement;
            }

            TrueTickTime = currentTime;
        } else {
            TrueTickTime = Date.now();
        }
    }
}