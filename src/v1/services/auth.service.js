const User = require('../models/User');
const createError = require('http-errors');
const jwt = require('jsonwebtoken');
const {
	generateAccessToken,
	generateRefreshToken,
} = require('../utils/jwt.utils');
const { MAX_LINKED_ACCOUNT } = require('../configs');

const login = async (email, password) => {
	const user = await User.findOne({ email, provider: 'local' }).select(
		'email password status provider',
	);
	if (!user) throw createError.NotFound('User not found');
	if (user.status === 'pending')
		throw createError.Unauthorized('Please verify your email');
	const isMatch = await user.isValidPassword(password);
	if (!isMatch) throw createError.Unauthorized('Email or password is wrong');
	return user;
};

const createResponseToken = (user, res) => {
	const accessToken = generateAccessToken(user);
	const refreshToken = generateRefreshToken(user);
	res.cookie('refresh_token', refreshToken, {
		httpOnly: true,
		maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
	});
	return accessToken;
};

const addExistingAccount = async (user, account) => {
	Object.assign(user, await User.findById(user._id).select('linkedAccounts'));
	Object.assign(
		account,
		await User.findById(account._id).select('linkedAccounts'),
	);

	// Check if the user is trying to link themselves
	if (user._id.toString() === account._id.toString())
		throw createError.BadRequest('You cannot add yourself');

	// Check if the account is already linked
	if (user.linkedAccounts.includes(account._id))
		throw createError.BadRequest('This account is already linked');

	// Check if the account is at the max number of linked accounts
	if (account.linkedAccounts.length >= MAX_LINKED_ACCOUNT)
		throw createError.BadRequest(
			'This account has reached the maximum number of linked accounts',
		);

	// Check if the user is at the max number of linked accounts
	if (user.linkedAccounts.length >= MAX_LINKED_ACCOUNT)
		throw createError.BadRequest(
			'You have reached the maximum number of linked accounts',
		);

	const [newUser, newUserLink] = await Promise.all([
		User.findByIdAndUpdate(
			user._id,
			{
				$addToSet: { linkedAccounts: account._id },
			},
			{
				new: true,
			},
		)
			.select('linkedAccounts')
			.populate(
				'linkedAccounts',
				'_id name avatar username email numNotifications',
			),
		User.findByIdAndUpdate(account._id, {
			$addToSet: { linkedAccounts: user._id },
		}),
	]);

	return newUser;
};

const removeLinkedAccount = async (user, accountId) => {
	// get and assign linked accounts
	Object.assign(user, await User.findById(user._id).select('linkedAccounts'));

	// Get all linked accounts from an account
	const { linkedAccounts: accountLinkedAccounts } = await User.findById(
		accountId,
	).select('linkedAccounts');

	// Check if the account is linked
	if (accountId === user._id.toString())
		throw createError.Conflict('You cannot remove yourself');
	// Check if the account is linked
	if (!user.linkedAccounts.includes(accountId))
		throw createError.Conflict('This account is not linked');
	// Check if the account is linked
	if (!accountLinkedAccounts.includes(user._id))
		throw createError.Conflict('This account is not linked');

	const [newUser, newUserLink] = await Promise.all([
		User.findByIdAndUpdate(
			user._id,
			{
				$pull: { linkedAccounts: accountId },
			},
			{
				new: true,
			},
		)
			.select('linkedAccounts')
			.populate(
				'linkedAccounts',
				'_id name avatar username email numNotifications',
			),
		User.findByIdAndUpdate(accountId, {
			$pull: { linkedAccounts: user._id },
		}),
	]);
	return newUser;
};

const verifyAccessToken = (token) => {
	const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
	if (payload.exp < Date.now().valueOf() / 1000)
		throw createError.Unauthorized('Access token is expired');
	return payload;
};

module.exports = {
	login,
	createResponseToken,
	verifyAccessToken,
	addExistingAccount,
	removeLinkedAccount,
};
