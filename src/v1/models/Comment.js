const mongoose = require('mongoose');
const Photo = require('./Photo');
const Notification = require('./Notification');
const Schema = mongoose.Schema;
const CommentSchema = new mongoose.Schema(
	{
		author: {
			type: Schema.Types.ObjectId,
			required: true,
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
		postId: {
			type: String,
			required: true,
		},
		parentId: {
			type: String,
			default: null,
		},
		path: {
			type: String,
			default: null,
		},
		numReplies: {
			type: Number,
			default: 0,
		},
	},
	{ timestamps: true },
);
CommentSchema.index({ postId: 1 });
CommentSchema.index({ postId: 1, parentId: 1 });

const Comment = mongoose.model('comment', CommentSchema);

module.exports = Comment;
