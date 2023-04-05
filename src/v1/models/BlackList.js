const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BlackListSchema = new mongoose.Schema(
	{
		user: {
			type: Schema.Types.ObjectId,
			ref: 'user',
		},
		users: {
			type: [Schema.Types.ObjectId],
			ref: 'user',
		},
		posts: {
			type: [Schema.Types.ObjectId],
			ref: 'post',
		},
	},
	{ timestamps: true },
);

// crete index for user

BlackListSchema.index({ user: 1 });
const BlackList = mongoose.model('BlackList', BlackListSchema);

module.exports = BlackList;
