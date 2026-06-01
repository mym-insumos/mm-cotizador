const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('username').isLength({ min: 3, max: 20 }).matches(/^[a-zA-Z0-9_]+$/),
  body('password').isLength({ min: 8 }),
], ctrl.register);

router.post('/login', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], ctrl.login);

router.get('/profile', authenticate, ctrl.getProfile);
router.patch('/profile', authenticate, ctrl.updateProfile);
router.post('/link-chess', authenticate, [
  body('provider').isIn(['lichess', 'chesscom']),
  body('username').notEmpty(),
], ctrl.linkChessAccount);

module.exports = router;
