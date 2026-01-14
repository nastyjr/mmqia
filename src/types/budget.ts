export interface Budget {
    id: string;
    accountId: string;
    month: string; // "2024-12"
    amount: number;
}

export interface BudgetVariance {
    accountId: string;
    accountName: string;
    budgeted: number;
    actual: number;
    variance: number;
    variancePercent: number;
    status: 'OK' | 'WARNING' | 'EXCEEDED';
}
