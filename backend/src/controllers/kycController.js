const prisma = require('../utils/prisma');
const logger = require('../utils/logger');

async function submitKYC(req, res) {
  const { fullName, birthDate, documentType, documentNumber, country } = req.body;

  const existing = await prisma.kYCProfile.findUnique({ where: { userId: req.user.id } });
  if (existing && existing.submittedAt) {
    return res.status(409).json({ error: 'Ya tienes una solicitud KYC enviada' });
  }

  const profile = existing
    ? await prisma.kYCProfile.update({
        where: { userId: req.user.id },
        data: { fullName, birthDate: new Date(birthDate), documentType, documentNumber, country },
      })
    : await prisma.kYCProfile.create({
        data: {
          userId: req.user.id,
          fullName,
          birthDate: new Date(birthDate),
          documentType,
          documentNumber,
          country,
        },
      });

  await prisma.user.update({
    where: { id: req.user.id },
    data: { kycStatus: 'SUBMITTED' },
  });

  logger.info('KYC enviado', { userId: req.user.id });
  res.status(201).json({ message: 'Solicitud KYC enviada. Revisión en 24-48 horas.', profile });
}

async function getKYCStatus(req, res) {
  const profile = await prisma.kYCProfile.findUnique({
    where: { userId: req.user.id },
    select: {
      fullName: true, country: true, documentType: true,
      submittedAt: true, verifiedAt: true, rejectedAt: true, rejectionReason: true,
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { kycStatus: true },
  });

  res.json({ kycStatus: user.kycStatus, profile });
}

async function reviewKYC(req, res) {
  const { userId, decision, rejectionReason } = req.body;

  if (!['VERIFIED', 'REJECTED'].includes(decision)) {
    return res.status(400).json({ error: 'Decisión no válida' });
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { kycStatus: decision },
    });

    await tx.kYCProfile.update({
      where: { userId },
      data: {
        ...(decision === 'VERIFIED' && { verifiedAt: new Date() }),
        ...(decision === 'REJECTED' && { rejectedAt: new Date(), rejectionReason }),
      },
    });
  });

  logger.info('KYC revisado por admin', { userId, decision });
  res.json({ message: `KYC ${decision === 'VERIFIED' ? 'aprobado' : 'rechazado'}` });
}

async function listPendingKYC(req, res) {
  const profiles = await prisma.kYCProfile.findMany({
    where: { user: { kycStatus: 'SUBMITTED' } },
    include: { user: { select: { id: true, username: true, email: true } } },
    orderBy: { submittedAt: 'asc' },
  });
  res.json(profiles);
}

module.exports = { submitKYC, getKYCStatus, reviewKYC, listPendingKYC };
