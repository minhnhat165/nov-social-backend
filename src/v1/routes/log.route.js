const router = require('express-promise-router')();
const logController = require('../controllers/log.controller');
const passport = require('passport');
const passportConfig = require('../middlewares/passport.middleware');
const {
	validateBody,
	schemas,
	authRegisterSchema,
	passwordSchema,
	validateParams,
} = require('../middlewares/validation.middleware');

router.get(
	'/search',
	passport.authenticate('jwt', { session: false }),
	logController.search.getAll
);

router.put(
	'/search/user/:userId',
	validateParams(schemas.idSchema, 'userId'),
	passport.authenticate('jwt', { session: false }),
	logController.search.addUser
);

router.put(
	'/search/keyword/:keyword',
	passport.authenticate('jwt', { session: false }),
	logController.search.addKeyword
);

router.delete(
	'/search/user/:userId',
	validateParams(schemas.idSchema, 'userId'),
	passport.authenticate('jwt', { session: false }),
	logController.search.removeUser
);

router.delete(
	'/search/keyword/:keyword',
	passport.authenticate('jwt', { session: false }),
	logController.search.removeKeyword
);

module.exports = router;
