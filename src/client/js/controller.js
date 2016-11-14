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
var names = [];

console.log("Connecting!");
var socket = io();


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
    socket.emit('name', person);
});