const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const OtpSchema = new Schema(
	{
		email: {
			type: String,
			required: true,
			trim: true,
		},
		otp: {
			type: String,
			required: true,
		},
		createdAt: { type: Date, default: Date.now, index: { expires: 300 } },
	},
	{ timestamps: true }
);

module.exports = mongoose.model('otp', OtpSchema);
