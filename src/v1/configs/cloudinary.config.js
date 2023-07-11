const cloudinary = require('cloudinary').v2;
cloudinary.config({
	cloud_name: process.env.CLOUDINARY_NAME,
	api_key: process.env.CLOUDINARY_KEY,
	api_secret: process.env.CLOUDINARY_SECRET,
});

const systemPublicIds = [
	'v1689060128/_1f6505e1-ecab-4da2-8067-d5cf8bbe1fca_kvcqs7',
	'v1689060113/_63de5350-0f14-43ee-9e8f-eaf9ff20ac93_pu4pay',
	'v1689061596/_16409030-9393-4d44-85f0-44a0731acff0_csk1mr',
];

module.exports = {
	cloudinary_js_config: cloudinary,
	systemPublicIds,
};
