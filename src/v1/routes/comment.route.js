const passport = require('passport');

const PostController = require('../controllers/post.controller');
const CommentController = require('../controllers/comment.controller');
const { verifyAccessTokenOptional } = require('../middlewares/jwt.middleware');

const router = require('express-promise-router')();

router.post(
	'/',
	passport.authenticate('jwt', { session: false }),
	CommentController.createComment,
);

router.get(
	'/',
	passport.authenticate('jwt', { session: false }),
	PostController.getPosts,
);

router.delete(
	'/:id',
	passport.authenticate('jwt', { session: false }),
	CommentController.deleteComment,
);

router.patch(
	'/:id',
	passport.authenticate('jwt', { session: false }),
	CommentController.updateComment,
);

router.patch(
	'/:id/like',
	passport.authenticate('jwt', { session: false }),
	CommentController.likeComment,
);

router.patch(
	'/:id/unlike',
	passport.authenticate('jwt', { session: false }),
	CommentController.unlikeComment,
);

router.patch(
	'/:id/hide',
	passport.authenticate('jwt', { session: false }),
	PostController.hidePost,
);

router.patch(
	'/:id/unhide',
	passport.authenticate('jwt', { session: false }),
	PostController.unhidePost,
);

router.patch(
	'/:id/save',
	passport.authenticate('jwt', { session: false }),
	PostController.savePost,
);

router.patch(
	'/:id/unsave',
	passport.authenticate('jwt', { session: false }),
	PostController.unSavePost,
);
router.get(
	'/:id/child',
	verifyAccessTokenOptional,
	CommentController.getChildComments,
);

module.exports = router;
