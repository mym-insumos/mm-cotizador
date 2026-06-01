import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import KYCBanner from '../components/KYCBanner';
import MatchCard from '../components/MatchCard';
import { matches as matchesApi } from '../services/api';
import type { Match } from '../types';

const TIME_CONTROLS = [
  { label: '1+0 (Bullet)',   minutes: 1,  increment: 0 },
  { label: '2+1 (Bullet)',   minutes: 2,  increment: 1 },
  { label: '3+0 (Blitz)',    minutes: 3,  increment: 0 },
  { label: '3+2 (Blitz)',    minutes: 3,  increment: 2 },
  { label: '5+0 (Blitz)',    minutes: 5,  increment: 0 },
  { label: '5+3 (Blitz)',    minutes: 5,  increment: 3 },
  { label: '10+0 (Rapid)',   minutes: 10, increment: 0 },
  { label: '15+10 (Rapid)',  minutes: 15, increment: 10 },
];

export default function Matches() {
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();
  const [tab, setTab] = useState<'open' | 'my'>('open');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ stakeAmount: 5, timeControlIdx: 2 });
  const [createError, setCreateError] = useState('');

  const { data: openMatches, isLoading: loadingOpen } = useQuery({
    queryKey: ['open-matches'],
    queryFn: () => matchesApi.list({ limit: 50 }),
    refetchInterval: 5000,
  });

  const { data: myMatchesData } = useQuery({
    queryKey: ['my-matches'],
    queryFn: () => matchesApi.myMatches({ limit: 50 }),
    enabled: tab === 'my',
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const tc = TIME_CONTROLS[form.timeControlIdx];
      return matchesApi.create({
        stakeAmount: form.stakeAmount,
        timeControl: tc.minutes,
        incrementSeconds: tc.increment,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['open-matches'] });
      qc.invalidateQueries({ queryKey: ['my-matches'] });
      qc.invalidateQueries({ queryKey: ['balance'] });
      setShowCreate(false);
      setCreateError('');
    },
    onError: (e: any) => setCreateError(e.response?.data?.error || 'Error al crear la partida'),
  });

  const joinMutation = useMutation({
    mutationFn: (matchId: string) => matchesApi.join(matchId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['open-matches'] });
      qc.invalidateQueries({ queryKey: ['my-matches'] });
      qc.invalidateQueries({ queryKey: ['balance'] });
    },
  });

  if (!user) return null;
  const maxStake = { FREE: 10, PREMIUM: 500, HIGH_STAKES: 5000 }[user.subscriptionTier];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <KYCBanner kycStatus={user.kycStatus} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Partidas</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">
          {showCreate ? 'Cancelar' : '+ Nueva partida'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card mb-6 border-chess-gold/30">
          <h2 className="font-semibold text-lg mb-4">Crear partida con apuesta</h2>

          {createError && (
            <div className="bg-red-900/30 border border-red-600/40 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">
              {createError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Apuesta (USD) — máx. ${maxStake}
              </label>
              <input
                type="number"
                min={0.5}
                max={maxStake}
                step={0.5}
                value={form.stakeAmount}
                onChange={e => setForm(f => ({ ...f, stakeAmount: Number(e.target.value) }))}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Control de tiempo</label>
              <select
                value={form.timeControlIdx}
                onChange={e => setForm(f => ({ ...f, timeControlIdx: Number(e.target.value) }))}
                className="input"
              >
                {TIME_CONTROLS.map((tc, i) => (
                  <option key={i} value={i}>{tc.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-chess-accent/20 rounded-lg p-3 text-sm text-gray-400 mb-4">
            <div className="flex justify-between">
              <span>Pozo total:</span>
              <span className="text-white">${(form.stakeAmount * 2).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tu comisión ({user.subscriptionTier === 'FREE' ? '8' : user.subscriptionTier === 'PREMIUM' ? '5' : '3'}%):</span>
              <span className="text-red-400">
                -${((form.stakeAmount * 2) * (user.subscriptionTier === 'FREE' ? 0.08 : user.subscriptionTier === 'PREMIUM' ? 0.05 : 0.03)).toFixed(2)}
              </span>
            </div>
          </div>

          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="btn-primary"
          >
            {createMutation.isPending ? 'Creando...' : 'Crear partida'}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-chess-panel rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('open')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'open' ? 'bg-chess-accent text-white' : 'text-gray-400 hover:text-white'}`}
        >
          Abiertas
        </button>
        <button
          onClick={() => setTab('my')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'my' ? 'bg-chess-accent text-white' : 'text-gray-400 hover:text-white'}`}
        >
          Mis partidas
        </button>
      </div>

      {tab === 'open' && (
        <div>
          {loadingOpen ? (
            <div className="text-center text-gray-400 py-12">Cargando partidas...</div>
          ) : (openMatches as Match[])?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(openMatches as Match[]).filter(m => m.player1Id !== user.id).map(m => (
                <MatchCard
                  key={m.id}
                  match={m}
                  onJoin={(match) => joinMutation.mutate(match.id)}
                />
              ))}
            </div>
          ) : (
            <div className="card text-center text-gray-400 py-12">
              No hay partidas abiertas. ¡Creá la primera!
            </div>
          )}
        </div>
      )}

      {tab === 'my' && (
        <div>
          {myMatchesData?.matches.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myMatchesData.matches.map(m => <MatchCard key={m.id} match={m} />)}
            </div>
          ) : (
            <div className="card text-center text-gray-400 py-12">
              Aún no tenés partidas.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
