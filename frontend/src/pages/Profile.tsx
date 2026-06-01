import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { auth, kyc, payments } from '../services/api';

type Section = 'overview' | 'kyc' | 'chess' | 'transactions' | 'subscription';

export default function Profile() {
  const user = useAuthStore(s => s.user);
  const setUser = useAuthStore(s => s.setUser);
  const qc = useQueryClient();
  const [section, setSection] = useState<Section>('overview');

  const { data: kycData, refetch: refetchKYC } = useQuery({
    queryKey: ['kyc-status'],
    queryFn: kyc.getStatus,
  });

  const { data: txData } = useQuery({
    queryKey: ['transactions-all'],
    queryFn: () => payments.getTransactions({ limit: 50 }),
    enabled: section === 'transactions',
  });

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Mi perfil</h1>

      <div className="flex gap-2 mb-8 flex-wrap">
        {([
          ['overview', 'Resumen'],
          ['kyc', 'Verificación KYC'],
          ['chess', 'Cuenta de ajedrez'],
          ['transactions', 'Historial'],
          ['subscription', 'Membresía'],
        ] as [Section, string][]).map(([s, label]) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              section === s ? 'bg-chess-gold text-chess-dark' : 'bg-chess-accent/30 text-gray-300 hover:bg-chess-accent'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {section === 'overview' && <OverviewSection user={user} />}
      {section === 'kyc' && <KYCSection kycData={kycData} onRefresh={refetchKYC} />}
      {section === 'chess' && <ChessSection user={user} setUser={setUser} />}
      {section === 'transactions' && <TransactionsSection txData={txData} />}
      {section === 'subscription' && <SubscriptionSection user={user} />}
    </div>
  );
}

function OverviewSection({ user }: any) {
  const tierLabels: any = { FREE: 'Free', PREMIUM: 'Premium', HIGH_STAKES: 'High Stakes' };
  const kycLabels: any = { PENDING: 'Sin verificar', SUBMITTED: 'En revisión', VERIFIED: 'Verificado ✓', REJECTED: 'Rechazado' };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="card">
        <h2 className="font-semibold text-lg mb-4">Información de cuenta</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-gray-400">Usuario</span><span>{user.username}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Email</span><span>{user.email}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">País</span><span>{user.country || '—'}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Miembro desde</span><span>{new Date(user.createdAt).toLocaleDateString('es-AR')}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Plan</span><span className="text-chess-gold">{tierLabels[user.subscriptionTier]}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">KYC</span><span>{kycLabels[user.kycStatus]}</span></div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-lg mb-4">Estadísticas</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-gray-400">Rating</span><span className="text-chess-gold font-bold">{user.rating}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Victorias</span><span className="text-green-400">{user.totalWins}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Derrotas</span><span className="text-red-400">{user.totalLosses}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Tablas</span><span>{user.totalDraws}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Ganancias totales</span><span className="text-chess-gold">${parseFloat(user.totalEarnings).toFixed(2)}</span></div>
        </div>
      </div>
    </div>
  );
}

function KYCSection({ kycData, onRefresh }: any) {
  const [form, setForm] = useState({
    fullName: '', birthDate: '', documentType: 'DNI', documentNumber: '', country: 'AR',
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (f: string) => (e: any) => setForm(prev => ({ ...prev, [f]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await kyc.submit(form);
      setSuccess('Solicitud enviada. Revisión en 24-48 horas.');
      onRefresh();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al enviar KYC');
    } finally {
      setLoading(false);
    }
  };

  const status = kycData?.kycStatus;

  return (
    <div className="card max-w-lg">
      <h2 className="font-semibold text-lg mb-2">Verificación de Identidad (KYC)</h2>
      <p className="text-sm text-gray-400 mb-6">
        Requerida para apuestas mayores a $50 y retiros. Proceso cumple con AML.
      </p>

      {status === 'VERIFIED' && (
        <div className="bg-green-900/30 border border-green-600/40 text-green-300 rounded-lg p-4 text-sm">
          ✓ Identidad verificada — {kycData.profile?.fullName}
        </div>
      )}

      {status === 'SUBMITTED' && (
        <div className="bg-blue-900/30 border border-blue-600/40 text-blue-300 rounded-lg p-4 text-sm">
          Tu solicitud está siendo revisada. Tiempo estimado: 24-48 horas.
        </div>
      )}

      {(status === 'PENDING' || status === 'REJECTED') && (
        <>
          {status === 'REJECTED' && (
            <div className="bg-red-900/30 border border-red-600/40 text-red-300 rounded-lg p-4 text-sm mb-4">
              Rechazado: {kycData.profile?.rejectionReason || 'Documentación inválida'}
            </div>
          )}

          {success && <div className="bg-green-900/30 border border-green-600/40 text-green-300 rounded-lg p-3 text-sm mb-4">{success}</div>}
          {error && <div className="bg-red-900/30 border border-red-600/40 text-red-300 rounded-lg p-3 text-sm mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm text-gray-300 mb-1">Nombre completo</label><input type="text" value={form.fullName} onChange={set('fullName')} className="input" required /></div>
            <div><label className="block text-sm text-gray-300 mb-1">Fecha de nacimiento</label><input type="date" value={form.birthDate} onChange={set('birthDate')} className="input" required /></div>
            <div><label className="block text-sm text-gray-300 mb-1">Tipo de documento</label>
              <select value={form.documentType} onChange={set('documentType')} className="input">
                <option value="DNI">DNI</option>
                <option value="PASSPORT">Pasaporte</option>
                <option value="CEDULA">Cédula</option>
                <option value="DRIVERS_LICENSE">Licencia de conducir</option>
              </select>
            </div>
            <div><label className="block text-sm text-gray-300 mb-1">Número de documento</label><input type="text" value={form.documentNumber} onChange={set('documentNumber')} className="input" required /></div>
            <div><label className="block text-sm text-gray-300 mb-1">País del documento</label>
              <select value={form.country} onChange={set('country')} className="input">
                <option value="AR">Argentina</option>
                <option value="ES">España</option>
                <option value="MX">México</option>
                <option value="CO">Colombia</option>
                <option value="CL">Chile</option>
                <option value="UY">Uruguay</option>
              </select>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Enviando...' : 'Enviar verificación'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

function ChessSection({ user, setUser }: any) {
  const [provider, setProvider] = useState<'lichess' | 'chesscom'>('lichess');
  const [username, setUsername] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLink = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(''); setMsg('');
    try {
      const updated = await auth.linkChess(provider, username);
      setUser({ ...user, ...updated });
      setMsg('Cuenta vinculada correctamente');
      setUsername('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al vincular cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card max-w-lg">
      <h2 className="font-semibold text-lg mb-2">Vincular cuenta de ajedrez</h2>
      <p className="text-sm text-gray-400 mb-6">
        Vincula tu cuenta de Lichess para que el sistema pueda verificar automáticamente los resultados.
      </p>

      {user.lichessUsername && (
        <div className="bg-green-900/30 border border-green-600/40 text-green-300 rounded-lg p-3 text-sm mb-4">
          ✓ Lichess vinculado: <strong>{user.lichessUsername}</strong>
        </div>
      )}

      {msg && <div className="bg-green-900/30 border border-green-600/40 text-green-300 rounded-lg p-3 text-sm mb-4">{msg}</div>}
      {error && <div className="bg-red-900/30 border border-red-600/40 text-red-300 rounded-lg p-3 text-sm mb-4">{error}</div>}

      <form onSubmit={handleLink} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-300 mb-1">Plataforma</label>
          <select value={provider} onChange={e => setProvider(e.target.value as any)} className="input">
            <option value="lichess">Lichess</option>
            <option value="chesscom">Chess.com</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">Nombre de usuario en {provider}</label>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="input" required />
        </div>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Verificando...' : 'Vincular cuenta'}
        </button>
      </form>
    </div>
  );
}

function TransactionsSection({ txData }: any) {
  const typeColors: any = {
    DEPOSIT: 'text-green-400', MATCH_WIN: 'text-green-400', TOURNAMENT_PRIZE: 'text-green-400',
    WITHDRAWAL: 'text-red-400', MATCH_STAKE: 'text-orange-400', TOURNAMENT_FEE: 'text-orange-400',
    COMMISSION: 'text-red-400', MATCH_REFUND: 'text-blue-400',
  };
  const typeLabels: any = {
    DEPOSIT: 'Depósito', WITHDRAWAL: 'Retiro', MATCH_STAKE: 'Apuesta',
    MATCH_WIN: 'Premio partida', MATCH_REFUND: 'Devolución', TOURNAMENT_FEE: 'Inscripción torneo',
    TOURNAMENT_PRIZE: 'Premio torneo', COMMISSION: 'Comisión', SUBSCRIPTION: 'Membresía',
  };

  return (
    <div>
      <h2 className="font-semibold text-lg mb-4">Historial de movimientos</h2>
      {txData?.transactions.length ? (
        <div className="space-y-2">
          {txData.transactions.map((tx: any) => (
            <div key={tx.id} className="card py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{tx.description || typeLabels[tx.type] || tx.type}</div>
                <div className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleString('es-AR')}</div>
              </div>
              <div className="text-right">
                <div className={`font-semibold ${typeColors[tx.type] || 'text-white'}`}>
                  {['DEPOSIT','MATCH_WIN','TOURNAMENT_PRIZE','MATCH_REFUND'].includes(tx.type) ? '+' : '-'}
                  ${Math.abs(Number(tx.amount)).toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">{tx.status}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center text-gray-400">Sin movimientos aún.</div>
      )}
    </div>
  );
}

function SubscriptionSection({ user }: any) {
  const plans = [
    { tier: 'FREE', name: 'Free', price: 'Gratis', commission: '8%', maxStake: '$10', color: 'border-gray-600' },
    { tier: 'PREMIUM', name: 'Premium', price: '$15/mes', commission: '5%', maxStake: '$500', color: 'border-purple-500' },
    { tier: 'HIGH_STAKES', name: 'High Stakes', price: '$49/mes', commission: '3%', maxStake: '$5,000', color: 'border-chess-gold' },
  ];

  return (
    <div>
      <h2 className="font-semibold text-lg mb-2">Plan actual: <span className="text-chess-gold">{user.subscriptionTier}</span></h2>
      <p className="text-sm text-gray-400 mb-6">
        Los planes con membresía reducen comisiones y aumentan el límite de apuesta.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map(plan => (
          <div key={plan.tier} className={`card border-2 ${plan.color} ${user.subscriptionTier === plan.tier ? 'opacity-100' : 'opacity-60'}`}>
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-bold text-lg">{plan.name}</h3>
              {user.subscriptionTier === plan.tier && (
                <span className="text-xs bg-chess-gold text-chess-dark px-2 py-0.5 rounded-full">Actual</span>
              )}
            </div>
            <div className="text-2xl font-bold text-chess-gold mb-4">{plan.price}</div>
            <div className="space-y-2 text-sm text-gray-300">
              <div className="flex justify-between"><span>Comisión</span><span className="font-semibold">{plan.commission}</span></div>
              <div className="flex justify-between"><span>Apuesta máx.</span><span className="font-semibold">{plan.maxStake}</span></div>
            </div>
            {user.subscriptionTier !== plan.tier && plan.tier !== 'FREE' && (
              <button className="btn-primary w-full mt-4 text-sm">
                Activar {plan.name}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
