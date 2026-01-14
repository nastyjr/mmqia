import { journalEntriesService } from './databaseService';
import { JournalEntry, INITIAL_ACCOUNTS } from '../types';

// Types for Professional Tax Compliance

export type TaxScheme = '14A' | '14D3' | '14D8';

export interface TaxAdjustment {
    id: string;
    concept: string; // e.g., "Multas Fiscales", "Corrección Monetaria"
    code?: number;   // SII Code (F22), e.g., 1137
    amount: number;  // Absolute value
    type: 'AGREGADO' | 'DEDUCCION';
    isManual: boolean;
}

export interface RLIResult {
    financialProfit: number;
    financialRevenue: number;
    financialExpense: number;
    adjustments: TaxAdjustment[];
    rli: number; // Renta Líquida Imponible
    taxScheme: TaxScheme;
}

export interface AssetLiabilityDetail {
    code: string;
    name: string;
    financialValue: number;
    taxValue: number;
    adjustmentReason?: string; // e.g., "Depreciación Acelerada"
}

export interface CPTResult {
    totalAssetsFinancial: number;
    totalAssetsTax: number;
    totalLiabilitiesFinancial: number; // Pasivo Exigible
    totalLiabilitiesTax: number;
    cpt: number; // Capital Propio Tributario
    details: {
        assets: AssetLiabilityDetail[];
        liabilities: AssetLiabilityDetail[];
    };
    taxScheme: TaxScheme;
}

class TaxEngine {

    // In a real app, this would come from Company Settings
    private defaultScheme: TaxScheme = '14D3';

    /**
     * Calculates Renta Líquida Imponible (RLI) following SII Structure:
     * 1. Resultado Financiero
     * 2. Agregados (Art 33 N1, Art 21, etc.)
     * 3. Deducciones (Art 33 N2, etc.)
     */
    async calculateRLI(year: number, scheme: TaxScheme = '14D3'): Promise<RLIResult> {
        const entries = await journalEntriesService.getAll();

        let financialRevenue = 0;
        let financialExpense = 0;

        // 1. Calculate Financial Profit
        entries?.forEach((entry: any) => {
            const entryYear = new Date(entry.date).getFullYear();
            if (entryYear !== year) return;

            entry.lines.forEach((line: any) => {
                const account = INITIAL_ACCOUNTS.find(a => a.code === line.accountId);
                if (!account) return;

                if (account.type === 'Ingresos') {
                    financialRevenue += (line.credit - line.debit);
                } else if (account.type === 'Gastos' || account.type === 'Costos') {
                    financialExpense += (line.debit - line.credit);
                }
            });
        });

        const financialProfit = financialRevenue - financialExpense;

        // 2. Auto-Detect Adjustments
        const adjustments: TaxAdjustment[] = [];

        // 2.1 Detect "Multas Fiscales" (Gastos Rechazados Art 21 inc 2 usually, or Agregado)
        let multasAmount = 0;
        entries?.forEach((entry: any) => {
            if (new Date(entry.date).getFullYear() !== year) return;
            if (entry.glosa.toLowerCase().includes('multa') || entry.glosa.toLowerCase().includes('interes penal')) {
                multasAmount += entry.total; // Assumes simple entry
            }
        });

        if (multasAmount > 0) {
            adjustments.push({
                id: 'auto-1',
                concept: 'Gastos Rechazados (Multas Fiscales)',
                code: 1137, // Example F22 code
                amount: multasAmount,
                type: 'AGREGADO',
                isManual: false
            });
        }

        // 2.2 Corrección Monetaria (Only for 14A, 14D3 usually excludes unless specific case)
        if (scheme === '14A') {
            // Logic to fetch CM account 6.1.11
            // If Debit balance -> Agregado. If Credit balance -> Deducción.
            // Placeholder for now.
        }

        // 3. Incentive 14E (For 14D3: 50% of RLI invested can be deducted, capped)
        // This logic is complex as it depends on the RLI itself (circular).
        // Usually applied as a final deduction.

        const totalAdds = adjustments.filter(a => a.type === 'AGREGADO').reduce((sum, a) => sum + a.amount, 0);
        const totalDeducts = adjustments.filter(a => a.type === 'DEDUCCION').reduce((sum, a) => sum + a.amount, 0);

        const rli = financialProfit + totalAdds - totalDeducts;

        return {
            financialProfit,
            financialRevenue,
            financialExpense,
            adjustments,
            rli,
            taxScheme: scheme
        };
    }

    /**
     * Calculates Capital Propio Tributario (CPT)
     * Supports Manual Overrides for Tax Values
     */
    async calculateCPT(year: number, scheme: TaxScheme = '14D3', manualOverrides: Record<string, number> = {}): Promise<CPTResult> {
        const entries = await journalEntriesService.getAll();

        // Calculate Financial Balances
        const accountBalances = new Map<string, number>();

        entries?.forEach((entry: any) => {
            const entryYear = new Date(entry.date).getFullYear();
            if (entryYear > year) return;

            entry.lines.forEach((line: any) => {
                const current = accountBalances.get(line.accountId) || 0;
                accountBalances.set(line.accountId, current + (line.debit - line.credit));
            });
        });

        const assetDetails: AssetLiabilityDetail[] = [];
        const liabilityDetails: AssetLiabilityDetail[] = [];

        let totalAssetsFinancial = 0;
        let totalAssetsTax = 0;
        let totalLiabilitiesFinancial = 0;
        let totalLiabilitiesTax = 0;

        INITIAL_ACCOUNTS.forEach(account => {
            const balance = accountBalances.get(account.code) || 0;
            if (balance === 0) return;

            if (account.type === 'Activo') {
                if (balance > 0) {
                    const financialVal = balance;
                    // Check for manual tax value override
                    const taxVal = manualOverrides[account.code] !== undefined ? manualOverrides[account.code] : financialVal;

                    // Logic: If 14D3, Fixed Assets are usually expensed immediately (Val Tributario = 0 or $1)
                    // We don't auto-apply this unless configured, to avoid confusion.

                    assetDetails.push({
                        code: account.code,
                        name: account.name,
                        financialValue: financialVal,
                        taxValue: taxVal,
                        adjustmentReason: financialVal !== taxVal ? 'Ajuste Manual' : undefined
                    });

                    totalAssetsFinancial += financialVal;
                    totalAssetsTax += taxVal;
                }
            } else if (account.type === 'Pasivo') {
                const financialVal = Math.abs(balance);
                // Exclude "Provisiones" (Non-Exigible)?

                // Allow override
                const taxVal = manualOverrides[account.code] !== undefined ? manualOverrides[account.code] : financialVal;

                if (financialVal > 0) {
                    liabilityDetails.push({
                        code: account.code,
                        name: account.name,
                        financialValue: financialVal,
                        taxValue: taxVal
                    });

                    totalLiabilitiesFinancial += financialVal;
                    totalLiabilitiesTax += taxVal;
                }
            }
        });

        return {
            totalAssetsFinancial,
            totalAssetsTax,
            totalLiabilitiesFinancial,
            totalLiabilitiesTax,
            cpt: totalAssetsTax - totalLiabilitiesTax,
            details: {
                assets: assetDetails,
                liabilities: liabilityDetails
            },
            taxScheme: scheme
        };
    }
}

export const taxEngine = new TaxEngine();
