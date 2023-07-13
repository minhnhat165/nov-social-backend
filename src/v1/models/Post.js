const mongoose = require('mongoose');
const Photo = require('./Photo');
const { POST } = require('../configs');
const Schema = mongoose.Schema;

const PostSchema = new mongoose.Schema(
	{
		author: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'user',
		},
		visibility: {
			type: String,
			enum: Object.values(POST.VISIBILITY),
			default: 'public',
		},
		allowedList: {
			type: [Schema.Types.ObjectId],
			ref: 'user',
		},

		blockedList: {
			type: [Schema.Types.ObjectId],
			ref: 'user',
		},

		content: {
			type: String,
		},
		photos: {
			type: [Photo],
			default: null,
		},
		likes: {
			type: [Schema.Types.ObjectId],
			ref: 'user',
		},
		hashtags: {
			type: [Schema.Types.ObjectId],
			ref: 'hashtag',
		},
		mentions: {
			type: [Schema.Types.ObjectId],
			ref: 'user',
		},
		poll: {
			type: Schema.Types.ObjectId,
			default: null,
			ref: 'poll',
		},
		numComments: {
			type: Number,
			default: 0,
		},
	},
	{ timestamps: true },
);

const Post = mongoose.model('post', PostSchema);

// create index user field for faster search
PostSchema.index({ author: 1 });

module.exports = Post;
