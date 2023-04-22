const Post = require('../models/Post');
const Hashtag = require('../models/Hashtag');
const createHttpError = require('http-errors');
const { deleteImages, deleteFolder } = require('./cloud.service');
const redis = require('../databases/init.redis');
const BlackList = require('../models/BlackList');
const Bookmark = require('../models/Bookmark');
const Comment = require('../models/Comment');
const createPost = async (post, user) => {
	const {
		content,
		photos,
		hashtags: hashtagNames = [],
		mentions,
		visibility,
		poll = null,
	} = post;

	const { _id } = user;
	const allHashtags = await handleHashtags(hashtagNames);

	const newPoll = await handlePoll(poll, user);

	const newPost = new Post({
		author: _id,
		content,
		photos,
		hashtags: allHashtags,
		mentions,
		visibility,
		poll: newPoll,
	});
	const savedPost = await newPost.save();
	await Hashtag.updateMany(
		{ _id: { $in: allHashtags } },
		{ $push: { posts: savedPost._id } },
	);
	await savedPost.populate('author', 'avatar name username');
	cachePost(savedPost);
	return savedPost;
};

const updatePost = async (postId, post, user) => {
	const {
		content,
		photos,
		hashtags: hashtagNames,
		mentions,
		poll,
		visibility,
	} = post;
	const { _id } = user;
	let dataUpdate = {};
	const updatePost = await Post.findById(postId);

	if (!updatePost) throw new createHttpError(404, 'Post not found');
	if (updatePost.author.toString() !== _id.toString())
		throw new createHttpError(403, 'Unauthorized');

	if (hashtagNames) {
		const newHashtags = await handleHashtags(hashtagNames);
		if (newHashtags.length > 0) dataUpdate.hashtags = newHashtags;
		// get old hashtags
		const oldHashtags = updatePost.hashtags || [];

		// hashtags that need to be removed
		const hashtagsToRemove = oldHashtags.filter(
			(hashtag) => !newHashtags.includes(hashtag),
		);

		//update post in hashtag
		await Hashtag.updateMany(
			{ _id: { $in: newHashtags } },
			{ $push: { posts: updatePost._id } },
		);
		await Hashtag.updateMany(
			{ _id: { $in: hashtagsToRemove } },
			{ $pull: { posts: updatePost._id } },
		);
	}

	if (content) dataUpdate.content = content;
	if (visibility) dataUpdate.visibility = visibility;
	if (photos) {
		const oldPhotoIds = updatePost.photos.map((photo) => photo.publicId);
		const newPhotoIds = photos.map((photo) => photo.publicId);
		const photoIdsRemove = oldPhotoIds.filter(
			(photoId) => !newPhotoIds.includes(photoId),
		);
		deleteImages(photoIdsRemove);
		dataUpdate.photos = photos;
	}
	if (poll || poll === null) {
		const newPoll = await handlePoll(poll, user);
		dataUpdate.poll = newPoll;
	}

	if (mentions) dataUpdate.mentions = mentions;
	const updatedPost = await Post.findByIdAndUpdate(postId, dataUpdate, {
		new: true,
	}).select(Object.keys(dataUpdate).join(' '));

	updatePostCached(postId, updatedPost._doc);
	return updatedPost;
};

const deletePost = async (id, user) => {
	const post = await Post.findById(id);
	if (!post) throw new HttpError(404, 'Post not found');
	if (post.author.toString() !== user._id.toString())
		throw new createHttpError(403, 'Unauthorized');
	// remove post in hashtag
	const { hashtags, photos } = post;

	if (photos.length > 0) {
		const photoIds = photos.map((photo) => photo.publicId);
		deleteImages(photoIds);
	}

	deleteFolder(post._id.toString());

	if (hashtags.length > 0) {
		await Hashtag.updateMany(
			{ _id: { $in: hashtags } },
			{ $pull: { posts: post._id } },
		);
	}
	await post.remove();
	deletePostCached(post._id);
	await Comment.deleteMany({ postId: post._id });
	return true;
};

const likePost = async (postId, user) => {
	const { _id } = user;
	const userId = _id.toString();
	let post = await getPostCached(postId);
	if (!post) {
		post = await Post.findById(postId).select('likes');
	}

	if (!post) throw new createHttpError(404, 'Post not found');

	const { likes } = post;
	const isLiked = likes.some((like) => like.toString() === userId);

	if (isLiked) throw new createHttpError(400, 'Post already liked');

	await Post.findByIdAndUpdate(
		postId,
		{
			$push: { likes: userId },
		},
		{ new: true },
	);

	const newLikes = [...likes, userId];
	updatePostCached(postId, {
		likes: newLikes,
		likesCount: newLikes.length,
	});

	return post;
};

const unlikePost = async (postId, user) => {
	const { _id } = user;
	const userId = _id.toString();
	let post = await getPostCached(postId);
	if (!post) {
		post = await Post.findById(postId).select('likes');
	}

	if (!post) throw new createHttpError(404, 'Post not found');

	const { likes } = post;
	const isLiked = likes.some((like) => like.toString() === userId);

	if (!isLiked) throw new createHttpError(400, 'Post not liked yet');

	const newLikes = likes.filter((like) => like.toString() !== userId);

	await Post.findByIdAndUpdate(postId, {
		$pull: { likes: userId },
	});
	updatePostCached(postId, {
		likes: newLikes,
		likesCount: newLikes.length,
	});
	return post;
};

const hidePost = async (postId, userId) => {
	const newBlackList = await BlackList.findOneAndUpdate(
		{ user: userId },
		{ $addToSet: { posts: postId } },
		{ upsert: true, new: true },
	).select('posts');
	redis.hsetobj(`user:${userId}`, 'hiddenPosts', newBlackList.posts);
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

const handlePoll = async (poll, user) => {
	if (!poll) return null;
	const { options } = poll;
	const newOptions = options.map((option) => {
		return {
			value: option.value,
			votes: 0,
			voters: [],
			createdBy: user._id,
		};
	});
	return { ...poll, options: newOptions };
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
		.populate('author', 'name avatar username')
		.select('-__v -updatedAt -blockedUsers -allowedUsers');
	return posts;
};

const getAllUserPostIds = async (userId) => {
	const posts = await Post.find({ author: userId }).select('_id');
	return posts.map((post) => post._id);
};

const retrievePostsSendToClient = async (posts, userId) => {
	const savedPostIds = await getSavedPostIds(userId);
	return posts.map((post) => {
		post.isSaved = savedPostIds.some(
			(savedPostId) => savedPostId.toString() === post._id.toString(),
		);
		return retrievePostSendToClient(post, userId);
	});
};

const retrievePostSendToClient = (post, userId) => {
	const { likes, ...newPost } = post;
	newPost.isLiked = likes.some(
		(like) => like.toString() === userId.toString(),
	);
	return newPost;
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

const getSavedPostIds = async (userId) => {
	let savedPostIds = await redis.hgetobj(`user${userId}`, 'savedPosts');
	if (!savedPostIds) {
		const bookmark = await Bookmark.findOne({
			user: userId,
		}).select('posts');
		savedPostIds = bookmark ? bookmark.posts : [];
		redis.hsetobj(`user:${userId}`, 'savedPosts', savedPostIds);
	}
	return savedPostIds;
};

// Cache
const CACHE_POST_PREFIX = 'post';

const cachePost = async (post) => {
	post._doc.likesCount = post.likes.length;
	redis.set(
		`${CACHE_POST_PREFIX}:${post._id}`,
		JSON.stringify(post),
		'EX',
		60 * 60 * 24,
	); // 1 day
};

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

const getPostCached = async (postId) => {
	const postCached = await redis.get(`${CACHE_POST_PREFIX}:${postId}`);
	if (!postCached) return null;
	return JSON.parse(postCached);
};

const deletePostCached = async (postId) => {
	redis.del(`${CACHE_POST_PREFIX}:${postId}`);
};

const updatePostCached = async (postId, update) => {
	const postCached = await redis.get(`${CACHE_POST_PREFIX}:${postId}`);
	if (!postCached) return;
	const post = JSON.parse(postCached);
	const newPost = { ...post, ...update };
	redis.set(
		`${CACHE_POST_PREFIX}:${postId}`,
		JSON.stringify(newPost),
		'EX',
		60 * 60 * 24,
	); // 1 day
};

const postService = {
	createPost,
	deletePost,
	updatePost,
	getAllUserPostIds,
	getPostsByListId,
	retrievePostsSendToClient,
	likePost,
	unlikePost,
	retrievePostSendToClient,
	hidePost,
	unhidePost,
	getHiddenPostIds,
	savePost,
	unSavePost,
	updatePostCached,
};

module.exports = postService;
