const passport = require('passport');
const pollController = require('../controllers/poll.controller');

const router = require('express-promise-router')();

router.get('/:id', pollController.getPoll);

router.put(
	'/:id',
	passport.authenticate('jwt', { session: false }),
	pollController.updatePoll,
);

router.patch(
	'/:id/vote/:optionId',
	passport.authenticate('jwt', { session: false }),
	pollController.vote,
);
router.patch(
	'/:id/unvote/:optionId',
	passport.authenticate('jwt', { session: false }),
	pollController.unvote,
);

module.exports = router;
