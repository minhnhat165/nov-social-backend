const redis = require('../databases/init.redis');
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

const user = {
	online: {
		add: async (userId, socketId) => {
			const key = `online:${userId}`;
			const user = await redis.get(key);
			let socketIds = [];
			if (user) {
				socketIds = JSON.parse(user);
				if (!socketIds.includes(socketId)) {
					socketIds.push(socketId);
				}
			} else {
				socketIds.push(socketId);
			}
			redis.set(key, JSON.stringify(socketIds));
		},
		remove: async (userId, socketId) => {
			const key = `online:${userId}`;
			const user = await redis.get(key);
			if (!user) return;
			const socketIds = JSON.parse(user);
			const index = socketIds.indexOf(socketId);
			if (index > -1) {
				socketIds.splice(index, 1);
			}
			if (socketIds.length === 0) {
				redis.del(key);
				return 0;
			}
			redis.set(key, JSON.stringify(socketIds));
			return socketIds.length;
		},
		getAllUserId: async () => {
			const keys = await redis.keys('online:*');
			const userIds = keys.map((key) => key.split(':')[1]);
			return userIds;
		},
		getSocketIds: async (userId) => {
			const key = `online:${userId}`;
			const user = await redis.get(key);
			if (!user) return [];
			const socketIds = JSON.parse(user);
			return socketIds;
		},
	},
};

const redisService = {
	timeline,
	user,
};

module.exports = redisService;
