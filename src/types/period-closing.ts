export interface PeriodClosure {
    id: string;
    month: string; // "2024-11"
    closedAt: string; // ISO date
    closedBy: string; // Usuario
    closingEntryId?: string; // ID del asiento de cierre
    status: 'OPEN' | 'CLOSED';
    netProfit: number; // Utilidad/Pérdida del período
}
