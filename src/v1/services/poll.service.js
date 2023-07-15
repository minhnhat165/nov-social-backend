const Poll = require('../models/Poll');
const getPoll = async (id) => {
	return await Poll.findById(id);
};
const createPoll = async (poll, userId) => {
	const { options } = poll;
	const newOptions = options.map((option) => {
		const value = option.value.trim();
		if (!value) {
			throw new Error('Option value cannot be empty');
		}
		return {
			value,
			votes: 0,
			voters: [],
			createdBy: userId,
		};
	});

	const newPoll = new Poll({
		...poll,
		options: newOptions,
	});
	return await newPoll.save();
};

const updatePoll = async (pollId, data, userId) => {
	const { _id, options, ...rest } = data;
	const poll = await Poll.findById(pollId);
	if (!poll) {
		throw new Error('Poll not found');
	}

	const newOptions = options.map((option) => {
		if (
			poll.options.find((o) => o._id.toString() === option._id.toString())
		) {
			const value = option.value.trim();
			if (!value) {
				throw new Error('Option value cannot be empty');
			}
			return {
				...option,
				value,
			};
		}
		return {
			value: option.value,
			votes: 0,
			voters: [],
			createdBy: userId,
		};
	});

	rest.options = newOptions;
	const newPoll = await Poll.findByIdAndUpdate(pollId, rest, {
		new: true,
	});

	_io.to(newPoll._id.toString()).emit('server.poll.update', newPoll);

	return newPoll;
};

const vote = async (pollId, optionId, userId) => {
	const poll = await Poll.findById(pollId);
	const { allowMultipleVotes, options } = poll;
	const option = options.find((option) => option._id == optionId);
	if (option.voters.includes(userId)) {
		option.votes = option.votes - 1;
		option.voters = option.voters.filter((voter) => voter != userId);
	} else {
		option.votes = option.votes + 1;
		option.voters.push(userId);
		if (!allowMultipleVotes) {
			options.forEach((option) => {
				if (option._id != optionId) {
					option.voters = option.voters.filter(
						(voter) => voter != userId,
					);
					option.votes = option.voters.length;
				}
			});
		}
	}

	return await poll.save();
};

const deletePoll = async (pollId) => {
	const poll = await Poll.findById(pollId);
	if (!poll) {
		throw new Error('Poll not found');
	}
	return await Poll.findByIdAndDelete(pollId);
};

const unvote = async (pollId, optionId, userId) => {
	const poll = await Poll.findById(pollId);
	const option = poll.options.find((option) => option._id == optionId);
	if (!option.voters.includes(userId)) {
		throw new Error('You have not voted for this option');
	}
	option.votes = option.votes - 1;
	option.voters = option.voters.filter((voter) => voter != userId);
	return await poll.save();
};

const pollService = {
	createPoll,
	getPoll,
	vote,
	unvote,
	updatePoll,
	deletePoll,
};

module.exports = pollService;
