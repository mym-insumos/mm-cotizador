import { Link } from 'react-router-dom';
import type { KYCStatus } from '../types';

interface Props { kycStatus: KYCStatus }

export default function KYCBanner({ kycStatus }: Props) {
  if (kycStatus === 'VERIFIED') return null;

  const messages: Record<Exclude<KYCStatus, 'VERIFIED'>, { text: string; color: string }> = {
    PENDING:   { text: 'Verifica tu identidad (KYC) para apostar más de $50 y retirar fondos.', color: 'bg-yellow-900/40 border-yellow-600/40 text-yellow-300' },
    SUBMITTED: { text: 'Tu verificación KYC está siendo revisada (24-48 hs).', color: 'bg-blue-900/40 border-blue-600/40 text-blue-300' },
    REJECTED:  { text: 'Tu verificación KYC fue rechazada. Revisa y reenvía tus documentos.', color: 'bg-red-900/40 border-red-600/40 text-red-300' },
  };

  const msg = messages[kycStatus];

  return (
    <div className={`border rounded-lg px-4 py-3 flex items-center justify-between mb-6 ${msg.color}`}>
      <span className="text-sm">{msg.text}</span>
      {(kycStatus === 'PENDING' || kycStatus === 'REJECTED') && (
        <Link to="/profile#kyc" className="text-sm font-semibold hover:underline ml-4 shrink-0">
          Verificar →
        </Link>
      )}
    </div>
  );
}
