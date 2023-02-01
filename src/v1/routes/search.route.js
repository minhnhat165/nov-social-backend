const router = require('express-promise-router')();
const passport = require('passport');
const passportConfig = require('../middlewares/passport.middleware');
const {
	validateBody,
	schemas,
	authRegisterSchema,
	passwordSchema,
	validateParams,
} = require('../middlewares/validation.middleware');

const searchController = require('../controllers/search.controller');

router.get('/', searchController.search);

router.get(
	'/log',
	passport.authenticate('jwt', { session: false }),
	searchController.getSearchLog
);

router.post(
	'/log',
	passport.authenticate('jwt', { session: false }),
	searchController.updateSearchLog
);

router.delete(
	'/log/:searchId',
	passport.authenticate('jwt', { session: false }),
	searchController.deleteSearchLog
);

module.exports = router;
