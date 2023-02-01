const throwError = (message, code) => {
	const error = new Error(message);
	error.status = code;
	throw error;
};

module.exports = throwError;
