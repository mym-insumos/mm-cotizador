require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimiter } = require('./middleware/rateLimiter');
const authRoutes = require('./routes/auth');
const matchRoutes = require('./routes/matches');
const tournamentRoutes = require('./routes/tournaments');
const paymentRoutes = require('./routes/payments');
const kycRoutes = require('./routes/kyc');
const { initSocketHandlers } = require('./services/socketService');
const matchCtrl = require('./controllers/matchController');
const tournamentCtrl = require('./controllers/tournamentController');
const logger = require('./utils/logger');

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin:  process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

matchCtrl.setIO(io);
tournamentCtrl.setIO(io);

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(rateLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/kyc', kycRoutes);

app.get('/api/health', (req, res) => res.json({
  status:    'ok',
  timestamp: new Date(),
  version:   '1.0.0',
}));

initSocketHandlers(io);

app.use((err, req, res, next) => {
  logger.error(err.message, { stack: err.stack, path: req.path });
  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  logger.info(`Servidor iniciado en puerto ${PORT}`);
});

module.exports = { app, io };
