const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const SearchLogSchema = new Schema(
	{
		userId: {
			type: mongoose.Types.ObjectId,
			ref: 'user',
		},
		search: {
			type: mongoose.Types.ObjectId,
			ref: 'search',
		},
	},
	{ timestamps: true }
);

module.exports = mongoose.model('SearchLog', SearchLogSchema);
