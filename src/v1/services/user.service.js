const createHttpError = require('http-errors');
const User = require('../models/User');
const redis = require('../databases/init.redis');
const Post = require('../models/Post');

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

	timelineService.addMultipleToTimeline(
		userId,
		await getUserPostIds(followId),
	);
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

	timelineService.removeMultipleFromTimeline(
		userId,
		await getUserPostIds(followId),
	);
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

const getUserPostIds = async (userId) => {
	let postIds = await getUserPostIdsFromCache(userId);
	if (!postIds) {
		postIds = await getUserPostIdsFromDB(userId);
		await redis.hsetobj(`user:${userId}`, 'postIds', postIds);
	}
	return postIds;
};

const getUserPostIdsFromDB = async (userId) => {
	const posts = await Post.find({ author: userId }).select('_id');
	return posts.map((post) => post._id);
};

// HELPERS

const checkUsernameAvailability = async (username) => {
	const countUser = await User.countDocuments({ username });
	return countUser === 0;
};

// cache

const USER_CACHE_PREFIX = 'user';

const getUserPostIdsFromCache = async (userId) => {
	const key = `${USER_CACHE_PREFIX}:${userId}`;
	const postIds = await redis.hgetobj(key, 'postIds');
	if (postIds) return postIds;
	return null;
};

const deleteUserPostIdsFromCache = async (userId) => {
	const key = `${USER_CACHE_PREFIX}:${userId}`;
	await redis.hdel(key, 'postIds');
};

const addPostIdToUserCache = async (userId, postId) => {
	const key = `${USER_CACHE_PREFIX}:${userId}`;
	await redis.hpusharr(key, 'postIds', postId, true);
};

const removePostIdFromUserCache = async (userId, postId) => {
	const key = `${USER_CACHE_PREFIX}:${userId}`;
	await redis.hpullarr(key, 'postIds', postId, true);
};

const userService = {
	createUser,
	getUser,
	searchByEmail,
	searchByName,
	followUser,
	unFollowUser,
	retrieveUserSendToClient,
	deleteUserPostIdsFromCache,
	addPostIdToUserCache,
	removePostIdFromUserCache,
	increaseNumNotifications,
	resetNumNotifications,
	checkUsernameAvailability,
	searchByField,
};

module.exports = userService;
const timelineService = require('./timeline.service');
const notificationService = require('./notification.service');
const {
	NOTIFICATION_TYPES,
	ENTITY_TYPES,
	NOTIFICATION_MESSAGES,
} = require('../configs');
