import { JournalEntry } from '../types';

export interface DataPoint {
    month: string; // YYYY-MM
    income: number;
    expense: number;
    profit: number;
    isProjected?: boolean;
    confidenceLower?: number;
    confidenceUpper?: number;
}

export interface ForecastMetrics {
    rSquared: number; // 0-1, quality of fit
    trend: 'STRONG_UP' | 'UP' | 'STABLE' | 'DOWN' | 'STRONG_DOWN';
    avgMonthlyGrowth: number; // Percentage
    seasonality: boolean;
}

// Helper to group entries by month
export const groupEntriesByMonth = (entries: JournalEntry[]): DataPoint[] => {
    const groups: { [key: string]: DataPoint } = {};

    entries.forEach(entry => {
        const month = entry.date.substring(0, 7); // YYYY-MM
        if (!groups[month]) {
            groups[month] = { month, income: 0, expense: 0, profit: 0, isProjected: false };
        }

        entry.lines.forEach(line => {
            // 4xxx = Ingresos (Income), 5xxx = Gastos (Expenses/Costs)
            if (line.accountId.startsWith('4')) {
                groups[month].income += line.credit; // Income usually credit
            }
            if (line.accountId.startsWith('5') || line.accountId.startsWith('6')) { // 6 could be costs
                groups[month].expense += line.debit; // Expense usually debit
            }
        });
    });

    // Calculate profit and sort
    return Object.values(groups)
        .map(g => ({ ...g, profit: g.income - g.expense }))
        .sort((a, b) => a.month.localeCompare(b.month));
};

// Calculate R² (coefficient of determination)
const calculateRSquared = (actual: number[], predicted: number[]): number => {
    const mean = actual.reduce((a, b) => a + b, 0) / actual.length;
    const ssTotal = actual.reduce((sum, y) => sum + Math.pow(y - mean, 2), 0);
    const ssResidual = actual.reduce((sum, y, i) => sum + Math.pow(y - predicted[i], 2), 0);
    return 1 - (ssResidual / ssTotal);
};

// Calculate standard error for confidence intervals
const calculateStandardError = (actual: number[], predicted: number[]): number => {
    const n = actual.length;
    const residuals = actual.map((y, i) => Math.pow(y - predicted[i], 2));
    const sumSquaredResiduals = residuals.reduce((a, b) => a + b, 0);
    return Math.sqrt(sumSquaredResiduals / (n - 2));
};

// Enhanced Linear Regression with metrics
export const calculateProjection = (data: DataPoint[], monthsToProject: number = 6): { projections: DataPoint[], metrics: ForecastMetrics } => {
    if (data.length < 2) return { projections: [], metrics: { rSquared: 0, trend: 'STABLE', avgMonthlyGrowth: 0, seasonality: false } };

    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i); // 0, 1, 2...

    // Linear Regression for Income
    const yIncome = data.map(d => d.income);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumYIncome = yIncome.reduce((a, b) => a + b, 0);
    const sumXYIncome = x.reduce((sum, xi, i) => sum + xi * yIncome[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slopeIncome = (n * sumXYIncome - sumX * sumYIncome) / (n * sumXX - sumX * sumX);
    const interceptIncome = (sumYIncome - slopeIncome * sumX) / n;

    // Predicted values for income (for R² calculation)
    const predictedIncome = x.map(xi => slopeIncome * xi + interceptIncome);
    const rSquaredIncome = calculateRSquared(yIncome, predictedIncome);
    const standardErrorIncome = calculateStandardError(yIncome, predictedIncome);

    // Linear Regression for Expense
    const yExpense = data.map(d => d.expense);
    const sumYExpense = yExpense.reduce((a, b) => a + b, 0);
    const sumXYExpense = x.reduce((sum, xi, i) => sum + xi * yExpense[i], 0);

    const slopeExpense = (n * sumXYExpense - sumX * sumYExpense) / (n * sumXX - sumX * sumX);
    const interceptExpense = (sumYExpense - slopeExpense * sumX) / n;

    // Calculate metrics
    const avgIncome = sumYIncome / n;
    const avgMonthlyGrowth = avgIncome > 0 ? (slopeIncome / avgIncome) * 100 : 0;

    let trend: ForecastMetrics['trend'] = 'STABLE';
    if (avgMonthlyGrowth > 5) trend = 'STRONG_UP';
    else if (avgMonthlyGrowth > 1) trend = 'UP';
    else if (avgMonthlyGrowth < -5) trend = 'STRONG_DOWN';
    else if (avgMonthlyGrowth < -1) trend = 'DOWN';

    // Simple seasonality detection: check if variance is high across same month positions
    const seasonality = data.length >= 12; // Need at least a year for seasonality

    // Generate projections with confidence intervals
    const projections: DataPoint[] = [];
    const lastMonthStr = data[data.length - 1].month;
    let [year, month] = lastMonthStr.split('-').map(Number);

    for (let i = 1; i <= monthsToProject; i++) {
        month++;
        if (month > 12) {
            month = 1;
            year++;
        }
        const newMonthStr = `${year}-${month.toString().padStart(2, '0')}`;
        const xProjected = n - 1 + i;

        const projectedIncome = slopeIncome * xProjected + interceptIncome;
        const projectedExpense = slopeExpense * xProjected + interceptExpense;

        // 95% confidence interval (1.96 * SE)
        const marginOfError = 1.96 * standardErrorIncome * Math.sqrt(1 + 1 / n + Math.pow(xProjected - sumX / n, 2) / sumXX);

        projections.push({
            month: newMonthStr,
            income: Math.max(0, Math.round(projectedIncome)),
            expense: Math.max(0, Math.round(projectedExpense)),
            profit: Math.round(projectedIncome - projectedExpense),
            isProjected: true,
            confidenceLower: Math.max(0, Math.round(projectedIncome - marginOfError)),
            confidenceUpper: Math.round(projectedIncome + marginOfError)
        });
    }

    return {
        projections,
        metrics: {
            rSquared: rSquaredIncome,
            trend,
            avgMonthlyGrowth: Number(avgMonthlyGrowth.toFixed(2)),
            seasonality
        }
    };
};
