const router = require('express-promise-router')();
const passport = require('passport');
const passportConfig = require('../middlewares/passport.middleware');
const authController = require('../controllers/auth.controller');
const {
	validateBody,
	schemas,
	authRegisterSchema,
	passwordSchema,
	validateParams,
} = require('../middlewares/validation.middleware');
const { transferUser } = require('../middlewares/transferUser.middleware');

router.get(
	'/me',
	passport.authenticate('jwt', { session: false }),
	authController.getOwnProfile
);
// login
router.post(
	'/login',
	validateBody(schemas.authLoginSchema),
	authController.login
);

router.post(
	'/login/google',
	passport.authenticate('google-token', {
		session: false,
	}),
	authController.socialLogin
);

router.post(
	'/login/facebook',
	passport.authenticate('facebook-token', {
		session: false,
	}),
	authController.socialLogin
);

// add existing account
router.post(
	'/add-existing-account',
	passport.authenticate('jwt', { session: false }),
	validateBody(schemas.authLoginSchema),
	authController.addExistingAccountLocal,
	authController.addExistingAccount
);

router.post(
	'/add-existing-account/google',
	passport.authenticate('google-token', {
		session: false,
	}),
	transferUser,
	passport.authenticate('jwt', { session: false }),
	authController.addExistingAccountSocial,
	authController.addExistingAccount
);

router.post(
	'/add-existing-account/facebook',
	passport.authenticate('facebook-token', {
		session: false,
	}),
	transferUser,
	passport.authenticate('jwt', { session: false }),
	authController.addExistingAccountSocial,
	authController.addExistingAccount
);

router.delete(
	'/remove-linked-account/:userId',
	validateParams(schemas.idSchema, 'userId'),
	passport.authenticate('jwt', { session: false }),
	authController.removeLinkedAccount,
	authController.removeLinkedAccount
);

router.get(
	'/switch-account/:userId',
	validateParams(schemas.idSchema, 'userId'),
	passport.authenticate('jwt', { session: false }),
	authController.switchAccount
);

router.post(
	'/register',
	validateBody(authRegisterSchema),
	authController.register
);

router.post(
	'/email/exists',
	validateBody(schemas.authCheckEmailSchema),
	authController.checkEmailExists
);

router.post('/activation', authController.activeAccount);

router.post(
	'/password/forgot',
	validateBody(schemas.authCheckEmailSchema),
	authController.forgotPassword
);

router.post(
	'/password/forgot/verify',
	validateBody(schemas.authCheckEmailSchema),
	authController.verifyOTP
);

router.put(
	'/password',
	validateBody(passwordSchema),
	authController.updatePassword
);

router.get(
	'/login/google',
	passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
	'/login/google/callback',
	passport.authenticate('google', {
		failureRedirect: '/login',
		session: false,
	}),
	authController.socialLogin
);

router.get('/refresh_token', authController.refreshToken);
router.delete('/logout', authController.logout);

module.exports = router;
