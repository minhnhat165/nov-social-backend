const passport = require('passport');
const feedController = require('../controllers/feed.controller');

const router = require('express-promise-router')();

router.get(
	'/timeline',
	passport.authenticate('jwt', { session: false }),
	feedController.getTimeLine,
);

module.exports = router;
