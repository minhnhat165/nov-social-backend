const Post = require('../models/Post');
const Hashtag = require('../models/Hashtag');
const createHttpError = require('http-errors');
const { deleteImages, deleteFolder } = require('./cloud.service');
const redis = require('../databases/init.redis');
const BlackList = require('../models/BlackList');
const Bookmark = require('../models/Bookmark');
const Comment = require('../models/Comment');
const createPost = async (post, user) => {
	let {
		content,
		photos,
		hashtags: hashtagNames = [],
		mentions,
		visibility,
		poll = null,
	} = post;

	const { _id } = user;
	const allHashtags = await handleHashtags(hashtagNames);

	const newPoll = poll ? await pollService.createPoll(poll, _id) : null;

	mentions = mentions ? [...new Set(mentions)] : [];

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
	if (photos.length > 0) {
		const profilePhotos = photos.map((photo) => {
			return photo.publicId;
		});
		await User.findByIdAndUpdate(_id, {
			$push: {
				photos: { $each: profilePhotos, $position: 0, $slice: 9 },
			},
		});
	}
	savedPost.poll = newPoll;
	await savedPost.populate('author', 'avatar name username');
	if (mentions.length > 0) {
		notificationService.createNotification({
			sender: _id,
			receivers: mentions,
			type: NOTIFICATION_TYPES.TAG,
			entityId: savedPost._id,
			entityType: ENTITY_TYPES.POST,
			message: NOTIFICATION_MESSAGES.POST.MENTION,
		});
	}

	timelineService.updateTimelineByPostVisibility(
		savedPost._id,
		_id,
		visibility,
	);

	savedPost.poll = newPoll;

	return savedPost;
};

const getPostById = async (id) => {
	const post = await Post.findById(id)
		.populate('author', 'avatar name username email followers')
		.populate('hashtags', 'name')
		.populate('mentions', 'name username');
	if (!post) throw new createHttpError(404, 'Post not found');
	return post;
};

const getPostByIdWithCredential = async (id, userId) => {
	const post = await Post.findById(id);

	const { author, visibility } = post;
	if (
		author._id.toString() === userId ||
		visibility === POST.VISIBILITY.PUBLIC
	) {
		return post;
	}

	if (visibility === POST.VISIBILITY.FOLLOWER) {
		const isFollowed = author.followers.includes(userId);
		if (isFollowed) return post;
		throw new createHttpError(404, 'Post not found');
	}
	throw new createHttpError(404, 'Post not found');
};

const getPost = async (id, userId) => {
	const post = await getPostByIdWithCredential(id, userId);
	return post;
};

const updatePost = async (postId, post, user) => {
	let {
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
		await User.findByIdAndUpdate(_id, {
			$pull: {
				photos: { $in: photoIdsRemove },
			},
		});

		await User.findByIdAndUpdate(_id, {
			$push: {
				photos: { $each: newPhotoIds, $position: 0, $slice: 9 },
			},
		});

		dataUpdate.photos = photos;
	}
	if (poll || poll === null) {
		const oldPoll = updatePost?.poll;
		if (oldPoll && poll === null) {
			await pollService.deletePoll(oldPoll._id);
			dataUpdate.poll = null;
		} else if (oldPoll && poll) {
			dataUpdate.poll = await pollService.updatePoll(
				oldPoll._id,
				poll,
				_id,
			);
		} else if (poll) {
			const newPoll = await pollService.createPoll(poll, _id);
			dataUpdate.poll = newPoll;
		}
	}

	if (mentions) {
		mentions = [...new Set(mentions)];
		dataUpdate.mentions = mentions;
		notificationService.updateNotificationTypeTag({
			oldTags: updatePost.mentions,
			newTags: mentions,
			sender: _id,
			entityId: postId,
			entityType: ENTITY_TYPES.POST,
		});
	}
	const updatedPost = await Post.findByIdAndUpdate(postId, dataUpdate, {
		new: true,
	}).select(Object.keys(dataUpdate).join(' '));

	updatedPost.poll = dataUpdate.poll;

	if (visibility) {
		timelineService.updateTimelineByPostVisibility(postId, _id, visibility);
	}

	return updatedPost;
};

const updateNumComments = async (postId, numComment) => {
	const post = await getPostById(postId);
	await Post.updateOne(
		{ _id: post._id },
		{
			$inc: {
				numComments: numComment,
			},
		},
	);
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
		await User.findByIdAndUpdate(user._id.toString(), {
			$pull: {
				photos: { $in: photoIds },
			},
		});
	}

	deleteFolder(post._id.toString());

	if (hashtags.length > 0) {
		await Hashtag.updateMany(
			{ _id: { $in: hashtags } },
			{ $pull: { posts: post._id } },
		);
	}
	await post.remove();
	notificationService.deleteNotificationsByEntityId(post._id);
	commentService.deleteCommentByPostId(post._id);
	timelineService.removeFromTimelines(post._id);
	return true;
};

const likePost = async (postId, user) => {
	const { _id } = user;
	const userId = _id.toString();
	const post = await getPostById(postId);

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

	notificationService.createNotification({
		sender: userId,
		receivers: [post.author._id],
		entityId: post._id,
		entityType: 'post',
		type: NOTIFICATION_TYPES.LIKE,
		message: NOTIFICATION_MESSAGES.LIKE.POST,
	});

	return post;
};

const unlikePost = async (postId, user) => {
	const { _id } = user;
	const userId = _id.toString();
	const post = await getPostById(postId);

	const { likes } = post;
	const isLiked = likes.some((like) => like.toString() === userId);

	if (!isLiked) throw new createHttpError(400, 'Post not liked yet');

	await Post.findByIdAndUpdate(postId, {
		$pull: { likes: userId },
	});

	notificationService.deleteNotification({
		sender: userId,
		entity: post._id,
		type: NOTIFICATION_TYPES.LIKE,
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

const getPostsByListId = async (listId) => {
	const posts = await getPostsByListIdFromDatabase(listId);
	return posts;
};

const getPostsByListIdFromDatabase = async (listId) => {
	const posts = await Post.find({ _id: { $in: listId } })
		.sort({ _id: -1 })
		.populate('author', 'name avatar username email')
		.populate('poll')
		.select('-__v -updatedAt -blockedUsers -allowedUsers');
	return posts;
};

const getAllUserPostIds = async (userId) => {
	const posts = await Post.find({ author: userId }).select('_id');
	return posts.map((post) => post._id);
};

const convertPostsSendToClient = async (posts, userId) => {
	const savedPostIds = await getSavedPostIds(userId);
	return posts.map((post) => {
		const isSaved = savedPostIds.some(
			(savedPostId) => savedPostId.toString() === post._id.toString(),
		);
		if (post._doc) {
			post._doc.isSaved = isSaved;
		} else {
			post.isSaved = isSaved;
		}

		return convertPostSendToClient(post, userId);
	});
};

const convertPostSendToClient = (post, userId) => {
	if (post._doc) post = post._doc;
	let { likes, author, ...newPost } = post;
	if (author._doc) author = author._doc;
	const { followers, following, ...newAuthor } = author;
	newPost.isLiked = likes.some(
		(like) => like.toString() === userId.toString(),
	);
	newPost.likesCount = likes.length;
	newPost.author = newAuthor;
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

const getPostsByUserId = async (
	userId,
	currentUserId,
	cursor = generatePostId(),
	limit = 10,
	isMe = false,
) => {
	if (!cursor) {
		cursor = new Post()._id.toString();
	}
	const hiddenPostIds = await getHiddenPostIds(currentUserId);
	let query = {};
	if (isMe) {
		query = {
			$or: [
				{
					author: userId,
				},
				{
					mentions: userId,
					visibility: {
						$in: [POST.VISIBILITY.PUBLIC, POST.VISIBILITY.FOLLOWER],
					},
				},
			],
			_id: { $nin: hiddenPostIds, $lt: cursor },
		};
	} else {
		const { followers } = await User.findById(userId).select('followers');
		const isFollower = followers.some(
			(follower) => follower.toString() === currentUserId.toString(),
		);

		query = {
			$or: [
				{
					author: userId,
					visibility: {
						$in: [
							POST.VISIBILITY.PUBLIC,
							isFollower
								? POST.VISIBILITY.FOLLOWER
								: POST.VISIBILITY.PUBLIC,
						],
					},
				},
				{
					mentions: userId,
					visibility: {
						$in: [
							POST.VISIBILITY.PUBLIC,
							isFollower
								? POST.VISIBILITY.FOLLOWER
								: POST.VISIBILITY.PUBLIC,
						],
					},
				},
			],
			_id: { $nin: hiddenPostIds, $lt: cursor },
		};
	}

	const posts = await Post.find(query)
		.sort({ _id: -1 })
		.limit(limit)
		.populate('author', 'name avatar username')
		.populate('poll')
		.select('-__v -updatedAt -blockedList -allowedList')
		.lean();
	return {
		items: await convertPostsSendToClient(posts, currentUserId),
		endCursor: posts.length > 0 ? posts[posts.length - 1]._id : null,
		hasNextPage: posts.length === limit,
	};
};

const getPostIdsByFollowId = async (userId) => {
	const query = {
		$or: [
			{
				author: userId,
				visibility: {
					$in: [POST.VISIBILITY.PUBLIC, POST.VISIBILITY.FOLLOWER],
				},
			},
		],
	};
	const posts = await Post.find(query).sort({ _id: -1 }).select('_id').lean();

	return posts.map((post) => post._id);
};

const getUsersLikedPost = async (postId) => {
	const post = await Post.findById(postId)
		.select('likes')
		.populate('likes', 'name avatar username email');
	return post.likes;
};

const getUsersCommentedPost = async (postId) => {
	const comments = await Comment.find({ postId })
		.select('author')
		.populate('author', 'name avatar username email');
	const uniqueUsers = [];
	comments.forEach((comment) => {
		if (
			!uniqueUsers.some(
				(user) =>
					user?._id?.toString() === comment?.author?._id?.toString(),
			)
		) {
			uniqueUsers.push(comment.author);
		}
	});
	return uniqueUsers;
};

const generatePostId = () => {
	const newPostId = new Post()._id.toString();
	return newPostId;
};

const postService = {
	createPost,
	deletePost,
	updatePost,
	getAllUserPostIds,
	getPostsByListId,
	convertPostsSendToClient,
	likePost,
	unlikePost,
	convertPostSendToClient,
	hidePost,
	unhidePost,
	getHiddenPostIds,
	savePost,
	unSavePost,
	getPostById,
	getPost,
	updateNumComments,
	getPostsByUserId,
	getUsersLikedPost,
	getUsersCommentedPost,
	getPostIdsByFollowId,
	getPostByIdWithCredential,
};

module.exports = postService;
const commentService = require('./comment.service');
const notificationService = require('./notification.service');
const {
	NOTIFICATION_TYPES,
	NOTIFICATION_MESSAGES,
	ENTITY_TYPES,
	POST,
} = require('../configs');
const User = require('../models/User');
const pollService = require('./poll.service');

const timelineService = require('./timeline.service');
