var express = require('express');
var router = express.Router();

function returnRouter(io) {

    var allClients = [];

    io.on('connection', function (socket) {
        allClients.push(socket);

        socket.on("hello", function(data) {
          console.log(data);
        });

        socket.on('start', function() {
          console.log("receive start");
          socket.broadcast.emit('start');
        });

        socket.on('play-music', function(data) {
          console.log("play-music: " + data);
          socket.broadcast.emit('play-music', data);
        });

        socket.on('vol-change', function(data) {
          socket.broadcast.emit('vol-change', data);
        });

      socket.on('disconnect', function() {
          console.log('Got disconnect!');
          var i = allClients.indexOf(socket);
          allClients.splice(i, 1);
      });


    });
    
    /* GET home page. */
    router.get('/', function(req, res, next) {
          res.render('prestart', { title: 'Express' });
    });

    router.get('/play', function(req, res, next) {
          res.render('index', { title: 'Express' });
    });

    router.get('/test', function(req, res, next) {
          res.render('testleapmotion');
    });
    return router;
}

module.exports = returnRouter;
