const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/tournamentController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', ctrl.listTournaments);
router.get('/:id', ctrl.getTournament);
router.get('/:id/standings', ctrl.getStandings);

router.post('/', authenticate, requireAdmin, ctrl.createTournament);
router.post('/:id/register', authenticate, ctrl.registerForTournament);
router.post('/:id/start', authenticate, requireAdmin, ctrl.startTournament);
router.post('/:id/next-round', authenticate, requireAdmin, ctrl.nextRound);

module.exports = router;
