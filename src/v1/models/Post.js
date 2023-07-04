const mongoose = require('mongoose');
const Photo = require('./Photo');
const { POST } = require('../configs');
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
			enum: Object.values(POST.VISIBILITY),
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
