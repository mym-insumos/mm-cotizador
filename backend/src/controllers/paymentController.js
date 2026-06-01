const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const prisma = require('../utils/prisma');
const logger = require('../utils/logger');

async function createDepositIntent(req, res) {
  const { amount } = req.body;
  const amountCents = Math.round(Number(amount) * 100);

  if (amountCents < 500) {
    return res.status(400).json({ error: 'El monto mínimo de depósito es $5' });
  }

  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    metadata: { userId: req.user.id, username: req.user.username },
    description: `Depósito de saldo — ${req.user.username}`,
  });

  const transaction = await prisma.transaction.create({
    data: {
      userId:      req.user.id,
      type:        'DEPOSIT',
      amount:      Number(amount),
      status:      'PENDING',
      stripeId:    intent.id,
      description: `Depósito vía Stripe`,
    },
  });

  res.json({ clientSecret: intent.client_secret, transactionId: transaction.id });
}

async function stripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error('Stripe webhook signature inválida', { error: err.message });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    const userId = intent.metadata.userId;
    const amount = intent.amount / 100;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: amount } },
      });

      await tx.transaction.updateMany({
        where: { stripeId: intent.id, status: 'PENDING' },
        data: { status: 'COMPLETED' },
      });
    });

    logger.info('Depósito acreditado', { userId, amount });
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object;
    await prisma.transaction.updateMany({
      where: { stripeId: intent.id },
      data: { status: 'FAILED' },
    });
  }

  res.json({ received: true });
}

async function requestWithdrawal(req, res) {
  const { amount, bankAccount } = req.body;
  const withdrawAmount = Number(amount);

  if (req.user.kycStatus !== 'VERIFIED') {
    return res.status(403).json({ error: 'Se requiere verificación KYC para retirar fondos' });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (Number(user.balance) < withdrawAmount) {
    return res.status(400).json({ error: 'Saldo insuficiente para el retiro solicitado' });
  }

  if (withdrawAmount < 10) {
    return res.status(400).json({ error: 'El retiro mínimo es de $10' });
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: req.user.id },
      data: { balance: { decrement: withdrawAmount } },
    });

    await tx.transaction.create({
      data: {
        userId:      req.user.id,
        type:        'WITHDRAWAL',
        amount:      withdrawAmount,
        status:      'PENDING',
        metadata:    { bankAccount },
        description: `Solicitud de retiro`,
      },
    });
  });

  logger.info('Solicitud de retiro registrada', { userId: req.user.id, amount: withdrawAmount });
  res.json({ message: 'Solicitud de retiro recibida. Procesamiento en 1-3 días hábiles.' });
}

async function getBalance(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { balance: true, lockedBalance: true },
  });
  res.json(user);
}

async function getTransactions(req, res) {
  const { page = 1, limit = 30, type } = req.query;
  const where = { userId: req.user.id, ...(type && { type }) };

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.transaction.count({ where }),
  ]);

  res.json({ transactions, total });
}

async function subscribe(req, res) {
  const { tier } = req.body;
  if (!['PREMIUM', 'HIGH_STAKES'].includes(tier)) {
    return res.status(400).json({ error: 'Plan de suscripción no válido' });
  }

  const prices = { PREMIUM: 1500, HIGH_STAKES: 4900 };
  const intent = await stripe.paymentIntents.create({
    amount: prices[tier],
    currency: 'usd',
    metadata: { userId: req.user.id, subscriptionTier: tier },
    description: `Suscripción ${tier}`,
  });

  res.json({ clientSecret: intent.client_secret });
}

module.exports = {
  createDepositIntent, stripeWebhook, requestWithdrawal,
  getBalance, getTransactions, subscribe,
};
