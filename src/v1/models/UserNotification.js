const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserNotificationSchema = new mongoose.Schema(
	{
		user: {
			type: Schema.Types.ObjectId,
			ref: 'user',
		},
		isRead: {
			type: Boolean,
			default: false,
		},
		notification: {
			type: Schema.Types.ObjectId,
			ref: 'notification',
		},
	},
	{ timestamps: true },
);

// crete index for user

UserNotificationSchema.index({ user: 1 });
UserNotificationSchema.index({ user: 1, isRead: 1 });
// create primary key for user and notification
UserNotificationSchema.index({ user: 1, notification: 1 }, { unique: true });
const UserNotification = mongoose.model(
	'userNotification',
	UserNotificationSchema,
);

module.exports = UserNotification;
