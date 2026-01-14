// Purchase Order Types

export type POStatus = 'DRAFT' | 'SENT' | 'PENDING' | 'RECEIVED' | 'CANCELLED';

export interface POItem {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitCost: number; // Costo unitario neto
    totalCost: number; // Total neto de la linea
    receivedQty?: number; // For partial receipts

    // Tax Info
    taxCategory: 'AFECTO' | 'EXENTO' | 'ILA_10' | 'ILA_18' | 'ILA_31' | 'ILA_40';
    taxAmount?: number; // Estimated tax for this line
}

export interface PurchaseOrder {
    id: string;
    number: string; // OC-001, OC-002, etc.
    date: string;
    expectedDate: string; // Expected delivery date

    // Supplier Info
    supplierId: string;
    supplierRut: string;
    supplierName: string;
    supplierAddress?: string;

    // Totals
    subtotal: number; // Suma de netos
    taxAmount: number; // Total IVA (19%)
    ilaAmount?: number; // Total Impuestos Adicionales
    exemptAmount?: number; // Total Exento
    total: number; // Gran Total

    // Status & Tracking
    status: POStatus;
    notes?: string;

    // Items
    items: POItem[];

    createdAt: string;
    createdBy: string;

    // Receipt tracking
    receiptDate?: string;
    invoiceRef?: string; // Reference to supplier's invoice
}

export interface GoodsReceipt {
    id: string;
    purchaseOrderId: string;
    date: string;
    items: { productId: string; receivedQty: number }[];
    notes?: string;
    createdAt: string;
}
