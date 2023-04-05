const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BookmarkSchema = new mongoose.Schema(
	{
		user: {
			type: Schema.Types.ObjectId,
			ref: 'user',
		},
		posts: {
			type: [Schema.Types.ObjectId],
			ref: 'post',
		},
	},
	{ timestamps: true },
);

BookmarkSchema.index({ user: 1 });

const Bookmark = mongoose.model('Bookmark', BookmarkSchema);

module.exports = Bookmark;
