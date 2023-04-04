const createError = require('http-errors');
const authService = require('../services/auth.service');
const userService = require('../services/user.service');

const verifyAccessToken = async (req, res, next) => {
	const authHeader = req.headers.authorization;
	if (!authHeader) throw createError.Unauthorized();
	const token = authHeader.split(' ')[1];
	try {
		const payload = await authService.verifyAccessToken(token);
		const user = await userService.getUser(payload.id);
		req.user = user;
		next();
	} catch (error) {
		next(error);
	}
};

const verifyAccessTokenOptional = async (req, res, next) => {
	const authHeader = req.headers.authorization;
	if (!authHeader) {
		req.user = null;
		return next();
	}
	const token = authHeader.split(' ')[1];
	try {
		const payload = await authService.verifyAccessToken(token);
		const user = await userService.getUser(payload.id);
		req.user = user;
		next();
	} catch (error) {
		next(error);
	}
};

module.exports = {
	verifyAccessToken,
	verifyAccessTokenOptional,
};
