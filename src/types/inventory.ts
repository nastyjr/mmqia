export interface StorageLocation {
    id: string;
    name: string;
    code: string;
    address?: string;
    isActive: boolean;
}

export interface ProductStock {
    id: string;
    productId: string;
    locationId: string;
    locationName?: string; // Helper for UI
    quantity: number;
}

export interface Product {
    id: string;
    sku: string;
    name: string;
    description?: string;
    unit: string; // UN, KG, LT, MT

    // Global Valuation
    minStock: number; // Reorder Point (Global for now, could be per location) (updated name)
    weightedAverageCost: number; // PMP
    lastPurchasePrice?: number;
    sellingPrice: number;

    category: string;

    // Helper to sum all locations
    totalStock?: number;
    currentStock: number; // Backward compatibility alias
}

export type MovementType = 'COMPRA' | 'VENTA' | 'DEVOLUCION_COMPRA' | 'DEVOLUCION_VENTA' | 'AJUSTE_ENTRADA' | 'AJUSTE_SALIDA' | 'DESPACHO' | 'TRASPASO';

export interface StockMovement {
    id: string;
    productId: string;
    locationId?: string; // Where
    transferLocationId?: string; // To where (if transfer)

    date: string;
    type: MovementType;
    movementCode?: string; // '101', '201', etc.
    documentRef?: string;

    quantity: number;
    unitCost: number;
    totalValue: number;

    stockAfter?: number;
    pmpAfter?: number;
}
