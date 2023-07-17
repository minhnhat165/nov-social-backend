const createHttpError = require('http-errors');
const { AVATAR_SIZE } = require('../configs');
const User = require('../models/User');
const Post = require('../models/Post');
const {
	uploadImageBuffer,
	deleteImage,
	getImageWithDimension,
	getImagesByFolder,
} = require('../services/cloud.service');
const userService = require('../services/user.service');

const getProfile = async (req, res, next) => {
	const { userId } = req.value.params;
	const { user: userReq } = req;
	const user = await User.findById(userId).populate('interests').lean();
	if (!user) throw createHttpError.NotFound('User not found');
	const profile = {};

	const profilePrivate = user.profilePrivate;
	// remove private key from profile
	Object.keys(user).forEach((key) => {
		if (!profilePrivate.includes(key)) {
			profile[key] = user[key];
		}
	});

	profile.photos = profile.photos.map((photo) =>
		getImageWithDimension(photo, 160, 160),
	);

	if (user.avatarId)
		profile.avatar = getImageWithDimension(
			user.avatarId,
			AVATAR_SIZE.MEDIUM,
			AVATAR_SIZE.MEDIUM,
		);
	const postsCount = await Post.countDocuments({ author: userId });
	profile.postsCount = postsCount;
	return res.status(200).json({
		status: 'success',
		profile: userService.retrieveUserSendToClient(
			profile,
			userReq?._id?.toString(),
		),
	});
};

const getOwnProfile = async (req, res, next) => {
	const { user } = req;
	const profile = await User.findById(user._id).populate('interests').lean();
	if (!profile) throw createHttpError.NotFound('User not found');
	profile.photos = profile.photos.map((photo) =>
		getImageWithDimension(photo, 160, 160),
	);
	if (profile.avatar && profile.avatarId)
		profile.avatar = getImageWithDimension(
			profile.avatarId,
			AVATAR_SIZE.MEDIUM,
			AVATAR_SIZE.MEDIUM,
		);
	const postsCount = await Post.countDocuments({ author: user._id });
	profile.postsCount = postsCount;
	return res.status(200).json({
		success: true,
		profile: userService.retrieveUserSendToClient(profile, user?._id, true),
	});
};

const getPreview = async (req, res, next) => {
	const { userId } = req.value.params;
	const { _id } = req.user;
	const preview = await User.findById(userId)
		.select('name username avatar following followers rank')
		.lean();
	const postsCount = await Post.countDocuments({ author: userId });
	preview.postsCount = postsCount;
	if (!preview) throw createHttpError.NotFound('User not found');
	return res.status(200).json({
		success: true,
		user: userService.retrieveUserSendToClient(preview, _id),
	});
};

const getTopRankers = async (req, res, next) => {
	const { limit = 10 } = req.query;
	const query = {
		rank: { $exists: true },
	};

	const users = await User.find(query)
		.sort({ 'rank.number': -1, 'rank.dateReached': 1 })
		.limit(parseInt(limit))
		.select('username avatar name rank')
		.lean();
	res.status(200).json({ users });
};

const updateProfile = async (req, res, next) => {
	const { user, files, body: clientRequestData } = req;
	const { avatar, cover } = files;
	const updateFields = Object.keys(clientRequestData);
	avatar && !updateFields.includes('avatar') && updateFields.push('avatar');
	cover && !updateFields.includes('cover') && updateFields.push('cover');

	if (updateFields.length === 0) {
		throw createHttpError.BadRequest('No data to update');
	}
	// data return to client
	const dataUpdate = {};
	const mediaUpdate = {};

	const isUpdateAvatar = updateFields.includes('avatar');
	const isUpdateCover = updateFields.includes('cover');

	if (isUpdateAvatar || isUpdateCover) {
		const userExtraData = await User.findById(user._id).select(
			`${isUpdateAvatar && 'avatarId'} ${
				isUpdateCover && 'coverId'
			} photos`,
		);
		let isPhotosChanged = false;

		let [newCoverId, newAvatarId] = await Promise.all([
			cover ? uploadImageBuffer(cover[0], user?._id?.toString()) : null,
			avatar ? uploadImageBuffer(avatar[0], user?._id?.toString()) : null,
		]);

		if (isUpdateCover) {
			deleteImage(userExtraData.coverId);
			userExtraData.photos = userExtraData.photos.filter(
				(photo) => photo !== userExtraData.coverId,
			);
			if (clientRequestData?.cover === 'remove') {
				newCoverId = null;
				mediaUpdate.cover = null;
			}
			mediaUpdate.coverId = newCoverId;
			if (newCoverId) userExtraData.photos.push(newCoverId);
			isPhotosChanged = true;
		}
		if (newAvatarId) {
			deleteImage(userExtraData.avatarId);
			userExtraData.photos = userExtraData.photos.filter(
				(photo) => photo !== userExtraData.avatarId,
			);
			mediaUpdate.avatarId = newAvatarId;
			userExtraData.photos.push(newAvatarId);
			isPhotosChanged = true;
		}
		if (isPhotosChanged) {
			mediaUpdate.photos = userExtraData.photos;
		}
	}
	if (clientRequestData.interests) {
		clientRequestData.interests = [
			...JSON.parse(clientRequestData.interests),
		];
	}

	if (clientRequestData.profilePrivate) {
		clientRequestData.profilePrivate = [
			...JSON.parse(clientRequestData.profilePrivate),
		];
	}

	Object.assign(dataUpdate, clientRequestData, mediaUpdate);

	const keyUpdateStrings = updateFields.join(' ');

	const userUpdated = await User.findByIdAndUpdate(user._id, dataUpdate, {
		new: true,
	})
		.select(keyUpdateStrings)
		.populate(keyUpdateStrings);

	if (mediaUpdate.avatarId)
		userUpdated.avatar = getImageWithDimension(
			mediaUpdate.avatarId,
			AVATAR_SIZE.MEDIUM,
			AVATAR_SIZE.MEDIUM,
		);

	return res.status(200).json({
		status: 'success',
		data: userUpdated,
	});
};

const followUser = async (req, res, next) => {
	const { user } = req;
	const { userId: followId } = req.value.params;
	await userService.followUser(user._id, followId);
	return res.status(200).json({
		status: 'success',
	});
};

const unFollowUser = async (req, res, next) => {
	const { user } = req;
	const { userId: followId } = req.value.params;
	await userService.unFollowUser(user._id, followId);
	return res.status(200).json({
		status: 'success',
	});
};

const getPhotos = async (req, res, next) => {
	const { userId } = req.value.params;
	const { limit = 5, endCursor } = req.query;
	const data = await getImagesByFolder({
		folder: userId,
		limit,
		next_cursor: endCursor,
	});
	const photos = data.resources.map((photo) => ({
		_id: photo.public_id,
		url: photo.secure_url,
	}));

	return res.status(200).json({
		status: 'success',
		data: {
			items: photos,
			endCursor: data?.next_cursor,
			hasNextPage: !!data?.next_cursor,
		},
	});
};

const getProfilePhotos = async (req, res, next) => {
	const { userId } = req.value.params;
	const { photos } = await User.findById(userId).select('photos');
	return res.status(200).json({
		status: 'success',
		photos,
	});
};

const searchUser = async (req, res, next) => {
	const { q, page = 1, limit = 10 } = req.query;
	const users = await User.find({
		$or: [
			{ username: { $regex: q, $options: 'i' } },
			{ name: { $regex: q, $options: 'i' } },
		],
	})
		.select('username name avatarId coverId')
		.limit(limit * 1)
		.sort({ name: 1 })
		.skip((page - 1) * limit)
		.lean()
		.exec();
	const count = await User.countDocuments({
		$or: [
			{ username: { $regex: q, $options: 'i' } },
			{ name: { $regex: q, $options: 'i' } },
		],
	});
	return res.status(200).json({
		status: 'success',
		data: {
			items: users,
			total: count,
			currentPage: page,
			totalPage: Math.ceil(count / limit),
		},
	});
};

const recommendUsers = async (req, res, next) => {
	let { limit = 10, page = 1 } = req.query;
	limit = parseInt(limit);
	page = parseInt(page);
	const recommendedUsers = await User.find({
		_id: { $ne: req.user._id },
		followers: { $nin: req.user._id },
	})
		.limit(limit)
		.skip((page - 1) * limit)
		.select('name username avatar')
		.lean();

	const total = await User.countDocuments({
		_id: { $ne: req.user._id },
		followers: { $nin: req.user._id },
	});

	const totalPage = Math.ceil(total / limit);

	res.status(200).json({
		status: 'success',
		data: {
			items: [
				...recommendedUsers.map((user) => ({
					...user,
					followed: false,
				})),
			],
			total,
			totalPage,
			currentPage: page,
		},
	});
};

const getMentions = async (req, res, next) => {
	const { q } = req.query;
	const users = await User.find({
		$or: [
			{ username: { $regex: q, $options: 'i' } },
			{ name: { $regex: q, $options: 'i' } },
		],
	})
		.select('username name avatar')
		.limit(5)
		.lean()
		.exec();
	return res.status(200).json({
		status: 'success',
		mentions: users,
	});
};

const readNotify = async (req, res, next) => {
	const { user } = req;
	await userService.resetNumNotifications(user._id);
	return res.status(200).json({
		status: 'success',
	});
};

const checkUsernameAvailability = async (req, res, next) => {
	const { username } = req.query;
	const available = await userService.checkUsernameAvailability(username);
	return res.status(200).json({
		available,
	});
};

const getFollowing = async (req, res, next) => {
	const { userId } = req.value.params;
	const { page = 1, limit = 5 } = req.query;
	const data = await userService.getFollowing(
		userId,
		parseInt(page),
		parseInt(limit),
	);
	return res.status(200).json({
		status: 'success',
		data,
	});
};

const getFollow = async (req, res, next) => {
	const { userId } = req.value.params;
	let { page = 1, limit = 5, type = 'following', q } = req.query;
	page = parseInt(page);
	limit = parseInt(limit);
	const query = {};
	if (q) {
		query.$or = [
			{ username: { $regex: q, $options: 'i' } },
			{ name: { $regex: q, $options: 'i' } },
		];
	}
	switch (type) {
		case 'following':
			query.followers = userId;
			break;
		case 'followers':
			query.following = userId;
			break;
		default:
			query.followers = userId;
			break;
	}

	const data = await User.find(query)
		.select('name avatar email username')
		.limit(limit)
		.skip((page - 1) * limit)
		.lean()
		.exec();

	const total = await User.countDocuments(query);
	const totalPages = Math.ceil(total / limit);
	const currentPage = page;

	return res.status(200).json({
		status: 'success',
		data: {
			items: data,
			total,
			totalPages,
			currentPage,
		},
	});
};

module.exports = {
	getProfile,
	updateProfile,
	getOwnProfile,
	followUser,
	unFollowUser,
	getPhotos,
	searchUser,
	getMentions,
	getTopRankers,
	recommendUsers,
	getPreview,
	readNotify,
	checkUsernameAvailability,
	getProfilePhotos,
	getFollowing,
	getFollow,
};
