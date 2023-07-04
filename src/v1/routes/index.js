const authRouter = require('./auth.route');
const userRouter = require('./user.route');
const searchRouter = require('./search.route');
const feedRouter = require('./feed.route');
const interestRouter = require('./interest.route');
const commentRouter = require('./comment.route');
const postRouter = require('./post.route');
const notificationRouter = require('./notification.route');
const useRoutes = (app) => {
	app.use('/api/auth', authRouter);
	app.use('/api/users', userRouter);
	app.use('/api/search', searchRouter);
	app.use('/api/posts', postRouter);
	app.use('/api/interests', interestRouter);
	app.use('/api/feed', feedRouter);
	app.use('/api/comments', commentRouter);
	app.use('/api/notifications', notificationRouter);
};

module.exports = useRoutes;
