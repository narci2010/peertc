var WebSocketServer = require('ws').Server;
var events = require('events');
var _ = require('lodash');
var util = require('util');

function Peertc() {
	var that = this;
	this.sockets = [];
	this.mapping = {};
	that.on('__init', function(data, socket) {
		var id = data.id;
		socket.id = id;
		that.mapping[id] = socket;
		socket.send(JSON.stringify({
			event: '_init'
		}));
	});


	that.on('__ice_candidate', function(data, socket) {
		console.log(data.from + '---' + data.to + ': ice');
		var soc = that.get(data.to);

		if (soc) {
			soc.send(JSON.stringify({
				"event": "_ice_candidate",
				"data": {
					"label": data.label,
					"candidate": data.candidate,
					"from": data.from,
					"to": data.to
				}
			}));
		}
	});

	that.on('__offer', function(data, socket) {
		console.log(data.from + '---' + data.to + ': offer');
		var soc = that.get(data.to);
		if (soc) {
			soc.send(JSON.stringify({
				"event": "_offer",
				"data": {
					"sdp": data.sdp,
					"from": data.from,
					"to": data.to
				}
			}));
		}
	});

	that.on('__answer', function(data, socket) {
		console.log(data.from + '---' + data.to + ': answer');
		var soc = that.get(data.to);
		if (soc) {
			soc.send(JSON.stringify({
				"event": "_answer",
				"data": {
					"sdp": data.sdp,
					"from": data.from,
					"to": data.to
				}
			}));
		}
	});
}

util.inherits(Peertc, events.EventEmitter);

_.mixin(Peertc.prototype, {
	init: function(socket) {
		var that = this;
		that.add(socket);
		socket.on('message', function(data) {
			var json = JSON.parse(data);
			var event;
			if ((event = json.event)) {
				that.emit(event, json.data, socket);
			} else {
				that.emit("message", data, socket);
			}
		});

		socket.on('close', function() {
			that.remove(socket);
		});
	},
	add: function(socket) {
		var that = this;
		that.sockets.push(socket);
	},
	remove: function(socket) {
		var that = this;
		var i = that.sockets.indexOf(socket);
		that.sockets.splice(i, 1);
		delete that.mapping[socket.id];
	},
	get: function(id) {
		var that = this;
		return that.mapping[id];
	}
});

module.exports.listen = function(port) {
	var server;
	var peertc = new Peertc();
	server = typeof port === 'number' ? new WebSocketServer({
		port: port
	}) : new WebSocketServer({
		server: port
	});

	server.on('connection', function(socket) {
		peertc.init(socket);
	});

	return server;
};