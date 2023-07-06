const Bookmark = require('../models/Bookmark');

const getBookmarks = async (
	userId,
	cursor = new Date().toISOString(),
	limit,
) => {
	const query = {
		user: userId,
		createdAt: { $lt: cursor },
	};
	const bookmarks = await Bookmark.find(query)
		.sort({ createdAt: -1 })
		.limit(limit)
		.populate({
			path: 'posts',
			populate: {
				path: 'author',
				select: 'name avatar',
			},
		});

	return {
		items: bookmarks,
		endCursor: bookmarks.length
			? bookmarks[bookmarks.length - 1].createdAt
			: null,
		hasNextPage: bookmarks.length === limit,
	};
};

const bookmarkService = {
	getBookmarks,
};

module.exports = bookmarkService;
