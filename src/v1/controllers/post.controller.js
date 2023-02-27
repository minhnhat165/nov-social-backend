const Post = require('../models/Post');
const postService = require('../services/post.service');

const createPost = async (req, res) => {
	const { body, user } = req;
	const post = body;
	const newPost = await postService.createPost(post, user);
	await newPost.populate('author', 'avatar name');
	res.status(201).json(newPost);
};

const getPosts = async (req, res) => {
	const { lastCreatedAt, limit = 10 } = req.query;
	const posts = await Post.find(
		lastCreatedAt ? { createdAt: { $lt: lastCreatedAt } } : {},
	)
		.sort({ createdAt: -1 }) // Sort posts by createdAt field in descending order
		.limit(limit)
		.populate('author', 'avatar name');

	res.status(200).json(posts);
};

const deletePost = async (req, res) => {
	const { id } = req.params;
	const { user } = req;
	await postService.deletePost(id, user);
	res.status(200).json({ message: 'Post deleted' });
};

const updatePost = async (req, res) => {
	const { id } = req.params;
	const { body: post, user } = req;
	const updatedPost = await postService.updatePost(id, post, user);
	res.status(200).json(updatedPost);
};

const PostController = {
	createPost,
	getPosts,
	deletePost,
	updatePost,
};

module.exports = PostController;
