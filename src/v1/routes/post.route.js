const passport = require('passport');

const PostController = require('../controllers/post.controller');

const router = require('express-promise-router')();

router.post(
	'/',
	passport.authenticate('jwt', { session: false }),
	PostController.createPost,
);

router.get(
	'/',
	passport.authenticate('jwt', { session: false }),
	PostController.getPosts,
);

router.delete(
	'/:id',
	passport.authenticate('jwt', { session: false }),
	PostController.deletePost,
);

router.patch(
	'/:id',
	passport.authenticate('jwt', { session: false }),
	PostController.updatePost,
);

module.exports = router;
