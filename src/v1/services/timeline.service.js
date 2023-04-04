const redis = require('../databases/init.redis');
const Post = require('../models/Post');
const User = require('../models/User');
const postService = require('./post.service');
const PREFIX = 'timeline';
const createTimeline = async (userId) => {
	const key = `${PREFIX}:${userId}`;
	const { following } = await User.findById(userId).select('following');
	const posts = await Post.find({
		author: { $in: [...following, userId] },
	})
		.sort({ createdAt: -1 })
		.select('_id');
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

const getTimeLine = async (user, lastIndex = -1, limit = 5) => {
	const { _id } = user;
	const key = `${PREFIX}:${_id}`;

	// Check if the newsfeed is cached in Redis
	if (!(await redis.exists(key))) {
		await createTimeline(_id);
	}

	const start = lastIndex + 1;
	const end = lastIndex + limit;

	const postIds = await redis.zrange(key, start, end);

	const lengthGet = postIds.length;

	const posts =
		lengthGet > 0 ? await postService.getPostsByListId(postIds) : [];

	let newLastIndex = lastIndex + lengthGet;

	const total = await redis.zcard(key);

	const isEnd = newLastIndex + 1 >= total;
	if (isEnd) {
		newLastIndex = total - 1;
	}

	return {
		items: postService.retrievePostsSendToClient(posts, _id),
		lastIndex: newLastIndex,
		moreAvailable: !isEnd,
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

const addMultipleToTimeline = async (userId, postIds) => {
	const key = `${PREFIX}:${userId}`;
	const hasTimeline = await redis.exists(key);
	if (!hasTimeline) return;

	const minScore = await redis.zrange(key, 0, 0, 'WITHSCORES');
	const pipeline = redis.pipeline();
	postIds.forEach((postId, index) => {
		pipeline.zadd(
			key,
			minScore.length > 0 ? minScore[1] - index : 0,
			postId,
		);
	});
	await pipeline.exec();
};

const removeFromTimeline = async (postId) => {
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
};

module.exports = timelineService;
