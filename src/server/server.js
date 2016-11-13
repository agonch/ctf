var http = require('http').Server(app);
var io = require('socket.io')(http);
var app = require('express')();


var names = [];

http.listen(3000, function() {
    console.log('listening on *:3000');
})

app.get('/', function (req, res) {
    console.log('serving');
    res.sendfile(__dirname + '../client/index.html');
    res.sendfile(__dirname + '../client/js/controller.js');
    res.sendfile(__dirname + '../client/js/canvas.js');
});

io.on('connection', function (socket) {
    console.log("New connection");
    socket.emit('ack');
    socket.on('name', function (name) {
        names.push(name);
        console.log("New name: " + name);
        io.emit('newPlayer', name);
    });
});