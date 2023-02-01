const { cloudinary_js_config } = require('../configs/cloudinary.config');
const fs = require('fs');
const path = require('path');

const uploadImageBuffer = async (file, path) => {
	let tempPath = '';
	try {
		if (!file) return null;
		if (!path) throw new Error('Path is required');
		tempPath =
			'./uploads/' + new Date().getTime() + '-' + file.originalname;
		fs.writeFileSync(tempPath, file.buffer);

		const res = await cloudinary_js_config.uploader.upload(tempPath, {
			folder: path,
			use_filename: true,
			unique_filename: false,
		});
		return res.secure_url;
	} catch (error) {
		console.log(error);
	} finally {
		if (tempPath) fs.unlinkSync(tempPath);
	}
};
const getPublicId = (imageURL) => {
	return imageURL.split('/').slice(7).join('/').split('.')[0];
};
const deleteImage = async (path) => {
	try {
		const publicId = getPublicId(path);
		return await cloudinary_js_config.uploader.destroy(publicId);
	} catch (error) {
		console.log(error);
	}
};

module.exports = {
	uploadImageBuffer,
	deleteImage,
};
