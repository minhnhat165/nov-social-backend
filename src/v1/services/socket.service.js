class SocketService {
	connect(socket) {
		socket.on('client.join', async (userId) => {
			redisService.user.online.add(userId, socket.id);
			socket.userId = userId;
			const userIds = await redisService.user.online.getAllUserId();
			socket.broadcast.emit('server.user.online', userId);
			socket.emit('server.user.online.all', userIds);
		});
		socket.on('disconnect', async () => {
			if (socket.userId) {
				const numConnect = await redisService.user.online.remove(
					socket.userId,
					socket.id,
				);
				if (numConnect === 0) {
					socket.broadcast.emit('server.user.offline', socket.userId);
				}
			}
		});
	}
}

module.exports = new SocketService();
const redisService = require('./redis.service');
