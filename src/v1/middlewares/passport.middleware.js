const passport = require('passport');
const GoogleTokenStrategy = require('passport-google-token').Strategy;
var GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookTokenStrategy = require('passport-facebook-token');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/User');
const {
	ACCESS_TOKEN_SECRET,
	GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET,
	FACEBOOK_APP_ID,
	FACEBOOK_APP_SECRET,
	GOOGLE_CALLBACK_URL,
} = require('../configs');
const { createUser } = require('../services/user.service');

// passport google token strategy config
passport.use(
	new GoogleTokenStrategy(
		{
			clientID: GOOGLE_CLIENT_ID,
			clientSecret: GOOGLE_CLIENT_SECRET,
		},
		async (accessToken, refreshToken, profile, done) => {
			try {
				const user = await User.findOne({ providerId: profile.id });
				if (!user) {
					const newUser = await createUser({
						providerId: profile.id,
						provider: profile.provider,
						name: profile.displayName,
						firstName: profile.name.givenName,
						lastName: profile.name.familyName,
						email: profile.emails[0].value,
						avatar: profile._json.picture,
					});
					return done(null, newUser);
				}
				done(null, user);
			} catch (e) {
				done(e, false, e.message);
			}
		},
	),
);

// passport facebook token strategy config
passport.use(
	new FacebookTokenStrategy(
		{
			clientID: FACEBOOK_APP_ID,
			clientSecret: FACEBOOK_APP_SECRET,
			profileFields: [
				'id',
				'displayName',
				'name',
				'gender',
				'email',
				'picture.type(large)',
			],
		},
		async (accessToken, refreshToken, profile, done) => {
			try {
				const user = await User.findOne({ providerId: profile.id });
				if (!user) {
					const newUser = await User.create({
						providerId: profile.id,
						provider: profile.provider,
						name: profile.displayName,
						firstName: profile.name.givenName,
						lastName: profile.name.familyName,
						email: profile.emails[0].value,
						avatar: profile._json?.picture?.data?.url,
					});
					return done(null, newUser);
				}
				done(null, user);
			} catch (e) {
				done(e, false, e.message);
			}
		},
	),
);

// passport config
passport.use(
	new JwtStrategy(
		{
			jwtFromRequest:
				ExtractJwt.fromAuthHeaderAsBearerToken('Authorization'),
			secretOrKey: ACCESS_TOKEN_SECRET,
		},
		async (payload, done) => {
			try {
				const user = await User.findById(
					payload.id,
					'_id email name avatar followers following',
				);
				if (!user) {
					return done(null, false);
				}
				done(null, user);
			} catch (error) {
				done(error, false);
			}
		},
	),
);

//passport local strategy config
passport.use(
	new LocalStrategy(
		{
			usernameField: 'email',
			passwordField: 'password',
		},
		async (email, password, done) => {
			try {
				// Find the user given the email
				const user = await User.findOne({
					email,
					provider: 'local',
				});
				// If not, handle it
				if (!user) {
					return done(null, false);
				}
				// Check if the password is correct
				const isMatch = await user.isValidPassword(password);
				// If not, handle it
				if (!isMatch) {
					return done(null, false, {
						message: 'Incorrect password',
					});
				}
				// Otherwise, return the user
				done(null, user);
			} catch (error) {
				done(error, false);
			}
		},
	),
);

passport.use(
	new GoogleStrategy(
		{
			clientID: GOOGLE_CLIENT_ID,
			clientSecret: GOOGLE_CLIENT_SECRET,
			callbackURL: GOOGLE_CALLBACK_URL,
		},
		async (accessToken, refreshToken, profile, cb) => {
			try {
				console.log(profile);
				const user = await User.findOne({ providerId: profile.id });
				if (!user) {
					const newUser = await createUser({
						providerId: profile.id,
						provider: profile.provider,
						name: profile.displayName,
						lastName: profile.name.familyName,
						firstName: profile.name.givenName,
						email: profile.emails[0].value,
						avatar: profile.photos[0].value,
					});
					return cb(null, newUser);
				}
				cb(null, user);
			} catch (e) {
				cb(e, false, e.message);
			}
		},
	),
);

//passport facebook strategy config

module.exports = passport;
