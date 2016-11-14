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

var names = [];

window.onresize = function(event) {
    GAME_RENDERER.updateCanvas();
};

console.log("Connecting!");
const socket = io();
setupSocket(socket);
setupKeyListeners(socket);

function setupSocket(socket) {
    socket.on('gameStateNames', function(names_new) {
        console.log("Get games state");
        names = names_new;
        notifyUserUpdate();
    });

    socket.on('newPlayer', function(name) {
        console.log("Player joined: " + name);
        names.push(name);
        notifyUserUpdate();
    });

    socket.on('removePlayer', function(name) {
        console.log("Player disconnected: " + name);
        names.splice(names.indexOf(name), 1);
        notifyUserUpdate();
    });

    function notifyUserUpdate() {
        console.log("updating names");
        console.log(names);
    }


    socket.on('ack', function() {
        console.log("Got ack!");
        var person = prompt("Please enter your name", "Harry Potter");
        GAME_RENDERER.initializeCanvas(person);
        socket.emit('name', person);
    });

    socket.on('updatePosition', function(pos) {
        GAME_RENDERER.setPlayerLocation(pos);
    });
}

function setupKeyListeners(socket) {
    const keys_pressed = {'W': false, 'A': false, 'S': false, 'D': false};

    document.addEventListener('keydown', function (e) {
        if (String.fromCharCode(e.keyCode) in keys_pressed) {
            keys_pressed[String.fromCharCode(e.keyCode)] = true;
            sendToServerKeyUpdates();
        }
    });

    document.addEventListener("keyup", function (e) {
        if (String.fromCharCode(e.keyCode) in keys_pressed) {
            keys_pressed[String.fromCharCode(e.keyCode)] = false;
        }
    });

    function sendToServerKeyUpdates() {
        // cancel out opposite movements (up and down, left and right)
        if (keys_pressed['W'] && keys_pressed['S']) {
            keys_pressed['W'] = keys_pressed['S'] = false;
        }
        if (keys_pressed['A'] && keys_pressed['D']) {
            keys_pressed['A'] = keys_pressed['D'] = false;
        }
        if (keys_pressed['W'] || keys_pressed['A'] || keys_pressed['S'] || keys_pressed['D']) {
            socket.emit('updateKeys', keys_pressed);
        }
    }

}
