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
		name: yup.string().min(2).max(60),
		bio: yup.string().max(160),
	}),
};

const authRegisterSchema = yup.object().shape({
	firstName: yup.string().required().min(2).max(50),
	lastName: yup.string().required().min(2).max(50),
	email: yup.string().email().required(),
	password: yup.string().required().min(6),
	avatar: yup.string(),
	dateOfBirth: yup.date().required(),
	gender: yup.string().required().oneOf(['male', 'female', 'other']),
});

const passwordSchema = yup.object().shape({
	password: yup.string().required().min(6),
});

module.exports = {
	validateParams,
	validateBody,
	schemas,
	authRegisterSchema,
	passwordSchema,
};
