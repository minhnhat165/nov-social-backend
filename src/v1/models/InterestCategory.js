const mongoose = require('mongoose');

const InterestCategorySchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		unique: true,
	},
	slug: {
		type: String,
		unique: true,
	},
	description: {
		type: String,
		required: true,
	},
});

InterestCategorySchema.pre('save', function (next) {
	this.slug = this.name.toLowerCase().replace(/ /g, '-');
	next();
});

const InterestCategory = mongoose.model(
	'InterestCategory',
	InterestCategorySchema,
);

module.exports = InterestCategory;
