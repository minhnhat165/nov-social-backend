const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const bcrypt = require('bcryptjs');
const { getImageWithDimension } = require('../services/cloud.service');
const { AVATAR_SIZE, COVER_SIZE } = require('../configs');

const UserSchema = new Schema(
	{
		email: {
			type: String,
			required: true,
			trim: true,
			lowercase: true,
		},
		password: {
			type: String,
		},
		status: {
			type: String,
			enum: ['pending', 'active'],
			default: 'active',
		},
		providerId: {
			type: String,
			default: null,
		},
		provider: {
			type: String,
			enum: ['local', 'google', 'facebook', 'twitter'],
			default: 'local',
		},
		name: {
			type: String,
			required: true,
			trim: true,
		},
		firstName: {
			type: String,
			required: true,
			trim: true,
		},
		lastName: {
			type: String,
			required: true,
			trim: true,
		},
		cover: {
			type: String,
		},
		avatar: {
			type: String,
		},
		avatarId: {
			type: String,
		},
		cover: {
			type: String,
		},
		coverId: {
			type: String,
		},
		dateOfBirth: {
			type: Date,
		},
		bio: {
			type: String,
			default: '',
			maxLength: 160,
		},

		address: { type: String, default: '' },
		homeTown: { type: String, default: '' },
		phoneNumber: { type: String, default: '' },
		gender: {
			type: String,
			enum: ['male', 'female', 'other'],
			default: 'male',
		},
		followers: [
			{
				type: mongoose.Types.ObjectId,
				ref: 'user',
			},
		],
		following: [
			{
				type: mongoose.Types.ObjectId,
				ref: 'user',
			},
		],
		notificationsCount: { type: Number, default: 0 },
		linkedAccounts: [
			{
				type: mongoose.Types.ObjectId,
				ref: 'user',
			},
		],
	},
	{ timestamps: true },
);

UserSchema.index({ email: 1, provider: 1 }, { unique: true });

UserSchema.index(
	{
		createdAt: 1,
	},
	{
		expireAfterSeconds: 60 * 60 * 24,
		partialFilterExpression: { status: 'pending' },
	},
);

UserSchema.methods.isValidPassword = async function (password) {
	try {
		return await bcrypt.compare(password, this.password);
	} catch (e) {
		throw new Error(e);
	}
};

UserSchema.pre('save', async function (next) {
	if (this.isModified('avatarId')) {
		this.avatar = getImageWithDimension(
			this.avatarId,
			AVATAR_SIZE.SMALL,
			AVATAR_SIZE.SMALL,
		);
	}

	if (this.isModified('coverId')) {
		this.cover = getImageWithDimension(
			this.coverId,
			COVER_SIZE.MEDIUM.WIDTH,
			COVER_SIZE.MEDIUM.HEIGHT,
		);
	}

	if (!this.isModified('password') || this.provider !== 'local')
		return next();
	try {
		const salt = await bcrypt.genSalt(10);
		const hash = await bcrypt.hash(this.password, salt);
		this.password = hash;
		next();
	} catch (e) {
		next(e);
	}
});

module.exports = mongoose.model('user', UserSchema);
