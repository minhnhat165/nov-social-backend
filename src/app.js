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

require('./v1/databases/init.mongodb');
require('./v1/databases/init.redis');

// add cors
app.use(
	cors({
		origin: CLIENT_URL,
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
		allowedHeaders: ['Content-Type', 'Authorization'],
	}),
);
app.use(cookies());

//user middleware
app.use(helmet());
app.use(morgan('combined'));
// compress responses
app.use(compression());

// add body-parser
app.use(express.json());
app.use(
	express.urlencoded({
		extended: true,
	}),
);
// add passport
app.use(passport.initialize());

//router
useRoutes(app);
// Error Handling Middleware called

app.use((req, res, next) => {
	const error = new Error('Not found');
	error.status = 404;
	next(error);
});

// error handler middleware
app.use((error, req, res, next) => {
	res.status(error.status || 500).send({
		status: error.status || 500,
		message: error.message || 'Internal Server Error',
	});
});

module.exports = app;
