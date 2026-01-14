// Role-Based Access Control Types

export type Role = 'ADMIN' | 'ACCOUNTANT' | 'SALESPERSON' | 'VIEWER';

export type Permission =
    // Accounting
    | 'accounting:read'
    | 'accounting:write'
    | 'accounting:delete'
    | 'accounting:close_period'
    // Invoicing
    | 'invoices:read'
    | 'invoices:create'
    | 'invoices:void'
    // Inventory
    | 'inventory:read'
    | 'inventory:write'
    // CRM
    | 'crm:read'
    | 'crm:write'
    // Payroll
    | 'payroll:read'
    | 'payroll:write'
    // Reports
    | 'reports:view'
    | 'reports:export'
    // Admin
    | 'settings:manage'
    | 'users:manage'
    | 'audit:view';

export interface RoleDefinition {
    name: string;
    description: string;
    permissions: Permission[];
}

export const ROLE_DEFINITIONS: Record<Role, RoleDefinition> = {
    ADMIN: {
        name: 'Administrador',
        description: 'Acceso completo a todos los módulos',
        permissions: [
            'accounting:read', 'accounting:write', 'accounting:delete', 'accounting:close_period',
            'invoices:read', 'invoices:create', 'invoices:void',
            'inventory:read', 'inventory:write',
            'crm:read', 'crm:write',
            'payroll:read', 'payroll:write',
            'reports:view', 'reports:export',
            'settings:manage', 'users:manage', 'audit:view'
        ]
    },
    ACCOUNTANT: {
        name: 'Contador',
        description: 'Acceso a contabilidad, reportes y cierre de períodos',
        permissions: [
            'accounting:read', 'accounting:write', 'accounting:close_period',
            'invoices:read', 'invoices:create',
            'inventory:read',
            'crm:read',
            'payroll:read', 'payroll:write',
            'reports:view', 'reports:export',
            'audit:view'
        ]
    },
    SALESPERSON: {
        name: 'Vendedor',
        description: 'Acceso a ventas, cotizaciones e inventario',
        permissions: [
            'invoices:read', 'invoices:create',
            'inventory:read',
            'crm:read', 'crm:write',
            'reports:view'
        ]
    },
    VIEWER: {
        name: 'Solo Lectura',
        description: 'Solo visualización de datos, sin edición',
        permissions: [
            'accounting:read',
            'invoices:read',
            'inventory:read',
            'crm:read',
            'reports:view'
        ]
    }
};

export interface UserWithRole {
    id: string;
    username: string;
    email: string;
    role: Role;
    isActive: boolean;
    createdAt: string;
    lastLogin?: string;
}
