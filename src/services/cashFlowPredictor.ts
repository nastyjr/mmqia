/**
 * Cash Flow Prediction Engine
 * Predicts future cash flow based on historical data and pending transactions
 */

export interface CashFlowPrediction {
    period: string; // YYYY-MM
    predictedInflow: number;
    predictedOutflow: number;
    predictedBalance: number;
    confidence: number; // 0-100
    breakdown: {
        confirmedInflow: number; // From pending invoices
        estimatedInflow: number; // Based on historical average
        confirmedOutflow: number; // From pending bills
        estimatedOutflow: number; // Based on historical average
    };
    alerts: Array<{
        type: 'CASH_SHORTAGE' | 'SURPLUS' | 'WARNING';
        message: string;
    }>;
}

class CashFlowPredictor {
    /**
     * Predict cash flow for next N months
     */
    predictCashFlow(months: number = 3): CashFlowPrediction[] {
        const predictions: CashFlowPrediction[] = [];
        const today = new Date();

        // Get current balance
        let currentBalance = this.getCurrentCashBalance();

        for (let i = 0; i < months; i++) {
            const targetDate = new Date(today.getFullYear(), today.getMonth() + i + 1, 1);
            const period = targetDate.toISOString().substring(0, 7);

            const prediction = this.predictMonth(period, currentBalance);
            predictions.push(prediction);

            // Update running balance
            currentBalance = prediction.predictedBalance;
        }

        return predictions;
    }

    /**
     * Predict cash flow for specific month
     */
    private predictMonth(period: string, startingBalance: number): CashFlowPrediction {
        // 1. Confirmed transactions
        const confirmed = this.getConfirmedTransactions(period);

        // 2. Historical averages
        const historical = this.getHistoricalAverages();

        // 3. Calculate prediction
        const predictedInflow = confirmed.inflow + historical.avgInflow;
        const predictedOutflow = confirmed.outflow + historical.avgOutflow;
        const predictedBalance = startingBalance + predictedInflow - predictedOutflow;

        // 4. Confidence score
        const confidence = this.calculateConfidence(confirmed, historical);

        // 5. Generate alerts
        const alerts = this.generateAlerts(predictedBalance, predictedInflow, predictedOutflow);

        return {
            period,
            predictedInflow,
            predictedOutflow,
            predictedBalance,
            confidence,
            breakdown: {
                confirmedInflow: confirmed.inflow,
                estimatedInflow: historical.avgInflow,
                confirmedOutflow: confirmed.outflow,
                estimatedOutflow: historical.avgOutflow
            },
            alerts
        };
    }

    /**
     * Get current cash balance from accounting
     */
    private getCurrentCashBalance(): number {
        const entries = JSON.parse(localStorage.getItem('accounting_journal') || '[]');
        let balance = 0;

        entries.forEach((entry: any) => {
            entry.lines?.forEach((line: any) => {
                // Bank accounts (1.1.01)
                if (line.accountId === '1.1.01') {
                    balance += line.debit - line.credit;
                }
            });
        });

        return balance;
    }

    /**
     * Get confirmed future transactions
     */
    private getConfirmedTransactions(period: string): { inflow: number; outflow: number } {
        let inflow = 0;
        let outflow = 0;

        // Pending customer invoices
        const invoices = JSON.parse(localStorage.getItem('invoicing_db') || '[]');
        invoices.forEach((inv: any) => {
            if (inv.status === 'ISSUED' && inv.dueDate?.startsWith(period)) {
                inflow += inv.total;
            }
        });

        // Pending supplier invoices (would need a payables system)
        // For now, we'll use purchase orders as proxy
        const orders = JSON.parse(localStorage.getItem('purchase_orders_db') || '[]');
        orders.forEach((order: any) => {
            if (order.status === 'PENDING' && order.expectedDate?.startsWith(period)) {
                outflow += order.total;
            }
        });

        return { inflow, outflow };
    }

    /**
     * Calculate historical averages
     */
    private getHistoricalAverages(): { avgInflow: number; avgOutflow: number } {
        const entries = JSON.parse(localStorage.getItem('accounting_journal') || '[]');

        // Group by month
        const monthlyData = new Map<string, { inflow: number; outflow: number }>();

        entries.forEach((entry: any) => {
            const month = entry.date.substring(0, 7);
            if (!monthlyData.has(month)) {
                monthlyData.set(month, { inflow: 0, outflow: 0 });
            }

            const data = monthlyData.get(month)!;

            entry.lines?.forEach((line: any) => {
                // Revenue accounts (4.x.x)
                if (line.accountId?.startsWith('4')) {
                    data.inflow += line.credit;
                }
                // Expense accounts (6.x.x)
                if (line.accountId?.startsWith('6')) {
                    data.outflow += line.debit;
                }
            });
        });

        // Calculate averages from last 6 months
        const months = Array.from(monthlyData.values()).slice(-6);

        if (months.length === 0) {
            return { avgInflow: 0, avgOutflow: 0 };
        }

        const avgInflow = months.reduce((sum, m) => sum + m.inflow, 0) / months.length;
        const avgOutflow = months.reduce((sum, m) => sum + m.outflow, 0) / months.length;

        return { avgInflow, avgOutflow };
    }

    /**
     * Calculate confidence score
     */
    private calculateConfidence(
        confirmed: { inflow: number; outflow: number },
        historical: { avgInflow: number; avgOutflow: number }
    ): number {
        // Higher confidence if we have more confirmed transactions
        const confirmedRatio = (confirmed.inflow + confirmed.outflow) /
            (confirmed.inflow + confirmed.outflow + historical.avgInflow + historical.avgOutflow);

        // Base confidence on confirmed ratio (50-90%)
        return Math.round(50 + (confirmedRatio * 40));
    }

    /**
     * Generate alerts
     */
    private generateAlerts(
        balance: number,
        inflow: number,
        outflow: number
    ): CashFlowPrediction['alerts'] {
        const alerts: CashFlowPrediction['alerts'] = [];

        // Cash shortage warning
        if (balance < 0) {
            alerts.push({
                type: 'CASH_SHORTAGE',
                message: `⚠️ Déficit proyectado: $${Math.abs(balance).toLocaleString('es-CL')}`
            });
        } else if (balance < outflow * 0.1) {
            alerts.push({
                type: 'WARNING',
                message: `⚠️ Saldo bajo: $${balance.toLocaleString('es-CL')} (menos del 10% de gastos)`
            });
        }

        // Large surplus
        if (balance > outflow * 3) {
            alerts.push({
                type: 'SURPLUS',
                message: `💰 Excedente: $${balance.toLocaleString('es-CL')} - Considerar inversión`
            });
        }

        // Outflow exceeds inflow significantly
        if (outflow > inflow * 1.2) {
            alerts.push({
                type: 'WARNING',
                message: `📉 Gastos superan ingresos en ${(((outflow - inflow) / inflow) * 100).toFixed(0)}%`
            });
        }

        return alerts;
    }

    /**
     * Get cash flow trend
     */
    getCashFlowTrend(): 'IMPROVING' | 'STABLE' | 'DECLINING' {
        const predictions = this.predictCashFlow(3);

        if (predictions.length < 2) return 'STABLE';

        const first = predictions[0].predictedBalance;
        const last = predictions[predictions.length - 1].predictedBalance;

        const change = ((last - first) / Math.abs(first)) * 100;

        if (change > 10) return 'IMPROVING';
        if (change < -10) return 'DECLINING';
        return 'STABLE';
    }
}

export const cashFlowPredictor = new CashFlowPredictor();
