const createHttpError = require('http-errors');
const { AVATAR_SIZE } = require('../configs');
const User = require('../models/User');
const {
	uploadImageBuffer,
	deleteImage,
	getOriginalImage,
	getImageWithDimension,
} = require('../services/cloud.service');

const getProfile = async (req, res, next) => {
	const { userId } = req.value.params;
	const user = await User.findById(userId).select('-password');
	if (!user) throw createHttpError.NotFound('User not found');
	if (user.avatarId)
		user.avatar = getImageWithDimension(
			user.avatarId,
			AVATAR_SIZE.MEDIUM,
			AVATAR_SIZE.MEDIUM,
		);
	return res.status(200).json({ success: true, user });
};

const updateProfile = async (req, res, next) => {
	const { user, files, body: updateData } = req;
	const { avatar, cover } = files;
	// data return to client
	const clientRes = updateData;
	// file avatarId and coverId
	Object.assign(
		user,
		await User.findById(user._id).select('avatarId coverId'),
	);
	// upload image to cloudinary
	const [newCoverId, newAvatarId] = await Promise.all([
		cover ? uploadImageBuffer(cover[0], user._id.toString()) : null,
		avatar ? uploadImageBuffer(avatar[0], user._id.toString()) : null,
	]);

	if (updateData?.cover === 'remove') {
		deleteImage(user?.coverId);
		user.coverId = null;
		// remove key cover from updateData
		updateData.cover = null;
		clientRes.cover = null;
	}
	if (newCoverId) {
		deleteImage(user?.coverId);
		user.coverId = newCoverId;
		clientRes.cover = getOriginalImage(newCoverId);
	}
	if (newAvatarId) {
		deleteImage(user.avatarId);
		user.avatarId = newAvatarId;
		clientRes.avatar = getOriginalImage(newAvatarId);
	}

	Object.assign(user, updateData);

	await user.save();
	return res.status(200).json({ success: true, data: clientRes });
};

module.exports = {
	getProfile,
	updateProfile,
};
