import { Link } from 'react-router-dom';
import type { Tournament } from '../types';

const statusLabel: Record<string, { text: string; color: string }> = {
  REGISTRATION: { text: 'Inscripción abierta', color: 'text-green-400'  },
  IN_PROGRESS:  { text: 'En curso',            color: 'text-blue-400'   },
  COMPLETED:    { text: 'Finalizado',           color: 'text-gray-400'   },
  CANCELLED:    { text: 'Cancelado',            color: 'text-red-400'    },
};

const formatLabel: Record<string, string> = {
  SWISS:                'Sistema Suizo',
  ROUND_ROBIN:          'Round Robin',
  SINGLE_ELIMINATION:   'Eliminación simple',
  DOUBLE_ELIMINATION:   'Eliminación doble',
};

interface Props {
  tournament: Tournament;
  onRegister?: (t: Tournament) => void;
}

export default function TournamentCard({ tournament, onRegister }: Props) {
  const status = statusLabel[tournament.status] ?? { text: tournament.status, color: 'text-gray-400' };
  const filled = (tournament.currentPlayers / tournament.maxPlayers) * 100;

  return (
    <div className="card hover:border-chess-gold/40 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-lg">{tournament.name}</h3>
          <p className="text-sm text-gray-400 mt-0.5">
            {formatLabel[tournament.format]} · {tournament.timeControl}+{tournament.incrementSeconds}
          </p>
        </div>
        <span className={`text-xs font-medium ${status.color}`}>{status.text}</span>
      </div>

      {tournament.description && (
        <p className="text-sm text-gray-400 mb-3 line-clamp-2">{tournament.description}</p>
      )}

      <div className="grid grid-cols-3 gap-3 mb-4 text-center">
        <div className="bg-chess-accent/20 rounded-lg p-2">
          <div className="text-chess-gold font-bold">${parseFloat(tournament.entryFee).toFixed(0)}</div>
          <div className="text-xs text-gray-400">Inscripción</div>
        </div>
        <div className="bg-chess-accent/20 rounded-lg p-2">
          <div className="text-chess-gold font-bold">${parseFloat(tournament.prizePool).toFixed(0)}</div>
          <div className="text-xs text-gray-400">Premio total</div>
        </div>
        <div className="bg-chess-accent/20 rounded-lg p-2">
          <div className="text-white font-bold">{tournament.rounds}</div>
          <div className="text-xs text-gray-400">Rondas</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{tournament.currentPlayers} inscriptos</span>
          <span>máx. {tournament.maxPlayers}</span>
        </div>
        <div className="w-full bg-chess-accent/30 rounded-full h-1.5">
          <div
            className="bg-chess-gold rounded-full h-1.5 transition-all"
            style={{ width: `${Math.min(filled, 100)}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {tournament.requiresKYC && (
            <span className="text-xs bg-blue-900/40 text-blue-400 px-2 py-1 rounded-full">KYC</span>
          )}
          {tournament.requiresPremium && (
            <span className="text-xs bg-purple-900/40 text-purple-400 px-2 py-1 rounded-full">Premium</span>
          )}
        </div>

        {tournament.status === 'REGISTRATION' && onRegister && (
          <button
            onClick={() => onRegister(tournament)}
            className="btn-primary text-sm py-1.5 px-4"
            disabled={tournament.currentPlayers >= tournament.maxPlayers}
          >
            {tournament.currentPlayers >= tournament.maxPlayers ? 'Completo' : 'Inscribirse'}
          </button>
        )}

        {tournament.status === 'IN_PROGRESS' && (
          <Link
            to={`/tournaments`}
            className="text-sm text-chess-gold hover:underline"
          >
            Ver tabla →
          </Link>
        )}
      </div>
    </div>
  );
}
