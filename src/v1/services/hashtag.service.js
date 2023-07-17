const Hashtag = require('../models/Hashtag');

const findHashtagIdsByQuery = async (q) => {
	const query = {
		name: {
			$regex: q,
			$options: 'i',
		},
	};
	const hashtags = await Hashtag.find(query).select('_id');
	return hashtags.map((hashtag) => hashtag._id);
};

const hashtagService = {
	findHashtagIdsByQuery,
};

module.exports = hashtagService;
