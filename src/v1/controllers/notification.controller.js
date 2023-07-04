const notificationService = require('../services/notification.service');

const getNotification = async (req, res) => {
	const { id } = req.params;
	const { user } = req;
	const userNotification = await notificationService.getUserNotificationById(
		id,
		user._id,
	);
	res.status(200).json({
		status: 'success',
		notification: notificationService.retrieveUserNotificationSendToClient(
			userNotification._doc,
		),
	});
};

const getNotifications = async (req, res) => {
	const { user } = req;
	const { limit, cursor, isRead = null } = req.query;

	const pageData = await notificationService.getUserNotificationCursor({
		userId: user._id.toString(),
		limit: parseInt(limit),
		cursor,
		isRead,
	});
	res.status(200).json({
		...pageData,
	});
};

const markNotificationAsRead = async (req, res) => {
	const { id } = req.params;
	const { user } = req;
	await notificationService.markNotificationAsRead(id, user._id);
	res.status(200).json({
		status: 'success',
	});
};

const markAllNotificationAsRead = async (req, res) => {
	const { user } = req;
	await notificationService.markAllNotificationAsRead(user._id);
	res.status(200).json({
		status: 'success',
	});
};

const deleteNotification = async (req, res) => {
	const { id } = req.params;
	const { user } = req;
	await notificationService.deleteUserNotification(id, user._id);
	res.status(200).json({
		status: 'success',
	});
};

const notificationController = {
	getNotification,
	getNotifications,
	markNotificationAsRead,
	markAllNotificationAsRead,
	deleteNotification,
};

module.exports = notificationController;
