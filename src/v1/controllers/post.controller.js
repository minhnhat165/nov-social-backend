const redis = require('../databases/init.redis');
const client = require('../databases/init.redis');
const Post = require('../models/Post');
const User = require('../models/User');
const commentService = require('../services/comment.service');
const postService = require('../services/post.service');
const timelineService = require('../services/timeline.service');

const createPost = async (req, res) => {
	const { body, user } = req;
	const post = body;
	const newPost = await postService.createPost(post, user);
	// timelineService.addToTimelines(
	// 	[...user.followers.map((id) => id.toString()), user._id.toString()],
	// 	newPost._id,
	// );
	res.status(201).json(newPost);
};

const getPosts = async (req, res) => {
	const { q } = req.query;
	const { user } = req;
	const data = await postService.searchPosts({
		q,
		userId: user?._id?.toString(),
	});
	res.status(200).json({
		status: 'success',
		data,
	});
};

const getPostsByUserId = async (req, res) => {
	const { userId } = req.params;
	const { cursor, limit = 10 } = req.query;
	let { user } = req;
	let data = await postService.getPostsByUserId(
		userId,
		user?._id?.toString(),
		cursor,
		parseInt(limit),
		userId === user?._id?.toString(),
	);

	res.status(200).json({
		status: 'success',
		data,
	});
};

const getPost = async (req, res) => {
	const { id } = req.params;
	const { user } = req;
	let post = await postService.getPost(id, user);
	post = postService.convertPostSendToClient(
		post._doc,
		user?._id?.toString(),
	);

	res.status(200).json({
		post,
	});
};

const deletePost = async (req, res) => {
	const { id } = req.params;
	const { user } = req;
	await postService.deletePost(id, user);
	timelineService.removeFromTimelines(id);
	res.status(200).json({ message: 'Post deleted' });
};

const updatePost = async (req, res) => {
	const { id } = req.params;
	const { body: post, user } = req;
	const updatedPost = await postService.updatePost(id, post, user);
	console.log(updatedPost);
	res.status(200).json(updatedPost);
};

const likePost = async (req, res) => {
	const { id } = req.params;
	const { user } = req;
	await postService.likePost(id, user);
	res.status(200).json({
		status: 'success',
	});
};

const unlikePost = async (req, res) => {
	const { id } = req.params;
	const { user } = req;
	await postService.unlikePost(id, user);
	res.status(200).json({ status: 'success' });
};

const hidePost = async (req, res) => {
	const { id } = req.params;
	const { user } = req;
	await postService.hidePost(id, user?._id?.toString());
	timelineService.removeFromTimeline(user?._id?.toString(), id);
	res.status(200).json({ status: 'success' });
};

const unhidePost = async (req, res) => {
	const { id } = req.params;
	const { user } = req;
	await postService.unhidePost(id, user?._id?.toString());
	timelineService.addToTimeline(user?._id?.toString(), id);
	res.status(200).json({ status: 'success' });
};

const savePost = async (req, res) => {
	const { id } = req.params;
	const { user } = req;
	await postService.savePost(id, user?._id?.toString());
	res.status(200).json({ status: 'success' });
};

const unSavePost = async (req, res) => {
	const { id } = req.params;
	const { user } = req;
	await postService.unSavePost(id, user?._id?.toString());
	res.status(200).json({ status: 'success' });
};

const getPostComments = async (req, res) => {
	const { id } = req.params;
	const { limit = 10, cursor, commentId } = req.query;
	const { user } = req;
	const { comments, endCursor, hasMore } =
		await commentService.getCommentsByCursor({
			postId: id,
			limit: parseInt(limit),
			cursor,
			parentId: null,
			commentId,
		});

	res.status(200).json({
		hasMore,
		endCursor,
		comments: commentService.retrieveCommentsSendToClient(
			comments,
			user?._id?.toString(),
		),
	});
};

const getUsersLikedPost = async (req, res) => {
	const { id } = req.params;
	const users = await postService.getUsersLikedPost(id);
	res.status(200).json({
		items: users,
	});
};

const getUsersCommentedPost = async (req, res) => {
	const { id } = req.params;
	const users = await postService.getUsersCommentedPost(id);
	res.status(200).json({
		items: users,
	});
};

const searchPosts = async (req, res) => {
	const { q } = req.query;
	const { user } = req;
	const posts = await postService.searchPosts({
		q,
		userId: user?._id?.toString(),
	});
	res.status(200).json({
		items: posts,
	});
};

const PostController = {
	createPost,
	getPosts,
	getPost,
	deletePost,
	updatePost,
	likePost,
	unlikePost,
	hidePost,
	unhidePost,
	savePost,
	unSavePost,
	getPostComments,
	getPostsByUserId,
	getUsersLikedPost,
	getUsersCommentedPost,
	searchPosts,
};

module.exports = PostController;
