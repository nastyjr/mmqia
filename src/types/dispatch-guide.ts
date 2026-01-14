// Dispatch Guide Types (Guía de Despacho)

export type DispatchGuideStatus = 'DRAFT' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';

export interface DispatchGuideItem {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalNet: number;
}

export interface DispatchGuide {
    id: string;
    number: string; // GD-0001
    date: string;

    // Customer / Destination
    customerId: string;
    customerRut: string;
    customerName: string;
    destinationAddress: string;

    // Transport Info
    transportType: 'PROPIO' | 'TERCERO' | 'CLIENTE';
    driverName?: string;
    vehiclePlate?: string;

    // Items
    items: DispatchGuideItem[];

    // Totals (reference only, GD doesn't have tax)
    subtotal: number;

    // Status & Metadata
    status: DispatchGuideStatus;
    observations?: string;
    createdAt: string;
    createdBy: string;

    // Reference to Invoice (if created from one)
    relatedInvoiceId?: string;
    relatedInvoiceFolio?: number;
}
