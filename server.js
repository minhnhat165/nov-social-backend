require('dotenv').config();
const httpServer = require('./src/app');

const { PORT } = process.env;

const server = httpServer.listen(PORT, () => {
	console.log(`WSV start with port ${PORT}`);
});

process.on('SIGINT', () => {
	server.close(() => console.log(`exits server express`));
});
