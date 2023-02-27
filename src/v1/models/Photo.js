const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PhotoSchema = new mongoose.Schema({
	publicId: {
		type: String,
		required: true,
	},
	url: {
		type: String,
		required: true,
	},
	description: {
		type: String,
		default: '',
	},
});

module.exports = PhotoSchema;
