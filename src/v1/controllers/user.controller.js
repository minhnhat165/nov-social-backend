const User = require('../models/User');
const { uploadImageBuffer, deleteImage } = require('../services/cloud.service');

const getProfile = async (req, res, next) => {
	const { userId } = req.value.params;
	const user = await User.findById(userId).select('-password');
	return res.status(200).json({ user });
};

const updateProfile = async (req, res, next) => {
	const { user, files } = req;
	const { avatar, cover } = files;
	Object.assign(user, await User.findById(user._id).select('linkedAccounts'));
	const [newCover, newAvatar] = await Promise.all([
		cover ? uploadImageBuffer(cover[0], user._id.toString()) : null,
		avatar ? uploadImageBuffer(avatar[0], user._id.toString()) : null,
	]);

	const updateData = req.body;

	if (updateData?.cover === 'remove') {
		if (user?.cover) deleteImage(user.cover);
		updateData.cover = null;
	}

	if (newCover) {
		if (user?.cover) {
			deleteImage(user.cover);
		}
		updateData.cover = newCover;
	}
	if (newAvatar) {
		if (user?.avatar) {
			deleteImage(user.avatar);
		}
		updateData.avatar = newAvatar;
	}
	Object.assign(user, updateData);

	await user.save();
	return res.status(200).json({ success: true, data: updateData });
};

module.exports = {
	getProfile,
	updateProfile,
};
