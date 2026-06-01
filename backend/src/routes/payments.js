const router = require('express').Router();
const { body } = require('express-validator');
const express = require('express');
const ctrl = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');
const { paymentLimiter } = require('../middleware/rateLimiter');

router.post('/webhook', express.raw({ type: 'application/json' }), ctrl.stripeWebhook);

router.get('/balance', authenticate, ctrl.getBalance);
router.get('/transactions', authenticate, ctrl.getTransactions);
router.post('/deposit', authenticate, paymentLimiter, [
  body('amount').isFloat({ min: 5 }),
], ctrl.createDepositIntent);
router.post('/withdraw', authenticate, paymentLimiter, [
  body('amount').isFloat({ min: 10 }),
  body('bankAccount').notEmpty(),
], ctrl.requestWithdrawal);
router.post('/subscribe', authenticate, paymentLimiter, [
  body('tier').isIn(['PREMIUM', 'HIGH_STAKES']),
], ctrl.subscribe);

module.exports = router;
