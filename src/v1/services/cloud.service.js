const {
	cloudinary_js_config,
	systemPublicIds,
} = require('../configs/cloudinary.config');
const fs = require('fs');

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
		if (!error.message.startsWith("Can't find folder with path")) {
			throw error;
		}
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
	if (systemPublicIds.includes(publicId)) return null;
	try {
		return await cloudinary_js_config.uploader.destroy(publicId);
	} catch (error) {
		console.log(error);
	}
};

const deleteImages = async (publicIds) => {
	if (!publicIds) return null;
	if (publicIds.some((publicId) => systemPublicIds.includes(publicId)))
		return null;

	try {
		return await cloudinary_js_config.api.delete_resources(publicIds);
	} catch (error) {
		console.log(error);
	}
};

const deleteFolder = async (path) => {
	if (!path) return null;
	try {
		await cloudinary_js_config.api.delete_resources_by_prefix(path);
		await cloudinary_js_config.api.delete_folder(path);
	} catch (error) {
		console.log(error);
	}
};

const getImagesByFolder = async ({ folder, limit = 9, next_cursor = null }) => {
	if (!folder) return null;
	try {
		const res = await cloudinary_js_config.search
			.expression(`folder:${folder}/*`)
			.max_results(limit)
			.sort_by('created_at', 'desc')
			.next_cursor(next_cursor)
			.execute();
		return res;
	} catch (error) {
		console.log(error);
	}
};

const cloudinaryService = {
	uploadImageBuffer,
	deleteImage,
	getImageWithDimension,
	getOriginalImage,
	deleteImages,
	deleteFolder,
	getImagesByFolder,
};

module.exports = cloudinaryService;
