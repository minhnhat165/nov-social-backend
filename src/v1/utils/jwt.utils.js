const JWT = require('jsonwebtoken');
const {
	ACCESS_TOKEN_SECRET,
	REFRESH_TOKEN_SECRET,
	VERIFY_TOKEN_SECRET,
} = require('../configs');

const generateAccessToken = (user) => {
	const accessToken = JWT.sign(
		{
			id: user._id,
		},
		ACCESS_TOKEN_SECRET,
		{
			expiresIn: '1h',
		}
	);
	return accessToken;
};

const generateRefreshToken = (user) => {
	const refreshToken = JWT.sign(
		{
			id: user._id,
		},
		REFRESH_TOKEN_SECRET,
		{
			expiresIn: '7d',
		}
	);
	return refreshToken;
};

const generateVerifyToken = (user) => {
	const verifyToken = JWT.sign(
		{
			id: user._id,
		},
		VERIFY_TOKEN_SECRET,
		{
			expiresIn: '1d',
		}
	);
	return verifyToken;
};

module.exports = {
	generateAccessToken,
	generateRefreshToken,
	generateVerifyToken,
};
