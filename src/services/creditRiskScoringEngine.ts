/**
 * Credit Risk Scoring Engine
 * Auto-calculates credit scores for customers based on payment behavior
 */

export interface CustomerCreditProfile {
    customerId: string;
    customerName: string;
    customerRut: string;
    creditScore: number; // 300-850 (FICO-style)
    creditRating: 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC' | 'D';
    creditLimit: number;
    currentExposure: number;
    availableCredit: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    status: 'ACTIVE' | 'WATCH_LIST' | 'CREDIT_HOLD' | 'COLLECTIONS';
    factors: CreditScoreFactor[];
    recommendations: string[];
    calculatedAt: string;
    history: CreditScoreHistory[];
}

export interface CreditScoreFactor {
    factor: string;
    impact: number; // -100 to +100
    description: string;
    weight: number;
}

export interface CreditScoreHistory {
    date: string;
    score: number;
    rating: string;
    event?: string;
}

export interface CreditAlert {
    id: string;
    customerId: string;
    customerName: string;
    type: 'LIMIT_EXCEEDED' | 'PAYMENT_OVERDUE' | 'SCORE_DROP' | 'HIGH_EXPOSURE';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    message: string;
    amount?: number;
    createdAt: string;
}

class CreditRiskScoringEngine {
    private readonly STORAGE_KEY = 'credit_profiles';
    private readonly ALERTS_KEY = 'credit_alerts';

    // Weights for scoring factors
    private readonly WEIGHTS = {
        PAYMENT_HISTORY: 0.35,      // 35% - Most important
        DEBT_TO_LIMIT: 0.30,         // 30% - Credit utilization
        PAYMENT_SPEED: 0.20,         // 20% - How fast they pay
        RELATIONSHIP_AGE: 0.10,      // 10% - Length of relationship
        TRANSACTION_FREQUENCY: 0.05  // 5% - How often they buy
    };

    /**
     * Calculate credit score for a customer
     */
    async calculateCreditScore(customerId: string, customerName: string, customerRut: string): Promise<CustomerCreditProfile> {
        const invoices = this.getCustomerInvoices(customerRut);
        const payments = this.getCustomerPayments(customerRut);

        const factors: CreditScoreFactor[] = [];
        let score = 500; // Start at midpoint

        // 1. Payment History (35%)
        const paymentHistoryScore = this.calculatePaymentHistory(invoices, payments);
        const paymentImpact = paymentHistoryScore * this.WEIGHTS.PAYMENT_HISTORY;
        score += paymentImpact;

        factors.push({
            factor: 'Historial de Pagos',
            impact: Math.round(paymentImpact),
            description: this.getPaymentHistoryDescription(paymentHistoryScore),
            weight: this.WEIGHTS.PAYMENT_HISTORY
        });

        // 2. Debt to Limit Ratio (30%)
        const currentExposure = this.getCurrentExposure(invoices);
        const creditLimit = this.getCreditLimit(customerId) || this.calculateDefaultLimit(invoices);
        const debtRatio = creditLimit > 0 ? currentExposure / creditLimit : 0;

        const debtScore = (1 - Math.min(debtRatio, 1)) * 200 - 100; // -100 to +100
        const debtImpact = debtScore * this.WEIGHTS.DEBT_TO_LIMIT;
        score += debtImpact;

        factors.push({
            factor: 'Utilización de Crédito',
            impact: Math.round(debtImpact),
            description: `${(debtRatio * 100).toFixed(0)}% del límite utilizado`,
            weight: this.WEIGHTS.DEBT_TO_LIMIT
        });

        // 3. Payment Speed (20%)
        const avgPaymentDays = this.calculateAveragePaymentDays(invoices, payments);
        const paymentSpeedScore = this.scorePaymentSpeed(avgPaymentDays);
        const speedImpact = paymentSpeedScore * this.WEIGHTS.PAYMENT_SPEED;
        score += speedImpact;

        factors.push({
            factor: 'Velocidad de Pago',
            impact: Math.round(speedImpact),
            description: `Promedio: ${avgPaymentDays} días`,
            weight: this.WEIGHTS.PAYMENT_SPEED
        });

        // 4. Relationship Age (10%)
        const firstInvoiceDate = invoices.length > 0
            ? new Date(Math.min(...invoices.map(inv => new Date(inv.date).getTime())))
            : new Date();
        const monthsAsCustomer = this.getMonthsDiff(firstInvoiceDate, new Date());
        const relationshipScore = Math.min(monthsAsCustomer * 3, 100); // Max 100 at ~33 months
        const relationshipImpact = relationshipScore * this.WEIGHTS.RELATIONSHIP_AGE;
        score += relationshipImpact;

        factors.push({
            factor: 'Antigüedad como Cliente',
            impact: Math.round(relationshipImpact),
            description: `${monthsAsCustomer} meses`,
            weight: this.WEIGHTS.RELATIONSHIP_AGE
        });

        // 5. Transaction Frequency (5%)
        const monthlyFrequency = invoices.length / Math.max(monthsAsCustomer, 1);
        const frequencyScore = Math.min(monthlyFrequency * 20, 100); // Max 100 at 5 transactions/month
        const frequencyImpact = frequencyScore * this.WEIGHTS.TRANSACTION_FREQUENCY;
        score += frequencyImpact;

        factors.push({
            factor: 'Frecuencia de Transacciones',
            impact: Math.round(frequencyImpact),
            description: `${monthlyFrequency.toFixed(1)} transacciones/mes`,
            weight: this.WEIGHTS.TRANSACTION_FREQUENCY
        });

        // Normalize score to 300-850 range (FICO-style)
        const finalScore = Math.max(300, Math.min(850, Math.round(score)));

        // Determine rating
        const rating = this.scoreToRating(finalScore);

        // Calculate credit limit
        const calculatedLimit = this.calculateCreditLimit(finalScore, invoices);

        // Determine risk level
        const riskLevel = this.determineRiskLevel(finalScore, debtRatio, avgPaymentDays);

        // Determine status
        const status = this.determineStatus(finalScore, debtRatio, currentExposure, calculatedLimit);

        // Generate recommendations
        const recommendations = this.generateRecommendations(factors, debtRatio, avgPaymentDays, finalScore);

        // Get or create history
        const history = this.getScoreHistory(customerId);
        history.push({
            date: new Date().toISOString(),
            score: finalScore,
            rating,
            event: 'Recalculation'
        });

        const profile: CustomerCreditProfile = {
            customerId,
            customerName,
            customerRut,
            creditScore: finalScore,
            creditRating: rating,
            creditLimit: calculatedLimit,
            currentExposure,
            availableCredit: Math.max(0, calculatedLimit - currentExposure),
            riskLevel,
            status,
            factors,
            recommendations,
            calculatedAt: new Date().toISOString(),
            history: history.slice(-12) // Keep last 12 entries
        };

        // Save profile
        this.saveProfile(profile);

        // Check for alerts
        this.checkAndCreateAlerts(profile);

        return profile;
    }

    /**
     * Calculate payment history score
     */
    private calculatePaymentHistory(invoices: any[], payments: any[]): number {
        if (invoices.length === 0) return 0;

        let onTimeCount = 0;
        let lateCount = 0;
        let totalOverdueDays = 0;

        invoices.forEach(inv => {
            const payment = payments.find(p => p.invoiceId === inv.id);

            if (payment) {
                const dueDate = new Date(inv.dueDate || inv.date);
                const paidDate = new Date(payment.date);
                const daysLate = Math.max(0, Math.ceil((paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

                if (daysLate === 0) {
                    onTimeCount++;
                } else {
                    lateCount++;
                    totalOverdueDays += daysLate;
                }
            } else if (inv.status === 'PAID') {
                onTimeCount++; // Assume on time if marked paid
            }
        });

        const totalPaid = onTimeCount + lateCount;
        if (totalPaid === 0) return -50; // No payment history

        const onTimeRate = onTimeCount / totalPaid;
        const avgDaysLate = lateCount > 0 ? totalOverdueDays / lateCount : 0;

        // Score from -100 to +100
        let score = (onTimeRate * 150) - 50; // Perfect = +100, None = -50
        score -= Math.min(avgDaysLate * 2, 50); // Penalize late days

        return Math.max(-100, Math.min(100, score));
    }

    /**
     * Get payment history description
     */
    private getPaymentHistoryDescription(score: number): string {
        if (score >= 80) return 'Excelente historial de pagos';
        if (score >= 50) return 'Buen historial de pagos';
        if (score >= 0) return 'Historial de pagos regular';
        if (score >= -50) return 'Historial de pagos deficiente';
        return 'Sin historial de pagos suficiente';
    }

    /**
     * Calculate average payment days
     */
    private calculateAveragePaymentDays(invoices: any[], payments: any[]): number {
        const paidInvoices = invoices.filter(inv => {
            return payments.some(p => p.invoiceId === inv.id) || inv.status === 'PAID';
        });

        if (paidInvoices.length === 0) return 0;

        let totalDays = 0;
        let count = 0;

        paidInvoices.forEach(inv => {
            const payment = payments.find(p => p.invoiceId === inv.id);
            if (payment) {
                const invoiceDate = new Date(inv.date);
                const paidDate = new Date(payment.date);
                const days = Math.ceil((paidDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
                totalDays += days;
                count++;
            }
        });

        return count > 0 ? totalDays / count : 30; // Default to 30 days if no data
    }

    /**
     * Score payment speed
     */
    private scorePaymentSpeed(avgDays: number): number {
        // Ideal: 0-15 days = +100
        // Acceptable: 30 days = 0
        // Slow: 60+ days = -100
        if (avgDays <= 15) return 100;
        if (avgDays <= 30) return 100 - ((avgDays - 15) * 6.67); // Linear -100 to 0
        if (avgDays <= 60) return -(avgDays - 30) * 3.33; // -100 at 60 days
        return -100;
    }

    /**
     * Get current exposure (unpaid invoices)
     */
    private getCurrentExposure(invoices: any[]): number {
        return invoices
            .filter(inv => inv.status !== 'PAID' && inv.status !== 'CANCELED')
            .reduce((sum, inv) => sum + (inv.total || 0), 0);
    }

    /**
     * Get or calculate credit limit
     */
    private getCreditLimit(customerId: string): number | null {
        const profiles = this.getAllProfiles();
        const profile = profiles.find(p => p.customerId === customerId);
        return profile?.creditLimit || null;
    }

    /**
     * Calculate default credit limit based on history
     */
    private calculateDefaultLimit(invoices: any[]): number {
        if (invoices.length === 0) return 500000; // Default 500k CLP

        // Average monthly sales * 2
        const totalSales = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
        const avgMonthly = totalSales / Math.max(this.getMonthsDiff(new Date(invoices[0].date), new Date()), 1);

        return Math.round(avgMonthly * 2);
    }

    /**
     * Calculate credit limit based on score
     */
    private calculateCreditLimit(score: number, invoices: any[]): number {
        const baseLimit = this.calculateDefaultLimit(invoices);

        // Multiply by score factor
        let multiplier = 1;
        if (score >= 750) multiplier = 2;
        else if (score >= 700) multiplier = 1.5;
        else if (score >= 650) multiplier = 1.2;
        else if (score >= 600) multiplier = 1;
        else if (score >= 550) multiplier = 0.7;
        else if (score >= 500) multiplier = 0.5;
        else multiplier = 0.3;

        return Math.round(baseLimit * multiplier);
    }

    /**
     * Convert score to rating
     */
    private scoreToRating(score: number): CustomerCreditProfile['creditRating'] {
        if (score >= 800) return 'AAA';
        if (score >= 750) return 'AA';
        if (score >= 700) return 'A';
        if (score >= 650) return 'BBB';
        if (score >= 600) return 'BB';
        if (score >= 550) return 'B';
        if (score >= 500) return 'CCC';
        return 'D';
    }

    /**
     * Determine risk level
     */
    private determineRiskLevel(score: number, debtRatio: number, avgPaymentDays: number): CustomerCreditProfile['riskLevel'] {
        if (score >= 700 && debtRatio < 0.5 && avgPaymentDays <= 30) return 'LOW';
        if (score >= 600 && debtRatio < 0.8 && avgPaymentDays <= 45) return 'MEDIUM';
        if (score >= 500 && debtRatio < 1.0 && avgPaymentDays <= 60) return 'HIGH';
        return 'CRITICAL';
    }

    /**
     * Determine customer status
     */
    private determineStatus(score: number, debtRatio: number, exposure: number, limit: number): CustomerCreditProfile['status'] {
        if (score < 500 || debtRatio > 1.2) return 'COLLECTIONS';
        if (debtRatio > 1.0 || score < 550) return 'CREDIT_HOLD';
        if (debtRatio > 0.8 || score < 650) return 'WATCH_LIST';
        return 'ACTIVE';
    }

    /**
     * Generate recommendations
     */
    private generateRecommendations(factors: CreditScoreFactor[], debtRatio: number, avgDays: number, score: number): string[] {
        const recommendations: string[] = [];

        // Payment history
        const paymentFactor = factors.find(f => f.factor === 'Historial de Pagos');
        if (paymentFactor && paymentFactor.impact < 0) {
            recommendations.push('Establecer recordatorios de pago automáticos');
            recommendations.push('Considerar descuentos por pronto pago');
        }

        // Debt ratio
        if (debtRatio > 0.8) {
            recommendations.push('⚠️ Alto nivel de endeudamiento - solicitar pago antes de nuevas ventas');
            recommendations.push('Reducir límite de crédito o requerir garantías');
        }

        // Payment speed
        if (avgDays > 45) {
            recommendations.push('Pagos lentos - considerar pago contra entrega');
            recommendations.push('Evaluar situación financiera del cliente');
        }

        // Low score
        if (score < 600) {
            recommendations.push('⚠️ Score bajo - requerir pago al contado o anticipado');
            recommendations.push('Solicitar referencias comerciales actualizadas');
        }

        if (recommendations.length === 0) {
            recommendations.push('✅ Cliente en buen standing - mantener relación');
        }

        return recommendations;
    }

    /**
     * Check and create alerts
     */
    private checkAndCreateAlerts(profile: CustomerCreditProfile): void {
        const alerts: CreditAlert[] = [];

        // Limit exceeded
        if (profile.currentExposure > profile.creditLimit) {
            alerts.push({
                id: crypto.randomUUID(),
                customerId: profile.customerId,
                customerName: profile.customerName,
                type: 'LIMIT_EXCEEDED',
                severity: 'HIGH',
                message: `Límite excedido en $${(profile.currentExposure - profile.creditLimit).toLocaleString('es-CL')}`,
                amount: profile.currentExposure - profile.creditLimit,
                createdAt: new Date().toISOString()
            });
        }

        // Score drop
        if (profile.history.length >= 2) {
            const previousScore = profile.history[profile.history.length - 2].score;
            const scoreDrop = previousScore - profile.creditScore;

            if (scoreDrop >= 50) {
                alerts.push({
                    id: crypto.randomUUID(),
                    customerId: profile.customerId,
                    customerName: profile.customerName,
                    type: 'SCORE_DROP',
                    severity: 'MEDIUM',
                    message: `Score bajó ${scoreDrop} puntos`,
                    createdAt: new Date().toISOString()
                });
            }
        }

        // High exposure
        if (profile.currentExposure > profile.creditLimit * 0.9) {
            alerts.push({
                id: crypto.randomUUID(),
                customerId: profile.customerId,
                customerName: profile.customerName,
                type: 'HIGH_EXPOSURE',
                severity: 'MEDIUM',
                message: `Exposición al ${((profile.currentExposure / profile.creditLimit) * 100).toFixed(0)}% del límite`,
                amount: profile.currentExposure,
                createdAt: new Date().toISOString()
            });
        }

        // Save alerts
        if (alerts.length > 0) {
            this.saveAlerts(alerts);
        }
    }

    // Helper methods
    private getCustomerInvoices(rut: string): any[] {
        const invoices = JSON.parse(localStorage.getItem('invoicing_db') || '[]');
        return invoices.filter((inv: any) => inv.customerRut === rut || inv.supplierRut === rut);
    }

    private getCustomerPayments(rut: string): any[] {
        // Simplified - in real app, would have separate payments table
        return [];
    }

    private getMonthsDiff(date1: Date, date2: Date): number {
        return Math.max(1, Math.round((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    }

    private getScoreHistory(customerId: string): CreditScoreHistory[] {
        const profiles = this.getAllProfiles();
        const profile = profiles.find(p => p.customerId === customerId);
        return profile?.history || [];
    }

    private saveProfile(profile: CustomerCreditProfile): void {
        const profiles = this.getAllProfiles();
        const index = profiles.findIndex(p => p.customerId === profile.customerId);

        if (index >= 0) {
            profiles[index] = profile;
        } else {
            profiles.push(profile);
        }

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(profiles));
    }

    private getAllProfiles(): CustomerCreditProfile[] {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
        } catch {
            return [];
        }
    }

    private saveAlerts(alerts: CreditAlert[]): void {
        const existing = this.getAllAlerts();
        existing.push(...alerts);
        localStorage.setItem(this.ALERTS_KEY, JSON.stringify(existing));
    }

    getAllAlerts(): CreditAlert[] {
        try {
            return JSON.parse(localStorage.getItem(this.ALERTS_KEY) || '[]');
        } catch {
            return [];
        }
    }

    /**
     * Get all customer profiles
     */
    getAllCustomerProfiles(): CustomerCreditProfile[] {
        return this.getAllProfiles().sort((a, b) => b.creditScore - a.creditScore);
    }

    /**
     * Get profile for specific customer
     */
    getCustomerProfile(customerId: string): CustomerCreditProfile | null {
        const profiles = this.getAllProfiles();
        return profiles.find(p => p.customerId === customerId) || null;
    }

    /**
     * Recalculate all customer scores
     */
    async recalculateAllScores(): Promise<number> {
        const invoices = JSON.parse(localStorage.getItem('invoicing_db') || '[]');
        const customers = new Map<string, { name: string, rut: string }>();

        invoices.forEach((inv: any) => {
            const rut = inv.customerRut || inv.supplierRut;
            const name = inv.customerName || inv.supplierName;
            if (rut && name) {
                customers.set(rut, { name, rut });
            }
        });

        let count = 0;
        for (const [rut, data] of customers) {
            await this.calculateCreditScore(rut, data.name, data.rut);
            count++;
        }

        return count;
    }
}

export const creditRiskScoringEngine = new CreditRiskScoringEngine();
