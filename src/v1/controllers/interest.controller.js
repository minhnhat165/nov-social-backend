const InterestCategory = require('../models/InterestCategory');

const getAllCategories = async (req, res) => {
	const categories = await InterestCategory.find().select('name slug');
	res.status(200).json({
		status: 'success',
		data: categories,
	});
};

module.exports = interestController = {
	getAllCategories,
};
