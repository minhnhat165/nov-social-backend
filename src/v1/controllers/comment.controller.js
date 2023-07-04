const commentService = require('../services/comment.service');
const postService = require('../services/post.service');
const timelineService = require('../services/timeline.service');

const createComment = async (req, res) => {
	const { body, user } = req;
	const comment = body;
	const newComment = await commentService.createComment(comment, user._id);
	res.status(201).json({
		status: 'success',
		comment: newComment,
	});
};

const getChildComments = async (req, res) => {
	const { id } = req.params;
	const { limit = 10, page } = req.query;
	const { user } = req;
	const { total, comments } = await commentService.getCommentByParentId(
		id,
		parseInt(page),
		parseInt(limit),
	);
	res.status(200).json({
		status: 'success',
		total,
		comments: commentService.retrieveCommentsSendToClient(
			comments,
			user?._id?.toString(),
		),
	});
};

const updateComment = async (req, res) => {
	const { id } = req.params;
	const { body: comment, user } = req;
	const updatedComment = await commentService.updateComment(
		id,
		comment,
		user._id,
	);
	res.status(200).json({
		status: 'success',
		comment: updatedComment,
	});
};

const deleteComment = async (req, res) => {
	const { id } = req.params;
	const { user } = req;
	const { numCommentsDeleted } = await commentService.deleteComment(
		id,
		user._id.toString(),
	);
	res.status(200).json({
		status: 'ok',
		numCommentsDeleted,
	});
};

const likeComment = async (req, res) => {
	const { id } = req.params;
	const { user } = req;
	await commentService.likeComment(id, user._id.toString());
	res.status(200).json({
		status: 'success',
	});
};

const unlikeComment = async (req, res) => {
	const { id } = req.params;
	const { user } = req;
	await commentService.unlikeComment(id, user._id.toString());
	res.status(200).json({ status: 'success' });
};

const hidePost = async (req, res) => {
	const { id } = req.params;
	const { user } = req;
	await postService.hidePost(id, user._id.toString());
	timelineService.removeFromTimeline(user._id.toString(), id);
	res.status(200).json({ status: 'success' });
};

const unhidePost = async (req, res) => {
	const { id } = req.params;
	const { user } = req;
	await postService.unhidePost(id, user._id.toString());
	timelineService.addToTimeline(user._id.toString(), id);
	res.status(200).json({ status: 'success' });
};

const savePost = async (req, res) => {
	const { id } = req.params;
	const { user } = req;
	await postService.savePost(id, user._id.toString());
	res.status(200).json({ status: 'success' });
};

const unSavePost = async (req, res) => {
	const { id } = req.params;
	const { user } = req;
	await postService.unSavePost(id, user._id.toString());
	res.status(200).json({ status: 'success' });
};

const CommentController = {
	createComment,
	getChildComments,
	updateComment,
	deleteComment,
	likeComment,
	unlikeComment,
	hidePost,
	unhidePost,
	savePost,
	unSavePost,
};

module.exports = CommentController;
