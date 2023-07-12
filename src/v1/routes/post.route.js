const passport = require('passport');

const PostController = require('../controllers/post.controller');
const { verifyAccessTokenOptional } = require('../middlewares/jwt.middleware');
const {
	schemas,
	validateParams,
	validateQuery,
} = require('../middlewares/validation.middleware');

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

router.get(
	'/:id',
	validateParams(schemas.idSchema, 'id'),
	validateQuery(schemas.postSchema),
	verifyAccessTokenOptional,
	PostController.getPost,
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

router.patch(
	'/:id/like',
	passport.authenticate('jwt', { session: false }),
	PostController.likePost,
);

router.patch(
	'/:id/unlike',
	passport.authenticate('jwt', { session: false }),
	PostController.unlikePost,
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
	'/:id/comments',
	verifyAccessTokenOptional,
	PostController.getPostComments,
);
router.get(
	'/:id/users/liked',
	verifyAccessTokenOptional,
	PostController.getUsersLikedPost,
);

router.get(
	'/:id/users/commented',
	verifyAccessTokenOptional,
	PostController.getUsersCommentedPost,
);

router.get(
	'/user/:userId',
	validateParams(schemas.idSchema, 'userId'),
	verifyAccessTokenOptional,
	PostController.getPostsByUserId,
);

module.exports = router;
