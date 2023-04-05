const createHttpError = require('http-errors');
const { AVATAR_SIZE } = require('../configs');
const User = require('../models/User');
const {
	uploadImageBuffer,
	deleteImage,
	getImageWithDimension,
} = require('../services/cloud.service');
const userService = require('../services/user.service');

const getProfile = async (req, res, next) => {
	const { userId } = req.value.params;
	const { user: userReq } = req;
	const user = await User.findById(userId).populate('interests');
	if (!user) throw createHttpError.NotFound('User not found');
	const profile = {};

	const profilePrivate = user.profilePrivate;
	// remove private key from profile
	Object.keys(user._doc).forEach((key) => {
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
	return res.status(200).json({
		status: 'success',
		profile: userService.retrieveUserSendToClient(profile, userReq?._id),
	});
};

const getOwnProfile = async (req, res, next) => {
	const { user } = req;
	const profile = await User.findById(user._id).populate('interests');
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
	return res.status(200).json({ success: true, profile });
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
			cover ? uploadImageBuffer(cover[0], user._id.toString()) : null,
			avatar ? uploadImageBuffer(avatar[0], user._id.toString()) : null,
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
	const { page = 1, limit = 5 } = req.q;
	const { photos } = await User.findById(userId).select('photos');
	return res.status(200).json({
		status: 'success',
		photos,
	});
};

const searchUser = async (req, res, next) => {
	const { q, page, limit } = req.query;
	const users = await User.find({
		$or: [
			{ username: { $regex: q, $options: 'i' } },
			{ name: { $regex: q, $options: 'i' } },
		],
	})
		.select('username name avatarId')
		.limit(limit * 1)
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
			users,
			count,
		},
	});
};

const recommendUsers = async (req, res, next) => {
	const { limit = 10 } = req.query;
	// Find users who the logged-in user is not already following and who are not the logged-in user
	const recommendedUsers = await User.find({
		_id: { $ne: req.user._id },
		followers: { $nin: req.user._id },
	})
		.sort({ followers: -1 })
		.limit(parseInt(limit))
		.select('name username avatar')
		.lean();

	res.status(200).json({ users: recommendedUsers });
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
};
