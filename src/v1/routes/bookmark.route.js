const passport = require('passport');
const BookmarkController = require('../controllers/bookmark.controller');

const router = require('express-promise-router')();

router.get(
	'/',
	passport.authenticate('jwt', { session: false }),
	BookmarkController.getBookmarks,
);

module.exports = router;
