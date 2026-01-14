// Alert Types

export type AlertType =
    | 'INVOICE_DUE'        // Factura por vencer
    | 'INVOICE_OVERDUE'    // Factura vencida
    | 'LOW_STOCK'          // Stock bajo mínimo
    | 'STOCK_DEPLETION'    // Predicción de agotamiento
    | 'TAX_DEADLINE'       // Fecha límite tributaria
    | 'PERIOD_CLOSE'       // Cierre de período pendiente
    | 'PAYMENT_DUE'        // Pago a proveedor pendiente
    | 'PAYMENT_RISK'       // Riesgo de impago
    | 'INFO';              // Informativo general

export type AlertPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface QuickAction {
    id: string;
    label: string;
    icon?: string; // Icon name as string
    action: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
}

export interface Alert {
    id: string;
    type: AlertType;
    priority: AlertPriority;
    title: string;
    message: string;
    entityType?: string;    // e.g., 'Invoice', 'Product', etc.
    entityId?: string;
    actionLabel?: string;   // e.g., 'Ver Factura'
    actionView?: string;    // Navigation target
    dueDate?: string;
    createdAt: string;
    isRead: boolean;
    isDismissed: boolean;
    quickActions?: QuickAction[]; // NEW: Quick action buttons
    prediction?: {          // NEW: Prediction data
        value: number;
        unit: string;
        trend: 'up' | 'down' | 'stable';
    };
}
