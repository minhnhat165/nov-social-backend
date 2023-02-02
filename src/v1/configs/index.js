module.exports = {
	// Client URL
	CLIENT_URL: process.env.CLIENT_URL,
	// MongoDB connection options
	MONGODB_URI:
		process.env.MONGODB_URI || 'mongodb://localhost:27017/express-api',
	// Session secret
	SESSION_SECRET: process.env.SESSION_SECRET,
	// Google OAuth
	GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
	GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
	// Facebook OAuth
	FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID,
	FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET,
	// Twitter OAuth
	TWITTER_CONSUMER_KEY: process.env.TWITTER_CONSUMER_KEY,
	TWITTER_CONSUMER_SECRET: process.env.TWITTER_CONSUMER_SECRET,
	// JWT secret
	ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
	REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
	VERIFY_TOKEN_SECRET: process.env.VERIFY_TOKEN_SECRET,
	MAX_LINKED_ACCOUNT: process.env.MAX_ACCOUNT_ADD || 5,
	AVATAR_SIZE: {
		SMALL: 60,
		MEDIUM: 320,
		LARGE: 640,
	},
	COVER_SIZE: {
		MEDIUM: {
			WIDTH: 1500,
			HEIGHT: 500,
		},
	},
};
