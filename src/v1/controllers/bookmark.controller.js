const bookmarkService = require('../services/bookmark.service');

const getBookmarks = async (req, res) => {
	const { user, query } = req;
	const { cursor, limit = 10 } = query;
	const bookmarks = await bookmarkService.getBookmarks(
		user?._id?.toString(),
		cursor,
		parseInt(limit),
	);
	res.status(200).json({
		status: 'success',
		data: bookmarks,
	});
};

const BookmarkController = {
	getBookmarks,
};

module.exports = BookmarkController;
