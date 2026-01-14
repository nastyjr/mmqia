/**
 * Tax Compliance Radar
 * Automated tax validation and compliance tracking for Chilean tax system
 */

export interface TaxValidationResult {
    id: string;
    period: string; // YYYY-MM
    validatedAt: string;
    status: 'COMPLIANT' | 'WARNINGS' | 'ERRORS' | 'CRITICAL';
    score: number; // 0-100
    validations: TaxValidation[];
    missingDocuments: MissingDocument[];
    provisions: TaxProvision[];
    nextDeadlines: TaxDeadline[];
}

export interface TaxValidation {
    id: string;
    category: string;
    rule: string;
    status: 'PASS' | 'WARNING' | 'FAIL';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    message: string;
    details?: string;
    suggestedAction?: string;
}

export interface MissingDocument {
    type: 'F29' | 'F50' | 'F1887' | 'RENTA' | 'IET' | 'RCV';
    period: string;
    dueDate: string;
    daysOverdue: number;
    penalty?: number;
    status: 'MISSING' | 'IN_PROGRESS' | 'SUBMITTED';
}

export interface TaxProvision {
    type: 'IVA' | 'PPM' | 'RENTA' | 'MUNICIPAL';
    period: string;
    amount: number;
    calculated: boolean;
    booked: boolean;
}

export interface TaxDeadline {
    form: string;
    description: string;
    dueDate: string;
    daysUntil: number;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

class TaxComplianceRadar {
    /**
     * Run full tax compliance check
     */
    async runCompleteCheck(period: string): Promise<TaxValidationResult> {
        const validations = await this.runValidations(period);
        const missingDocs = this.checkMissingDocuments(period);
        const provisions = this.calculateProvisions(period);
        const deadlines = this.getUpcomingDeadlines();

        // Calculate overall score
        const passCount = validations.filter(v => v.status === 'PASS').length;
        const totalChecks = validations.length;
        const score = totalChecks > 0 ? Math.round((passCount / totalChecks) * 100) : 0;

        // Determine status
        let status: TaxValidationResult['status'];
        const criticalCount = validations.filter(v => v.severity === 'CRITICAL' && v.status === 'FAIL').length;
        const errorCount = validations.filter(v => v.status === 'FAIL').length;
        const warningCount = validations.filter(v => v.status === 'WARNING').length;

        if (criticalCount > 0 || score < 50) status = 'CRITICAL';
        else if (errorCount > 0 || score < 70) status = 'ERRORS';
        else if (warningCount > 0 || score < 90) status = 'WARNINGS';
        else status = 'COMPLIANT';

        return {
            id: crypto.randomUUID(),
            period,
            validatedAt: new Date().toISOString(),
            status,
            score,
            validations,
            missingDocuments: missingDocs,
            provisions,
            nextDeadlines: deadlines
        };
    }

    /**
     * Run all tax validations
     */
    private async runValidations(period: string): Promise<TaxValidation[]> {
        const validations: TaxValidation[] = [];

        // 1. IVA Validation
        validations.push(...this.validateIVA(period));

        // 2. Sales Book vs Purchases Book
        validations.push(...this.validateBooks(period));

        // 3. RCV Consistency
        validations.push(...this.validateRCV(period));

        // 4. Payment dates
        validations.push(...this.validatePaymentDates(period));

        // 5. RUT validations
        validations.push(...this.validateRUTs(period));

        // 6. Account balances
        validations.push(...this.validateAccountBalances(period));

        return validations;
    }

    /**
     * Validate IVA calculations
     */
    private validateIVA(period: string): TaxValidation[] {
        const validations: TaxValidation[] = [];
        const entries = JSON.parse(localStorage.getItem('accounting_journal') || '[]');

        let ivaDebito = 0; // IVA Ventas (Débito Fiscal)
        let ivaCredito = 0; // IVA Compras (Crédito Fiscal)

        entries.forEach((entry: any) => {
            if (!entry.date.startsWith(period)) return;

            entry.lines?.forEach((line: any) => {
                // IVA Débito Fiscal (account 2.1.05.001)
                if (line.accountId === '2.1.05.001') {
                    ivaDebito += line.credit - line.debit;
                }
                // IVA Crédito Fiscal (account 1.1.08.001)
                if (line.accountId === '1.1.08.001') {
                    ivaCredito += line.debit - line.credit;
                }
            });
        });

        const ivaToPay = ivaDebito - ivaCredito;

        // Validation: IVA should be positive or close to zero
        if (ivaToPay < -50000) {
            validations.push({
                id: crypto.randomUUID(),
                category: 'IVA',
                rule: 'IVA a pagar coherente',
                status: 'WARNING',
                severity: 'MEDIUM',
                message: 'IVA a favor inusualmente alto',
                details: `IVA a favor: $${Math.abs(ivaToPay).toLocaleString('es-CL')}. Verificar si es correcto.`,
                suggestedAction: 'Revisar compras del período y validar facturas'
            });
        }

        // Validation: IVA Débito should exist if there are sales
        const invoices = JSON.parse(localStorage.getItem('invoicing_db') || '[]');
        const salesInPeriod = invoices.filter((inv: any) => inv.date.startsWith(period) && inv.type === 'FACTURA');

        if (salesInPeriod.length > 0 && ivaDebito === 0) {
            validations.push({
                id: crypto.randomUUID(),
                category: 'IVA',
                rule: 'IVA Débito Fiscal registrado',
                status: 'FAIL',
                severity: 'CRITICAL',
                message: 'Hay ventas pero no IVA Débito registrado',
                details: `${salesInPeriod.length} facturas emitidas sin IVA contabilizado`,
                suggestedAction: 'Contabilizar IVA de ventas'
            });
        } else if (salesInPeriod.length > 0) {
            validations.push({
                id: crypto.randomUUID(),
                category: 'IVA',
                rule: 'IVA Débito Fiscal registrado',
                status: 'PASS',
                severity: 'LOW',
                message: 'IVA Débito correctamente registrado',
                details: `$${ivaDebito.toLocaleString('es-CL')}`
            });
        }

        return validations;
    }

    /**
     * Validate Sales/Purchase books
     */
    private validateBooks(period: string): TaxValidation[] {
        const validations: TaxValidation[] = [];
        const invoices = JSON.parse(localStorage.getItem('invoicing_db') || '[]');

        const salesInvoices = invoices.filter((inv: any) =>
            inv.date.startsWith(period) && inv.type === 'FACTURA'
        );

        const purchaseInvoices = invoices.filter((inv: any) =>
            inv.date.startsWith(period) && (inv.supplierRut || inv.type === 'FACTURA_COMPRA')
        );

        // Validation: Folios should be sequential (for sales)
        if (salesInvoices.length > 0) {
            const folios = salesInvoices
                .map((inv: any) => parseInt(inv.folio.split('-').pop() || '0'))
                .filter(f => !isNaN(f))
                .sort((a, b) => a - b);

            let hasGaps = false;
            for (let i = 1; i < folios.length; i++) {
                if (folios[i] - folios[i - 1] > 1) {
                    hasGaps = true;
                    break;
                }
            }

            if (hasGaps) {
                validations.push({
                    id: crypto.randomUUID(),
                    category: 'Libro de Ventas',
                    rule: 'Folios consecutivos',
                    status: 'WARNING',
                    severity: 'MEDIUM',
                    message: 'Hay saltos en la numeración de folios',
                    suggestedAction: 'Verificar facturas anuladas o revisar numeración'
                });
            } else {
                validations.push({
                    id: crypto.randomUUID(),
                    category: 'Libro de Ventas',
                    rule: 'Folios consecutivos',
                    status: 'PASS',
                    severity: 'LOW',
                    message: 'Numeración de folios correcta'
                });
            }
        }

        // Validation: Purchase invoices should have valid RUT
        const invalidRUTs = purchaseInvoices.filter((inv: any) => {
            const rut = inv.supplierRut || inv.customerRut;
            return !rut || !this.isValidRUT(rut);
        });

        if (invalidRUTs.length > 0) {
            validations.push({
                id: crypto.randomUUID(),
                category: 'Libro de Compras',
                rule: 'RUTs válidos',
                status: 'FAIL',
                severity: 'HIGH',
                message: `${invalidRUTs.length} facturas con RUT inválido`,
                suggestedAction: 'Corregir RUTs antes de declarar F29'
            });
        } else if (purchaseInvoices.length > 0) {
            validations.push({
                id: crypto.randomUUID(),
                category: 'Libro de Compras',
                rule: 'RUTs válidos',
                status: 'PASS',
                severity: 'LOW',
                message: 'Todos los RUTs son válidos'
            });
        }

        return validations;
    }

    /**
     * Validate RCV consistency
     */
    private validateRCV(period: string): TaxValidation[] {
        const validations: TaxValidation[] = [];

        // Check if RCV was downloaded for the period
        const rcvData = localStorage.getItem(`rcv_${period}`);

        if (!rcvData) {
            validations.push({
                id: crypto.randomUUID(),
                category: 'RCV',
                rule: 'RCV descargado',
                status: 'WARNING',
                severity: 'MEDIUM',
                message: 'RCV no descargado para este período',
                suggestedAction: 'Descargar RCV desde SII para validar compras'
            });
        } else {
            validations.push({
                id: crypto.randomUUID(),
                category: 'RCV',
                rule: 'RCV descargado',
                status: 'PASS',
                severity: 'LOW',
                message: 'RCV disponible para validación'
            });
        }

        return validations;
    }

    /**
     * Validate payment dates
     */
    private validatePaymentDates(period: string): TaxValidation[] {
        const validations: TaxValidation[] = [];
        const today = new Date();
        const [year, month] = period.split('-').map(Number);

        // F29 due date is 12th of next month
        const f29DueDate = new Date(year, month, 12);
        const daysUntilF29 = Math.ceil((f29DueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilF29 < 0) {
            validations.push({
                id: crypto.randomUUID(),
                category: 'Plazos',
                rule: 'F29 presentado a tiempo',
                status: 'FAIL',
                severity: 'CRITICAL',
                message: `F29 vencido hace ${Math.abs(daysUntilF29)} días`,
                suggestedAction: 'Presentar F29 urgente - multas aplicables'
            });
        } else if (daysUntilF29 <= 3) {
            validations.push({
                id: crypto.randomUUID(),
                category: 'Plazos',
                rule: 'F29 presentado a tiempo',
                status: 'WARNING',
                severity: 'HIGH',
                message: `Faltan ${daysUntilF29} días para F29`,
                suggestedAction: 'Preparar y presentar F29 urgente'
            });
        }

        return validations;
    }

    /**
     * Validate RUTs in documents
     */
    private validateRUTs(period: string): TaxValidation[] {
        const validations: TaxValidation[] = [];
        // Already covered in validateBooks
        return validations;
    }

    /**
     * Validate account balances
     */
    private validateAccountBalances(period: string): TaxValidation[] {
        const validations: TaxValidation[] = [];
        const entries = JSON.parse(localStorage.getItem('accounting_journal') || '[]');

        // Sum all entries for the period
        let totalDebits = 0;
        let totalCredits = 0;

        entries.forEach((entry: any) => {
            if (!entry.date.startsWith(period)) return;

            entry.lines?.forEach((line: any) => {
                totalDebits += line.debit || 0;
                totalCredits += line.credit || 0;
            });
        });

        const difference = Math.abs(totalDebits - totalCredits);

        if (difference > 1) {
            validations.push({
                id: crypto.randomUUID(),
                category: 'Balance',
                rule: 'Asientos balanceados',
                status: 'FAIL',
                severity: 'CRITICAL',
                message: 'Asientos desbalanceados',
                details: `Diferencia: $${difference.toLocaleString('es-CL')}`,
                suggestedAction: 'Corregir asientos antes de cerrar período'
            });
        } else {
            validations.push({
                id: crypto.randomUUID(),
                category: 'Balance',
                rule: 'Asientos balanceados',
                status: 'PASS',
                severity: 'LOW',
                message: 'Todos los asientos están balanceados'
            });
        }

        return validations;
    }

    /**
     * Check for missing tax documents
     */
    private checkMissingDocuments(period: string): MissingDocument[] {
        const missing: MissingDocument[] = [];
        const [year, month] = period.split('-').map(Number);
        const today = new Date();

        // F29 - Monthly
        const f29Due = new Date(year, month, 12);
        const f29Submitted = localStorage.getItem(`f29_${period}`);

        if (!f29Submitted && today > f29Due) {
            const daysOverdue = Math.ceil((today.getTime() - f29Due.getTime()) / (1000 * 60 * 60 * 24));
            missing.push({
                type: 'F29',
                period,
                dueDate: f29Due.toISOString().split('T')[0],
                daysOverdue,
                penalty: this.calculateF29Penalty(daysOverdue),
                status: 'MISSING'
            });
        }

        // More document checks can be added (F50, F1887, etc.)

        return missing;
    }

    /**
     * Calculate tax provisions
     */
    private calculateProvisions(period: string): TaxProvision[] {
        const provisions: TaxProvision[] = [];
        const entries = JSON.parse(localStorage.getItem('accounting_journal') || '[]');

        // IVA Provision
        let ivaDebito = 0;
        let ivaCredito = 0;

        entries.forEach((entry: any) => {
            if (!entry.date.startsWith(period)) return;

            entry.lines?.forEach((line: any) => {
                if (line.accountId === '2.1.05.001') ivaDebito += line.credit - line.debit;
                if (line.accountId === '1.1.08.001') ivaCredito += line.debit - line.credit;
            });
        });

        const ivaToPay = Math.max(0, ivaDebito - ivaCredito);

        provisions.push({
            type: 'IVA',
            period,
            amount: ivaToPay,
            calculated: true,
            booked: ivaToPay > 0
        });

        // PPM Provision (Pagos Provisionales Mensuales) - simplified 1% of sales
        const invoices = JSON.parse(localStorage.getItem('invoicing_db') || '[]');
        const salesInPeriod = invoices
            .filter((inv: any) => inv.date.startsWith(period) && inv.type === 'FACTURA')
            .reduce((sum: number, inv: any) => sum + (inv.netTotal || 0), 0);

        const ppmAmount = salesInPeriod * 0.01;

        if (ppmAmount > 0) {
            provisions.push({
                type: 'PPM',
                period,
                amount: ppmAmount,
                calculated: true,
                booked: false
            });
        }

        return provisions;
    }

    /**
     * Get upcoming tax deadlines
     */
    private getUpcomingDeadlines(): TaxDeadline[] {
        const deadlines: TaxDeadline[] = [];
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();

        // F29 - Always 12th of next month
        const f29Date = new Date(currentYear, currentMonth + 1, 12);
        const f29Days = Math.ceil((f29Date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        deadlines.push({
            form: 'F29',
            description: 'Declaración y pago IVA/PPM',
            dueDate: f29Date.toISOString().split('T')[0],
            daysUntil: f29Days,
            priority: f29Days <= 3 ? 'URGENT' : f29Days <= 7 ? 'HIGH' : 'MEDIUM'
        });

        // Add more deadlines (F50, Renta, etc.) based on calendar

        return deadlines.sort((a, b) => a.daysUntil - b.daysUntil);
    }

    /**
     * Calculate F29 penalty
     */
    private calculateF29Penalty(daysOverdue: number): number {
        // Simplified: 10% + 1.5% per month
        const basePenalty = 0.10;
        const monthlyRate = 0.015;
        const months = Math.ceil(daysOverdue / 30);

        return basePenalty + (monthlyRate * months);
    }

    /**
     * Validate RUT (Chilean tax ID)
     */
    private isValidRUT(rut: string): boolean {
        const cleanRut = rut.replace(/[.-]/g, '');
        if (cleanRut.length < 2) return false;

        const body = cleanRut.slice(0, -1);
        const dv = cleanRut.slice(-1).toUpperCase();

        let sum = 0;
        let multiplier = 2;

        for (let i = body.length - 1; i >= 0; i--) {
            sum += parseInt(body[i]) * multiplier;
            multiplier = multiplier === 7 ? 2 : multiplier + 1;
        }

        const expectedDV = 11 - (sum % 11);
        const calculatedDV = expectedDV === 11 ? '0' : expectedDV === 10 ? 'K' : expectedDV.toString();

        return dv === calculatedDV;
    }
}

export const taxComplianceRadar = new TaxComplianceRadar();
