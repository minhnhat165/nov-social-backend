const express = require('express');
const app = express();
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cors = require('cors');
const passport = require('passport');
const { CLIENT_URL } = require('./v1/configs');
var cookies = require('cookie-parser');
const useRoutes = require('./v1/routes');
const { createServer } = require('http');
const { Server } = require('socket.io');
const SocketService = require('./v1/services/socket.service');

const httpServer = createServer(app);
const io = new Server(httpServer, {
	cors: {
		origin: '*',
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
		allowedHeaders: ['Content-Type', 'Authorization'],
		credentials: true,
	},
});

global._io = io;

global._io.on('connection', SocketService.connect);

require('./v1/databases/init.mongodb');
require('./v1/databases/init.redis');

app.use(
	cors({
		origin: '*',
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
		allowedHeaders: ['Content-Type', 'Authorization'],
		credentials: true,
	}),
); // Enable CORS for all routes

app.use(cookies());
app.use(helmet());
app.use(morgan('combined'));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

useRoutes(app);

app.use((req, res, next) => {
	const error = new Error('Not found');
	error.status = 404;
	next(error);
});

app.use((error, req, res, next) => {
	res.status(error.status || 500).send({
		status: error.status || 500,
		message: error.message || 'Internal Server Error',
	});
});

module.exports = httpServer;
