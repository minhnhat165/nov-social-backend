const gameRoom = {};
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
		socket.on('client.game.room.create', async (room) => {
			// if number of room > 1000, delete the oldest room
			if (Object.keys(gameRoom).length > 5) {
				const oldestRoomId = Object.keys(gameRoom)[0];
				delete gameRoom[oldestRoomId];
			}
			gameRoom[room._id] = room;
			socket.broadcast.emit('server.game.room.create', room);
		});

		socket.on('client.game.room.join', async ({ roomId, user }) => {
			socket.join(roomId);
			const room = gameRoom[roomId];
			if (!room) return;
			room.players.push({
				_id: socket.userId,
				...user,
				symbol: room.players.length === 0 ? 'X' : 'O',
			});
			if (room.players.length == 2) {
				room.status = 'playing';
				room.turn =
					room.players[
						Math.floor(Math.random() * room.players.length)
					];
			} else if (room.players.length > 2) {
				room.audience.push(socket.userId);
			}
			gameRoom[roomId] = room;
			_io.to(roomId).emit('server.game.room.join', room);
		});

		socket.on('client.game.tictactoe.move', async ({ roomId, grid }) => {
			const room = gameRoom[roomId];
			if (!room) return;
			room.turn = room.players.find(
				(player) => player._id !== socket.userId,
			);
			room.grid = grid;
			gameRoom[roomId] = room;
			_io.to(roomId).emit('server.game.tictactoe.move', room);
		});

		socket.on('client.game.tictactoe.reset', async (roomId) => {
			const room = gameRoom[roomId];
			if (!room) return;
			room.turn =
				room.players[Math.floor(Math.random() * room.players.length)];
			gameRoom[roomId] = room;
			_io.to(roomId).emit('server.game.tictactoe.reset', room);
		});

		socket.on('client.game.room.leave', async (roomId) => {
			socket.leave(roomId);
			const room = gameRoom[roomId];
			if (!room) return;
			room.players = room.players.filter(
				(player) => player !== socket.userId,
			);
			if (room.players.length === 0) {
				_io.emit('server.game.room.delete', roomId);
				return delete gameRoom[roomId];
			}
			gameRoom[roomId] = room;
			_io.to(roomId).emit('server.game.room.leave', room);
		});
	}
}

module.exports = new SocketService();
const redisService = require('./redis.service');
