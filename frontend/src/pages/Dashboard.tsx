import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import KYCBanner from '../components/KYCBanner';
import MatchCard from '../components/MatchCard';
import { matches as matchesApi, payments } from '../services/api';

const tierColors = { FREE: 'badge-free', PREMIUM: 'badge-premium', HIGH_STAKES: 'badge-high-stakes' };
const tierLabels = { FREE: 'Free', PREMIUM: 'Premium', HIGH_STAKES: 'High Stakes' };
const kycColors = { PENDING: 'badge-kyc-pending', SUBMITTED: 'badge-kyc-submitted', VERIFIED: 'badge-kyc-verified', REJECTED: 'badge-kyc-rejected' };
const kycLabels = { PENDING: 'Sin verificar', SUBMITTED: 'En revisión', VERIFIED: 'Verificado', REJECTED: 'Rechazado' };

export default function Dashboard() {
  const user = useAuthStore(s => s.user);

  const { data: recentMatches } = useQuery({
    queryKey: ['my-matches'],
    queryFn: () => matchesApi.myMatches({ limit: 5 }),
  });

  const { data: balance, refetch: refetchBalance } = useQuery({
    queryKey: ['balance'],
    queryFn: payments.getBalance,
  });

  const { data: txData } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => payments.getTransactions({ limit: 5 }),
  });

  if (!user) return null;

  const wins    = user.totalWins;
  const losses  = user.totalLosses;
  const draws   = user.totalDraws;
  const total   = wins + losses + draws;
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(0) : '—';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <KYCBanner kycStatus={user.kycStatus} />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Hola, {user.username} ♟</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={tierColors[user.subscriptionTier]}>{tierLabels[user.subscriptionTier]}</span>
            <span className={kycColors[user.kycStatus]}>{kycLabels[user.kycStatus]}</span>
          </div>
        </div>
        <Link to="/matches" className="btn-primary">
          Nueva partida
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card text-center">
          <div className="text-2xl font-bold text-chess-gold">
            ${parseFloat(balance?.balance ?? user.balance).toFixed(2)}
          </div>
          <div className="text-sm text-gray-400 mt-1">Saldo disponible</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-orange-400">
            ${parseFloat(balance?.lockedBalance ?? user.lockedBalance).toFixed(2)}
          </div>
          <div className="text-sm text-gray-400 mt-1">En escrow</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-white">{user.rating}</div>
          <div className="text-sm text-gray-400 mt-1">Rating ELO</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-400">{winRate}%</div>
          <div className="text-sm text-gray-400 mt-1">Win rate</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card text-center">
          <div className="text-xl font-bold text-green-400">{wins}</div>
          <div className="text-sm text-gray-400">Victorias</div>
        </div>
        <div className="card text-center">
          <div className="text-xl font-bold text-red-400">{losses}</div>
          <div className="text-sm text-gray-400">Derrotas</div>
        </div>
        <div className="card text-center">
          <div className="text-xl font-bold text-gray-300">{draws}</div>
          <div className="text-sm text-gray-400">Tablas</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent matches */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Partidas recientes</h2>
            <Link to="/matches?tab=my" className="text-sm text-chess-gold hover:underline">Ver todas</Link>
          </div>
          {recentMatches?.matches.length ? (
            <div className="space-y-3">
              {recentMatches.matches.map(m => <MatchCard key={m.id} match={m} compact />)}
            </div>
          ) : (
            <div className="card text-center text-gray-400">
              Aún no jugaste ninguna partida.
              <Link to="/matches" className="block text-chess-gold mt-2 hover:underline">Jugar ahora</Link>
            </div>
          )}
        </div>

        {/* Recent transactions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Movimientos</h2>
            <Link to="/profile#transactions" className="text-sm text-chess-gold hover:underline">Ver todos</Link>
          </div>
          {txData?.transactions.length ? (
            <div className="space-y-2">
              {txData.transactions.map(tx => (
                <div key={tx.id} className="card py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{tx.description || tx.type}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(tx.createdAt).toLocaleDateString('es-AR')}
                    </div>
                  </div>
                  <span className={`font-semibold ${Number(tx.amount) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {Number(tx.amount) >= 0 ? '+' : ''}${Math.abs(Number(tx.amount)).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center text-gray-400">Sin movimientos aún.</div>
          )}
        </div>
      </div>
    </div>
  );
}
