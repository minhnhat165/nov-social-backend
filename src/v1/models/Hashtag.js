const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const HashtagSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			unique: true,
		},
		posts: {
			type: [Schema.Types.ObjectId],
			ref: 'post',
		},
	},
	{ timestamps: true },
);

const Hashtag = mongoose.model('hashtag', HashtagSchema);

module.exports = Hashtag;
