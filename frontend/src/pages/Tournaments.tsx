import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import KYCBanner from '../components/KYCBanner';
import TournamentCard from '../components/TournamentCard';
import { tournaments as tournamentsApi } from '../services/api';
import type { Tournament } from '../types';

export default function Tournaments() {
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [registerError, setRegisterError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['tournaments', statusFilter],
    queryFn: () => tournamentsApi.list({ status: statusFilter || undefined, page: 1 }),
  });

  const registerMutation = useMutation({
    mutationFn: (id: string) => tournamentsApi.register(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tournaments'] });
      qc.invalidateQueries({ queryKey: ['balance'] });
      setSelectedTournament(null);
      setRegisterError('');
    },
    onError: (e: any) => setRegisterError(e.response?.data?.error || 'Error al inscribirse'),
  });

  const { data: selectedData } = useQuery({
    queryKey: ['tournament', selectedTournament?.id],
    queryFn: () => tournamentsApi.get(selectedTournament!.id),
    enabled: !!selectedTournament,
  });

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <KYCBanner kycStatus={user.kycStatus} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Torneos</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['', 'REGISTRATION', 'IN_PROGRESS', 'COMPLETED'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-chess-gold text-chess-dark'
                : 'bg-chess-accent/30 text-gray-300 hover:bg-chess-accent'
            }`}
          >
            {{ '': 'Todos', REGISTRATION: 'Inscripción', IN_PROGRESS: 'En curso', COMPLETED: 'Finalizados' }[s]}
          </button>
        ))}
      </div>

      {/* Tournament detail modal */}
      {selectedTournament && selectedData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="card w-full max-w-lg">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xl font-bold">{selectedData.name}</h2>
              <button onClick={() => setSelectedTournament(null)} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>

            {registerError && (
              <div className="bg-red-900/30 border border-red-600/40 text-red-300 rounded-lg px-4 py-3 mb-4 text-sm">
                {registerError}
              </div>
            )}

            <div className="space-y-3 mb-6 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Formato</span><span>{selectedData.format}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Tiempo</span><span>{selectedData.timeControl}+{selectedData.incrementSeconds}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Inscripción</span><span className="text-chess-gold font-bold">${parseFloat(selectedData.entryFee).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Premio total</span><span className="text-chess-gold font-bold">${parseFloat(selectedData.prizePool).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Rondas</span><span>{selectedData.rounds}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Jugadores</span><span>{selectedData.currentPlayers}/{selectedData.maxPlayers}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Inicio</span><span>{new Date(selectedData.startDate).toLocaleDateString('es-AR')}</span></div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setSelectedTournament(null)} className="btn-secondary flex-1">Cancelar</button>
              <button
                onClick={() => registerMutation.mutate(selectedTournament.id)}
                disabled={registerMutation.isPending}
                className="btn-primary flex-1"
              >
                {registerMutation.isPending ? 'Inscribiendo...' : `Inscribirse — $${parseFloat(selectedTournament.entryFee).toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Cargando torneos...</div>
      ) : data?.tournaments.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.tournaments.map(t => (
            <TournamentCard
              key={t.id}
              tournament={t}
              onRegister={(tournament) => {
                setRegisterError('');
                setSelectedTournament(tournament);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="card text-center text-gray-400 py-12">
          No hay torneos disponibles en este momento.
        </div>
      )}
    </div>
  );
}
