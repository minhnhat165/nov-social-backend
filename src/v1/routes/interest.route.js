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
const interestController = require('../controllers/interest.controller');

router.get(
	'/categories',
	passport.authenticate('jwt', { session: false }),
	interestController.getAllCategories,
);

module.exports = router;
