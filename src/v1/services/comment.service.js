const Post = require('../models/Post');
const Hashtag = require('../models/Hashtag');
const createHttpError = require('http-errors');
const { deleteImages, deleteFolder } = require('./cloud.service');
const redis = require('../databases/init.redis');
const BlackList = require('../models/BlackList');
const timelineService = require('./timeline.service');
const Bookmark = require('../models/Bookmark');
const Comment = require('../models/Comment');
const postService = require('./post.service');

const getCommentsByPostId = async (
	postId,
	page = 0,
	limit = 10,
	parentId = null,
) => {
	if (!(await Post.exists({ _id: postId }))) {
		throw new createHttpError(404, 'Post not found');
	}
	const comments = await Comment.find({ postId, parentId })
		.sort({ createdAt: 1 })
		.skip(page * limit)
		.limit(limit)
		.populate('author', 'avatar name username')
		.lean();
	const total = await Comment.countDocuments({ postId, parentId });
	return { comments, total };
};

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

const createComment = async (comment, authorId) => {
	const {
		content,
		photos,
		hashtags: hashtagNames = [],
		mentions,
		postId,
		parentId = null,
	} = comment;

	const post = await Post.findById(postId);

	if (!post) throw new createHttpError(404, 'Post not found');

	let path = post._id.toString();

	if (parentId) {
		const parentComment = await Comment.findById(parentId)
			.select('path')
			.lean();

		if (!parentComment)
			throw new createHttpError(404, 'Parent comment not found');
		path = parentComment.path + '/' + parentComment._id.toString();
	}

	const allHashtags = await handleHashtags(hashtagNames);
	let newComment = new Comment({
		author: authorId,
		content,
		photos,
		hashtags: allHashtags,
		postId,
		parentId,
		mentions,
		path,
	});
	newComment = await newComment.save();
	await newComment.populate('author', 'avatar name username');
	const { parentIds } = extractPath(path);
	await Comment.updateMany(
		{ _id: { $in: parentIds } },
		{ $inc: { numReplies: 1 } },
	);

	await Post.updateOne({ _id: postId }, { $inc: { numComments: 1 } });
	postService.updatePostCached(postId, { numComments: post.numComments + 1 });
	return newComment;
};

const extractPath = (path) => {
	const pathArr = path.split('/');
	return {
		postId: pathArr[0],
		parentIds: pathArr.slice(1),
	};
};

const updateComment = async (commentId, data, authorId) => {
	const { content, photos, hashtags: hashtagNames, mentions } = data;
	let dataUpdate = {};
	const commentUpdate = await getCommentById(commentId);

	if (!commentUpdate) throw new createHttpError(404, 'Post not found');
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
		deleteImages(photoIdsRemove);
		dataUpdate.photos = photos;
	}

	if (mentions) dataUpdate.mentions = mentions;
	const updatedComment = await Comment.findByIdAndUpdate(
		commentId,
		dataUpdate,
		{
			new: true,
		},
	).select(Object.keys(dataUpdate).join(' '));

	return updatedComment;
};

const deleteComment = async (id, userId) => {
	const comment = await getCommentById(id);
	const post = await Post.findById(comment.postId).select(
		'author numComments',
	);
	if (!post) throw new createHttpError(404, 'Post not found');

	if (
		comment.author._id.toString() !== userId.toString() &&
		post.author.toString() !== userId.toString()
	)
		throw new createHttpError(403, 'Unauthorized');
	// remove post in hashtag
	const { hashtags, photos } = comment;

	if (photos.length > 0) {
		const photoIds = photos.map((photo) => photo.publicId);
		deleteImages(photoIds);
	}

	deleteFolder(`${comment.path}/${comment._id}`);

	if (hashtags.length > 0) {
		await Hashtag.updateMany(
			{ _id: { $in: hashtags } },
			{ $pull: { posts: comment._id } },
		);
	}

	await comment.remove();

	// delete all child comment
	const childDeleted = await Comment.deleteMany({
		path: { $regex: `${comment._id}` },
	});

	const numCommentsDeleted = childDeleted.deletedCount + 1;
	// update numComments of post
	await Post.updateOne(
		{ _id: post._id },
		{ $inc: { numComments: -numCommentsDeleted } },
	);

	// update numReplies of parent comment
	const { parentIds } = extractPath(comment.path);
	await Comment.updateMany(
		{ _id: { $in: parentIds } },
		{ $inc: { numReplies: -numCommentsDeleted } },
	);

	postService.updatePostCached(post._id, {
		numComments: post.numComments - numCommentsDeleted,
	});
	return {
		numCommentsDeleted,
	};
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

	return comment;
};

const unhidePost = async (postId, userId) => {
	const newBlackList = await BlackList.findOneAndUpdate(
		{ user: userId },
		{ $pull: { posts: postId } },
		{ upsert: true, new: true },
	).select('posts');

	redis.hsetobj(`user:${userId}`, 'hiddenPosts', newBlackList.posts);
};

const savePost = async (postId, userId) => {
	const newSavedPosts = await Bookmark.findOneAndUpdate(
		{ user: userId },
		{ $addToSet: { posts: postId } },
		{ upsert: true, new: true },
	).select('posts');
	redis.hsetobj(`user:${userId}`, 'savedPosts', newSavedPosts.posts);
};

const unSavePost = async (postId, userId) => {
	const newSavedPosts = await Bookmark.findOneAndUpdate(
		{ user: userId },
		{ $pull: { posts: postId } },
		{ upsert: true, new: true },
	).select('posts');
	redis.hsetobj(`user:${userId}`, 'savedPosts', newSavedPosts.posts);
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

const getPostsByListId = async (listId) => {
	// Get all post from redis cache
	const postCached = await redis.mget(
		listId.map((id) => `${CACHE_POST_PREFIX}:${id}`),
	);

	// Get all post id not in redis cache
	const postIdsNotCached = listId.filter((id, index) => !postCached[index]);

	// Get all post not in redis cache from database
	let postNotCached =
		postIdsNotCached.length <= 0
			? []
			: await getPostsByListIdFromDatabase(postIdsNotCached);

	// Set all post not in redis cache to redis cache
	cachePosts(postNotCached);

	// Combine all post from redis cache and post from database
	const posts = [];

	for (let i = 0; i < listId.length; i++) {
		if (postCached[i]) {
			posts.push(JSON.parse(postCached[i]));
			continue;
		}
		const postId = listId[i];
		const post = postNotCached.find(
			(post) => post._id.toString() === postId,
		);
		if (post) posts.push({ ...post._doc, likesCount: post.likes.length });
	}
	return posts;
};

const getPostsByListIdFromDatabase = async (listId) => {
	const posts = await Post.find({ _id: { $in: listId } })
		.populate('author', 'name avatar')
		.select('-__v -updatedAt -blockedUsers -allowedUsers');
	return posts;
};

const getAllUserPostIds = async (userId) => {
	const posts = await Post.find({ author: userId }).select('_id');
	return posts.map((post) => post._id);
};

const retrieveCommentsSendToClient = (comments, userId) => {
	return comments.map((comment) => {
		return retrieveCommentSendToClient(comment, userId);
	});
};

const retrieveCommentSendToClient = (comment, userId) => {
	const { likes, ...newComment } = comment;
	newComment.liked = likes.some(
		(like) => like.toString() === userId.toString(),
	);
	newComment.numLikes = likes.length;
	return newComment;
};

const getHiddenPostIds = async (userId) => {
	let hiddenPostIds = await redis.hgetobj(`user${userId}`, 'hiddenPosts');

	if (!hiddenPostIds) {
		const blackList = await BlackList.findOne({
			user: userId,
		}).select('posts');
		hiddenPostIds = blackList ? blackList.posts : [];
		redis.hsetobj(`user:${userId}`, 'hiddenPosts', hiddenPostIds);
	}
	return hiddenPostIds;
};

// Cache
const CACHE_POST_PREFIX = 'post';

const cachePosts = async (posts) => {
	const pipeline = redis.pipeline();
	posts.forEach((post) => {
		post._doc.likesCount = post.likes.length;
		pipeline.set(
			`${CACHE_POST_PREFIX}:${post._id}`,
			JSON.stringify(post),
			'EX',
			60 * 60 * 24,
		); // 1 day
	});
	await pipeline.exec();
};

const commentService = {
	getCommentsByPostId,
	getCommentByParentId,
	createComment,
	updateComment,
	deleteComment,
	getAllUserPostIds,
	getPostsByListId,
	likeComment,
	unlikeComment,
	retrieveCommentSendToClient,
	retrieveCommentsSendToClient,
	unhidePost,
	getHiddenPostIds,
	savePost,
	unSavePost,
};

module.exports = commentService;
