/**
 * Automatic Depreciation Scheduler
 * Calculates and applies depreciation to fixed assets automatically on monthly basis
 */

import { FixedAsset } from '../types/fixed-assets';
import { JournalEntry } from '../types';

export interface DepreciationResult {
    assetId: string;
    assetName: string;
    depreciationAmount: number;
    cmAmount: number;
    status: 'SUCCESS' | 'FULLY_DEPRECIATED' | 'ERROR';
    message?: string;
}

export interface DepreciationBatchResult {
    period: string; // YYYY-MM
    processedAt: string;
    assets: DepreciationResult[];
    totalDepreciation: number;
    totalCM: number;
    journalEntryId?: string;
}

class DepreciationScheduler {
    /**
     * Calculate monthly depreciation for a single asset
     */
    calculateMonthlyDepreciation(asset: FixedAsset, ipcVariation: number = 0): {
        depreciation: number;
        cm: number;
        newAccumulatedDep: number;
        newAccumulatedCM: number;
        isFullyDepreciated: boolean;
    } {
        // 1. Corrección Monetaria (CM)
        const currentValue = asset.purchaseValue + asset.accumulatedCM - asset.accumulatedDepreciation;
        const cmThisMonth = currentValue * (ipcVariation / 100);
        const newAccumulatedCM = asset.accumulatedCM + cmThisMonth;
        const valueWithCM = asset.purchaseValue + newAccumulatedCM;

        // 2. Calculate monthly depreciation
        const depreciableValue = valueWithCM - asset.residualValue;
        const monthlyDepreciation = depreciableValue / asset.usefulLifeMonths;

        // 3. Check if fully depreciated
        const potentialAccumulatedDep = asset.accumulatedDepreciation + monthlyDepreciation;
        const isFullyDepreciated = potentialAccumulatedDep >= depreciableValue;

        let actualDepreciation = monthlyDepreciation;
        let newAccumulatedDep = potentialAccumulatedDep;

        if (isFullyDepreciated) {
            // Cap at maximum depreciable value
            actualDepreciation = depreciableValue - asset.accumulatedDepreciation;
            newAccumulatedDep = depreciableValue;
        }

        return {
            depreciation: Math.max(0, Math.round(actualDepreciation)),
            cm: Math.round(cmThisMonth),
            newAccumulatedDep,
            newAccumulatedCM,
            isFullyDepreciated
        };
    }

    /**
     * Process depreciation for all active assets
     */
    async processMonthlyDepreciation(
        assets: FixedAsset[],
        period: string, // YYYY-MM
        ipcVariation: number = 0
    ): Promise<DepreciationBatchResult> {
        const results: DepreciationResult[] = [];
        let totalDepreciation = 0;
        let totalCM = 0;

        const activeAssets = assets.filter(a => a.status === 'ACTIVE');

        for (const asset of activeAssets) {
            try {
                const calculation = this.calculateMonthlyDepreciation(asset, ipcVariation);

                // Only process if there's actual depreciation
                if (calculation.depreciation > 0) {
                    totalDepreciation += calculation.depreciation;
                    totalCM += calculation.cm;

                    results.push({
                        assetId: asset.id,
                        assetName: asset.name,
                        depreciationAmount: calculation.depreciation,
                        cmAmount: calculation.cm,
                        status: calculation.isFullyDepreciated ? 'FULLY_DEPRECIATED' : 'SUCCESS'
                    });

                    // Update asset in database (would be done via service)
                    // This is just the calculation - actual update happens in the component/service
                }
            } catch (error) {
                results.push({
                    assetId: asset.id,
                    assetName: asset.name,
                    depreciationAmount: 0,
                    cmAmount: 0,
                    status: 'ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        return {
            period,
            processedAt: new Date().toISOString(),
            assets: results,
            totalDepreciation,
            totalCM
        };
    }

    /**
     * Generate journal entry for depreciation
     */
    generateDepreciationEntry(
        batchResult: DepreciationBatchResult,
        assetDetails: FixedAsset[]
    ): JournalEntry {
        const [year, month] = batchResult.period.split('-');
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        const entryDate = `${batchResult.period}-${lastDay}`;

        const lines: Array<{
            id: string;
            accountId: string;
            accountName: string;
            debit: number;
            credit: number;
        }> = [];

        // Group by asset account for cleaner entries
        const assetGroups = new Map<string, number>();

        batchResult.assets.forEach(result => {
            if (result.status !== 'SUCCESS' && result.status !== 'FULLY_DEPRECIATED') return;

            const asset = assetDetails.find(a => a.id === result.assetId);
            if (!asset) return;

            const current = assetGroups.get(asset.assetAccountId) || 0;
            assetGroups.set(asset.assetAccountId, current + result.depreciationAmount);
        });

        // 1. Corrección Monetaria entries (if any CM)
        if (batchResult.totalCM > 0) {
            lines.push({
                id: crypto.randomUUID(),
                accountId: '1.2.99', // Activos Fijos (generic)
                accountName: 'Activos Fijos',
                debit: batchResult.totalCM,
                credit: 0
            });
            lines.push({
                id: crypto.randomUUID(),
                accountId: '4.2.01',
                accountName: 'Corrección Monetaria (Ingreso)',
                debit: 0,
                credit: batchResult.totalCM
            });
        }

        // 2. Depreciation entries
        // Debit: Depreciation Expense
        lines.push({
            id: crypto.randomUUID(),
            accountId: '6.1.09',
            accountName: 'Depreciación del Período',
            debit: batchResult.totalDepreciation,
            credit: 0
        });

        // Credit: Accumulated Depreciation (can be broken down by asset category)
        assetGroups.forEach((amount, accountId) => {
            lines.push({
                id: crypto.randomUUID(),
                accountId: `${accountId}.DEP`, // e.g., 1.2.02.DEP
                accountName: 'Depreciación Acumulada',
                debit: 0,
                credit: amount
            });
        });

        // If only one type, simplify to generic
        if (assetGroups.size === 1 || batchResult.totalDepreciation < 1000) {
            // Use generic accumulated depreciation account
            const lastIdx = lines.length - 1;
            lines[lastIdx].accountId = '1.2.98';
            lines[lastIdx].accountName = 'Depreciación Acumulada';
        }

        return {
            id: crypto.randomUUID(),
            date: entryDate,
            glosa: `Depreciación Automática ${new Date(0, parseInt(month) - 1).toLocaleString('es-CL', { month: 'long' })} ${year}`,
            type: 'egreso',
            total: batchResult.totalDepreciation + batchResult.totalCM,
            createdAt: new Date().toISOString(),
            status: 'posted',
            lines
        };
    }

    /**
     * Check if depreciation has been run for a period
     */
    hasDepreciationForPeriod(period: string): boolean {
        try {
            const history = localStorage.getItem('depreciation_history');
            if (!history) return false;

            const records: DepreciationBatchResult[] = JSON.parse(history);
            return records.some(r => r.period === period);
        } catch {
            return false;
        }
    }

    /**
     * Save depreciation batch result to history
     */
    saveDepreciationHistory(result: DepreciationBatchResult): void {
        try {
            const history = localStorage.getItem('depreciation_history');
            const records: DepreciationBatchResult[] = history ? JSON.parse(history) : [];

            // Remove duplicate if exists
            const filtered = records.filter(r => r.period !== result.period);
            filtered.push(result);

            // Keep last 24 months
            const sorted = filtered.sort((a, b) => b.period.localeCompare(a.period));
            const latest = sorted.slice(0, 24);

            localStorage.setItem('depreciation_history', JSON.stringify(latest));
        } catch (error) {
            console.error('Error saving depreciation history:', error);
        }
    }

    /**
     * Get suggested IPC variation for the period
     * (In production, this would fetch from SII or INE API)
     */
    getSuggestedIPC(period: string): number {
        // Mock data - in production, fetch from API
        const ipcData: { [key: string]: number } = {
            '2024-12': 0.3,
            '2024-11': 0.5,
            '2024-10': 0.4,
            // ... more months
        };

        return ipcData[period] || 0;
    }
}

export const depreciationScheduler = new DepreciationScheduler();
