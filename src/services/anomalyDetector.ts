/**
 * Anomaly Detection Engine
 * Detects unusual patterns in financial data
 */

export interface Anomaly {
    id: string;
    type: 'expense_spike' | 'revenue_drop' | 'unusual_transaction' | 'duplicate' | 'outlier';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    details: string;
    entityType: string;
    entityId: string;
    value: number;
    expectedValue?: number;
    deviation: number; // Percentage
    detectedAt: string;
    suggestions?: string[];
}

import { journalEntriesService, invoicesService } from './databaseService';

class AnomalyDetector {
    private readonly SPIKE_THRESHOLD = 2.0; // 2x standard deviation
    private readonly DUPLICATE_TIME_WINDOW = 24 * 60 * 60 * 1000; // 24 hours
    private readonly DUPLICATE_AMOUNT_TOLERANCE = 0.01; // 1% tolerance

    /**
     * Run complete anomaly detection
     */
    async detectAnomalies(): Promise<Anomaly[]> {
        const anomalies: Anomaly[] = [];

        // Fetch data once
        const [entries, invoices] = await Promise.all([
            journalEntriesService.getAll().catch(() => []),
            invoicesService.getAll().catch(() => [])
        ]);

        // 1. Expense spikes
        anomalies.push(...this.detectExpenseSpikes(entries));

        // 2. Revenue drops
        anomalies.push(...this.detectRevenueDrops(entries));

        // 3. Duplicate transactions
        anomalies.push(...this.detectDuplicates(invoices));

        // 4. Unusual amounts
        anomalies.push(...this.detectUnusualAmounts(invoices));

        // 5. Missing recurring expenses
        anomalies.push(...this.detectMissingRecurring());

        return anomalies.sort((a, b) => {
            const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        });
    }

    /**
     * Detect expense spikes
     */
    private detectExpenseSpikes(entries: any[]): Anomaly[] {
        const anomalies: Anomaly[] = [];
        // entries passed as arg


        // Group expenses by month
        const monthlyExpenses = new Map<string, number>();

        entries.forEach((entry: any) => {
            const month = entry.date.substring(0, 7); // YYYY-MM
            entry.lines?.forEach((line: any) => {
                if (line.debit > 0 && line.accountId?.startsWith('6')) { // Expenses
                    const current = monthlyExpenses.get(month) || 0;
                    monthlyExpenses.set(month, current + line.debit);
                }
            });
        });

        // Calculate average and std dev
        const amounts = Array.from(monthlyExpenses.values());
        if (amounts.length < 3) return anomalies; // Need at least 3 months

        const avg = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
        const variance = amounts.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / amounts.length;
        const stdDev = Math.sqrt(variance);

        // Check current month
        const currentMonth = new Date().toISOString().substring(0, 7);
        const currentExpense = monthlyExpenses.get(currentMonth) || 0;

        if (currentExpense > avg + (this.SPIKE_THRESHOLD * stdDev)) {
            const deviation = ((currentExpense - avg) / avg) * 100;

            anomalies.push({
                id: crypto.randomUUID(),
                type: 'expense_spike',
                severity: deviation > 100 ? 'CRITICAL' : deviation > 50 ? 'HIGH' : 'MEDIUM',
                description: `Gastos del mes ${deviation.toFixed(0)}% sobre el promedio`,
                details: `Gasto actual: $${currentExpense.toLocaleString('es-CL')}, Promedio: $${Math.round(avg).toLocaleString('es-CL')}`,
                entityType: 'period',
                entityId: currentMonth,
                value: currentExpense,
                expectedValue: avg,
                deviation,
                detectedAt: new Date().toISOString(),
                suggestions: [
                    'Revisar gastos del mes actual',
                    'Identificar partidas excepcionales',
                    'Validar que no sean errores de registro'
                ]
            });
        }

        return anomalies;
    }

    /**
     * Detect revenue drops
     */
    private detectRevenueDrops(entries: any[]): Anomaly[] {
        const anomalies: Anomaly[] = [];
        // entries passed as arg

        // Group revenue by month
        const monthlyRevenue = new Map<string, number>();

        entries.forEach((entry: any) => {
            const month = entry.date.substring(0, 7);
            entry.lines?.forEach((line: any) => {
                if (line.credit > 0 && line.accountId?.startsWith('4')) { // Revenue
                    const current = monthlyRevenue.get(month) || 0;
                    monthlyRevenue.set(month, current + line.credit);
                }
            });
        });

        const amounts = Array.from(monthlyRevenue.values());
        if (amounts.length < 3) return anomalies;

        const avg = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
        const stdDev = Math.sqrt(amounts.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / amounts.length);

        const currentMonth = new Date().toISOString().substring(0, 7);
        const currentRevenue = monthlyRevenue.get(currentMonth) || 0;

        if (currentRevenue < avg - (this.SPIKE_THRESHOLD * stdDev)) {
            const deviation = ((avg - currentRevenue) / avg) * 100;

            anomalies.push({
                id: crypto.randomUUID(),
                type: 'revenue_drop',
                severity: deviation > 50 ? 'CRITICAL' : deviation > 30 ? 'HIGH' : 'MEDIUM',
                description: `Ingresos del mes ${deviation.toFixed(0)}% bajo el promedio`,
                details: `Ingreso actual: $${currentRevenue.toLocaleString('es-CL')}, Promedio: $${Math.round(avg).toLocaleString('es-CL')}`,
                entityType: 'period',
                entityId: currentMonth,
                value: currentRevenue,
                expectedValue: avg,
                deviation: -deviation,
                detectedAt: new Date().toISOString(),
                suggestions: [
                    'Revisar pipeline de ventas',
                    'Verificar facturación pendiente',
                    'Analizar causas de la baja'
                ]
            });
        }

        return anomalies;
    }

    /**
     * Detect duplicate transactions
     */
    private detectDuplicates(invoices: any[]): Anomaly[] {
        const anomalies: Anomaly[] = [];
        // invoices passed as arg

        // Group by supplier/customer and amount
        const groups = new Map<string, any[]>();

        invoices.forEach((inv: any) => {
            const key = `${inv.supplierRut || inv.customerRut}_${Math.round(inv.total)}`;
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(inv);
        });

        // Check for duplicates within time window
        groups.forEach((group, key) => {
            if (group.length < 2) return;

            const sorted = group.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            for (let i = 0; i < sorted.length - 1; i++) {
                const curr = sorted[i];
                const next = sorted[i + 1];

                const timeDiff = new Date(next.date).getTime() - new Date(curr.date).getTime();
                const amountDiff = Math.abs(curr.total - next.total);

                if (timeDiff <= this.DUPLICATE_TIME_WINDOW && amountDiff <= curr.total * this.DUPLICATE_AMOUNT_TOLERANCE) {
                    anomalies.push({
                        id: crypto.randomUUID(),
                        type: 'duplicate',
                        severity: 'HIGH',
                        description: `Posible factura duplicada`,
                        details: `${curr.folio} y ${next.folio} - Mismo monto ($${curr.total.toLocaleString('es-CL')}) en 24h`,
                        entityType: 'invoice',
                        entityId: next.id,
                        value: next.total,
                        deviation: 0,
                        detectedAt: new Date().toISOString(),
                        suggestions: [
                            'Verificar si son transacciones distintas',
                            'Revisar folios y fechas',
                            'Considerar eliminar duplicado'
                        ]
                    });
                }
            }
        });

        return anomalies;
    }

    /**
     * Detect unusual transaction amounts
     */
    private detectUnusualAmounts(invoices: any[]): Anomaly[] {
        const anomalies: Anomaly[] = [];
        // invoices passed as arg

        if (invoices.length < 10) return anomalies;

        // Calculate percentiles
        const amounts = invoices.map((inv: any) => inv.total).sort((a: number, b: number) => a - b);
        const p95 = amounts[Math.floor(amounts.length * 0.95)];
        const p99 = amounts[Math.floor(amounts.length * 0.99)];

        // Check for outliers
        invoices.forEach((inv: any) => {
            if (inv.total > p99) {
                const deviation = ((inv.total - p95) / p95) * 100;

                anomalies.push({
                    id: crypto.randomUUID(),
                    type: 'outlier',
                    severity: inv.total > p99 * 2 ? 'HIGH' : 'MEDIUM',
                    description: `Transacción con monto inusualmente alto`,
                    details: `Factura ${inv.folio}: $${inv.total.toLocaleString('es-CL')} (top 1%)`,
                    entityType: 'invoice',
                    entityId: inv.id,
                    value: inv.total,
                    expectedValue: p95,
                    deviation,
                    detectedAt: new Date().toISOString(),
                    suggestions: [
                        'Verificar que el monto sea correcto',
                        'Confirmar autorización para montos altos',
                        'Revisar documentación de respaldo'
                    ]
                });
            }
        });

        return anomalies.slice(0, 5); // Top 5 outliers
    }

    /**
     * Detect missing recurring expenses
     */
    private detectMissingRecurring(): Anomaly[] {
        const anomalies: Anomaly[] = [];
        // Placeholder - would analyze historical patterns
        // For now, we'll skip this as it requires more complex pattern matching
        return anomalies;
    }
}

export const anomalyDetector = new AnomalyDetector();
