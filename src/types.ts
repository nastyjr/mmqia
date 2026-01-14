
export type TransactionType = 'ingreso' | 'egreso' | 'traspaso';

export interface Account {
  code: string;
  name: string;
  type: 'Activo' | 'Pasivo' | 'Patrimonio' | 'Ingresos' | 'Costos' | 'Gastos';
  level: number; // 1: Titulo, 2: Subtitulo, 3: Imputable
  isImputable: boolean; // Si se puede usar en asientos
  description?: string; // Explicación simple para usuarios no contadores
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

// Plan de Cuentas MIPYME - SII Chile (Manual Oficial 2026)
// Actualizado conforme normativa tributaria vigente
export const INITIAL_ACCOUNTS: Account[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // 1. ACTIVOS
  // ═══════════════════════════════════════════════════════════════════════
  { code: '1', name: 'ACTIVOS', type: 'Activo', level: 1, isImputable: false },

  // 1.1 ACTIVO CIRCULANTE
  { code: '1.1', name: 'ACTIVO CIRCULANTE', type: 'Activo', level: 2, isImputable: false },
  { code: '1.1.10.1', name: 'Caja', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.20.1', name: 'Banco', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.30.1', name: 'Insumos', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.40.1', name: 'Productos en Proceso', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.50.1', name: 'Mercaderías', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.60.1', name: 'Depósito a Plazo', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.70.1', name: 'Valores Negociables', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.80.1', name: 'Deudores por Ventas', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.90.1', name: 'Documentos por Cobrar', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.100.1', name: 'Documentos por Cobrar de Terceros', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.110.1', name: 'Documentos y Cuentas por Cobrar a Empresas Relacionadas', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.120.1', name: 'Documentos y Cuentas por Cobrar a Empresas No Relacionadas', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.130.1', name: 'Estimación Deudores Incobrable (Provisión)', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.140.1', name: 'Deudores Varios', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.150.1', name: 'Anticipo Remuneraciones', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.160.1', name: 'Préstamos a Trabajadores', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.170.1', name: 'Otros Descuentos de Remuneraciones', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.180.1', name: 'Préstamos a Socio (Empresario)', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.190.1', name: 'Cuenta Corriente Consignatario', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.200.1', name: 'Impuestos por Recuperar', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.210.1', name: 'Impuesto Específico Combustible', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.220.1', name: 'IVA Créditos', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.230.1', name: 'Crédito Impuesto Ley 18.211', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.240.1', name: 'Crédito Impuesto Específico', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.250.1', name: 'Crédito Impuesto Adicional', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.260.1', name: 'Impuestos Diferidos', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.270.1', name: 'Gastos Pagados por Anticipado', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.280.1', name: 'Otros Activos Circulantes', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.290.1', name: 'Contratos Leasing', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.300.1', name: 'Activos para Leasing', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.310.1', name: 'Pago Provisional Mensual (PPM)', type: 'Activo', level: 3, isImputable: true },

  // 1.2 ACTIVO FIJO
  { code: '1.2', name: 'ACTIVO FIJO', type: 'Activo', level: 2, isImputable: false },
  { code: '1.2.10.1', name: 'Terrenos', type: 'Activo', level: 3, isImputable: true },
  { code: '1.2.20.1', name: 'Construcciones y Obras de Infraestructura', type: 'Activo', level: 3, isImputable: true },
  { code: '1.2.30.1', name: 'Maquinarias y Equipos', type: 'Activo', level: 3, isImputable: true },
  { code: '1.2.40.1', name: 'Muebles y Útiles', type: 'Activo', level: 3, isImputable: true },
  { code: '1.2.50.1', name: 'Activos en Leasing', type: 'Activo', level: 3, isImputable: true },
  { code: '1.2.60.1', name: 'Otros Activos Fijos', type: 'Activo', level: 3, isImputable: true },
  { code: '1.2.70.1', name: 'Mayor Valor Retasación Técnica del Activo Fijo', type: 'Activo', level: 3, isImputable: true },
  { code: '1.2.80.1', name: 'Depreciación Acumulada', type: 'Activo', level: 3, isImputable: true },

  // 1.3 OTROS ACTIVOS
  { code: '1.3', name: 'OTROS ACTIVOS', type: 'Activo', level: 2, isImputable: false },
  { code: '1.3.10.1', name: 'Cuentas Particulares', type: 'Activo', level: 3, isImputable: true },
  { code: '1.3.20.1', name: 'Inversión en Empresas Relacionadas', type: 'Activo', level: 3, isImputable: true },
  { code: '1.3.30.1', name: 'Inversión en Otras Sociedades', type: 'Activo', level: 3, isImputable: true },
  { code: '1.3.40.1', name: 'Deudores Largo Plazo', type: 'Activo', level: 3, isImputable: true },
  { code: '1.3.50.1', name: 'Documentos y Cuentas por Cobrar a Empresas Relacionadas Largo Plazo', type: 'Activo', level: 3, isImputable: true },
  { code: '1.3.60.1', name: 'Impuestos Diferidos Largo Plazo', type: 'Activo', level: 3, isImputable: true },
  { code: '1.3.70.1', name: 'Intangibles', type: 'Activo', level: 3, isImputable: true },
  { code: '1.3.80.1', name: 'Otros Activos', type: 'Activo', level: 3, isImputable: true },
  { code: '1.3.90.1', name: 'Otros Activos Trabajadores', type: 'Activo', level: 3, isImputable: true },
  { code: '1.3.100.1', name: 'Contratos de Leasing de Largo Plazo', type: 'Activo', level: 3, isImputable: true },
  { code: '1.3.110.1', name: 'Inversión Ley Arica', type: 'Activo', level: 3, isImputable: true },
  { code: '1.3.120.1', name: 'Inversión Ley Austral', type: 'Activo', level: 3, isImputable: true },
  { code: '1.3.130.1', name: 'Amortización (Acumulada)', type: 'Activo', level: 3, isImputable: true },

  // ═══════════════════════════════════════════════════════════════════════
  // 2. PASIVOS
  // ═══════════════════════════════════════════════════════════════════════
  { code: '2', name: 'PASIVOS', type: 'Pasivo', level: 1, isImputable: false },

  // 2.1 PASIVO CIRCULANTE
  { code: '2.1', name: 'PASIVO CIRCULANTE', type: 'Pasivo', level: 2, isImputable: false },
  { code: '2.1.10.1', name: 'Obligaciones con Bancos e Instituciones Financieras', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.1.20.1', name: 'Obligaciones con el Público (Pagarés)', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.1.30.1', name: 'Cuentas y Documentos por Pagar', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.1.40.1', name: 'Documentos y Cuentas por Pagar Empresas Relacionadas', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.1.50.1', name: 'Documentos y Cuentas por Pagar Empresas No Relacionadas', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.1.60.1', name: 'Cuenta Corriente Comitente', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.1.70.1', name: 'Acreedores Varios', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.1.80.1', name: 'Obligaciones por Leasing Porción C/P', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.1.90.1', name: 'Intereses Diferidos por Leasing', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.1.100.1', name: 'Provisiones', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.1.110.1', name: 'Remuneraciones por Pagar', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.1.120.1', name: 'Entidades Previsionales por Pagar', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.1.130.1', name: 'Impuesto Único por Pagar', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.1.140.1', name: 'Retenciones por Pagar', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.1.150.1', name: 'Impuesto a la Renta por Pagar', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.1.160.1', name: 'Otros Impuestos por Pagar', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.1.170.1', name: 'IVA Débitos', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.1.180.1', name: 'Impuesto Adicional Débitos', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.1.190.1', name: 'Impuesto Ley 18.211 Débitos', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.1.200.1', name: 'Impuestos Diferidos', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.1.210.1', name: 'Ingresos Percibidos por Adelantado', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.1.220.1', name: 'Depósitos Garantía de Envases', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.1.230.1', name: 'Otros Pasivos Circulantes', type: 'Pasivo', level: 3, isImputable: true },

  // 2.2 PASIVO LARGO PLAZO
  { code: '2.2', name: 'PASIVO LARGO PLAZO', type: 'Pasivo', level: 2, isImputable: false },
  { code: '2.2.10.1', name: 'Obligaciones con Bancos e Inst. Financieras L/P', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.2.20.1', name: 'Obligaciones con el Público Largo Plazo (Bonos)', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.2.30.1', name: 'Cuentas y Documentos por Pagar L/P', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.2.40.1', name: 'Acreedores Varios L/P', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.2.50.1', name: 'Obligaciones por Leasing Porción L/P', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.2.60.1', name: 'Documentos y Cuentas por Pagar a Empresas Relacionadas L/P', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.2.70.1', name: 'Impuestos Diferidos L/P', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.2.80.1', name: 'Otros Pasivos Largo Plazo', type: 'Pasivo', level: 3, isImputable: true },

  // ═══════════════════════════════════════════════════════════════════════
  // 3. PATRIMONIO
  // ═══════════════════════════════════════════════════════════════════════
  { code: '3', name: 'PATRIMONIO', type: 'Patrimonio', level: 1, isImputable: false },

  // 3.1 CAPITAL
  { code: '3.1', name: 'CAPITAL', type: 'Patrimonio', level: 2, isImputable: false },
  { code: '3.1.10.1', name: 'Capital Pagado', type: 'Patrimonio', level: 3, isImputable: true },
  { code: '3.1.20.1', name: 'Reserva Revalorización Capital Propio', type: 'Patrimonio', level: 3, isImputable: true },
  { code: '3.1.30.1', name: 'Otras Reservas', type: 'Patrimonio', level: 3, isImputable: true },
  { code: '3.1.40.1', name: 'Cuenta Obligada Socio', type: 'Patrimonio', level: 3, isImputable: true },

  // 3.2 UTILIDADES/PÉRDIDAS
  { code: '3.2', name: 'RESULTADOS ACUMULADOS', type: 'Patrimonio', level: 2, isImputable: false },
  { code: '3.2.10.1', name: 'Utilidades Acumuladas', type: 'Patrimonio', level: 3, isImputable: true },
  { code: '3.2.20.1', name: 'Pérdidas Acumuladas', type: 'Patrimonio', level: 3, isImputable: true },
  { code: '3.2.30.1', name: 'Utilidad del Ejercicio', type: 'Patrimonio', level: 3, isImputable: true },
  { code: '3.2.40.1', name: 'Pérdida y Ganancia', type: 'Patrimonio', level: 3, isImputable: true },

  // ═══════════════════════════════════════════════════════════════════════
  // 4. RESULTADO (INGRESOS, COSTOS, GASTOS)
  // ═══════════════════════════════════════════════════════════════════════
  { code: '4', name: 'RESULTADO', type: 'Ingresos', level: 1, isImputable: false },

  // 4.1 INGRESOS DE EXPLOTACIÓN
  { code: '4.1', name: 'INGRESOS DE EXPLOTACIÓN', type: 'Ingresos', level: 2, isImputable: false },
  { code: '4.1.10.1', name: 'Ingreso por Ventas de Bienes y Servicios del Giro', type: 'Ingresos', level: 3, isImputable: true },
  { code: '4.1.20.1', name: 'Otros Ingresos del Giro', type: 'Ingresos', level: 3, isImputable: true },

  // 4.2 COSTOS DE EXPLOTACIÓN
  { code: '4.2', name: 'COSTOS DE EXPLOTACIÓN', type: 'Costos', level: 2, isImputable: false },
  { code: '4.2.10.1', name: 'Costos Directo por Ventas de Bienes y Servicios del Giro', type: 'Costos', level: 3, isImputable: true },
  { code: '4.2.20.1', name: 'Otros Costos Directos del Giro', type: 'Costos', level: 3, isImputable: true },

  // 4.3 GASTOS ADMINISTRACIÓN Y VENTA
  { code: '4.3', name: 'GASTOS ADMINISTRACIÓN Y VENTA', type: 'Gastos', level: 2, isImputable: false },
  { code: '4.3.10.1', name: 'Gastos Generales', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.3.20.1', name: 'Contribuciones', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.3.30.1', name: 'Deudores Incobrables', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.3.40.1', name: 'Reparaciones Automóviles', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.3.50.1', name: 'Gastos de Organización y Puesta en Marcha', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.3.60.1', name: 'Gastos de Investigación y Desarrollo', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.3.70.1', name: 'Sueldos (Remuneraciones)', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.3.80.1', name: 'Aporte Patronal', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.3.90.1', name: 'Honorarios', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.3.100.1', name: 'Sueldo Empresarial', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.3.110.1', name: 'Depreciación', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.3.120.1', name: 'Amortización', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.3.130.1', name: 'Mermas (Castigo de Mercaderías)', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.3.140.1', name: 'Gasto Promoción', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.3.150.1', name: 'Otros Gastos de Administración y Venta', type: 'Gastos', level: 3, isImputable: true },

  // 4.4 OTROS INGRESOS FUERA DE EXPLOTACIÓN
  { code: '4.4', name: 'OTROS INGRESOS FUERA DE EXPLOTACIÓN', type: 'Ingresos', level: 2, isImputable: false },
  { code: '4.4.10.1', name: 'Ingresos Financieros', type: 'Ingresos', level: 3, isImputable: true },
  { code: '4.4.20.1', name: 'Utilidad Inversión en Empresas Relacionadas', type: 'Ingresos', level: 3, isImputable: true },
  { code: '4.4.30.1', name: 'Rentas de Fuente Extranjera', type: 'Ingresos', level: 3, isImputable: true },
  { code: '4.4.40.1', name: 'Dividendos Percibidos', type: 'Ingresos', level: 3, isImputable: true },
  { code: '4.4.50.1', name: 'Ingresos No Renta', type: 'Ingresos', level: 3, isImputable: true },
  { code: '4.4.60.1', name: 'Rentas Exentas Impuesto 1° Categoría', type: 'Ingresos', level: 3, isImputable: true },
  { code: '4.4.70.1', name: 'Rentas Afectas a Impuesto Único de 1° Categoría', type: 'Ingresos', level: 3, isImputable: true },
  { code: '4.4.80.1', name: 'Rentas por Arriendos de Bienes Raíces Agrícolas', type: 'Ingresos', level: 3, isImputable: true },
  { code: '4.4.90.1', name: 'Rentas por Bienes Raíces No Agrícolas', type: 'Ingresos', level: 3, isImputable: true },
  { code: '4.4.100.1', name: 'Otras Rentas Afectas a Impuesto de 1° Categoría', type: 'Ingresos', level: 3, isImputable: true },
  { code: '4.4.110.1', name: 'Comisiones Percibidas', type: 'Ingresos', level: 3, isImputable: true },
  { code: '4.4.120.1', name: 'Ingresos Fuera de Explotación', type: 'Ingresos', level: 3, isImputable: true },
  { code: '4.4.130.1', name: 'Ajuste Ejercicio Anterior', type: 'Ingresos', level: 3, isImputable: true },
  { code: '4.4.140.1', name: 'Corrección Monetaria', type: 'Ingresos', level: 3, isImputable: true },
  { code: '4.4.150.1', name: 'Diferencia por Tipo de Cambio', type: 'Ingresos', level: 3, isImputable: true },

  // 4.5 EGRESOS FUERA DE EXPLOTACIÓN
  { code: '4.5', name: 'EGRESOS FUERA DE EXPLOTACIÓN', type: 'Gastos', level: 2, isImputable: false },
  { code: '4.5.10.1', name: 'Gastos Financieros', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.5.20.1', name: 'Comisiones Pagadas', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.5.30.1', name: 'Pérdida Inversión en Empresas Relacionadas', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.5.40.1', name: 'Costos y Gastos por Rentas Fuentes Extranjeras', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.5.50.1', name: 'Otros Egresos Fuera de Explotación', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.5.60.1', name: 'Pérdida por Financiamiento (Operaciones en Leasing)', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.5.70.1', name: 'Gastos Aceptado por Donaciones para Fines Sociales', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.5.80.1', name: 'Gastos Aceptado por Donaciones para Fines Políticos', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.5.90.1', name: 'Gasto Aceptado por Donaciones Art. N° 10 Ley 19.885', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.5.100.1', name: 'Donaciones Escasos Recursos Art. 46 DL 3063', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.5.110.1', name: 'Donaciones sin Beneficios Tributarios', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.5.120.1', name: 'Otras Donaciones', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.5.130.1', name: 'Provisiones', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.5.140.1', name: 'Impuestos No Recuperables', type: 'Gastos', level: 3, isImputable: true },

  // 4.6 IMPUESTO A LA RENTA
  { code: '4.6', name: 'IMPUESTO A LA RENTA', type: 'Gastos', level: 2, isImputable: false },
  { code: '4.6.10.1', name: 'Provisión Impuesto a la Renta', type: 'Gastos', level: 3, isImputable: true },

  // ═══════════════════════════════════════════════════════════════════════
  // CUENTAS NUEVAS 2024-2026 - Actualizaciones Normativas
  // Ley 21.713 (2024), Ley 21.210 (2020), Pro Pyme 14D, Activos Digitales
  // ═══════════════════════════════════════════════════════════════════════

  // ACTIVOS - Nuevos 2024-2026
  { code: '1.1.320.1', name: 'Activos Digitales (Criptoactivos)', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.330.1', name: 'Crédito Fiscal Pro Pyme 14D', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.340.1', name: 'PPM Tasa Reducida Pro Pyme (12.5%)', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.350.1', name: 'Crédito por Capacitación SENCE', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.360.1', name: 'Crédito Inversión en I+D (Ley 20.241)', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.370.1', name: 'Crédito Activo Fijo PYME', type: 'Activo', level: 3, isImputable: true },
  { code: '1.1.380.1', name: 'IVA Exportador por Recuperar', type: 'Activo', level: 3, isImputable: true },
  { code: '1.3.140.1', name: 'Inversión Fondos Mutuos y de Inversión', type: 'Activo', level: 3, isImputable: true },
  { code: '1.3.150.1', name: 'Participación en Cuotas de Fondos', type: 'Activo', level: 3, isImputable: true },

  // PASIVOS - Nuevos 2024-2026
  { code: '2.1.240.1', name: 'Retención Boletas de Honorarios (15.25% - 2026)', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.1.250.1', name: 'Impuesto Sustitutivo Vendedores Ambulantes (1.5%)', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.1.260.1', name: 'Cotización Seguro Cesantía AFC por Pagar', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.1.270.1', name: 'Cotización SIS (Seguro Invalidez y Sobrevivencia)', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.1.280.1', name: 'APV Colectivo por Pagar', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.1.290.1', name: 'Impuesto Adicional por Servicios Digitales', type: 'Pasivo', level: 3, isImputable: true },
  { code: '2.1.300.1', name: 'IVA Plataformas Digitales Extranjeras', type: 'Pasivo', level: 3, isImputable: true },

  // PATRIMONIO - Registros Pro Pyme 14D (Ley 21.210)
  { code: '3.3', name: 'REGISTROS TRIBUTARIOS PRO PYME', type: 'Patrimonio', level: 2, isImputable: false },
  { code: '3.3.10.1', name: 'RAI - Rentas Afectas a Impuestos', type: 'Patrimonio', level: 3, isImputable: true },
  { code: '3.3.20.1', name: 'REX - Rentas Exentas e Ingresos No Renta', type: 'Patrimonio', level: 3, isImputable: true },
  { code: '3.3.30.1', name: 'STUT - Saldo Total de Utilidades Tributables', type: 'Patrimonio', level: 3, isImputable: true },
  { code: '3.3.40.1', name: 'SAC - Saldo Acumulado de Créditos', type: 'Patrimonio', level: 3, isImputable: true },
  { code: '3.3.50.1', name: 'Diferencia Valor Libro vs Tributario', type: 'Patrimonio', level: 3, isImputable: true },

  // INGRESOS - Nuevos 2024-2026
  { code: '4.4.160.1', name: 'Ingresos por Operaciones con Activos Digitales', type: 'Ingresos', level: 3, isImputable: true },
  { code: '4.4.170.1', name: 'Ingresos por Servicios de Economía Digital', type: 'Ingresos', level: 3, isImputable: true },
  { code: '4.4.180.1', name: 'Rescate Fondos Mutuos y de Inversión', type: 'Ingresos', level: 3, isImputable: true },
  { code: '4.4.190.1', name: 'Utilidad en Venta de Activos Digitales', type: 'Ingresos', level: 3, isImputable: true },
  { code: '4.4.200.1', name: 'Ingresos por Staking/Mining Criptoactivos', type: 'Ingresos', level: 3, isImputable: true },
  { code: '4.4.210.1', name: 'Subsidio Empleo Pro Pyme', type: 'Ingresos', level: 3, isImputable: true },

  // GASTOS - Nuevos 2024-2026
  { code: '4.5.150.1', name: 'Pérdida en Operaciones con Activos Digitales', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.5.160.1', name: 'Gastos por Servicios Digitales Internacionales', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.5.170.1', name: 'Comisiones Plataformas Digitales', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.5.180.1', name: 'Cotización Patronal Seguro Cesantía (2.4%)', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.5.190.1', name: 'Cotización Patronal SIS (1.53%)', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.5.200.1', name: 'Gastos Rechazados Art. 21 LIR', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.5.210.1', name: 'Retiros Presuntos Art. 21 LIR', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.5.220.1', name: 'Multas e Intereses SII', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.5.230.1', name: 'Depreciación Instantánea Pro Pyme', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.5.240.1', name: 'Gasto por Diferencia Temporal Impuesto Diferido', type: 'Gastos', level: 3, isImputable: true },

  // IMPUESTOS - Nuevas tasas y regímenes 2026
  { code: '4.6.20.1', name: 'Impuesto 1° Categoría Pro Pyme (12.5% - 2026)', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.6.30.1', name: 'Impuesto Único sobre Activos Digitales', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.6.40.1', name: 'Impuesto Adicional Servicios Digitales No Residentes', type: 'Gastos', level: 3, isImputable: true },
  { code: '4.6.50.1', name: 'Impuesto Verde (Emisiones CO2)', type: 'Gastos', level: 3, isImputable: true },
];