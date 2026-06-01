const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const prisma = require('../utils/prisma');
const { verifyLichessUser } = require('../services/chessApiService');

async function register(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, username, password, country } = req.body;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    return res.status(409).json({ error: 'Email o nombre de usuario ya registrado' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, username, passwordHash, country },
    select: { id: true, email: true, username: true, createdAt: true },
  });

  const token = signToken(user.id);
  res.status(201).json({ user, token });
}

async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  if (!user.isActive || user.isBanned) {
    return res.status(403).json({ error: 'Cuenta suspendida o inactiva' });
  }

  const token = signToken(user.id);
  res.json({
    token,
    user: {
      id:               user.id,
      email:            user.email,
      username:         user.username,
      rating:           user.rating,
      balance:          user.balance,
      lockedBalance:    user.lockedBalance,
      kycStatus:        user.kycStatus,
      subscriptionTier: user.subscriptionTier,
      role:             user.role,
    },
  });
}

async function getProfile(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true, email: true, username: true, rating: true,
      balance: true, lockedBalance: true, kycStatus: true,
      subscriptionTier: true, subscriptionEnd: true,
      lichessUsername: true, chesscomUsername: true,
      country: true, totalWins: true, totalLosses: true,
      totalDraws: true, totalEarnings: true, createdAt: true, role: true,
    },
  });
  res.json(user);
}

async function updateProfile(req, res) {
  const { country } = req.body;
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { country },
    select: { id: true, username: true, country: true },
  });
  res.json(user);
}

async function linkChessAccount(req, res) {
  const { provider, username } = req.body;
  if (!['lichess', 'chesscom'].includes(provider)) {
    return res.status(400).json({ error: 'Proveedor no válido' });
  }

  if (provider === 'lichess') {
    const check = await verifyLichessUser(username);
    if (!check.exists) {
      return res.status(404).json({ error: 'Usuario de Lichess no encontrado' });
    }
  }

  const field = provider === 'lichess' ? 'lichessUsername' : 'chesscomUsername';
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { [field]: username },
    select: { id: true, lichessUsername: true, chesscomUsername: true },
  });

  res.json(user);
}

function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

module.exports = { register, login, getProfile, updateProfile, linkChessAccount };
