import type { Match } from '../types';

const statusLabel: Record<string, { text: string; color: string }> = {
  WAITING_DEPOSIT: { text: 'Esperando depósito', color: 'text-yellow-400' },
  READY:           { text: 'Buscando rival',     color: 'text-blue-400'   },
  ACTIVE:          { text: 'En juego',            color: 'text-green-400'  },
  COMPLETED:       { text: 'Finalizada',          color: 'text-gray-400'   },
  DISPUTED:        { text: 'En disputa',          color: 'text-orange-400' },
  CANCELLED:       { text: 'Cancelada',           color: 'text-red-400'    },
  VOID:            { text: 'Anulada',             color: 'text-red-500'    },
};

interface Props {
  match:    Match;
  onJoin?:  (match: Match) => void;
  compact?: boolean;
}

export default function MatchCard({ match, onJoin, compact }: Props) {
  const status = statusLabel[match.status] ?? { text: match.status, color: 'text-gray-400' };
  const pool = parseFloat(match.totalPool || String(parseFloat(match.stakeAmount) * 2));
  const commission = parseFloat(match.commissionRate) * 100;

  return (
    <div className="card hover:border-chess-gold/40 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold">{match.player1.username}</span>
            <span className="text-gray-500 text-sm">vs</span>
            <span className="font-semibold">{match.player2?.username ?? '???'}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span>⏱ {match.timeControl}+{match.incrementSeconds}</span>
            <span>★ {match.player1.rating}</span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-chess-gold font-bold text-lg">
            ${parseFloat(match.stakeAmount).toFixed(2)}
          </div>
          <div className="text-xs text-gray-400">por jugador</div>
        </div>
      </div>

      {!compact && (
        <div className="flex items-center justify-between text-sm mb-4">
          <div className="flex gap-4 text-gray-400">
            <span>Pozo: <span className="text-white">${pool.toFixed(2)}</span></span>
            <span>Comisión: <span className="text-white">{commission.toFixed(1)}%</span></span>
          </div>
          <span className={`font-medium ${status.color}`}>{status.text}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        {match.winner && (
          <div className="text-sm">
            <span className="text-gray-400">Ganador: </span>
            <span className="text-chess-gold font-medium">{match.winner.username}</span>
          </div>
        )}

        {match.status === 'READY' && !match.player2Id && onJoin && (
          <button
            onClick={() => onJoin(match)}
            className="btn-primary text-sm py-1.5 px-4 ml-auto"
          >
            Unirse — ${parseFloat(match.stakeAmount).toFixed(2)}
          </button>
        )}

        {match.chessGameUrl && (
          <a
            href={match.chessGameUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-chess-gold hover:underline ml-auto"
          >
            Ver partida →
          </a>
        )}
      </div>
    </div>
  );
}
