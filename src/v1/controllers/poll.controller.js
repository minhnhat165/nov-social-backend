const pollService = require('../services/poll.service');

const getPoll = async (req, res) => {
	const { id } = req.params;
	const poll = await pollService.getPoll(id);
	res.status(200).json({
		status: 'success',
		data: poll,
	});
};

const updatePoll = async (req, res) => {
	const { user } = req;

	const poll = await pollService.createPoll();
	res.status(200).json({
		status: 'success',
		data: poll,
	});
};

const vote = async (req, res) => {
	const { user } = req;
	const { id, optionId } = req.params;
	const poll = await pollService.vote(id, optionId, user._id.toString());
	_io.to(id).emit('server.poll.vote', poll);
	res.status(200).json({
		status: 'success',
		data: poll,
	});
};

const unvote = async (req, res) => {
	const { user } = req;
	const { id, optionId } = req.params;
	const poll = await pollService.unvote(id, optionId, user._id.toString());
	res.status(200).json({
		status: 'success',

		data: poll,
	});
};

const pollController = {
	updatePoll,
	getPoll,
	vote,
	unvote,
};

module.exports = pollController;
