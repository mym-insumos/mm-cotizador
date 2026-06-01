function requireKYC(req, res, next) {
  if (req.user?.kycStatus !== 'VERIFIED') {
    return res.status(403).json({
      error: 'Verificación de identidad (KYC) requerida para esta acción',
      kycStatus: req.user?.kycStatus,
    });
  }
  next();
}

function requireKYCForHighStakes(stakeThreshold) {
  return (req, res, next) => {
    const stake = Number(req.body.stakeAmount || 0);
    const threshold = stakeThreshold || Number(process.env.KYC_STAKE_THRESHOLD) || 50;

    if (stake >= threshold && req.user?.kycStatus !== 'VERIFIED') {
      return res.status(403).json({
        error: `Para apuestas mayores a $${threshold} se requiere verificación KYC completa`,
        kycStatus: req.user?.kycStatus,
      });
    }
    next();
  };
}

module.exports = { requireKYC, requireKYCForHighStakes };
