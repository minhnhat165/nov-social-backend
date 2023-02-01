const transferUser = async (req, res, next) => {
	const user = req.user;
	req.userSub = user;
	next();
};

module.exports = {
	transferUser,
};
