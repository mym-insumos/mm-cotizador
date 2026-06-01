const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/matchController');
const { authenticate } = require('../middleware/auth');
const { requireKYCForHighStakes } = require('../middleware/kyc');

router.get('/', ctrl.listOpenMatches);
router.get('/my', authenticate, ctrl.getMyMatches);
router.get('/:id', authenticate, ctrl.getMatch);

router.post('/', authenticate, requireKYCForHighStakes(), [
  body('stakeAmount').isFloat({ min: 0.5 }),
  body('timeControl').isInt({ min: 1, max: 60 }),
], ctrl.createMatch);

router.post('/:id/join', authenticate, ctrl.joinMatch);
router.post('/:id/settle', authenticate, [
  body('chessGameId').notEmpty(),
], ctrl.settleMatch);
router.post('/:id/cancel', authenticate, ctrl.cancelMatch);
router.post('/:id/dispute', authenticate, [
  body('reason').notEmpty().isLength({ max: 500 }),
], ctrl.disputeMatch);

module.exports = router;
