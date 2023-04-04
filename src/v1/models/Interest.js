const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InterestSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		unique: true,
	},
	icon: {
		type: String,
		required: true,
	},
	categories: [
		{
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'InterestCategory',
		},
	],
	slug: {
		type: String,
		unique: true,
	},
});

InterestSchema.pre('save', async function (next) {
	this.slug = this.name.toLowerCase().replace(/ /g, '-');
	next();
});
InterestSchema.index({ categories: 1 });
const Interest = mongoose.model('Interest', InterestSchema);

module.exports = Interest;
