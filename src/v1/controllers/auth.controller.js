const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const createError = require('http-errors');
const authService = require('../services/auth.service');
const { createUser } = require('../services/user.service');
const { generateVerifyToken } = require('../utils/jwt.utils');
const { sendEmail } = require('../utils/mailer.util');
const Otp = require('../models/Otp');
const {
	generateEmailResetPassword,
	generateEmailVerify,
} = require('../views/email');
const { getImageWithDimension } = require('../services/cloud.service');
const { AVATAR_SIZE } = require('../configs');

const login = async (req, res, next) => {
	const { email, password } = req.value.body;
	const user = await authService.login(email, password);
	const accessToken = authService.createResponseToken(user, res);
	return res.status(200).json({ success: true, access_token: accessToken });
};

const addExistingAccountLocal = async (req, res, next) => {
	const { email, password } = req.value.body;
	const { user } = req;
	const account = await authService.login(email, password);
	req.account = account;
	req.user = user;
	next();
};

const addExistingAccount = async (req, res, next) => {
	const { user, account } = req;
	const newUser = await authService.addExistingAccount(user, account);
	return res.status(200).json({
		success: true,
		linkedAccounts: newUser.linkedAccounts,
	});
};

const addExistingAccountSocial = async (req, res, next) => {
	const { user, userSub: account } = req;
	req.account = account;
	req.user = user;
	next();
};

const removeLinkedAccount = async (req, res, next) => {
	const { user, params } = req;
	const { userId: accountId } = params;
	const newUser = await authService.removeLinkedAccount(user, accountId);

	return res.status(200).json({
		success: true,
		linkedAccounts: newUser.linkedAccounts,
	});
};

const switchAccount = async (req, res, next) => {
	const { user, params } = req;
	const { userId: accountId } = params;
	if (user._id.toString() === accountId)
		throw createError.Conflict('You cannot switch to yourself');
	const userSwitch = await User.findOne({
		_id: accountId,
		linkedAccounts: user._id,
	}).select('_id');

	if (!userSwitch) throw createError.Conflict('This account is not linked');
	const accessToken = authService.createResponseToken(userSwitch, res);
	return res.status(200).json({ success: true, access_token: accessToken });
};

const logout = async (req, res, next) => {
	res.clearCookie('refresh_token');
	return res.status(200).json({ success: true });
};

const socialLogin = async (req, res, next) => {
	const { user } = req;
	const accessToken = authService.createResponseToken(user, res);
	return res.status(200).json({ success: true, access_token: accessToken });
};

const checkEmailExists = async (req, res, next) => {
	const { email } = req.value.body;
	const countUser = await User.countDocuments({ email, provider: 'local' });
	const isExisted = countUser > 0;
	return res.status(200).json({ isExisted });
};

const register = async (req, res, next) => {
	const { avatar, ...userData } = req.value.body;
	const newUser = await createUser({
		...userData,
		avatar: getImageWithDimension(
			avatar,
			AVATAR_SIZE.MEDIUM,
			AVATAR_SIZE.MEDIUM,
		),
		avatarId: avatar,
		provider: 'local',
	});
	const verifyToken = generateVerifyToken(newUser);
	const url = `${process.env.CLIENT_URL}/auth/activation/${verifyToken}`;
	await sendEmail({
		email: newUser.email,
		subject: 'Verify your email',
		text: 'Verify your email',
		html: generateEmailVerify(url),
	});
	return res.status(200).json({ success: true });
};

const activeAccount = async (req, res, next) => {
	const { verify_token } = req.body;
	// verify token with jsonwebtoken
	const decoded = jwt.verify(verify_token, process.env.VERIFY_TOKEN_SECRET);
	const { id, exp } = decoded;
	// check if token is expired
	if (exp < Date.now().valueOf() / 1000)
		throw createError.Unauthorized(
			'Account activation expired, please re-register',
		);

	// find user by id
	const user = await User.findById(id).select('status');
	if (!user) throw createError.NotFound('Account not found');
	if (user.status === 'active')
		throw createError.Conflict('Account is already active');
	user.status = 'active';
	await User.findByIdAndUpdate(id, {
		status: 'active',
	});
	return res.status(200).json({ success: true });
};

const getOwnProfile = async (req, res, next) => {
	const { user: userReq } = req;
	const user = await User.findById(userReq.id)
		.select(
			'name username lastName email avatar notificationsCount linkedAccounts',
		)
		.populate(
			'linkedAccounts',
			'name username email avatar notificationsCount',
		)
		.lean();
	return res.status(200).json({
		user,
	});
};

const forgotPassword = async (req, res) => {
	const { email } = req.body;
	const user = await User.findOne({ email, provider: 'local' }).select(
		'_id email',
	);
	if (!user)
		throw createError.NotFound(
			'This email does not exist or this account is not provided by us',
		);

	const otp = Math.floor(100000 + Math.random() * 900000).toString();
	const newOtp = new Otp({ email, otp });
	newOtp.otp = bcrypt.hashSync(otp, 10);
	await newOtp.save();
	await sendEmail({
		email: user.email,
		subject: 'Verify reset password',
		text: 'Verify reset password',
		html: generateEmailResetPassword(otp),
	});
	res.status(200).json({ success: true });
};

const verifyOTP = async (req, res) => {
	const { email, otp } = req.body;
	const otpList = await Otp.find({ email });
	if (otpList.length === 0) throw createError.Gone('OTP is expired');
	const dbOtp = otpList[otpList.length - 1];
	const check = await bcrypt.compare(otp, dbOtp.otp);
	if (!check) throw createError.Unauthorized('OTP is incorrect');
	const user = await User.findOne({ email, provider: 'local' }).select(
		'_id email',
	);
	if (!user) throw createError.NotFound('User does not exist');
	const verifyToken = generateVerifyToken(user);
	return res.status(200).json({ success: true, verify_token: verifyToken });
};

const updatePassword = async (req, res) => {
	const { password, verify_token } = req.body;
	const decoded = jwt.verify(verify_token, process.env.VERIFY_TOKEN_SECRET);
	const { id, exp } = decoded;
	// check if token is expired
	if (exp < Date.now().valueOf() / 1000)
		throw createError.Unauthorized(
			"Token is expired, please re-send 'forgot password'",
		);
	// find user by id
	const user = await User.findById(id).select('password');
	if (!user) throw createError.NotFound('Account not found');
	user.password = password;
	await user.save();
	return res.status(200).json({ success: true });
};

const refreshToken = async (req, res, next) => {
	const { refresh_token } = req.cookies;
	if (!refresh_token) throw createError.Unauthorized();
	const decoded = jwt.verify(refresh_token, process.env.REFRESH_TOKEN_SECRET);
	if (decoded.exp < Date.now().valueOf() / 1000)
		throw createError.Unauthorized(
			'Refresh token is expired, please login again',
		);
	const user = await User.findById(decoded.id).select('_id email');
	if (!user) throw createError.NotFound('User not found');
	const accessToken = authService.createResponseToken(user, res);
	return res.status(200).json({ success: true, access_token: accessToken });
};

module.exports = {
	login,
	getOwnProfile,
	checkEmailExists,
	register,
	activeAccount,
	forgotPassword,
	verifyOTP,
	updatePassword,
	refreshToken,
	logout,
	socialLogin,
	addExistingAccount,
	addExistingAccountLocal,
	addExistingAccountSocial,
	removeLinkedAccount,
	switchAccount,
};
