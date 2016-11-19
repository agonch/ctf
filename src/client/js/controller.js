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
        GAME_VIEW.draw();
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

        socket.on('newPlayer', function (name, pos, playerNum) {
            if (GAME_VIEW.playerName != name) {
                console.log("Player joined: " + name + " this is player # ", playerNum);
                GAME_VIEW.setPlayerNum(name, playerNum);
                GAME_VIEW.setPlayerLocation(name, pos);
            }
        });

        socket.on('removePlayer', function (name) {
            if (GAME_VIEW.playerName != name) {
                console.log("Player disconnected: " + name);
                GAME_VIEW.removePlayer(name);
            }
        });

        socket.on('initialize_approved', function (startData) {
            $('#startMenu').hide();
            $('#gameArea').show();
            setupKeyListeners(socket);
            setupMouseWallListener(socket);
            console.log('initializing Canvas with --> ', JSON.stringify(startData, null, 4));
            GAME_VIEW.initializeCanvas(startData);
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

        socket.on('updatePlayerPositions', function (names, nameToPosition) {
            // this is emitted after every game loop tick (to update all dynamic object positions at once)
            names.forEach(name => {
                // console.log("Updating position of", name, " to ", nameToPosition[name]);
                GAME_VIEW.setPlayerLocation(name, nameToPosition[name]);
            });
        });
    }

    function setupMouseWallListener(socket) {
        // When mouse hovers over a grid, gray it out to help client thinking about selecting it
        // If mouse pressed, then send to server selected block (don't draw it out, server must approve
        // and send to other users.)

        // Update mouse position on canvas
        window.addEventListener('mousemove', function (e) {
            var mouseCoords = getMouseCoords(GAME_VIEW.getCanvasDimensions(), e);
            GAME_VIEW.setMousePosition(mouseCoords);
        });

        window.addEventListener('mouseclick', function(e) {
            socket.emit('selectWallLocation', GAME_VIEW.gridTopLeft);
        });

        //onclick = function() {  socket.emit('selectWallLocation', {x: x, y: y} };
        


        socket.on('updateWallLocation', function(wallLocation) {
            // Some other teammate has selected a wall, (or could have been you after broadcasted to your team).
            // Display it.
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
