const createHttpError = require('http-errors');
const SearchLog = require('../models/SearchLog');
const search = {
	getAll: async (req, res, next) => {
		const { user } = req;
		const searchLog = await SearchLog.findOne({
			userId: user._id,
		}).populate('users', '_id name avatar email');

		if (!searchLog) throw createHttpError(404, 'No search history found');

		return res.status(200).json({ success: true, searchLog });
	},

	addUser: async (req, res, next) => {
		const { user } = req;
		const { userId } = req.value.params;
		let searchLog = await SearchLog.findOneAndUpdate(
			{ userId: user._id },
			{
				$addToSet: { users: userId },
			},
			{ new: true }
		).populate('users', '_id name avatar email');

		if (!searchLog) {
			const newSearchLog = new SearchLog({
				user: user._id,
				users: [userId],
			});
			await newSearchLog.save();
			await newSearchLog.populate('users', '_id name avatar email');
			searchLog = newSearchLog;
		}

		return res.status(200).json({ success: true, searchLog });
	},

	removeUser: async (req, res, next) => {
		const { user } = req;
		const { userId } = req.value.params;
		let searchLog = await SearchLog.findOneAndUpdate(
			{ userId: user._id },
			{
				$pull: { users: userId },
			},
			{ new: true }
		).populate('users', '_id name avatar email');
		return res.status(200).json({ success: true, searchLog });
	},

	addKeyword: async (req, res, next) => {
		const { user } = req;
		const { keyword } = req.params;
		let searchLog = await SearchLog.findOneAndUpdate(
			{ userId: user._id },
			{
				$addToSet: { keywords: keyword },
			},
			{ new: true }
		).populate('users', '_id name avatar email');

		if (!searchLog) {
			const newSearchLog = new SearchLog({
				userId: user._id,
				keywords: [keyword],
			});
			await newSearchLog.save();
			await newSearchLog.populate('users', '_id name avatar email');
			searchLog = newSearchLog;
		}
		return res.status(200).json({ success: true, searchLog });
	},

	removeKeyword: async (req, res, next) => {
		const { user } = req;
		const { keyword } = req.params;
		let searchLog = await SearchLog.findOneAndUpdate(
			{ userId: user._id },
			{
				$pull: { keywords: keyword },
			},
			{ new: true }
		).populate('users', '_id name avatar email');
		return res.status(200).json({ success: true, searchLog });
	},
};

module.exports = {
	search,
};
