export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID';
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'CREDIT' | 'DEBIT';
export type DocumentType = 'FACTURA' | 'BOLETA' | 'NOTA_CREDITO';

export interface InvoiceDetail {
    id: string;
    productId: string; // SKU or internal ID
    productName: string;
    quantity: number;
    price: number; // Net Unit Price
    discount: number; // Percentage or Amount, simplified to amount here for now
    totalNet: number; // quantity * price - discount
}

export interface Invoice {
    id: string; // Internal UUID
    folio: number; // Official SII Folio
    type: DocumentType;
    date: string; // ISO Date
    dueDate: string; // ISO Date

    // Customer Info (Snapshot)
    customerId: string; // Link to ThirdParty
    customerRut: string;
    customerName: string;
    customerAddress: string;
    customerGiro: string;

    // Items
    items: InvoiceDetail[];

    // Totals
    subtotal: number; // Sum of nets
    discountTotal: number;
    netTotal: number; // Subtotal - Discount
    taxFactor: number; // 0.19
    taxTotal: number; // Net * 0.19
    total: number; // Net + Tax

    paymentMethod: PaymentMethod;
    status: InvoiceStatus;

    // Metadata
    createdAt: string;
    issuedBy: string; // User ID or Name
    accountingEntryId?: string; // Link to Journal Entry

    // Credit Note Reference (only for NOTA_CREDITO)
    referencedFolio?: number;
    creditNoteReason?: string;
}

export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface Subscription {
    id: string;
    customerId: string; // Link to ThirdParty
    customerName: string; // Cached for display
    items: InvoiceDetail[];
    cycle: BillingCycle;
    nextBillingDate: string; // ISO Date
    lastBillingDate?: string;
    isActive: boolean;
    autoIssue: boolean; // true = ISSUED, false = DRAFT
    createdAt: string;
}
