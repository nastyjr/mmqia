
export type TransactionType = 'ingreso' | 'egreso' | 'traspaso';

export interface Account {
  code: string;
  name: string;
  type: 'Activo' | 'Pasivo' | 'Patrimonio' | 'Ingresos' | 'Costos' | 'Gastos';
  level: number; // 1: Titulo, 2: Subtitulo, 3: Imputable
  isImputable: boolean; // Si se puede usar en asientos
}

export interface JournalLine {
  id: string;
  accountId: string; // Código de la cuenta
  accountName: string;
  debit: number; // Debe
  credit: number; // Haber
  rut?: string; // Para auxiliar (Cliente/Proveedor)
  documentType?: string; // Fac, Bol, N/C
  documentNumber?: string; // Folio
  // New ERP Fields
  costCenter?: string; // Centro de Costo
  documentDate?: string; // Fecha Emisión Doc
  dueDate?: string; // Fecha Vencimiento Doc
  lineGloss?: string; // Glosa específica de la línea
  // Multi-currency
  currency?: 'CLP' | 'USD' | 'UF' | 'EUR';
  exchangeRate?: number;
  originalDebit?: number;
  originalCredit?: number;
  glosa?: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  glosa: string;
  lines: JournalEntryLine[];
  total: number;
  type: 'ingreso' | 'egreso' | 'traspaso';
  status?: 'draft' | 'posted';
  createdAt: string; // Keeping this as it was not explicitly removed from the original JournalEntry
  currency?: string; // CLP, USD, UF // Keeping this as it was not explicitly removed from the original JournalEntry
  exchangeRate?: number; // Keeping this as it was not explicitly removed from the original JournalEntry
}

export const CATEGORIES = [
  'Ventas', 'Salario', 'Alquiler', 'Comida', 'Transporte',
  'Servicios', 'Entretenimiento', 'Salud', 'Educación', 'Otros', 'Inversiones'
];

export interface CostCenter {
  id: string;
  name: string;
  code: string;
}

export interface JournalEntryLine {
  id: string;
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
  costCenterId?: string;
  glosa?: string;
  rut?: string;
  documentNumber?: string;
  originalDebit?: number;
  originalCredit?: number;
  currency?: string;
  exchangeRate?: number;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
}

export interface User {
  email: string;
  name: string;
  token: string;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  JOURNAL = 'JOURNAL', // Libro Diario
  COA = 'COA', // Plan de Cuentas
  INSIGHTS = 'INSIGHTS',
  // Nuevas Vistas para Libros
  LIBRO_DIARIO = 'LIBRO_DIARIO',
  LIBRO_MAYOR = 'LIBRO_MAYOR',
  PLAN_DE_CUENTAS = 'PLAN_DE_CUENTAS',
  FORMULARIO_29 = 'FORMULARIO_29',
  LIBRO_CAJA = 'LIBRO_CAJA',
  LIBRO_COMPRA_VENTA = 'LIBRO_COMPRA_VENTA',
  LIBRO_REMUNERACIONES = 'LIBRO_REMUNERACIONES',
  EMPLOYEES = 'EMPLOYEES',
  INVOICING = 'INVOICING',
  LIBRO_RETENCIONES = 'LIBRO_RETENCIONES',
  LIBRO_RRE = 'LIBRO_RRE', // Registro Rentas Empresariales
  BALANCE_8_COL = 'BALANCE_8_COL',
  ACTIVO_FIJO = 'ACTIVO_FIJO',
  ESTADOS_IFRS = 'ESTADOS_IFRS',
  FIXED_ASSETS = 'FIXED_ASSETS',
  INVENTORY = 'INVENTORY',
  CRM = 'CRM',
  BANK_RECONCILIATION_VIEW = 'BANK_RECONCILIATION_VIEW',
  IFRS_STATEMENTS = 'IFRS_STATEMENTS',
  BUDGET_CONTROL = 'budget_control',
  PERIOD_CLOSING = 'period_closing',
  FORECASTING = 'forecasting',
  ESTADO_RESULTADOS = 'ESTADO_RESULTADOS',
  TAX_COMPLIANCE = 'TAX_COMPLIANCE',
  BANK_RECONCILIATION = 'BANK_RECONCILIATION',
  PAYROLL_GENERATOR = 'PAYROLL_GENERATOR',
  // Tributaria
  F29 = 'F29',
  F50 = 'F50',
  F22 = 'F22',
  DJ_1887 = 'DJ_1887',
  DJ_1879 = 'DJ_1879',
  DJ_1926 = 'DJ_1926',
  AUDIT_LOG = 'AUDIT_LOG',
  PURCHASE_ORDERS = 'PURCHASE_ORDERS',
  QUOTES = 'QUOTES',
  DISPATCH_GUIDES = 'DISPATCH_GUIDES',
  USER_MANAGEMENT = 'USER_MANAGEMENT',
  AGING_REPORT = 'AGING_REPORT',
  EXECUTIVE_DASHBOARD = 'EXECUTIVE_DASHBOARD',
  RENTA_LIQUIDA = 'RENTA_LIQUIDA',
  CAPITAL_PROPIO = 'CAPITAL_PROPIO'
}

export const INITIAL_COST_CENTERS: CostCenter[] = [
  { id: 'cc-1', code: '100', name: 'Administración' },
  { id: 'cc-2', code: '200', name: 'Ventas' },
  { id: 'cc-3', code: '300', name: 'Operaciones' },
  { id: 'cc-4', code: '400', name: 'Marketing' },
];

// Datos iniciales para el Plan de Cuentas (Extracto estándar IFRS/Chile)
export const INITIAL_ACCOUNTS: Account[] = [
  { code: '1.1.01', name: 'Caja', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.03', name: 'Banco de Chile', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.04', name: 'Clientes Nacionales', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.05', name: 'IVA Crédito Fiscal', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.06', name: 'Mercaderías', type: 'Activo', level: 3, isImputable: true },
  { code: '1.2.00', name: 'ACTIVO NO CORRIENTE', type: 'Activo', level: 2, isImputable: false },
  { code: '1.2.01', name: 'Muebles y Útiles', type: 'Activo', level: 3, isImputable: true },
  { code: '1.2.02', name: 'Equipos Computacionales', type: 'Activo', level: 3, isImputable: true },

  { code: '2.0.00', name: 'PASIVO', type: 'Pasivo', level: 1, isImputable: false },
  { code: '2.1.00', name: 'PASIVO CORRIENTE', type: 'Pasivo', level: 2, isImputable: false },
  { code: '2.1.01', name: 'Proveedores Nacionales', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.1.02', name: 'Acreedores Varios', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.1.03', name: 'IVA Débito Fiscal', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.1.04', name: 'Imposiciones por Pagar', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.1.05', name: 'Impuesto a la Renta por Pagar', type: 'Pasivo', level: 3, isImputable: true },

  { code: '3.0.00', name: 'PATRIMONIO', type: 'Patrimonio', level: 1, isImputable: false },
  { code: '3.1.01', name: 'Capital Pagado', type: 'Patrimonio', level: 3, isImputable: true },
  { code: '3.1.02', name: 'Utilidad del Ejercicio', type: 'Patrimonio', level: 3, isImputable: true },

  { code: '4.0.00', name: 'INGRESOS', type: 'Ingresos', level: 1, isImputable: false },
  { code: '4.1.01', name: 'Ventas Netas', type: 'Ingresos', level: 3, isImputable: true },
  { code: '4.1.02', name: 'Ingresos Fuera de Explotación', type: 'Ingresos', level: 3, isImputable: true },

  { code: '5.0.00', name: 'COSTOS', type: 'Costos', level: 1, isImputable: false },
  { code: '5.1.01', name: 'Costo de Ventas', type: 'Costos', level: 3, isImputable: true },
  { code: '5.2.03', name: 'Otros Ingresos', type: 'Ingresos', level: 3, isImputable: true },


  { code: '6.0.00', name: 'GASTOS', type: 'Gastos', level: 1, isImputable: false },
  { code: '6.1.00', name: 'GASTOS ADMINISTRACIÓN Y VENTAS', type: 'Gastos', level: 2, isImputable: false },
  { code: '6.1.01', name: 'Sueldos y Salarios', type: 'Gastos', level: 3, isImputable: true },
  { code: '6.1.02', name: 'Arriendos', type: 'Gastos', level: 3, isImputable: true },
  { code: '6.1.03', name: 'Servicios Básicos (Luz/Agua)', type: 'Gastos', level: 3, isImputable: true },
  { code: '6.1.04', name: 'Gastos Bancarios', type: 'Gastos', level: 3, isImputable: true },
  { code: '6.1.05', name: 'Gastos de Representación', type: 'Gastos', level: 3, isImputable: true },
  { code: '6.1.06', name: 'Publicidad y Marketing', type: 'Gastos', level: 3, isImputable: true },
  { code: '6.2.02', name: 'Pérdidas y Mermas', type: 'Gastos', level: 3, isImputable: true },


  // Activo Fijo Related
  { code: '1.2.99', name: 'Depreciación Acumulada', type: 'Activo', level: 3, isImputable: true }, // Contra-asset
  { code: '6.1.10', name: 'Depreciación del Ejercicio', type: 'Gastos', level: 3, isImputable: true },
  { code: '6.1.11', name: 'Corrección Monetaria', type: 'Gastos', level: 3, isImputable: true }, // Can be debit or credit
];