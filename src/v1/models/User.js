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
			select: false,
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
		username: {
			type: String,
			trim: true,
			unique: true,
			validate: {
				validator: function (v) {
					return /^[a-zA-Z0-9]+$/.test(v); // ensure username contains only letters and numbers
				},
				message: (props) =>
					`${props.value} must contain only letters and numbers`,
			},
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
		photos: {
			type: [String],
			default: [],
		},
		dateOfBirth: {
			type: Date,
		},
		bio: {
			type: String,
			default: '',
			maxLength: 160,
		},

		address: { type: String },
		homeTown: { type: String },
		phoneNumber: { type: String, public: false },
		gender: {
			type: String,
			enum: ['male', 'female', 'other'],
			default: 'male',
		},
		followers: {
			type: [mongoose.Types.ObjectId],
			default: [],
			ref: 'user',
		},
		following: {
			type: [mongoose.Types.ObjectId],
			default: [],
			ref: 'user',
		},
		numNotifications: { type: Number, default: 0 },
		linkedAccounts: [
			{
				type: mongoose.Types.ObjectId,
				ref: 'user',
			},
		],
		interests: [
			{
				type: mongoose.Types.ObjectId,
				ref: 'Interest',
			},
		],
		profilePrivate: {
			type: [String],
			default: [],
		},
		rank: {
			number: {
				type: Number,
				default: 1,
				enum: [1, 2, 3, 4, 5, 6, 7],
			},
			dateReached: { type: Date, default: Date.now() },
		},
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

UserSchema.methods.toJSON = function () {
	const obj = this.toObject();
	delete obj.password; // This removes the password from the API response
	return obj;
};

UserSchema.pre('save', async function (next) {
	if (!this.username) {
		// generate username if not provided
		const firstName = this.firstName.replace(/\s/g, '');
		const lastName = this.lastName.replace(/\s/g, '');
		let num = 1;
		let username = `${firstName}${lastName}`
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-zA-Z0-9_]/g, '');
		while (await this.constructor.findOne({ username })) {
			// ensure username is unique
			num++;
			username = `${firstName}${lastName}${num}`;
		}
		this.username = username;
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

UserSchema.pre('findOneAndUpdate', async function (next) {
	const { _update } = this;
	if (_update.avatarId) {
		this._update.avatar = getImageWithDimension(
			this._update.avatarId,
			AVATAR_SIZE.SMALL,
			AVATAR_SIZE.SMALL,
		);
	}

	if (_update.coverId) {
		_update.cover = getImageWithDimension(
			this._update.coverId,
			COVER_SIZE.MEDIUM.WIDTH,
			COVER_SIZE.MEDIUM.HEIGHT,
		);
	}
	next();
});

module.exports = mongoose.model('user', UserSchema);
