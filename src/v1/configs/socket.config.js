const { Server } = require('socket.io');

const { CLIENT_URL } = require('../configs/index');

const io = new Server(3000, {
	cors: {
		origin: CLIENT_URL,
		methods: ['GET', 'POST'],
		allowedHeaders: ['Content-Type', 'Authorization'],
		credentials: true,
	},
});

io.on('connection', (socket) => {
	console.log('a user connected');
});

module.exports = io;
