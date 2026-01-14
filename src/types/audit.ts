// Audit Log Types

export type AuditAction =
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'LOGIN'
    | 'LOGOUT'
    | 'EXPORT'
    | 'PERIOD_CLOSE';

export type AuditModule =
    | 'ACCOUNTING'
    | 'INVENTORY'
    | 'CRM'
    | 'INVOICING'
    | 'PAYROLL'
    | 'FIXED_ASSETS'
    | 'AUTH'
    | 'SETTINGS';

export interface AuditEntry {
    id: string;
    timestamp: string;
    action: AuditAction;
    module: AuditModule;
    entityType: string; // e.g., 'JournalEntry', 'Invoice', 'Product'
    entityId: string;
    description: string;
    userId: string;
    userName: string;
    ipAddress?: string;
    beforeData?: string; // JSON stringified
    afterData?: string; // JSON stringified
}
