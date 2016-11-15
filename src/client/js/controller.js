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
const GAME_RENDERER = new GameRenderer();

window.onresize = function(event) {
    GAME_RENDERER.draw();
};

console.log("Connecting!");
const socket = io();
setupSocket(socket);
setupKeyListeners(socket);

function setupSocket(socket) {

    socket.on('newPlayer', function(name, pos) {
        console.log("Player joined: " + name);
        GAME_RENDERER.setPlayerLocation(name, pos);
    });

    socket.on('removePlayer', function(name) {
        console.log("Player disconnected: " + name);
        GAME_RENDERER.removePlayer(name);
    });

    socket.on('ack', function(spawnPoint, boardSize, defaultPlayerSize, playerPositions) {
        console.log("Got ack!");
        var name = prompt("Please enter your name", "Harry Potter");
        GAME_RENDERER.initializeCanvas(name, spawnPoint, boardSize, defaultPlayerSize, playerPositions);
        socket.emit('name', name);
    });

    socket.on('updatePosition', function(name, pos) {
        console.log("name: " + name);
        console.log("pos: " + pos);
        GAME_RENDERER.setPlayerLocation(name, pos);
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
