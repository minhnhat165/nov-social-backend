const express = require('express');
const app = express();
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cors = require('cors');
const passport = require('passport');
const authRouter = require('./v1/routes/auth.route');
const userRouter = require('./v1/routes/user.route');
const searchRouter = require('./v1/routes/search.route');
const interestRouter = require('./v1/routes/interest.route');
const postRouter = require('./v1/routes/post.route');
const { CLIENT_URL } = require('./v1/configs');
var cookies = require('cookie-parser');

require('./v1/databases/init.mongodb');

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
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/search', searchRouter);
app.use('/api/posts', postRouter);
app.use('/api/interests', interestRouter);

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
