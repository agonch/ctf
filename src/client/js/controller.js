/**
 * Created by agonch on 11/13/16.
 */

/*
 * This is the controller on the client side.
 * This will listen to server broadcasts and messages, and send updates to the server.
 * This will use some UI API to call the associated view methods (to update a view).
 *
 * No UI logic, no game logic ... just communication with server.
 */
(function () {
    const GAME_VIEW = new GameView();

    window.onresize = function (event) {
        if (GAME_VIEW.initialized) {
            GAME_VIEW.draw();
        }
    };

    console.log("Connecting!");
    const socket = io();
    /* (1) Server connected to me (hit 'ack'), get user input (name, walls, flag location, etc.)
     * (2) Send over to server ('new_game_input')
     * (3) If server approves, we hit ('initialize_approved'), and we can initialize their game
     * (4) If server denies our input (duplicate name, illegal wall placement, etc..)
     *        we hit event ('initialize_denied')
     */

    window.onload = function() {
        $('#gameArea').hide();
        $('#startMenu').hide();

        socket.on('ack', function() {
            // Server is connected to us. Show the start menu and let user enter name.
            console.log("Got ack!");
            $('#startMenu').show();
            $('#startButton').click(function(e) {
                var name = $('#nameInput').val();
                console.log("name = ", name);
                const newInputData = {
                    name: name
                };
                socket.emit('new_game_input', newInputData);
            });
        });

        setupSocket(socket);
    };

    function setupSocket(socket) {

        socket.on('newPlayer', function (name, pos, team) {
            console.log("Called: " + name);
            if (GAME_VIEW.playerName !== name) {
                console.log("Player joined: " + name + " this is player on team ", team);
                GAME_VIEW.setPlayerTeam(name, team);
                console.log("POSITION: " + pos);
                GAME_VIEW.setPlayerLocation(name, pos);
            }
        });

        socket.on('removePlayer', function (name) {
            if (GAME_VIEW.playerName !== name) {
                console.log("Player disconnected: " + name);
                GAME_VIEW.removePlayer(name);
            }
        });

        socket.on('initialize_approved', function (startData) {
            $('#startMenu').hide();
            $('#gameArea').show();
            setupKeyListeners(socket);
            setupMouseObjectListener(socket);
            console.log('initializing Canvas with --> ', JSON.stringify(startData, null, 4));
            GAME_VIEW.initializeCanvas(startData);
            
            // Request to calibrate clocks with the server right off the bat
            // And repeat regularly to make sure there are no irregular changes (in clocks, latency, or effective tickrate)
            socket.emit('calibrate:start', Date.now());
            setInterval(function() {
                socket.emit('calibrate:start', Date.now());
            }, 250);

            socket.emit('client_ready');
        });

        socket.on('initialize_denied', function (prevInputData, reason) {
            console.log('Cannot initialize game because of: ' + reason);
            if (reason === 'duplicate name') {
                $('#nameInputError').text('Cannot use this name \'' + prevInputData.name + '\', it is already taken.');
            } else {
                // TODO
            }
        });

        socket.on('calibrate:respond', function(serverTime, totalOffset, averageTickRate) {
            // Network Time Protocol
            // Separate the latency from the totalOffset of clocks to get the offset of our clock vs. the server
            var clientTime = Date.now();
            var startTime = serverTime - totalOffset;
            var offset = (totalOffset + (serverTime - clientTime)) / 2;

            var firstTimeCalibrating = (TICK_RATE === 0);
            Time_Offset = offset;
            TICK_RATE = averageTickRate;    // Update the tick rate the server is actually updating client at
            LATENCY = clientTime - startTime;

            if (firstTimeCalibrating) {
                console.log("average latency (Time_Offset) =", Time_Offset, "ms");
                
                $('#canvas').trigger('initializeStates');   // use new calibration to correct initial states
            }
        });

        socket.on('updatePlayerPositions', function (names, nameToPosition) {
            // this is emitted after every game loop tick (to update all dynamic object positions at once)
            names.forEach(name => {
                GAME_VIEW.setPlayerLocation(name, nameToPosition[name]);
            });
            
            GAME_VIEW.draw();
        });

        socket.on('updateFlagPositions', function (flagPositions) {
            Object.keys(flagPositions).forEach(flagTeam => {
                GAME_VIEW.setFlagLocation(flagTeam, flagPositions[flagTeam])
            });
        });

        socket.on('updateScores', function(scores) {
            Object.keys(scores).forEach(flagTeam => {
                GAME_VIEW.setScore(flagTeam, scores[flagTeam])
            });
        });

        // Triggered when turrets have changed behavioral states, syncing all attributes back to the server's
        socket.on('updateTurrets', function(updatedStates) {
            // updatedStates maps turretId -> turretState
            for (var turretId in updatedStates) {
                GAME_VIEW.turretStates[turretId] = updatedStates[turretId];
            }
        });

        // Triggered when bullets are created and destroyed only
        socket.on('updateBullets', function(bulletUpdates) {
            Object.keys(bulletUpdates).forEach(bulletId => {
                var [action, state] = bulletUpdates[bulletId];

                switch (action) {
                    case 'create':
                        // Add the bullet state to the map of bullet states
                        GAME_VIEW.bulletStates[bulletId] = state;
                        break;

                    case 'destroy':
                        // Remove the bullet state
                        if (GAME_VIEW.bulletStates[bulletId]) {
                            delete GAME_VIEW.bulletStates[bulletId];
                        }
                        break;

                    default: break;
                }
            });
        });
    }

    socket.on('startGame', function(gameTime, objects, turrets, namesToTeam) {
        GAME_VIEW.startGame(gameTime, objects, turrets, namesToTeam);
    });

    // Update Wall/Player Healths (this gets called during game only, not during build phase)
    socket.on('updateHealths', function(objType, healthUpdates) {
        if (!(objType in GAME_VIEW.healthValues))
            throw new Error('not a valid objType for health: ' + objType);
        if (objType === 'walls') {
            Object.keys(healthUpdates).forEach(pos => {
                if (healthUpdates[pos] <= 0) {
                    delete GAME_VIEW.healthValues[objType][pos]; // wall has 0 health, server deleted it
                } else {
                    GAME_VIEW.healthValues[objType][pos] = healthUpdates[pos];
                }
            });
        } else if (objType === 'players') {
            Object.keys(healthUpdates).forEach(name => {
                GAME_VIEW.healthValues[objType][name] = healthUpdates[name];
            });
        }
    });

    function setupMouseObjectListener(socket) {
        // When mouse hovers over a grid, gray it out to help client thinking about selecting it
        // If mouse pressed, then send to server selected block (don't draw it out, server must approve
        // and send to other users.)

        // Start user out in Build mode
        this.build = true;

        // prevent context menu on canvas when right clicking
        $('canvas').bind('contextmenu', function(e) {
            return false;
        });

        // Update mouse position on canvas
        window.addEventListener('mousemove', function (e) {
            var mouseCoords = getMouseCoords(GAME_VIEW.getCanvasDimensions(), e);
            GAME_VIEW.setMousePosition(mouseCoords);
        });

        // Handle mouse clicks
        // 0 = left, 2 = right button   [Left Click = select, Right Click = veto]
        window.addEventListener('mouseup', function(e) {
            // Do nothing if we're out of build mode
            if (!this.build) {
                return false;
            }

            // If the grid is null, the current highlighted grid is invalid
            var clickedGrid = GAME_VIEW.gridTopLeft;
            var buttonClicked = e.button;
            if (clickedGrid !== null) {
                if (buttonClicked === 0) {
                    socket.emit('selectObjectLocation', GAME_VIEW.buildTool, clickedGrid, 'select');
                } else if (buttonClicked === 2) {
                    socket.emit('selectObjectLocation', GAME_VIEW.buildTool, clickedGrid, 'veto');
                }
            }
        });

        // Select build tools (temporary controls)
        document.addEventListener('keyup', function (e) {
            var key = String.fromCharCode(e.keyCode);
            if (key === 'Q' || key === 'E') {
                if (key === 'Q') {
                    GAME_VIEW.buildToolIndex--;
                } else {
                    GAME_VIEW.buildToolIndex++;
                }

                // Wrap the selected build tool index and keep it positive
                GAME_VIEW.buildToolIndex = (GAME_VIEW.buildToolIndex + Build_Tools.length) % Build_Tools.length;
            }
        });
        
        socket.on('updateObjects', function({x, y, objectType, vetoCount, team, deleted, details}) {
            // Some other teammate has selected a wall, (or could have been you after broadcasted to your team).
            // Display it.
            //console.log(x, y, objectType, vetoCount, team, deleted);

            // search GAME_VIEW.objectPositions for the object to be updated
            // (either remove a object, or update its vetoCount, or add a new object)
            for (var i = 0; i < GAME_VIEW.objectPositions.length; i++) {
                if (x === GAME_VIEW.objectPositions[i].x && y === GAME_VIEW.objectPositions[i].y) {
                    if (deleted) {
                        // Remove object states if they exist
                        if (GAME_VIEW.objectPositions[i].objectType === 'turret') {
                            var turretId = GAME_VIEW.objectPositions[i].details.turretId;
                            delete GAME_VIEW.turretStates[turretId];
                        }

                        GAME_VIEW.objectPositions.splice(i, 1);
                        GAME_VIEW.draw();
                        return;
                    } else {
                        GAME_VIEW.objectPositions[i].vetoCount = vetoCount;
                        GAME_VIEW.draw();
                        return;
                    }
                }
            }

            // if the object can't be found, need to add it as a new one
            var attributes = {x: x, y: y, objectType: objectType, vetoCount: vetoCount, team: team};
            if (objectType === 'turret') {
                // Handle the turret, which should have a turretId detail that henceforth ties it to a turretState
                if (details && details.turretId !== null) {
                    // Add an additional attribute to turret objects so we can look up its state later
                    // (turretState updated later as a separate event)
                    attributes.details = {};
                    attributes.details.turretId = details.turretId;
                } else {
                    // Otherwise, reject the turret if no id was given (since the client won't be able to update it)
                    return false;
                }
            }

            GAME_VIEW.objectPositions.push(attributes);
            GAME_VIEW.draw();
        });
    }

})();

function setupKeyListeners(socket) {
    const keysPressed = {'W': false, 'A': false, 'S': false, 'D': false};

    document.addEventListener('keydown', function (e) {
        var key = String.fromCharCode(e.keyCode);
        if (key in keysPressed) {
            // only emit if we have a velocity change (went from not pressing key to pressing it)
            if (!keysPressed[key]) {
                keysPressed[key] = true;
                socket.emit('updateKeys', keysPressed);
            }
        }
    });

    document.addEventListener("keyup", function (e) {
        var key = String.fromCharCode(e.keyCode);
        // only emit if we have a velocity change (which by default we will have, since key is released)
        if (key in keysPressed) {
            keysPressed[key] = false;
            socket.emit('updateKeys', keysPressed);
        }
    });
}

/**
 * Get the absolute mouse coordinates over the given canvas
 * 
 * @param  {Object} containing canvas top and left position and x/y scale
 * @param  {Object} mouse event containing clientX and clientY
 * @return {x, y} mouse position on canvas
 */
function getMouseCoords(canvasDimensions, e) {
    return {
        x: (e.clientX - canvasDimensions.left) * canvasDimensions.scaleX,
        y: (e.clientY - canvasDimensions.top) * canvasDimensions.scaleY
    }
}
