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
                $('#startMenu').hide();
                socket.emit('new_game_input', newInputData);
            });
        });

        setupSocket()
    };

    // setupSocket(socket);
    // setupKeyListeners(socket);


    function setupSocket(socket) {

        socket.on('newPlayer', function (name, pos, playerNum) {
            console.log("Player joined: " + name + " this is player # ", playerNum);
            GAME_VIEW.setPlayerNum(name, playerNum);
            GAME_VIEW.setPlayerLocation(name, pos);
        });

        socket.on('removePlayer', function (name) {
            console.log("Player disconnected: " + name);
            GAME_VIEW.removePlayer(name);
        });

        socket.on('initialize_approved', function (startData) {
            console.log('initializing Canvas with --> ', JSON.stringify(startData, null, 4));
            GAME_VIEW.initializeCanvas(startData);
            socket.emit('client_ready');
        });

        socket.on('initialize_denied', function (prevInputData, reason) {
            alert('Cannot initialize game because of: ' + reason);
            if (reason === 'duplicate name') {
                prevInputData.name = prompt("Please enter another name, this one already exists");
            } else {
                // TODO
            }
            socket.emit('new_game_input', prevInputData); // try again
        });

        socket.on('updatePlayerPositions', function (names, nameToPosition) {
            // this is emitted after every game loop tick (to update all dynamic object positions at once)
            names.forEach(name => {
                // console.log("Updating position of", name, " to ", nameToPosition[name]);
                GAME_VIEW.setPlayerLocation(name, nameToPosition[name]);
            });
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
