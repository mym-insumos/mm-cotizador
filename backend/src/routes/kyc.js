const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/kycController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/status', authenticate, ctrl.getKYCStatus);
router.post('/submit', authenticate, [
  body('fullName').notEmpty().isLength({ max: 100 }),
  body('birthDate').isISO8601(),
  body('documentType').isIn(['DNI', 'PASSPORT', 'CEDULA', 'DRIVERS_LICENSE']),
  body('documentNumber').notEmpty(),
  body('country').isISO31661Alpha2(),
], ctrl.submitKYC);

router.get('/pending', authenticate, requireAdmin, ctrl.listPendingKYC);
router.post('/review', authenticate, requireAdmin, [
  body('userId').notEmpty(),
  body('decision').isIn(['VERIFIED', 'REJECTED']),
], ctrl.reviewKYC);

module.exports = router;
