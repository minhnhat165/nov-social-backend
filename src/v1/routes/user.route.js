const {
	validateParams,
	validateBody,
	schemas,
} = require('../middlewares/validation.middleware');

const passport = require('passport');

const userController = require('../controllers/user.controller');
const { upload } = require('../middlewares/upload.middleware');

const router = require('express-promise-router')();

router.get(
	'/profile/me',
	passport.authenticate('jwt', { session: false }),
	userController.getOwnProfile,
);
router.get(
	'/profile/:userId',
	validateParams(schemas.idSchema, 'userId'),
	userController.getProfile,
);
router.patch(
	'/profile',
	passport.authenticate('jwt', { session: false }),
	upload.fields([
		{ name: 'avatar', maxCount: 1 },
		{ name: 'cover', maxCount: 1 },
	]),
	validateBody(schemas.userProfileSchema),
	userController.updateProfile,
);

router.patch(
	'/follow/:userId',
	passport.authenticate('jwt', { session: false }),
	validateParams(schemas.idSchema, 'userId'),
	userController.followUser,
);

router.patch(
	'/unFollow/:userId',
	passport.authenticate('jwt', { session: false }),
	validateParams(schemas.idSchema, 'userId'),
	userController.unFollowUser,
);

router.get(
	'/:userId/photos',
	validateParams(schemas.idSchema, 'userId'),
	userController.getPhotos,
);

module.exports = router;
