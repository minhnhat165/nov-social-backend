const Hashtag = require('../models/Hashtag');
const createHttpError = require('http-errors');
const Comment = require('../models/Comment');

// READ
const getCommentById = async (id) => {
	const comment = await Comment.findById(id).populate(
		'author',
		'avatar name username',
	);
	if (!comment) {
		throw new createHttpError(404, 'Comment not found');
	}
	return comment;
};

const getCommentsByPostId = async (
	postId,
	page = 0,
	limit = 10,
	parentId = null,
) => {
	await postService.getPostById(postId);
	const comments = await Comment.find({ postId, parentId })
		.sort({ createdAt: 1 })
		.skip(page * limit)
		.limit(limit)
		.populate('author', 'avatar name username')
		.lean();
	const total = await Comment.countDocuments({ postId, parentId });
	return { comments, total };
};

const getCommentsByCursor = async ({
	postId,
	parentId = null,
	cursor = null,
	limit = 10,
}) => {
	await postService.getPostById(postId);
	const query = { postId, parentId };
	if (cursor) {
		query.createdAt = { $gt: cursor };
	}
	const comments = await Comment.find(query)
		.sort({ createdAt: 1 })
		.limit(limit)
		.populate('author', 'avatar name username');
	return {
		comments,
		endCursor: comments.length
			? comments[comments.length - 1].createdAt
			: null,
		hasMore: comments.length === limit,
	};
};

const getCommentByParentId = async (parentId, page = 0, limit = 10) => {
	const parentComment = await getCommentById(parentId);

	const comments = await getCommentsByPostId(
		parentComment.postId,
		page,
		limit,
		parentId,
	);
	return comments;
};

// WRITE
const createComment = async (comment, authorId) => {
	let {
		content,
		photos,
		hashtags: hashtagNames = [],
		mentions,
		postId,
		parentId = null,
	} = comment;
	const post = await postService.getPostById(postId);

	let path = post._id.toString();

	const parentComment = parentId && (await getCommentById(parentId));
	if (parentComment) {
		path = parentComment.path + '/' + parentComment._id.toString();
	}

	const allHashtags = await handleHashtags(hashtagNames);
	mentions = mentions ? [...new Set(mentions)] : [];
	let newComment = new Comment({
		author: authorId,
		content,
		photos,
		hashtags: allHashtags,
		postId,
		parentId,
		path,
		mentions,
	});
	newComment = await newComment.save();
	await newComment.populate('author', 'avatar name username');
	// update num replies for parent comments
	const { parentIds } = extractPath(path);
	Promise.all(
		parentIds.map((parentId) => {
			updateNumReplies(parentId, 1);
		}),
	);

	postService.updateNumComments(postId, 1);
	notificationService.createCommentNotification(newComment._id);
	return newComment;
};

const getCommentWhitRelative = async (commentId) => {
	const comment = await getCommentById(commentId);
	const { path } = comment;
	const { parentIds } = extractPath(path);
	const rootParentId = parentIds[0];
	let comments = await Comment.find({
		// id = root or root include path
		$or: [{ _id: rootParentId }, { path: new RegExp(`^${path}/?$`) }],
	})
		.sort({ createdAt: 1 })
		.populate('author', 'avatar name username');

	const numNextComments = await Comment.countDocuments({
		createdAt: { $gt: comment.createdAt },
	});

	return {
		numNextComments,
		comments: comments,
	};
};

// UPDATE
const updateComment = async (commentId, data, authorId) => {
	let { content, photos, hashtags: hashtagNames, mentions } = data;
	let dataUpdate = {};
	const commentUpdate = await getCommentById(commentId);
	if (commentUpdate.author._id.toString() !== authorId.toString())
		throw new createHttpError(403, 'Unauthorized');

	if (hashtagNames) {
		const newHashtags = await handleHashtags(hashtagNames);
		if (newHashtags.length > 0) dataUpdate.hashtags = newHashtags;
		// get old hashtags
		const oldHashtags = commentUpdate.hashtags || [];

		// hashtags that need to be removed
		const hashtagsToRemove = oldHashtags.filter(
			(hashtag) => !newHashtags.includes(hashtag),
		);

		//update post in hashtag
		await Hashtag.updateMany(
			{ _id: { $in: newHashtags } },
			{ $push: { posts: commentUpdate._id } },
		);
		await Hashtag.updateMany(
			{ _id: { $in: hashtagsToRemove } },
			{ $pull: { posts: commentUpdate._id } },
		);
	}

	if (content) dataUpdate.content = content;
	if (photos) {
		const oldPhotoIds = commentUpdate.photos.map((photo) => photo.publicId);
		const newPhotoIds = photos.map((photo) => photo.publicId);
		const photoIdsRemove = oldPhotoIds.filter(
			(photoId) => !newPhotoIds.includes(photoId),
		);
		cloudinaryService.deleteImages(photoIdsRemove);
		dataUpdate.photos = photos;
	}

	if (mentions) {
		mentions = [...new Set(mentions)];
		dataUpdate.mentions = mentions;
		notificationService.updateNotificationTypeTag({
			oldTags: commentUpdate.mentions,
			newTags: mentions,
			sender: commentUpdate.author,
			entityId: commentUpdate._id,
			entityType: 'comment',
		});
	}
	const updatedComment = await Comment.findByIdAndUpdate(
		commentId,
		dataUpdate,
		{
			new: true,
		},
	).select(Object.keys(dataUpdate).join(' '));

	return updatedComment;
};

const updateNumReplies = async (commentId, num) => {
	const comment = await Comment.findByIdAndUpdate(
		commentId,
		{ $inc: { numReplies: num } },
		{ new: true },
	);
	return comment;
};

const likeComment = async (commentId, userId) => {
	let comment = await getCommentById(commentId);
	const { likes } = comment;
	const isLiked = likes.some((like) => like.toString() === userId);

	if (isLiked) throw new createHttpError(400, 'Comment already liked');

	comment = await Comment.findByIdAndUpdate(
		commentId,
		{
			$push: { likes: userId },
		},
		{ new: true },
	);
	notificationService.createNotification({
		sender: userId,
		receivers: [comment.author._id],
		entityId: comment._id,
		entityType: 'comment',
		type: NOTIFICATION_TYPES.LIKE,
		message: NOTIFICATION_MESSAGES.LIKE.COMMENT,
	});
	return comment;
};

const unlikeComment = async (commentId, userId) => {
	let comment = await getCommentById(commentId);

	const { likes } = comment;
	const isLiked = likes.some((like) => like.toString() === userId);

	if (!isLiked) throw new createHttpError(400, 'Comment not liked yet');

	comment = await Comment.findByIdAndUpdate(
		commentId,
		{
			$pull: { likes: userId },
		},
		{
			new: true,
		},
	);

	notificationService.deleteNotification({
		sender: userId,
		entity: comment._id,
		type: NOTIFICATION_TYPES.LIKE,
	});

	return comment;
};

// DELETE
const deleteComment = async (id, userId, ignorePermission = false) => {
	const comment = await getCommentById(id);
	const post = await postService.getPostById(comment.postId);
	if (!ignorePermission) {
		if (
			comment.author._id.toString() !== userId &&
			post.author._id.toString() !== userId
		) {
			throw new createHttpError(403, 'Unauthorized');
		}
	}

	// remove post in hashtag
	const { hashtags, photos } = comment;

	if (photos.length > 0) {
		const photoIds = photos.map((photo) => photo.publicId);
		cloudinaryService.deleteImages(photoIds);
	}

	cloudinaryService.deleteFolder(`${comment.path}/${comment._id}`);

	if (hashtags.length > 0) {
		await Hashtag.updateMany(
			{ _id: { $in: hashtags } },
			{ $pull: { posts: comment._id } },
		);
	}

	await comment.remove();

	// SIDE UPDATE
	// delete notification
	notificationService.deleteNotificationsByEntityId(comment._id);
	const { numDeleted: numRepliesDeleted } = await deleteReplies(comment._id);
	const numCommentsDeleted = numRepliesDeleted + 1;
	postService.updateNumComments(post._id, -numCommentsDeleted);
	// update num replies for parent comments
	const { parentIds } = extractPath(comment.path);
	Promise.all(
		parentIds.map((parentId) => {
			updateNumReplies(parentId, -numCommentsDeleted);
		}),
	);
	return {
		numCommentsDeleted,
	};
};

const deleteCommentByPostId = async (postId) => {
	const comments = await Comment.find({ postId }).select('_id').lean();
	await Promise.all(
		comments.map((comment) =>
			notificationService.deleteNotificationsByEntityId(comment._id),
		),
	);
	await Comment.deleteMany({ postId });
	return {
		numDeleted: comments.length,
	};
};

const deleteReplies = async (commentId) => {
	const comments = await Comment.find({
		path: { $regex: `${commentId}` },
	})
		.select('_id')
		.lean();

	await Comment.deleteMany({
		path: { $regex: `${commentId}` },
	});

	Promise.all(
		comments.map((comment) =>
			notificationService.deleteNotificationsByEntityId(comment._id),
		),
	);

	return {
		numDeleted: comments.length,
	};
};

// HELPERS
const extractPath = (path) => {
	const pathArr = path.split('/');
	return {
		postId: pathArr[0],
		parentIds: pathArr.slice(1),
	};
};
const handleHashtags = async (hashtagNames) => {
	if (hashtagNames.length === 0) return [];
	let allHashtags = [];
	const hashTagNamesLowercase = hashtagNames.map((name) =>
		name.toLowerCase(),
	);
	const existingHashtags = await Hashtag.find({
		name: { $in: hashTagNamesLowercase },
	});
	const existingHashtagIds = existingHashtags.map((hashtag) => hashtag._id);
	const newHashtags = hashTagNamesLowercase
		.filter(
			(name) =>
				!existingHashtags.some((hashtag) => hashtag.name === name),
		)
		.map((name) => new Hashtag({ name }));

	const savedHashtags = await Hashtag.insertMany(newHashtags);

	allHashtags = existingHashtagIds.concat(
		savedHashtags.map((hashtag) => hashtag._id),
	);
	return allHashtags;
};

const retrieveCommentsSendToClient = (comments, userId) => {
	return comments.map((comment) => {
		return retrieveCommentSendToClient(comment, userId);
	});
};

const retrieveCommentSendToClient = (comment, userId) => {
	if (comment.hasOwnProperty('_doc')) {
		comment = comment._doc;
	}
	const { likes, ...newComment } = comment;
	console.log(likes);
	newComment.liked = likes.some(
		(like) => like.toString() === userId?.toString(),
	);
	newComment.numLikes = likes.length;
	return newComment;
};

const commentService = {
	getCommentsByPostId,
	getCommentsByCursor,
	getCommentByParentId,
	getCommentById,
	createComment,
	updateComment,
	deleteComment,
	likeComment,
	unlikeComment,
	retrieveCommentSendToClient,
	retrieveCommentsSendToClient,
	deleteCommentByPostId,
	getCommentWhitRelative,
};

module.exports = commentService;
const notificationService = require('./notification.service');
const postService = require('./post.service');
const cloudinaryService = require('./cloud.service');
const { NOTIFICATION_TYPES, NOTIFICATION_MESSAGES } = require('../configs');
