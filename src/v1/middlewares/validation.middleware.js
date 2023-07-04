const yup = require('yup');
const validateParams = (schema, name) => async (req, res, next) => {
	try {
		await schema.validate({ param: req.params[name] });
		if (!req.value) {
			req.value = {};
		}
		if (!req.value['params']) {
			req.value['params'] = {};
		}
		req.value['params'][name] = req.params[name];
		next();
	} catch (error) {
		res.status(400).json(error);
	}
};

const validateBody = (schema) => async (req, res, next) => {
	try {
		await schema.validate(req.body);
		if (!req.value) {
			req.value = {};
		}
		if (!req.value['body']) {
			req.value['body'] = {};
		}
		req.value['body'] = req.body;
		next();
	} catch (error) {
		res.status(400).json(error);
	}
};

const validateQuery = (schema) => async (req, res, next) => {
	try {
		await schema.validate(req.query);
		if (!req.value) {
			req.value = {};
		}
		if (!req.value['query']) {
			req.value['query'] = {};
		}
		req.value['query'] = req.query;
		next();
	} catch (error) {
		res.status(400).json({
			status: '400',
			message: error.message,
		});
	}
};

const schemas = {
	idSchema: yup.object().shape({
		param: yup
			.string()
			.matches(/^[0-9a-fA-F]{24}$/)
			.required(),
	}),
	authLoginSchema: yup.object().shape({
		email: yup.string().email().required(),
		password: yup.string().required().min(6),
	}),
	authCheckEmailSchema: yup.object().shape({
		email: yup.string().email().required(),
	}),
	authRegisterSchema: yup.object().shape({
		firstName: yup.string().required(),
		lastName: yup.string().required(),
		email: yup.string().email().required(),
		password: yup.string().required().min(6),
		avatar: yup.string(),
	}),

	authUpdateSchema: yup.object().shape({
		firstName: yup.string().required(),
		lastName: yup.string().required(),
		email: yup.string().email().required(),
		avatar: yup.string(),
	}),

	authUpdatePasswordSchema: yup.object().shape({
		oldPassword: yup.string().required().min(6),
		newPassword: yup.string().required().min(6),
	}),

	authForgotPasswordSchema: yup.object().shape({
		email: yup.string().email().required(),
	}),

	authResetPasswordSchema: yup.object().shape({
		password: yup.string().required().min(6),
		token: yup.string().required(),
	}),
	userProfileSchema: yup.object().shape({
		name: yup.string().min(1).max(60),
		bio: yup.string().max(160),
	}),
	usernameSchema: yup.object().shape({
		username: yup
			.string()
			.max(60)
			.required('Username is a required field')
			.matches(
				/^[a-zA-Z0-9_]+$/,
				'Username can only contain letters, numbers and underscores',
			),
	}),
	postSchema: yup.object().shape({
		commentId: yup.string().matches(/^[0-9a-fA-F]{24}$/),
	}),
};

const authRegisterSchema = yup.object().shape({
	firstName: yup.string().required().min(1).max(60),
	lastName: yup.string().required().min(1).max(60),
	email: yup.string().email().required(),
	password: yup.string().required().min(6),
	avatar: yup.string(),
	dateOfBirth: yup.date().required(),
	gender: yup.string().required().oneOf(['male', 'female', 'other']),
});

const passwordSchema = yup.object().shape({
	password: yup.string().required().min(6),
});

const usernameSchema = yup.object().shape({
	username: yup
		.string()
		.max(60)
		.required('Username is a required field')
		.matches(
			/^[a-zA-Z0-9_]+$/,
			'Username can only contain letters, numbers and underscores',
		),
});

module.exports = {
	validateParams,
	validateBody,
	validateQuery,
	schemas,
	authRegisterSchema,
	passwordSchema,
	usernameSchema,
};
