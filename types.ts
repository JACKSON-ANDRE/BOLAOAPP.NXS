
export type UserRole = 'admin' | 'user';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  balance: number;
  avatar_url?: string;
  pix_key?: string;
  withdrawable_balance?: number;
  created_at: string;
}

export type PoolStatus = 'open' | 'finished' | 'canceled';

export interface Pool {
  id: string;
  creator_id: string;
  title: string;
  modality: string;
  scheduled_at: string;
  entry_fee: number;
  options: string[]; // e.g. ["Time A", "Empate", "Time B"]
  bets_deadline?: string;
  status: PoolStatus;
  result?: string;
  created_at: string;
  creator?: {
    full_name: string;
  };
}

export interface Bet {
  id: string;
  pool_id: string;
  user_id: string;
  amount: number;
  selected_option: string;
  status: 'pending' | 'won' | 'lost';
  created_at: string;
}

export type TransactionType = 'deposit' | 'withdrawal' | 'bet_debit' | 'bet_credit';
export type TransactionStatus = 'pending' | 'approved' | 'rejected';

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  proof_url?: string;
  reference_id?: string; // Pool ID or withdrawal ref
  created_at: string;
}

export interface SystemSettings {
  pix_key: string;
  qr_code_url: string;
  maintenance_mode?: boolean;
}
