// Quote / Quotation Types

export type QuoteStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'CONVERTED' | 'EXPIRED';

export interface QuoteItem {
    id: string;
    productId: string;
    productName: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    discount: number; // Percentage
    totalNet: number;
}

export interface Quote {
    id: string;
    number: string; // COT-001, COT-002, etc.
    date: string;
    validUntil: string; // Expiration date

    // Customer Info
    customerId: string;
    customerRut: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    customerAddress?: string;

    // Items
    items: QuoteItem[];

    // Totals
    subtotal: number;
    discountTotal: number;
    netTotal: number;
    taxAmount: number;
    total: number;

    // Status & Notes
    status: QuoteStatus;
    notes?: string;
    terms?: string; // Payment terms, conditions, etc.

    // Metadata
    createdAt: string;
    createdBy: string;

    // Conversion Reference
    convertedToInvoiceId?: string;
    convertedToInvoiceFolio?: number;
}
