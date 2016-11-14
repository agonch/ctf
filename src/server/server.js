var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');


var names = {};

http.listen(3000, function() {
    console.log('listening on *:3000');
});

app.get('/', function (req, res) {
    console.log('serving');
    res.setHeader("Content-Type", "text/html");
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.use(express.static('../client/'))

io.on('connection', function (socket) {
    console.log("New connection");

    var values = [];
    for (var key in names) {
        if (names.hasOwnProperty(key)) {
            values.push(names[key]);
        }
    }
    socket.emit('gameState', values);
    socket.emit('ack');

    socket.on('disconnect', function(){
        console.log( socket.name + ' has disconnected from the chat.' + socket.id);
        io.emit('removePlayer', names[socket.id]);
        delete names[socket.id];
    });

    socket.on('name', function (name) {
        names[socket.id] = name;
        console.log("New name: " + name);
        io.emit('newPlayer', name);

    });
});
