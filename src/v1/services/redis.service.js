const redis = require('../databases/init.mongodb');
const Post = require('../models/Post');
const User = require('../models/User');

const timeline = {
	create: async (userId) => {
		const key = `newsfeed:${userId}`;
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
	},
};

const redisService = {
	timeline,
};

module.exports = redisService;
