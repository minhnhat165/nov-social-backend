const createHttpError = require('http-errors');
const User = require('../models/User');

// WRITE
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

// GET
const searchByEmail = async (email, limit) => {
	if (!email) return [];
	return await User.find({ email: { $regex: email, $options: 'i' } })
		.limit(limit)
		.select('name avatar email username');
};

const searchByName = async (name, limit, options) => {
	if (!name) return [];
	return await User.find({
		...options,
		name: { $regex: name, $options: 'i' },
	})
		.limit(limit)
		.select('name avatar email username');
};

const searchByField = async ({ field, value, limit, options = {} }) => {
	if (!field || !value) return [];
	return await User.find({
		...options,
		[field]: { $regex: value, $options: 'i' },
	})
		.limit(limit)
		.select('name avatar email username');
};

const followUser = async (userId, followId) => {
	if (userId.toString() === followId.toString()) {
		throw createHttpError(400, 'You cannot follow yourself');
	}

	const user = await User.findById(userId).select('following');

	if (user.following.includes(followId)) {
		throw createHttpError(400, 'User already followed');
	}

	await Promise.all([
		User.findByIdAndUpdate(userId, { $addToSet: { following: followId } }),
		User.findByIdAndUpdate(followId, { $addToSet: { followers: userId } }),
	]);

	notificationService.createNotification({
		sender: userId,
		receivers: [followId],
		type: NOTIFICATION_TYPES.FOLLOW,
		entityType: ENTITY_TYPES.USER,
		entityId: userId,
		message: NOTIFICATION_MESSAGES.FOLLOW.FOLLOW,
	});

	timelineService.updateTimelineByFollow(userId, followId, true);
};

const unFollowUser = async (userId, followId) => {
	const user = await User.findById(userId).select('following');
	if (!user.following.includes(followId)) {
		throw createHttpError(400, 'User is not followed');
	}

	await Promise.all([
		User.findByIdAndUpdate(userId, { $pull: { following: followId } }),
		User.findByIdAndUpdate(followId, { $pull: { followers: userId } }),
	]);

	notificationService.deleteNotification({
		sender: userId,
		entity: userId,
		type: NOTIFICATION_TYPES.FOLLOW,
	});

	timelineService.updateTimelineByFollow(userId, followId, false);
};

const increaseNumNotifications = async (userId) => {
	const { numNotifications, linkedAccounts } = await User.findByIdAndUpdate(
		userId,
		{ $inc: { numNotifications: 1 } },
		{
			new: true,
		},
	).select('numNotifications linkedAccounts');
	return { linkedAccounts, numNotifications };
};

const resetNumNotifications = async (userId) => {
	const { numNotifications } = await User.findByIdAndUpdate(
		userId,
		{ $set: { numNotifications: 0 } },
		{
			new: true,
		},
	).select('numNotifications');
	return numNotifications;
};

const getFollowing = async (userId, page, limit) => {
	const users = await User.find({
		followers: userId,
	})
		.select('name avatar email username')
		.limit(limit)
		.skip((page - 1) * limit);
	const total = await User.countDocuments({
		followers: userId,
	});
	const totalPages = Math.ceil(total / limit);
	const currentPage = page;
	return {
		items: users,
		currentPage,
		total,
		totalPages,
	};
};

const retrieveUserSendToClient = (user, userReqId) => {
	const {
		followers,
		following,
		profilePrivate,
		linkedAccounts = null,
		providerId = null,
		_v,
		updatedAt,
		numNotifications,
		status,
		...restUser
	} = user;
	return {
		...restUser,
		followingCount: following.length,
		followersCount: followers.length,
		followed: followers.some(
			(follower) => follower.toString() === userReqId.toString(),
		),
	};
};

// HELPERS

const checkUsernameAvailability = async (username) => {
	const countUser = await User.countDocuments({ username });
	return countUser === 0;
};

const userService = {
	createUser,
	getUser,
	searchByEmail,
	searchByName,
	followUser,
	unFollowUser,
	retrieveUserSendToClient,
	increaseNumNotifications,
	resetNumNotifications,
	checkUsernameAvailability,
	searchByField,
	getFollowing,
};

module.exports = userService;
const timelineService = require('./timeline.service');
const notificationService = require('./notification.service');
const {
	NOTIFICATION_TYPES,
	ENTITY_TYPES,
	NOTIFICATION_MESSAGES,
} = require('../configs');
const postService = require('./post.service');
