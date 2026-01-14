/**
 * Smart Budget Monitor
 * Tracks budget vs actual and sends alerts when approaching limits
 */

export interface BudgetCategory {
    id: string;
    name: string;
    accountIds: string[]; // Chart of accounts codes
    monthlyBudget: number;
    yearlyBudget: number;
    alertThreshold: number; // Percentage (e.g., 80 = alert at 80%)
}

export interface BudgetAlert {
    id: string;
    categoryId: string;
    categoryName: string;
    period: string; // YYYY-MM
    budgeted: number;
    spent: number;
    remaining: number;
    percentageUsed: number;
    projectedOverrun: number;
    severity: 'INFO' | 'WARNING' | 'CRITICAL';
    message: string;
    createdAt: string;
}

export interface BudgetReport {
    period: string;
    categories: Array<{
        categoryId: string;
        categoryName: string;
        budgeted: number;
        spent: number;
        remaining: number;
        percentageUsed: number;
        trend: 'under' | 'on_track' | 'over';
        projectedTotal: number; // Based on burn rate
    }>;
    totalBudget: number;
    totalSpent: number;
    totalRemaining: number;
    overallHealth: 'GOOD' | 'WARNING' | 'CRITICAL';
}

class SmartBudgetMonitor {
    private readonly CATEGORIES_KEY = 'budget_categories';
    private readonly ALERTS_KEY = 'budget_alerts';

    /**
     * Set budget for category
     */
    setBudgetCategory(category: BudgetCategory): void {
        const categories = this.getBudgetCategories();
        const existingIndex = categories.findIndex(c => c.id === category.id);

        if (existingIndex >= 0) {
            categories[existingIndex] = category;
        } else {
            categories.push(category);
        }

        localStorage.setItem(this.CATEGORIES_KEY, JSON.stringify(categories));
    }

    /**
     * Get all budget categories
     */
    getBudgetCategories(): BudgetCategory[] {
        try {
            const data = localStorage.getItem(this.CATEGORIES_KEY);
            return data ? JSON.parse(data) : this.getDefaultCategories();
        } catch {
            return this.getDefaultCategories();
        }
    }

    /**
     * Default budget categories
     */
    private getDefaultCategories(): BudgetCategory[] {
        return [
            {
                id: '1',
                name: 'Sueldos y Salarios',
                accountIds: ['6.1.01', '6.1.02'],
                monthlyBudget: 5000000,
                yearlyBudget: 60000000,
                alertThreshold: 90
            },
            {
                id: '2',
                name: 'Arriendo y Servicios',
                accountIds: ['6.2.01', '6.2.02'],
                monthlyBudget: 1500000,
                yearlyBudget: 18000000,
                alertThreshold: 85
            },
            {
                id: '3',
                name: 'Marketing',
                accountIds: ['6.3.01'],
                monthlyBudget: 800000,
                yearlyBudget: 9600000,
                alertThreshold: 80
            },
            {
                id: '4',
                name: 'Tecnología',
                accountIds: ['6.4.01'],
                monthlyBudget: 500000,
                yearlyBudget: 6000000,
                alertThreshold: 85
            }
        ];
    }

    /**
     * Monitor budgets and generate alerts
     */
    monitorBudgets(period?: string): BudgetAlert[] {
        const targetPeriod = period || new Date().toISOString().substring(0, 7);
        const categories = this.getBudgetCategories();
        const alerts: BudgetAlert[] = [];

        categories.forEach(category => {
            const spent = this.getSpentAmount(category, targetPeriod);
            const budgeted = category.monthlyBudget;
            const remaining = budgeted - spent;
            const percentageUsed = budgeted > 0 ? (spent / budgeted) * 100 : 0;

            // Calculate projected overrun based on burn rate
            const daysInMonth = new Date(
                parseInt(targetPeriod.split('-')[0]),
                parseInt(targetPeriod.split('-')[1]),
                0
            ).getDate();
            const currentDay = new Date().getDate();
            const daysRemaining = daysInMonth - currentDay;

            const dailyBurnRate = spent / currentDay;
            const projectedTotal = spent + (dailyBurnRate * daysRemaining);
            const projectedOverrun = Math.max(0, projectedTotal - budgeted);

            // Generate alert if threshold exceeded or projected overrun
            if (percentageUsed >= category.alertThreshold || projectedOverrun > 0) {
                let severity: BudgetAlert['severity'];
                let message: string;

                if (percentageUsed >= 100) {
                    severity = 'CRITICAL';
                    message = `Presupuesto agotado al ${percentageUsed.toFixed(0)}%`;
                } else if (projectedOverrun > budgeted * 0.1) {
                    severity = 'CRITICAL';
                    message = `Proyección excede presupuesto en $${projectedOverrun.toLocaleString('es-CL')}`;
                } else if (percentageUsed >= category.alertThreshold) {
                    severity = 'WARNING';
                    message = `Uso al ${percentageUsed.toFixed(0)}% del presupuesto`;
                } else {
                    severity = 'INFO';
                    message = `Proyección indica posible exceso`;
                }

                alerts.push({
                    id: crypto.randomUUID(),
                    categoryId: category.id,
                    categoryName: category.name,
                    period: targetPeriod,
                    budgeted,
                    spent,
                    remaining,
                    percentageUsed,
                    projectedOverrun,
                    severity,
                    message,
                    createdAt: new Date().toISOString()
                });
            }
        });

        // Save alerts
        this.saveAlerts(alerts);

        return alerts.sort((a, b) => {
            const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        });
    }

    /**
     * Get spent amount for category in period
     */
    private getSpentAmount(category: BudgetCategory, period: string): number {
        const entries = JSON.parse(localStorage.getItem('accounting_journal') || '[]');
        let total = 0;

        entries.forEach((entry: any) => {
            if (!entry.date.startsWith(period)) return;

            entry.lines?.forEach((line: any) => {
                if (category.accountIds.includes(line.accountId)) {
                    total += line.debit - line.credit;
                }
            });
        });

        return total;
    }

    /**
     * Generate budget report
     */
    generateReport(period?: string): BudgetReport {
        const targetPeriod = period || new Date().toISOString().substring(0, 7);
        const categories = this.getBudgetCategories();

        const categoryReports = categories.map(category => {
            const spent = this.getSpentAmount(category, targetPeriod);
            const budgeted = category.monthlyBudget;
            const remaining = budgeted - spent;
            const percentageUsed = budgeted > 0 ? (spent / budgeted) * 100 : 0;

            // Calculate projection
            const currentDay = new Date().getDate();
            const dailyBurnRate = spent / currentDay;
            const daysInMonth = new Date(
                parseInt(targetPeriod.split('-')[0]),
                parseInt(targetPeriod.split('-')[1]),
                0
            ).getDate();
            const projectedTotal = (dailyBurnRate * daysInMonth);

            let trend: 'under' | 'on_track' | 'over';
            if (percentageUsed < 80) trend = 'under';
            else if (percentageUsed <= 100) trend = 'on_track';
            else trend = 'over';

            return {
                categoryId: category.id,
                categoryName: category.name,
                budgeted,
                spent,
                remaining,
                percentageUsed,
                trend,
                projectedTotal
            };
        });

        const totalBudget = categories.reduce((sum, c) => sum + c.monthlyBudget, 0);
        const totalSpent = categoryReports.reduce((sum, c) => sum + c.spent, 0);
        const totalRemaining = totalBudget - totalSpent;

        const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
        let overallHealth: BudgetReport['overallHealth'];
        if (overallPercentage < 80) overallHealth = 'GOOD';
        else if (overallPercentage <= 100) overallHealth = 'WARNING';
        else overallHealth = 'CRITICAL';

        return {
            period: targetPeriod,
            categories: categoryReports,
            totalBudget,
            totalSpent,
            totalRemaining,
            overallHealth
        };
    }

    /**
     * Save alerts
     */
    private saveAlerts(alerts: BudgetAlert[]): void {
        try {
            const existing = JSON.parse(localStorage.getItem(this.ALERTS_KEY) || '[]');
            const combined = [...existing, ...alerts];

            // Keep last 100 alerts
            const trimmed = combined.slice(-100);
            localStorage.setItem(this.ALERTS_KEY, JSON.stringify(trimmed));
        } catch (error) {
            console.error('Error saving budget alerts:', error);
        }
    }

    /**
     * Get recent alerts
     */
    getRecentAlerts(count: number = 10): BudgetAlert[] {
        try {
            const alerts = JSON.parse(localStorage.getItem(this.ALERTS_KEY) || '[]');
            return alerts.slice(-count).reverse();
        } catch {
            return [];
        }
    }
}

export const smartBudgetMonitor = new SmartBudgetMonitor();
