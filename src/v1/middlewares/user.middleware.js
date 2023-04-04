const jwt = require('jsonwebtoken');
const User = require('../models/User');
const userService = require('../services/user.service');
const authService = require('../services/auth.service');

async function getUserFromJwt(req, res, next) {
	// Get the JWT token from the request header berer token
	const token = req.header('Authorization')?.replace('Bearer ', '');
	if (!token) {
		// If there is no token, set user as null and call next middleware
		req.user = null;
		return next();
	}

	try {
		const payload = await authService.verifyAccessToken(token);
		const user = await userService.getUser(payload.id);
		console.log(
			'🚀 ~ file: user.middleware.js:16 ~ getUserFromJwt ~ user:',
			user,
		);
		req.user = user;
		// Call next middleware
		next();
	} catch (err) {
		// If there is an error, set user as null and call next middleware
		req.user = null;
		next();
	}
}

module.exports = {
	getUserFromJwt,
};
