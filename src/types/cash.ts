// Libro de Caja Types

export type CashMovementType = 'INGRESO' | 'EGRESO' | 'TRASPASO';

export interface CashMovement {
    id: string;
    date: string;
    type: CashMovementType;
    description: string;
    amount: number;
    documentRef?: string;
    counterAccount?: string; // e.g., "Ventas", "Proveedor X", "Banco"
    createdAt: string;
    balanceAfter: number;
}

export interface DailyCashSummary {
    date: string;
    openingBalance: number;
    totalIncome: number;
    totalExpense: number;
    closingBalance: number;
    movementCount: number;
}
