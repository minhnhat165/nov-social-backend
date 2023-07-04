const mongoose = require('mongoose');
const { NOTIFICATION_TYPES } = require('../configs');
const Schema = mongoose.Schema;

const NotificationSchema = new mongoose.Schema(
	{
		sender: {
			type: Schema.Types.ObjectId,
			ref: 'user',
		},
		receivers: {
			type: [Schema.Types.ObjectId],
			ref: 'user',
		},
		type: {
			type: String,
			enum: Object.values(NOTIFICATION_TYPES),
		},

		entityType: {
			type: String,
			enum: ['comment', 'post', 'user'],
		},
		entity: {
			type: Schema.Types.ObjectId,
			refPath: 'entityType',
		},
		message: {
			type: String,
			default: '',
		},
	},
	{ timestamps: true },
);

// crete index for user

NotificationSchema.index({ sender: 1 });

// primary for sender, entity, type
NotificationSchema.index({ sender: 1, entity: 1, type: 1 }, { unique: true });

const Notification = mongoose.model('notification', NotificationSchema);

module.exports = Notification;
