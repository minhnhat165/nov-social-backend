const postService = require('../services/post.service');
const timelineService = require('../services/timeline.service');

const getTimeLine = async (req, res) => {
	const { user } = req;
	const { cursor = -1, limit = 5 } = req.query;

	const { posts, endCursor, hasNextPage } = await timelineService.getTimeLine(
		{
			userId: user._id.toString(),
			cursor: parseInt(cursor),
			limit: parseInt(limit),
		},
	);
	res.status(200).json({
		status: 'success',
		data: {
			items: await postService.convertPostsSendToClient(
				posts,
				user._id.toString(),
			),
			endCursor,
			hasNextPage,
		},
	});
};

const feedController = {
	getTimeLine,
};

module.exports = feedController;
