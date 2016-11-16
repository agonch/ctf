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
const GAME_VIEW = new GameView();

window.onresize = function(event) {
    GAME_VIEW.draw();
};

console.log("Connecting!");
const socket = io();
setupSocket(socket);
setupKeyListeners(socket);

function setupSocket(socket) {

    socket.on('newPlayer', function(name, pos, playerNum) {
        console.log("Player joined: " + name + " this is player # ", playerNum);
        GAME_VIEW.setPlayerNum(name, playerNum);
        GAME_VIEW.setPlayerLocation(name, pos);
    });

    socket.on('removePlayer', function(name) {
        console.log("Player disconnected: " + name);
        GAME_VIEW.removePlayer(name);
    });

    /* (1) Server connected to me (hit 'ack'), get user input (name, walls, flag location, etc.)
     * (2) Send over to server ('new_game_input')
     * (3) If server approves, we hit ('initialize_approved'), and we can initialize their game
     * (4) If server denies our input (duplicate name, illegal wall placement, etc..)
     *        we hit event ('initialize_denied')
     */

    socket.on('ack', function() {
        console.log("Got ack!");
        var name = prompt("Please enter your name", "Harry Potter");
        const newInputData = {
            name: name,
            wallLocations: null, // TODO later
            turretLocations: null, // TODO later
            // ..etc.
        };
        socket.emit('new_game_input', newInputData);
    });

    socket.on('initialize_approved', function (startData) {
        GAME_VIEW.initializeCanvas(startData);
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

    socket.on('updatePosition', function(name, pos) {
        console.log("name: " + name);
        console.log("pos: " + pos);
        GAME_VIEW.setPlayerLocation(name, pos);
    });
}


function setupKeyListeners(socket) {
    const keysPressed = {'W': false, 'A': false, 'S': false, 'D': false};

    document.addEventListener('keydown', function (e) {
        if (String.fromCharCode(e.keyCode) in keysPressed) {
            keysPressed[String.fromCharCode(e.keyCode)] = true;
            sendToServerKeyUpdates();
        }
    });

    document.addEventListener("keyup", function (e) {
        if (String.fromCharCode(e.keyCode) in keysPressed) {
            keysPressed[String.fromCharCode(e.keyCode)] = false;
        }
    });

    function sendToServerKeyUpdates() {
        // cancel out opposite movements (up and down, left and right)
        if (keysPressed['W'] && keysPressed['S']) {
            keysPressed['W'] = keysPressed['S'] = false;
        }
        if (keysPressed['A'] && keysPressed['D']) {
            keysPressed['A'] = keysPressed['D'] = false;
        }
        if (keysPressed['W'] || keysPressed['A'] || keysPressed['S'] || keysPressed['D']) {
            socket.emit('updateKeys', keysPressed);
        }
    }

}
