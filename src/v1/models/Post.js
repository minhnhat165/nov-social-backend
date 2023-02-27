const mongoose = require('mongoose');
const Photo = require('./Photo');
const Schema = mongoose.Schema;
const PollOptionSchema = new mongoose.Schema(
	{
		value: {
			type: String,
			required: true,
		},
		votes: {
			type: Number,
			default: 0,
		},

		voters: {
			type: [Schema.Types.ObjectId],
			ref: 'user',
		},
		createdBy: {
			type: Schema.Types.ObjectId,
			ref: 'user',
		},
	},
	{ timestamps: true },
);

const PollSchema = new mongoose.Schema(
	{
		options: {
			type: [PollOptionSchema],
			required: true,
		},
		allowAddNewOptions: {
			type: Boolean,
			default: false,
		},

		allowMultipleVotes: {
			type: Boolean,
			default: false,
		},

		duration: {
			type: Number,
			default: null, // 24 hours
		},
		status: {
			type: String,
			enum: ['open', 'closed'],
			default: 'open',
		},
		timerId: {
			type: String,
			default: null,
		},
	},
	{ timestamps: true },
);

const PostSchema = new mongoose.Schema(
	{
		author: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'user',
		},
		visibility: {
			type: String,
			enum: ['public', 'private', 'followers', 'custom'],
			default: 'public',
		},
		allowedUsers: {
			type: [Schema.Types.ObjectId],
			ref: 'user',
		},

		blockedUsers: {
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
			type: PollSchema,
			default: null,
		},
	},
	{ timestamps: true },
);

const Post = mongoose.model('post', PostSchema);

module.exports = Post;
