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
		});
		return res.public_id;
	} catch (error) {
		console.log(error);
	} finally {
		if (tempPath) fs.unlinkSync(tempPath);
	}
};

const getImageWithDimension = (publicId, width, height) => {
	if (!publicId) return null;
	return `https://res.cloudinary.com/${process.env.CLOUDINARY_NAME}/image/upload/c_fill,h_${height},w_${width}/${publicId}`;
};

const getOriginalImage = (publicId) => {
	if (!publicId) return null;
	return `https://res.cloudinary.com/${process.env.CLOUDINARY_NAME}/image/upload/${publicId}`;
};

const getPublicId = (imageURL) => {
	return imageURL.split('/').slice(7).join('/').split('.')[0];
};
const deleteImage = async (publicId) => {
	if (!publicId) return null;
	try {
		return await cloudinary_js_config.uploader.destroy(publicId);
	} catch (error) {
		console.log(error);
	}
};

module.exports = {
	uploadImageBuffer,
	deleteImage,
	getImageWithDimension,
	getOriginalImage,
};
