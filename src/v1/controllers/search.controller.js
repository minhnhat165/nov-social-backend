const Interest = require('../models/Interest');
const InterestCategory = require('../models/InterestCategory');
const Search = require('../models/Search');
const SearchLog = require('../models/SearchLog');
const User = require('../models/User');
const searchService = require('../services/search.service');
const userService = require('../services/user.service');
const escapeRegex = require('../utils/escapeRegex');

const search = async (req, res, next) => {
	const { q, limit = 10 } = req.query;
	if (q.includes('[]')) {
		return res.status(200).json({ searches: [] });
	}
	let users = [];
	let result = [];
	if (q.includes('[email]')) {
		const email = q.split('[email]')[1].trim();
		users = await userService.searchByEmail(email, limit);
	} else {
		// fix Regular expression is invalid: /[]/i
		const newQuery = escapeRegex(q);
		result = await Search.find({
			text: { $regex: newQuery, $options: 'i' },
			// updatedAt: { $gte: new Date(new Date() - 24 * 60 * 60 * 1000) },
		})
			.sort({ count: -1 })
			.limit(5)
			.populate('data.user', 'name avatar email username')
			.select('_id data type text');

		const userIdsInResult = [];

		result.forEach((item) => {
			if (item?.data?.user) {
				userIdsInResult.push(item.data.user._id);
			}
		});

		const resLimit = limit - result.length;

		users = await userService.searchByName(newQuery, resLimit, {
			_id: { $nin: userIdsInResult },
		});
	}

	users.forEach((user) => {
		result.push({
			_id: user._id,
			text: user.name,
			type: 'user',
			data: {
				user,
			},
		});
	});

	return res.status(200).json({ searches: result });
};

const getSearchLog = async (req, res) => {
	const { user } = req;
	const { limit = 10 } = req.query;

	const searchLog = await SearchLog.find({ userId: user._id })
		.limit(limit)
		.populate({
			path: 'search',
			select: 'type text data',
			populate: {
				path: 'data.user',
				select: 'name avatar email provider username',
			},
		})
		.sort({ updatedAt: -1 });

	const result = [];
	searchLog.forEach((item) => {
		if (item?.search) result.push(item.search);
	});

	res.status(200).json({
		searches: result,
		success: true,
	});
};

const updateSearchLog = async (req, res) => {
	const { user, body } = req;
	const { type, text, data } = body;
	const search = await searchService.createSearch({
		type,
		text,
		data,
	});

	let searchLog = await searchService.saveSearchLog(search._id, user._id);
	res.status(200).json({
		data: searchLog.search,
		success: true,
	});
};

const deleteSearchLog = async (req, res) => {
	const { user } = req;
	const { searchId } = req.params;
	await SearchLog.findOneAndDelete({
		userId: user._id,
		search: searchId,
	});
	res.status(200).json({
		success: true,
	});
};

const searchInterest = async (req, res) => {
	const { q, limit = 10, category } = req.query;
	const newQuery = escapeRegex(q);
	if (!q) return res.status(200).json({ result: [] });
	let categoryId;
	if (category) {
		const categoryFind = await InterestCategory.findOne({
			slug: category,
		}).select('_id');
		if (!categoryFind) return res.status(200).json({ result: [] });
		categoryId = categoryFind._id;
	}
	// if have category then search in categories filed of Interest model

	const result = await Interest.find({
		name: { $regex: newQuery, $options: 'i' },
		...(category && { categories: categoryId }),
	})
		.limit(limit)
		.select('_id name icon slug');
	res.status(200).json({ result });
};

const searchController = {
	search,
	updateSearchLog,
	getSearchLog,
	deleteSearchLog,
	searchInterest,
};

module.exports = searchController;
