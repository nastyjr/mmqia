/**
 * Automatic Journal Entry Generation Service
 * Creates accounting entries from business transactions
 */

import { JournalEntry } from '../types';

export interface PurchaseOrderReceiptData {
    orderId: string;
    orderNumber: string;
    date: string;
    supplierId: string;
    supplierName: string;
    items: Array<{
        productId: string;
        productName: string;
        quantity: number;
        unitCost: number;
        totalCost: number;
    }>;
    subtotal: number;
    taxAmount: number;
    total: number;
}

export interface PayrollData {
    employeeId: string;
    employeeName: string;
    employeeRut: string;
    grossSalary: number;
    afp: number;
    health: number;
    otherDeductions: number;
    netSalary: number;
    employerContributions: number;
}

export class AccountingAutomation {
    /**
     * Generate journal entry for goods receipt (Purchase Order reception)
     */
    static generateGoodsReceiptEntry(data: PurchaseOrderReceiptData): JournalEntry {
        return {
            id: crypto.randomUUID(),
            date: data.date,
            glosa: `Recepción OC ${data.orderNumber} - ${data.supplierName}`,
            type: 'egreso',
            total: data.total,
            createdAt: new Date().toISOString(),
            status: 'posted',
            lines: [
                {
                    id: crypto.randomUUID(),
                    accountId: '1.2.01',
                    accountName: 'Inventario / Existencias',
                    debit: data.subtotal,
                    credit: 0
                },
                {
                    id: crypto.randomUUID(),
                    accountId: '1.1.04',
                    accountName: 'IVA Crédito Fiscal',
                    debit: data.taxAmount,
                    credit: 0
                },
                {
                    id: crypto.randomUUID(),
                    accountId: '2.1.02',
                    accountName: 'Cuentas por Pagar Proveedores',
                    debit: 0,
                    credit: data.total
                }
            ]
        };
    }

    /**
     * Generate journal entry for payroll payment
     */
    static generatePayrollEntry(data: PayrollData[], paymentDate: string): JournalEntry {
        const totalGrossSalary = data.reduce((sum, emp) => sum + emp.grossSalary, 0);
        const totalNetSalary = data.reduce((sum, emp) => sum + emp.netSalary, 0);
        const totalAFP = data.reduce((sum, emp) => sum + emp.afp, 0);
        const totalHealth = data.reduce((sum, emp) => sum + emp.health, 0);
        const totalEmployerContrib = data.reduce((sum, emp) => sum + emp.employerContributions, 0);

        return {
            id: crypto.randomUUID(),
            date: paymentDate,
            glosa: `Pago de Remuneraciones - ${data.length} empleado(s)`,
            type: 'egreso',
            total: totalGrossSalary + totalEmployerContrib,
            createdAt: new Date().toISOString(),
            status: 'posted',
            lines: [
                // DEBE: Gastos de Personal
                {
                    id: crypto.randomUUID(),
                    accountId: '6.1.01',
                    accountName: 'Sueldos y Salarios',
                    debit: totalGrossSalary,
                    credit: 0
                },
                {
                    id: crypto.randomUUID(),
                    accountId: '6.1.02',
                    accountName: 'Leyes Sociales (Empleador)',
                    debit: totalEmployerContrib,
                    credit: 0
                },
                // HABER: Banco (pago neto)
                {
                    id: crypto.randomUUID(),
                    accountId: '1.1.01',
                    accountName: 'Banco',
                    debit: 0,
                    credit: totalNetSalary
                },
                // HABER: Retenciones por pagar
                {
                    id: crypto.randomUUID(),
                    accountId: '2.1.05',
                    accountName: 'AFP por Pagar',
                    debit: 0,
                    credit: totalAFP
                },
                {
                    id: crypto.randomUUID(),
                    accountId: '2.1.06',
                    accountName: 'Salud por Pagar',
                    debit: 0,
                    credit: totalHealth
                },
                // HABER: Leyes sociales empleador por pagar
                {
                    id: crypto.randomUUID(),
                    accountId: '2.1.07',
                    accountName: 'Leyes Sociales por Pagar',
                    debit: 0,
                    credit: totalEmployerContrib
                }
            ]
        };
    }

    /**
     * Generate journal entry for sales (already mostly automated, but this provides the structure)
     */
    static generateSalesEntry(
        invoiceNumber: string,
        customerName: string,
        date: string,
        netAmount: number,
        taxAmount: number,
        total: number
    ): JournalEntry {
        return {
            id: crypto.randomUUID(),
            date,
            glosa: `Venta Factura ${invoiceNumber} - ${customerName}`,
            type: 'ingreso',
            total,
            createdAt: new Date().toISOString(),
            status: 'posted',
            lines: [
                {
                    id: crypto.randomUUID(),
                    accountId: '1.1.02',
                    accountName: 'Clientes por Cobrar',
                    debit: total,
                    credit: 0
                },
                {
                    id: crypto.randomUUID(),
                    accountId: '4.1.01',
                    accountName: 'Ventas',
                    debit: 0,
                    credit: netAmount
                },
                {
                    id: crypto.randomUUID(),
                    accountId: '2.1.03',
                    accountName: 'IVA Débito Fiscal',
                    debit: 0,
                    credit: taxAmount
                }
            ]
        };
    }

    /**
     * Validate that journal entry is balanced
     */
    static isBalanced(entry: JournalEntry): boolean {
        const totalDebit = entry.lines.reduce((sum, line) => sum + line.debit, 0);
        const totalCredit = entry.lines.reduce((sum, line) => sum + line.credit, 0);

        // Allow small floating point differences
        return Math.abs(totalDebit - totalCredit) < 0.01;
    }
}
