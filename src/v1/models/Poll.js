const mongoose = require('mongoose');
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

module.exports = { PollSchema, PollOptionSchema };
