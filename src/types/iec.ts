// Libro de Compra y Venta (IEC) Types

export type DocumentType =
    | 'FACTURA'
    | 'FACTURA_EXENTA'
    | 'BOLETA'
    | 'NOTA_CREDITO'
    | 'NOTA_DEBITO'
    | 'GUIA_DESPACHO'
    | 'FACTURA_COMPRA';

export type TaxType = 'AFECTA' | 'EXENTA' | 'NO_RECUPERABLE';

export interface PurchaseInvoice {
    id: string;
    date: string; // ISO date
    documentType: DocumentType;
    folio: number;
    supplierRut: string;
    supplierName: string;
    netAmount: number;
    exemptAmount: number;
    ivaAmount: number;
    totalAmount: number;
    taxType: TaxType;
    period: string; // YYYYMM format
    createdAt: string;
    source: 'manual' | 'rcv' | 'import';
}

export interface SalesInvoice {
    id: string;
    date: string;
    documentType: DocumentType;
    folio: number;
    customerRut: string;
    customerName: string;
    netAmount: number;
    exemptAmount: number;
    ivaAmount: number;
    totalAmount: number;
    period: string;
    createdAt: string;
    source: 'invoicing' | 'manual' | 'import' | 'quote';
    linkedInvoiceId?: string; // Reference to Invoice from InvoicingView
}

export interface IECPeriodSummary {
    period: string; // YYYYMM
    salesCount: number;
    salesNet: number;
    salesIva: number; // IVA Débito
    salesTotal: number;
    purchasesCount: number;
    purchasesNet: number;
    purchasesIva: number; // IVA Crédito
    purchasesTotal: number;
    ivaBalance: number; // Débito - Crédito
    previousBalance: number; // Remanente anterior
    toPay: number; // Monto a pagar (o a favor si negativo)
}
