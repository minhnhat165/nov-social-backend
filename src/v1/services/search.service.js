const Search = require('../models/Search');
const SearchLog = require('../models/SearchLog');

const createSearch = async (data) => {
	// Find search by type and data (user, keyword or location)
	let search;
	switch (data.type) {
		case 'user':
			search = await Search.findOne({
				type: data.type,
				'data.user': data.data.user,
			});
			break;
		case 'keyword':
			search = await Search.findOne({
				type: data.type,
				'data.keyword': data.data.keyword,
			});
			break;
		case 'location':
			search = await Search.findOne({
				type: data.type,
				'data.location': data.data.location,
			});
			break;
		default:
			break;
	}

	// If search exists, update the count
	if (search) {
		search.count++;
	} else {
		// Otherwise, create new search with the data
		search = new Search(data);
	}

	// Save the search
	await search.save();
	// Return the search populated with user details
	return await search.populate(
		'data.user',
		'name avatar email username provider',
	);
};

const saveSearchLog = async (searchId, userId) => {
	try {
		let searchLog = await SearchLog.findOne({
			userId,
			search: searchId,
		});
		if (!searchLog) {
			searchLog = new SearchLog({
				userId,
				search: searchId,
			});
		}
		searchLog.updatedAt = Date.now();
		await searchLog.save();
		await searchLog.populate('search', 'type text data');
		await searchLog.search.populate(
			'data.user',
			'name avatar email provider',
		);
		return searchLog;
	} catch (err) {
		console.log(err);
	}
};

const searchService = {
	createSearch,
	saveSearchLog,
};

module.exports = searchService;
