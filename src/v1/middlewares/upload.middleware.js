const multer = require('multer');
const memoryStorage = multer.memoryStorage();
const upload = multer({
	storage: memoryStorage,
});

exports.upload = upload;
