var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var path = require('path');


var names = [];

http.listen(3000, function() {
    console.log('listening on *:3000');
});

app.get('/', function (req, res) {
    console.log('serving');
    res.setHeader("Content-Type", "text/html");
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// app.get('/client/js/canvas.js', function (req, res)  {
//     res.setHeader("Content-Type", "text/javascript");
//     res.sendFile(path.join(__dirname, '../client/js/canvas.js'));
// });
//
// app.get('/client/js/controller.js', function (req, res)  {
//     res.setHeader("Content-Type", "text/javascript");
//     res.sendFile(path.join(__dirname, '../client/js/controller.js'));
// });

io.on('connection', function (socket) {
    console.log("New connection");
    socket.emit('ack');
    socket.on('name', function (name) {
        names.push(name);
        console.log("New name: " + name);
        io.emit('newPlayer', name);
    });
});
