const createHttpError = require('http-errors');
const { model } = require('mongoose');
const User = require('../models/User');

const createUser = async (user) => {
	// Check if user is already existed
	const countUser = await User.countDocuments({
		email: user.email,
		provider: user.provider,
	});

	if (countUser > 0) throw createHttpError(400, 'User already existed');

	// If user is local, set status to pending
	if (user.provider === 'local') {
		user.status = 'pending';
	}

	user.name = `${user.firstName} ${user.lastName}`;
	const newUser = await User.create(user);
	return newUser;
};

const getUser = async (id) => {
	const user = await User.findById(id);
	if (!user) {
		throw createHttpError(404, 'User not found');
	}
	return user;
};

const searchByEmail = async (email, limit) => {
	if (!email) return [];
	return await User.find({ email: { $regex: email, $options: 'i' } })
		.limit(limit)
		.select('name avatar email');
};

const searchByName = async (name, limit, options) => {
	if (!name) return [];
	console.log(options);
	return await User.find({
		...options,
		name: { $regex: name, $options: 'i' },
	})
		.limit(limit)
		.select('name avatar email');
};

const userService = {
	createUser,
	getUser,
	searchByEmail,
	searchByName,
};

module.exports = userService;
