/**
 * Executive Report Generator
 * Automatically generates comprehensive executive reports
 */

export interface ExecutiveReport {
    id: string;
    period: string; // YYYY-MM
    generatedAt: string;
    summary: {
        revenue: number;
        expenses: number;
        netProfit: number;
        profitMargin: number;
        cashBalance: number;
    };
    kpis: {
        name: string;
        value: number;
        unit: string;
        trend: 'up' | 'down' | 'stable';
        trendPercentage: number;
        status: 'good' | 'warning' | 'critical';
    }[];
    insights: {
        type: 'positive' | 'negative' | 'neutral';
        title: string;
        description: string;
        impact: 'HIGH' | 'MEDIUM' | 'LOW';
    }[];
    recommendations: string[];
    charts: {
        revenueVsExpenses: { month: string; revenue: number; expenses: number }[];
        topExpenseCategories: { category: string; amount: number; percentage: number }[];
        cashFlowProjection: { month: string; balance: number }[];
    };
}

class ExecutiveReportGenerator {
    /**
     * Generate complete executive report
     */
    generateReport(period?: string): ExecutiveReport {
        const targetPeriod = period || new Date().toISOString().substring(0, 7);

        const summary = this.generateSummary(targetPeriod);
        const kpis = this.calculateKPIs(targetPeriod);
        const insights = this.generateInsights(summary, kpis);
        const recommendations = this.generateRecommendations(insights);
        const charts = this.generateCharts();

        return {
            id: crypto.randomUUID(),
            period: targetPeriod,
            generatedAt: new Date().toISOString(),
            summary,
            kpis,
            insights,
            recommendations,
            charts
        };
    }

    /**
     * Generate financial summary
     */
    private generateSummary(period: string): ExecutiveReport['summary'] {
        const entries = JSON.parse(localStorage.getItem('accounting_journal') || '[]');

        let revenue = 0;
        let expenses = 0;
        let cashBalance = 0;

        entries.forEach((entry: any) => {
            const entryMonth = entry.date.substring(0, 7);

            entry.lines?.forEach((line: any) => {
                // Revenue
                if (line.accountId?.startsWith('4') && entryMonth === period) {
                    revenue += line.credit;
                }
                // Expenses
                if (line.accountId?.startsWith('6') && entryMonth === period) {
                    expenses += line.debit;
                }
                // Cash balance (cumulative)
                if (line.accountId === '1.1.01') {
                    cashBalance += line.debit - line.credit;
                }
            });
        });

        const netProfit = revenue - expenses;
        const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

        return {
            revenue,
            expenses,
            netProfit,
            profitMargin,
            cashBalance
        };
    }

    /**
     * Calculate KPIs
     */
    private calculateKPIs(period: string): ExecutiveReport['kpis'] {
        const currentSummary = this.generateSummary(period);

        // Get previous month for comparison
        const [year, month] = period.split('-').map(Number);
        const prevMonth = month === 1
            ? `${year - 1}-12`
            : `${year}-${String(month - 1).padStart(2, '0')}`;
        const prevSummary = this.generateSummary(prevMonth);

        const kpis: ExecutiveReport['kpis'] = [];

        // 1. Revenue Growth
        const revenueGrowth = prevSummary.revenue > 0
            ? ((currentSummary.revenue - prevSummary.revenue) / prevSummary.revenue) * 100
            : 0;

        kpis.push({
            name: 'Crecimiento de Ingresos',
            value: revenueGrowth,
            unit: '%',
            trend: revenueGrowth > 0 ? 'up' : revenueGrowth < 0 ? 'down' : 'stable',
            trendPercentage: revenueGrowth,
            status: revenueGrowth > 10 ? 'good' : revenueGrowth < -10 ? 'critical' : 'warning'
        });

        // 2. Margen de Utilidad
        kpis.push({
            name: 'Margen de Utilidad',
            value: currentSummary.profitMargin,
            unit: '%',
            trend: currentSummary.profitMargin > prevSummary.profitMargin ? 'up' :
                currentSummary.profitMargin < prevSummary.profitMargin ? 'down' : 'stable',
            trendPercentage: currentSummary.profitMargin - prevSummary.profitMargin,
            status: currentSummary.profitMargin > 15 ? 'good' :
                currentSummary.profitMargin > 5 ? 'warning' : 'critical'
        });

        // 3. Liquidez (Cash Ratio)
        const monthlyExpenses = currentSummary.expenses;
        const monthsOfCash = monthlyExpenses > 0 ? currentSummary.cashBalance / monthlyExpenses : 0;

        kpis.push({
            name: 'Meses de Caja',
            value: monthsOfCash,
            unit: 'meses',
            trend: monthsOfCash > 3 ? 'up' : monthsOfCash < 1 ? 'down' : 'stable',
            trendPercentage: 0,
            status: monthsOfCash > 3 ? 'good' : monthsOfCash > 1 ? 'warning' : 'critical'
        });

        // 4. Eficiencia Operacional (Gastos/Ingresos)
        const operationalEfficiency = currentSummary.revenue > 0
            ? (currentSummary.expenses / currentSummary.revenue) * 100
            : 0;

        kpis.push({
            name: 'Ratio de Gastos',
            value: operationalEfficiency,
            unit: '%',
            trend: operationalEfficiency < 80 ? 'up' : 'down',
            trendPercentage: 0,
            status: operationalEfficiency < 70 ? 'good' : operationalEfficiency < 85 ? 'warning' : 'critical'
        });

        return kpis;
    }

    /**
     * Generate insights
     */
    private generateInsights(
        summary: ExecutiveReport['summary'],
        kpis: ExecutiveReport['kpis']
    ): ExecutiveReport['insights'] {
        const insights: ExecutiveReport['insights'] = [];

        // Positive insights
        if (summary.profitMargin > 20) {
            insights.push({
                type: 'positive',
                title: '🎉 Excelente rentabilidad',
                description: `Margen de utilidad de ${summary.profitMargin.toFixed(1)}% supera el 20% objetivo`,
                impact: 'HIGH'
            });
        }

        if (kpis.find(k => k.name === 'Crecimiento de Ingresos')!.value > 15) {
            insights.push({
                type: 'positive',
                title: '📈 Fuerte crecimiento',
                description: `Ingresos crecieron más del 15% vs mes anterior`,
                impact: 'HIGH'
            });
        }

        // Negative insights
        if (summary.cashBalance < 0) {
            insights.push({
                type: 'negative',
                title: '⚠️ Alerta de liquidez',
                description: `Saldo de caja negativo: $${Math.abs(summary.cashBalance).toLocaleString('es-CL')}`,
                impact: 'HIGH'
            });
        }

        if (summary.netProfit < 0) {
            insights.push({
                type: 'negative',
                title: '📉 Pérdida del período',
                description: `Resultado negativo de $${Math.abs(summary.netProfit).toLocaleString('es-CL')}`,
                impact: 'HIGH'
            });
        }

        // Neutral insights
        const expenseRatio = kpis.find(k => k.name === 'Ratio de Gastos')!.value;
        if (expenseRatio > 75 && expenseRatio < 85) {
            insights.push({
                type: 'neutral',
                title: 'ℹ️ Gastos controlados',
                description: `Gastos representan ${expenseRatio.toFixed(1)}% de ingresos - dentro del rango objetivo`,
                impact: 'MEDIUM'
            });
        }

        return insights;
    }

    /**
     * Generate recommendations
     */
    private generateRecommendations(insights: ExecutiveReport['insights']): string[] {
        const recommendations: string[] = [];

        insights.forEach(insight => {
            if (insight.type === 'negative') {
                if (insight.title.includes('liquidez')) {
                    recommendations.push('Acelerar cobranza de facturas pendientes');
                    recommendations.push('Evaluar línea de crédito bancaria de emergencia');
                    recommendations.push('Posponer gastos no esenciales');
                }
                if (insight.title.includes('Pérdida')) {
                    recommendations.push('Revisar estructura de costos variables');
                    recommendations.push('Analizar gastos fijos para posibles reducciones');
                    recommendations.push('Desarrollar plan de acción para recuperar rentabilidad');
                }
            }

            if (insight.type === 'positive' && insight.title.includes('rentabilidad')) {
                recommendations.push('Considerar reinversión en crecimiento');
                recommendations.push('Evaluar bonos por desempeño para equipo');
                recommendations.push('Analizar oportunidades de expansión');
            }
        });

        // Default recommendations
        if (recommendations.length === 0) {
            recommendations.push('Mantener el curso actual');
            recommendations.push('Continuar monitoreando KPIs mensualmente');
        }

        return recommendations;
    }

    /**
     * Generate chart data
     */
    private generateCharts(): ExecutiveReport['charts'] {
        const entries = JSON.parse(localStorage.getItem('accounting_journal') || '[]');

        // Revenue vs Expenses (last 6 months)
        const revenueVsExpenses: { month: string; revenue: number; expenses: number }[] = [];
        const monthlyData = new Map<string, { revenue: number; expenses: number }>();

        entries.forEach((entry: any) => {
            const month = entry.date.substring(0, 7);
            if (!monthlyData.has(month)) {
                monthlyData.set(month, { revenue: 0, expenses: 0 });
            }

            const data = monthlyData.get(month)!;
            entry.lines?.forEach((line: any) => {
                if (line.accountId?.startsWith('4')) data.revenue += line.credit;
                if (line.accountId?.startsWith('6')) data.expenses += line.debit;
            });
        });

        Array.from(monthlyData.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-6)
            .forEach(([month, data]) => {
                revenueVsExpenses.push({ month, ...data });
            });

        // Top Expense Categories
        const categoryExpenses = new Map<string, number>();
        entries.forEach((entry: any) => {
            entry.lines?.forEach((line: any) => {
                if (line.accountId?.startsWith('6')) {
                    const category = line.accountName || 'Otros';
                    categoryExpenses.set(category, (categoryExpenses.get(category) || 0) + line.debit);
                }
            });
        });

        const totalExpenses = Array.from(categoryExpenses.values()).reduce((sum, val) => sum + val, 0);
        const topExpenseCategories = Array.from(categoryExpenses.entries())
            .map(([category, amount]) => ({
                category,
                amount,
                percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
            }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        // Cash Flow Projection (would use cashFlowPredictor)
        const cashFlowProjection: { month: string; balance: number }[] = [];
        // Placeholder for now

        return {
            revenueVsExpenses,
            topExpenseCategories,
            cashFlowProjection
        };
    }
}

export const executiveReportGenerator = new ExecutiveReportGenerator();
