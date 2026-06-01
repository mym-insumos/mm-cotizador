export type KYCStatus = 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
export type SubscriptionTier = 'FREE' | 'PREMIUM' | 'HIGH_STAKES';
export type MatchStatus = 'WAITING_DEPOSIT' | 'READY' | 'ACTIVE' | 'COMPLETED' | 'DISPUTED' | 'CANCELLED' | 'VOID';
export type MatchResult = 'PLAYER1_WIN' | 'PLAYER2_WIN' | 'DRAW' | 'DISPUTED' | 'VOID';
export type TournamentStatus = 'REGISTRATION' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TournamentFormat = 'SWISS' | 'ROUND_ROBIN' | 'SINGLE_ELIMINATION' | 'DOUBLE_ELIMINATION';
export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'MATCH_STAKE' | 'MATCH_WIN' | 'MATCH_REFUND' | 'TOURNAMENT_FEE' | 'TOURNAMENT_PRIZE' | 'SUBSCRIPTION' | 'COMMISSION' | 'ADJUSTMENT';

export interface User {
  id:               string;
  email:            string;
  username:         string;
  rating:           number;
  balance:          string;
  lockedBalance:    string;
  kycStatus:        KYCStatus;
  subscriptionTier: SubscriptionTier;
  subscriptionEnd?: string;
  lichessUsername?: string;
  chesscomUsername?: string;
  country?:         string;
  totalWins:        number;
  totalLosses:      number;
  totalDraws:       number;
  totalEarnings:    string;
  role:             'PLAYER' | 'ADMIN';
  createdAt:        string;
}

export interface Match {
  id:               string;
  player1Id:        string;
  player2Id?:       string;
  player1:          { username: string; rating: number };
  player2?:         { username: string; rating: number };
  winner?:          { username: string };
  timeControl:      string;
  incrementSeconds: number;
  stakeAmount:      string;
  totalPool:        string;
  commissionRate:   string;
  commissionAmount: string;
  payoutAmount:     string;
  status:           MatchStatus;
  result?:          MatchResult;
  winnerId?:        string;
  chessGameId?:     string;
  chessGameUrl?:    string;
  isPublic:         boolean;
  tournamentId?:    string;
  startedAt?:       string;
  completedAt?:     string;
  createdAt:        string;
}

export interface Tournament {
  id:                 string;
  name:               string;
  description?:       string;
  format:             TournamentFormat;
  timeControl:        string;
  incrementSeconds:   number;
  entryFee:           string;
  commissionRate:     string;
  prizePool:          string;
  maxPlayers:         number;
  minPlayers:         number;
  currentPlayers:     number;
  rounds:             number;
  currentRound:       number;
  status:             TournamentStatus;
  minRating?:         number;
  maxRating?:         number;
  requiresKYC:        boolean;
  requiresPremium:    boolean;
  startDate:          string;
  endDate?:           string;
  participants?:      TournamentParticipant[];
  createdAt:          string;
}

export interface TournamentParticipant {
  id:           string;
  userId:       string;
  user:         { username: string; rating: number };
  standing?:    number;
  points:       string;
  wins:         number;
  losses:       number;
  draws:        number;
  prizeWon:     string;
  registeredAt: string;
  disqualified: boolean;
}

export interface Transaction {
  id:          string;
  type:        TransactionType;
  amount:      string;
  status:      'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  description?: string;
  createdAt:   string;
  matchId?:    string;
  tournamentId?: string;
}

export interface AuthResponse {
  token: string;
  user:  User;
}
