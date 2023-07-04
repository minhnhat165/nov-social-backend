const passport = require('passport');

const notificationController = require('../controllers/notification.controller');

const router = require('express-promise-router')();
router.get(
	'/',
	passport.authenticate('jwt', { session: false }),
	notificationController.getNotifications,
);
router.get(
	'/:id',
	passport.authenticate('jwt', { session: false }),
	notificationController.getNotification,
);

router.patch(
	'/:id/read',
	passport.authenticate('jwt', { session: false }),
	notificationController.markNotificationAsRead,
);

router.patch(
	'/read-all',
	passport.authenticate('jwt', { session: false }),
	notificationController.markAllNotificationAsRead,
);

router.delete(
	'/:id',
	passport.authenticate('jwt', { session: false }),
	notificationController.deleteNotification,
);

module.exports = router;
