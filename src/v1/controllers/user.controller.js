const createHttpError = require('http-errors');
const { AVATAR_SIZE } = require('../configs');
const User = require('../models/User');
const {
	uploadImageBuffer,
	deleteImage,
	getImageWithDimension,
} = require('../services/cloud.service');

const getProfile = async (req, res, next) => {
	const { userId } = req.value.params;
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
	return res.status(200).json({ success: true, profile });
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
	const { userId } = req.value.params;
	await User.updateOne(
		{ _id: user._id },
		{ $addToSet: { following: userId } },
	);

	await Promise.all([
		User.updateOne({ _id: user._id }, { $addToSet: { following: userId } }),
		User.updateOne({ _id: userId }, { $addToSet: { followers: user._id } }),
	]);

	return res.status(200).json({
		status: 'success',
		data: {
			message: 'Follow user successfully',
		},
	});
};

const unFollowUser = async (req, res, next) => {
	const { user } = req;
	const { userId } = req.value.params;
	await Promise.all([
		User.updateOne({ _id: user._id }, { $pull: { following: userId } }),
		User.updateOne({ _id: userId }, { $pull: { followers: user._id } }),
	]);

	return res.status(200).json({
		status: 'success',
		data: {
			message: 'UnFollow user successfully',
		},
	});
};

const getPhotos = async (req, res, next) => {
	const { userId } = req.value.params;
	const { page, limit } = req.query;
	const { photos } = await User.findById(userId).select('photos');
	return res.status(200).json({
		status: 'success',
		photos,
	});
};

module.exports = {
	getProfile,
	updateProfile,
	getOwnProfile,
	followUser,
	unFollowUser,
	getPhotos,
};