import { journalEntriesService } from './databaseService';
import { JournalEntry } from '../types';

interface ForecastingResult {
    nextMonthSales: number;
    nextMonthExpenses: number;
    trend: 'UP' | 'DOWN' | 'STABLE';
    confidence: number; // 0-1
}

export const forecastingService = {
    async predictNextMonth(): Promise<ForecastingResult> {
        // 1. Get History
        const entries = await journalEntriesService.getAll() as JournalEntry[];
        if (!entries || entries.length === 0) {
            return { nextMonthSales: 0, nextMonthExpenses: 0, trend: 'STABLE', confidence: 0 };
        }

        // 2. Aggregate by Month
        const salesByMonth = new Map<string, number>();
        const expensesByMonth = new Map<string, number>();

        entries.forEach(entry => {
            const month = entry.date.substring(0, 7); // YYYY-MM
            if (entry.type === 'ingreso') {
                salesByMonth.set(month, (salesByMonth.get(month) || 0) + entry.total);
            } else if (entry.type === 'egreso') {
                expensesByMonth.set(month, (expensesByMonth.get(month) || 0) + entry.total);
            }
        });

        // 3. Prepare Data Points (x = month index, y = amount)
        // Sort months
        const sortedMonths = Array.from(salesByMonth.keys()).sort();
        if (sortedMonths.length < 2) {
            // Not enough data for regression, return naive average or last month
            const lastMonth = sortedMonths[sortedMonths.length - 1];
            return {
                nextMonthSales: salesByMonth.get(lastMonth) || 0,
                nextMonthExpenses: expensesByMonth.get(lastMonth) || 0,
                trend: 'STABLE',
                confidence: 0.1
            };
        }

        const salesPoints = sortedMonths.map((m, i) => ({ x: i, y: salesByMonth.get(m) || 0 }));
        const expensesPoints = sortedMonths.map((m, i) => ({ x: i, y: expensesByMonth.get(m) || 0 }));

        // 4. Linear Regression
        const nextIndex = sortedMonths.length;
        const salesPrediction = predictLinear(salesPoints, nextIndex);
        const expensesPrediction = predictLinear(expensesPoints, nextIndex);

        // 5. Determine Trend
        const lastSales = salesPoints[salesPoints.length - 1].y;
        const trend = salesPrediction > lastSales * 1.05 ? 'UP' : (salesPrediction < lastSales * 0.95 ? 'DOWN' : 'STABLE');

        return {
            nextMonthSales: Math.max(0, Math.round(salesPrediction)),
            nextMonthExpenses: Math.max(0, Math.round(expensesPrediction)),
            trend,
            confidence: 0.7 // Mock confidence for simple regression
        };
    }
};

// Simple OLS Linear Regression
const predictLinear = (data: { x: number, y: number }[], xToPredict: number): number => {
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    for (const point of data) {
        sumX += point.x;
        sumY += point.y;
        sumXY += point.x * point.y;
        sumXX += point.x * point.x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return slope * xToPredict + intercept;
};
