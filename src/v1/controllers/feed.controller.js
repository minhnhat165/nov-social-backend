const timelineService = require('../services/timeline.service');

const getTimeLine = async (req, res) => {
	const { user } = req;
	const { lastIndex = -1, limit = 10 } = req.query;
	const posts = await timelineService.getTimeLine(
		user,
		parseInt(lastIndex),
		parseInt(limit),
	);
	res.status(200).json(posts);
};

const feedController = {
	getTimeLine,
};

module.exports = feedController;
