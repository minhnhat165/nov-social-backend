const Notification = require('../models/Notification');
const createHttpError = require('http-errors');
const UserNotification = require('../models/UserNotification');
const { NOTIFICATION_TYPES, NOTIFICATION_MESSAGES } = require('../configs');

const POPULATE_OPTION = {
	path: 'notification',
	populate: [
		{
			path: 'sender',
			select: ['_id', 'name', 'avatar'],
		},
		{
			path: 'entity',
		},
	],
};
// WRITE
const createNotification = async ({
	sender,
	receivers,
	type,
	entityType,
	entityId,
	message,
}) => {
	receivers = receivers.filter(
		(receiver) => receiver.toString() !== sender.toString(),
	);
	let notification = await Notification.findOne({
		sender,
		type,
		entity: entityId,
	});
	if (!notification) {
		notification = await Notification.create({
			sender,
			receivers,
			type,
			entityType,
			entity: entityId,
			message,
		});
	} else {
		await notification.updateOne({
			$addToSet: {
				receivers: {
					$each: receivers,
				},
			},
		});
	}

	await Promise.all(
		receivers.map((receiver) =>
			createUserNotification(receiver, notification._id),
		),
	);
	return notification;
};

const createCommentNotification = async (commentId) => {
	const comment = await commentService.getCommentById(commentId);
	const post = await postService.getPostById(comment.postId);
	const parentComment = comment.parentId
		? await commentService.getCommentById(comment.parentId)
		: null;
	const sender = comment.author;
	const postAuthorId = post.author._id.toString();
	const parentCommentAuthorId = parentComment
		? parentComment.author._id.toString()
		: null;
	const mentions = comment.mentions.map((mention) => mention._id.toString());
	const hasMention = mentions.length > 0;

	if (hasMention) {
		let message = NOTIFICATION_MESSAGES.COMMENT.MENTION;
		// if (postAuthorId === sender._id.toString()) {
		// 	message += ' on his post';
		// }
		await createNotification({
			sender: sender._id,
			receivers: mentions,
			type: NOTIFICATION_TYPES.TAG,
			message,
			entityType: 'comment',
			entityId: comment._id,
		});
	}

	if (parentComment) {
		if (!mentions.includes(parentCommentAuthorId)) {
			let message = NOTIFICATION_MESSAGES.COMMENT.REPLY;
			if (parentCommentAuthorId === postAuthorId) {
				message += ' on your post';
			}
			await createNotification({
				sender: sender._id,
				receivers: [parentCommentAuthorId],
				type: NOTIFICATION_TYPES.COMMENT,
				message,
				entityType: 'comment',
				entityId: comment._id,
			});
		} // if user have mentioned notification already
	}

	if (parentCommentAuthorId === postAuthorId) return;
	if (mentions.includes(postAuthorId)) return;

	await createNotification({
		sender: sender._id,
		receivers: [postAuthorId],
		type: NOTIFICATION_TYPES.COMMENT,
		message: NOTIFICATION_MESSAGES.COMMENT.COMMENT,
		entityType: 'comment',
		entityId: comment._id,
	});
};

const createUserNotification = async (userId, notificationId) => {
	let userNotification = await UserNotification.findOne({
		user: userId,
		notification: notificationId,
	});

	if (!userNotification) {
		userNotification = new UserNotification({
			user: userId,
			notification: notificationId,
		});
		await userNotification.save();
		userService.increaseNumNotifications(userId);
	}
	return userNotification;
};

// READ
const getUserNotificationById = async (id, userId) => {
	const notification = await UserNotification.findOne({
		_id: id,
		user: userId,
	}).populate(POPULATE_OPTION);

	if (!notification) {
		throw createHttpError(404, 'Notification not found');
	}
	return notification;
};

const getUserNotifications = async ({ userId, page = 1, limit = 10 }) => {
	const notifications = await UserNotification.find({
		user: userId,
	})
		.populate(POPULATE_OPTION)
		.sort({ createdAt: -1 })
		.skip((page - 1) * limit)
		.limit(limit);

	return notifications;
};

const getUserNotificationCursor = async ({
	userId,
	cursor = new Date().toISOString(),
	limit = 10,
	isRead = null,
}) => {
	const notifications = await UserNotification.find({
		user: userId,
		createdAt: { $lt: cursor },
		...(isRead !== null && { isRead }),
	})
		.populate(POPULATE_OPTION)
		.sort({ createdAt: -1 })
		.limit(limit);
	const endCursor =
		notifications.length > 0
			? notifications[notifications.length - 1].createdAt
			: null;

	return {
		hasMore: notifications.length === limit,
		endCursor,
		items: retrieveUserNotificationsSendToClient(notifications),
	};
};

// DELETE
const deleteNotificationById = async (id) => {
	await Notification.deleteOne({ _id: id });
	await UserNotification.deleteMany({ notification: id });
	return true;
};
const deleteNotification = async (notificationData) => {
	const notification = await Notification.findOne({
		...notificationData,
	});
	if (!notification) return;
	notificationService.deleteNotificationById(notification._id);
	return true;
};

const deleteNotificationsByEntityId = async (entityId) => {
	const notifications = await Notification.find({ entity: entityId }).select(
		'_id',
	);
	await UserNotification.deleteMany({
		notification: {
			$in: notifications.map((notification) => notification._id),
		},
	});
	await Notification.deleteMany({ entity: entityId });
};

const deleteUserNotification = async (id, userId) => {
	const userNotification = await UserNotification.findOne({
		_id: id,
		user: userId,
	});

	if (!userNotification) {
		throw createHttpError(404, 'Notification not found');
	}

	const notification = await Notification.findById(
		userNotification.notification,
	);

	if (notification.receivers.length === 1) {
		await notification.remove();
	} else {
		notification.receivers = notification.receivers.filter(
			(receiver) => receiver.toString() !== userId.toString(),
		);
		await notification.save();
	}
	await userNotification.remove();
	return true;
};

// UPDATE
const markNotificationAsRead = async (id, userId) => {
	const notification = await UserNotification.findOne({
		_id: id,
		user: userId,
	});

	if (!notification) {
		throw createHttpError(404, 'Notification not found');
	}

	notification.isRead = true;
	await notification.save();
	return notification;
};

const markAllNotificationAsRead = async (userId) => {
	await UserNotification.updateMany({ user: userId }, { isRead: true });
	return true;
};

const updateNotificationTypeTag = async ({
	oldTags,
	newTags,
	entityId,
	entityType,
	sender,
}) => {
	// get tags add and remove
	const tagsAdd = newTags.filter((tag) => !oldTags.includes(tag));
	if (tagsAdd.length > 0) {
		await createNotification({
			sender: sender,
			receivers: tagsAdd,
			type: NOTIFICATION_TYPES.TAG,
			entityType: entityType,
			entityId: entityId,
			message: NOTIFICATION_MESSAGES.COMMENT.MENTION,
		});
	}
	const tagsRemove = oldTags.filter((tag) => !newTags.includes(tag));

	if (tagsRemove.length > 0) {
		const notification = await Notification.findOne({
			entity: entityId,
			type: NOTIFICATION_TYPES.TAG,
		});

		if (notification) {
			notification.receivers = notification.receivers.filter(
				(receiver) => !tagsRemove.includes(receiver.toString()),
			);
			if (notification.receivers.length === 0) {
				await notification.remove();
			} else await notification.save();

			await UserNotification.deleteMany({
				notification: notification._id,
				user: {
					$in: tagsRemove,
				},
			});
		}
	}
};

// HELPERS
const retrieveUserNotificationSendToClient = (userNotification) => {
	const { notification, isRead, _id, createdAt } = userNotification;
	const {
		entityType,
		entity: originalEntity,
		receivers,
		__v,
		...rest
	} = notification._doc;

	if (!originalEntity) return null;
	let entity;

	switch (entityType) {
		case 'post':
			entity = {
				type: 'post',
				data: {
					_id: originalEntity._id,
				},
			};
			break;
		case 'comment':
			entity = {
				type: 'comment',
				data: {
					_id: originalEntity._id,
					postId: originalEntity.postId,
				},
			};
			break;
		case 'user':
			entity = {
				type: 'user',
				data: {
					_id: originalEntity._id,
				},
			};
			break;
		default:
			break;
	}

	return {
		...rest,
		_id: _id,
		entity,
		isRead,
		createdAt,
	};
};

const retrieveUserNotificationsSendToClient = (userNotifications) => {
	const notifications = [];
	for (const userNotification of userNotifications) {
		const notification =
			retrieveUserNotificationSendToClient(userNotification);
		if (notification) notifications.push(notification);
	}
	return notifications;
};

const notificationService = {
	createNotification,
	getUserNotificationById,
	getUserNotifications,
	retrieveUserNotificationSendToClient,
	retrieveUserNotificationsSendToClient,
	getUserNotificationCursor,
	markNotificationAsRead,
	markAllNotificationAsRead,
	deleteUserNotification,
	createCommentNotification,
	deleteNotificationsByEntityId,
	updateNotificationTypeTag,
	deleteNotificationById,
	deleteNotification,
};

module.exports = notificationService;
const commentService = require('./comment.service');
const postService = require('./post.service');
const userService = require('./user.service');
