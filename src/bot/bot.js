var io = require('socket.io-client');
var botState = require('./BotState.js');

if (process.argv.slice(2).length !== 3) {
    console.log("\n\tUsage: node bot.js <HOSTNAME> <PORT> <BOT_NAME>");
    process.exit();
}

const host = process.argv[2];
const port = process.argv[3];
const bot = new botState(process.argv[4]);
const address = 'http://' + host + ':' + port;
console.log('connecting bot_name:', bot.name, 'to server at:', address);


var socket = io.connect(address);
socket.on('connect', () => setupSocket(socket));

socket.on('disconnect', () => {
    console.log('DISCONNECTED  name:', bot.name);
    process.exit();
});

var LATENCY = 0;

// Set socket listeners
function setupSocket(socket) {
    socket.on('ack', function () {
        console.log("socket got ack");
        socket.emit('new_game_input', {name: bot.name});
    });

    socket.on('newPlayer', function (name, pos, team) {
        if (bot.name !== name) {
            console.log("Player joined: " + name + " this is player on team ", team);
            bot.addPlayer(name, pos, team);
        }
    });

    socket.on('removePlayer', function (name) {
        if (bot.name !== name) {
            console.log("Player disconnected: " + name);
            bot.removePlayer(name);
        }
    });

    socket.on('initialize_approved', function (startData) {
        bot.initialize(startData);
        bot.setupBotKeyListenerAI(socket);

        // Request to calibrate clocks with the server right off the bat
        // And repeat regularly to make sure there are no irregular changes (in clocks, latency, or effective tickrate)
        socket.emit('calibrate:start', Date.now());
        setInterval(function () {
            socket.emit('calibrate:start', Date.now());
        }, 8000);

        socket.emit('client_ready');
    });

    socket.on('initialize_denied', function (prevInputData, reason) {
        console.log('Cannot initialize game because of: ' + reason);
        process.exit(1);
    });

    socket.on('calibrate:respond', function (serverTime, totalOffset, averageTickRate) {
        // Network Time Protocol
        // Separate the latency from the totalOffset of clocks to get the offset of our clock vs. the server

        var clientTime = Date.now();
        var startTime = serverTime - totalOffset;
        LATENCY = clientTime - startTime;

        console.log("Bot:", bot.name, " LATENCY:", LATENCY, "averageTickRate", averageTickRate);
    });

    socket.on('updatePlayerPositions', function (names, positions) {
        names.forEach(name => {
            bot.nameToPosition[name] = positions[name];
        });
    });

    socket.on('updateTurrets', function (updatedStates) {
    });

    socket.on('updateBullets', function (bulletUpdates) {
    });

    socket.on('updateHealths', function (objType, healthUpdates) {
    });

    socket.on('updateObjects', function({x, y, objectType, vetoCount, team, deleted, details}) {
    });

}