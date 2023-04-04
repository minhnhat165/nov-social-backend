const Redis = require('ioredis');
const redis = new Redis({
	port: process.env.REDIS_PORT,
	host: process.env.REDIS_HOST,
	password: process.env.REDIS_PASSWORD,
});

redis.hsetobj = async (key, field, value) => {
	await redis.hset(key, field, JSON.stringify(value));
};

redis.hgetobj = async (key, field) => {
	const data = await redis.hget(key, field);
	return JSON.parse(data);
};

redis.hpusharr = async (key, field, value, requireExists) => {
	if (requireExists) {
		const exists = await redis.hexists(key, field);
		if (!exists) return;
	}
	const data = await redis.hgetobj(key, field);
	if (!data) return;
	data.push(value);
	await redis.hsetobj(key, field, data);
};

redis.hpullarr = async (key, field, value, requireExists) => {
	if (requireExists) {
		const exists = await redis.hexists(key, field);
		if (!exists) return;
	}
	const data = await redis.hgetobj(key, field);
	if (!data) return;
	const index = data.indexOf(value);
	if (index > -1) {
		data.splice(index, 1);
	}
	await redis.hsetobj(key, field, data);
};

module.exports = redis;
