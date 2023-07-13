const { POST } = require('../configs');
const redis = require('../databases/init.redis');
const BlackList = require('../models/BlackList');
const Post = require('../models/Post');
const User = require('../models/User');
const PREFIX = 'timeline';
const createTimeline = async (userId) => {
	const key = `${PREFIX}:${userId}`;
	const { following } = await User.findById(userId).select('following');
	const hiddenPostIds = await postService.getHiddenPostIds(userId);
	const query = {
		_id: { $lt: new Post()._id.toString(), $nin: hiddenPostIds },
		$or: [
			{
				visibility: {
					$in: [POST.VISIBILITY.PUBLIC, POST.VISIBILITY.FOLLOWER],
				},
				author: { $in: [...following, userId] },
			},
			{
				visibility: POST.VISIBILITY.PRIVATE,
				author: userId,
			},
			{
				allowedList: { $in: [userId] },
			},
		],
	};
	const posts = await Post.find(query).sort({ _id: -1 }).select('_id');
	const postIds = posts.map((post) => post._id.toString());
	// Cache the newsfeed in Redis
	const pipeline = redis.pipeline();
	if (postIds.length > 0) {
		for (let i = 0; i < postIds.length; i++) {
			pipeline.zadd(key, i, postIds[i]);
		}
		pipeline.expire(key, 60 * 60 * 24); // 1 day
		await pipeline.exec();
	}
};
const getTimeLine = async ({ userId, cursor = -1, limit = 5 }) => {
	const key = `${PREFIX}:${userId}`;

	// Check if the newsfeed is cached in Redis
	if (!(await redis.exists(key))) {
		await createTimeline(userId);
	}

	const start = cursor + 1;
	const end = cursor + limit;

	const postIds = await redis.zrange(key, start, end);

	const lengthGet = postIds.length;

	const posts =
		lengthGet > 0 ? await postService.getPostsByListId(postIds) : [];

	let newLastIndex = cursor + lengthGet;

	const total = await redis.zcard(key);

	const isEnd = newLastIndex + 1 >= total;
	if (isEnd) {
		newLastIndex = total - 1;
	}

	return {
		posts,
		endCursor: newLastIndex,
		hasNextPage: !isEnd,
	};
};

const getTimeLineV2 = async ({
	userId,
	cursor = new Post()._id.toString(),
	limit = 5,
}) => {
	const { following } = await User.findById(userId).select('following');
	const query = {
		_id: { $lt: cursor, $nin: await postService.getHiddenPostIds(userId) },
		$or: [
			{
				visibility: {
					$in: [POST.VISIBILITY.PUBLIC, POST.VISIBILITY.FOLLOWER],
				},
				author: { $in: [...following, userId] },
			},
			{
				visibility: POST.VISIBILITY.PRIVATE,
				author: userId,
			},
			{
				allowedList: { $in: [userId] },
			},
		],
	};

	const posts = await Post.find(query)
		.sort({ _id: -1 })
		.limit(limit)
		.populate('author', 'username avatar')
		.populate('poll');
	return {
		posts,
		endCursor:
			posts.length > 0 ? posts[posts.length - 1]._id.toString() : null,
		hasNextPage: posts.length === limit,
	};
};

const addToTimeline = async (userId, postId) => {
	const key = `${PREFIX}:${userId}`;
	const hasTimeline = await redis.exists(key);
	if (!hasTimeline) return;
	const minScore = await redis.zrange(key, 0, 0, 'WITHSCORES');
	await redis.zadd(key, minScore.length > 0 ? minScore[1] - 1 : 0, postId);
};

const addToTimelines = async (userIds, postId) => {
	const keys = userIds.map((userId) => `${PREFIX}:${userId}`);
	keys.forEach(async (key) => {
		const hasTimeline = await redis.exists(key);
		if (!hasTimeline) return;
		const minScore = await redis.zrange(key, 0, 0, 'WITHSCORES');
		await redis.zadd(
			key,
			minScore.length > 0 ? minScore[1] - 1 : 0,
			postId,
		);
	});
};

const updateTimelineByPostVisibility = async (postId, authorId, visibility) => {
	switch (visibility) {
		case POST.VISIBILITY.PUBLIC:
		case POST.VISIBILITY.FOLLOWER:
			const { followers } = await User.findById(authorId).select(
				'followers',
			);
			console.log(
				'🚀 ~ file: timeline.service.js:143 ~ updateTimelineByPostVisibility ~ postId:',
				postId,
			);
			addToTimelines([...followers, authorId], postId);
			break;
		case POST.VISIBILITY.PRIVATE:
			removeFromTimelines(postId);
			addToTimeline(authorId, postId);
			break;
		default:
			break;
	}
};

const updateTimelineByFollow = async (userId, followId, isAdd = true) => {
	const postIds = await postService.getPostIdsByFollowId(followId);
	if (isAdd) {
		addMultipleToTimeline(userId, postIds.reverse());
		return;
	}
	removeMultipleFromTimeline(userId, postIds.reverse());
};

const addMultipleToTimeline = async (userId, postIds) => {
	const key = `${PREFIX}:${userId}`;
	const hasTimeline = await redis.exists(key);
	if (!hasTimeline) return;

	const minScore = await redis.zrange(key, 0, 0, 'WITHSCORES');
	const pipeline = redis.pipeline();
	const hiddenPostIds = await postService.getHiddenPostIds(userId);
	postIds.forEach((postId, index) => {
		if (hiddenPostIds.includes(postId)) return;
		pipeline.zadd(
			key,
			minScore.length > 0 ? minScore[1] - index : 0,
			postId,
		);
	});
	await pipeline.exec();
};

const removeFromTimeline = async (userId, postId) => {
	const keys = await redis.keys(`${PREFIX}:${userId}`);
	const pipeline = redis.pipeline();
	keys.forEach((key) => {
		pipeline.zrem(key, postId);
	});
	await pipeline.exec();
};

const removeFromTimelines = async (postId) => {
	const keys = await redis.keys(`${PREFIX}:*`);
	const pipeline = redis.pipeline();
	keys.forEach((key) => {
		pipeline.zrem(key, postId);
	});
	await pipeline.exec();
};

const removeMultipleFromTimeline = async (userId, postIds) => {
	const key = `${PREFIX}:${userId}`;
	const hasTimeline = await redis.exists(key);
	if (!hasTimeline) return;
	const pipeline = redis.pipeline();
	postIds.forEach((postId) => {
		pipeline.zrem(key, postId);
	});
	await pipeline.exec();
};

const timelineService = {
	createTimeline,
	getTimeLine,
	addToTimeline,
	removeFromTimeline,
	addMultipleToTimeline,
	removeMultipleFromTimeline,
	addToTimelines,
	removeFromTimelines,
	getTimeLineV2,
	updateTimelineByPostVisibility,
	updateTimelineByFollow,
};

module.exports = timelineService;
const postService = require('./post.service');
