export interface BankTransaction {
    id: string;
    date: string; // YYYY-MM-DD
    description: string;
    debit: number; // Money out
    credit: number; // Money in
    balance: number; // Running balance
    reference?: string; // Folio, Check number, etc.
}

export type MatchStatus = 'MATCHED' | 'BANK_ONLY' | 'BOOKS_ONLY' | 'PENDING';

export interface ReconciliationMatch {
    id: string;
    bankTransactionId?: string;
    journalEntryId?: string;
    status: MatchStatus;
    confidence: number; // 0-100
    matchReason?: string; // "Exact match" | "Fuzzy date" | "Manual"
}

export interface ReconciliationSession {
    id: string;
    date: string;
    accountId: string; // Which bank account (1.1.03, etc.)
    periodStart: string;
    periodEnd: string;
    openingBalance: number;
    closingBalance: number;
    bankTransactions: BankTransaction[];
    matches: ReconciliationMatch[];
}
