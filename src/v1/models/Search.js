const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SearchSchema = new Schema(
	{
		type: {
			type: String,
			enum: ['user', 'keyword', 'location'],
		},
		text: {
			type: String,
			required: true,
		},
		data: {
			user: {
				type: Schema.Types.ObjectId,
				ref: 'user',
			},
			keyword: {
				type: String,
			},
			location: {
				type: String,
			},
		},
		count: {
			type: Number,
			default: 1,
		},
	},
	{ timestamps: true }
);

module.exports = mongoose.model('search', SearchSchema);
