/**
 * Prediction Engine for Proactive Notifications
 * Forecasts inventory depletion, payment risks, and business trends
 */

import { Product } from '../types/inventory';
import { Invoice } from '../types/invoicing';

export interface StockPrediction {
    productId: string;
    productName: string;
    currentStock: number;
    avgDailySales: number;
    daysUntilDepletion: number;
    depletionDate: string;
    urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM';
    suggestedReorderQty: number;
}

export interface PaymentRiskAssessment {
    customerId: string;
    customerName: string;
    overdueAmount: number;
    overdueCount: number;
    riskScore: number; // 0-100
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    recommendation: string;
}

class PredictionEngine {
    /**
     * Predict stock depletion based on sales history
     */
    predictStockDepletion(products: Product[], salesHistory: Array<{ productId: string; date: string; quantity: number }>): StockPrediction[] {
        const predictions: StockPrediction[] = [];
        const today = new Date();

        for (const product of products) {
            // Get sales for this product in last 30 days
            const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            const recentSales = salesHistory.filter(sale =>
                sale.productId === product.id &&
                new Date(sale.date) >= thirtyDaysAgo
            );

            if (recentSales.length === 0) continue; // No sales history

            // Calculate average daily sales
            const totalSold = recentSales.reduce((sum, sale) => sum + sale.quantity, 0);
            const avgDailySales = totalSold / 30;

            if (avgDailySales === 0) continue; // No movement

            // Calculate days until depletion
            const currentStock = product.currentStock || product.totalStock || 0;
            const daysUntilDepletion = Math.floor(currentStock / avgDailySales);

            // Only alert if depleting within 30 days
            if (daysUntilDepletion <= 30 && daysUntilDepletion >= 0) {
                const depletionDate = new Date(today.getTime() + daysUntilDepletion * 24 * 60 * 60 * 1000);

                // Determine urgency
                let urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM';
                if (daysUntilDepletion <= 3) urgency = 'CRITICAL';
                else if (daysUntilDepletion <= 7) urgency = 'HIGH';
                else urgency = 'MEDIUM';

                // Suggest reorder quantity (2-3 weeks of stock)
                const suggestedReorderQty = Math.ceil(avgDailySales * 15);

                predictions.push({
                    productId: product.id,
                    productName: product.name,
                    currentStock,
                    avgDailySales: Number(avgDailySales.toFixed(2)),
                    daysUntilDepletion,
                    depletionDate: depletionDate.toISOString().split('T')[0],
                    urgency,
                    suggestedReorderQty
                });
            }
        }

        // Sort by urgency
        return predictions.sort((a, b) => a.daysUntilDepletion - b.daysUntilDepletion);
    }

    /**
     * Assess customer payment risk
     */
    assessPaymentRisk(invoices: Invoice[]): PaymentRiskAssessment[] {
        const today = new Date();
        const customerRisks = new Map<string, PaymentRiskAssessment>();

        // Group by customer
        for (const invoice of invoices) {
            if (invoice.status !== 'ISSUED') continue; // Only unpaid invoices

            const dueDate = new Date(invoice.dueDate);
            const isOverdue = dueDate < today;

            if (!isOverdue) continue;

            const customerId = invoice.customerId;
            let risk = customerRisks.get(customerId);

            if (!risk) {
                risk = {
                    customerId,
                    customerName: invoice.customerName,
                    overdueAmount: 0,
                    overdueCount: 0,
                    riskScore: 0,
                    riskLevel: 'LOW',
                    recommendation: ''
                };
                customerRisks.set(customerId, risk);
            }

            risk.overdueAmount += invoice.total;
            risk.overdueCount++;
        }

        // Calculate risk scores
        const risks: PaymentRiskAssessment[] = [];
        for (const risk of customerRisks.values()) {
            // Risk score based on amount and frequency
            let score = 0;

            // Amount contribution (0-50 points)
            if (risk.overdueAmount > 5000000) score += 50;
            else if (risk.overdueAmount > 1000000) score += 30;
            else if (risk.overdueAmount > 500000) score += 20;
            else score += 10;

            // Frequency contribution (0-50 points)
            if (risk.overdueCount > 5) score += 50;
            else if (risk.overdueCount > 3) score += 30;
            else if (risk.overdueCount > 1) score += 20;
            else score += 10;

            risk.riskScore = Math.min(100, score);

            // Determine risk level
            if (risk.riskScore >= 70) {
                risk.riskLevel = 'HIGH';
                risk.recommendation = 'Considerar suspensión de crédito y plan de pago';
            } else if (risk.riskScore >= 40) {
                risk.riskLevel = 'MEDIUM';
                risk.recommendation = 'Enviar recordatorio de pago inmediato';
            } else {
                risk.riskLevel = 'LOW';
                risk.recommendation = 'Monitorear vencimiento';
            }

            risks.push(risk);
        }

        return risks.sort((a, b) => b.riskScore - a.riskScore);
    }

    /**
     * Detect tax deadline proximity
     */
    getTaxDeadlineAlerts(currentDate: Date = new Date()): Array<{ type: string; daysLeft: number; message: string; urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' }> {
        const alerts = [];
        const dayOfMonth = currentDate.getDate();
        const month = currentDate.getMonth() + 1;

        // F29 due on 12th of each month
        if (dayOfMonth >= 1 && dayOfMonth <= 12) {
            const daysLeft = 12 - dayOfMonth;
            let urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM';

            if (daysLeft <= 2) urgency = 'CRITICAL';
            else if (daysLeft <= 5) urgency = 'HIGH';
            else urgency = 'MEDIUM';

            alerts.push({
                type: 'F29',
                daysLeft,
                message: `Formulario 29 vence en ${daysLeft} días (12 de ${this.getMonthName(month)})`,
                urgency
            });
        }

        // Add more tax deadlines as needed (F50, annual declarations, etc.)

        return alerts;
    }

    private getMonthName(month: number): string {
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return months[month - 1];
    }
}

export const predictionEngine = new PredictionEngine();
