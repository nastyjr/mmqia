import React from 'react';
import { JournalEntry } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import {
  Users,
  Book,
  Wallet,
  ShoppingBag,
  ShoppingCart,
  ArrowRight,
  Calculator,
  Landmark,
  Briefcase,
  FileSpreadsheet,
  DollarSign,
  LogOut,
  ScrollText,
  PieChart,
  Building2,
  Globe2,
  ShieldCheck,
  Package,
  Repeat,
  FileText,
  Truck,
  Database
} from 'lucide-react';
import { ExecutiveDashboard } from './ExecutiveDashboard';
import { AppView } from '../types';
import { AnomalyWidget } from './AnomalyWidget';

interface DashboardProps {
  entries: JournalEntry[];
  onNavigate: (view: AppView) => void;
  onMigrate?: () => void;
  // Legacy props kept for compatibility if needed, but made optional
  onViewJournal?: () => void;
  onViewInsights?: () => void;
}

// Tile Component
const ModuleTile = ({ title, subtitle, icon, colorClass, onClick, active = true }: any) => (
  <button
    onClick={onClick}
    disabled={!active}
    className={`p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-left group relative overflow-hidden ${active ? 'bg-white hover:-translate-y-1' : 'bg-slate-50 opacity-60 cursor-not-allowed'
      }`}
  >
    <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${colorClass.replace('bg-', 'text-')}`}>
      {React.cloneElement(icon, { size: 48 })}
    </div>
    <div className={`w-10 h-10 rounded-lg ${colorClass} text-white flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform`}>
      {React.cloneElement(icon, { size: 20 })}
    </div>
    <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
    <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
  </button>
);

// Section Header Component
const SectionTitle: React.FC<{ title: string; badge?: string }> = ({ title, badge }) => (
  <div className="flex items-center mb-4 mt-8 first:mt-0">
    <div className="h-6 w-1 bg-indigo-600 rounded-full mr-3"></div>
    <h2 className="text-base font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
      {title}
      {badge && <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full">{badge}</span>}
    </h2>
    <div className="h-px bg-gray-200 flex-grow ml-4"></div>
  </div>
);

const formatCLP = (value: number) => {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
};

export const Dashboard: React.FC<DashboardProps> = ({
  entries,
  onNavigate,
  onMigrate
}) => {

  // Compatibility fallback in case entries is undefined
  const safeEntries = entries || [];

  const income = safeEntries.filter(t => t.type === 'ingreso').reduce((acc, t) => acc + t.total, 0);
  const expenses = safeEntries.filter(t => t.type === 'egreso').reduce((acc, t) => acc + t.total, 0);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const chartData = last7Days.map(dateStr => {
    // Robust date matching
    const d = new Date(dateStr);
    d.setMinutes(d.getMinutes() + d.getTimezoneOffset()); // Adjust to local day

    const dayIncome = safeEntries.filter(t => {
      const tDate = new Date(t.date.length === 10 ? t.date + 'T12:00:00' : t.date);
      return tDate.getDate() === d.getDate() && tDate.getMonth() === d.getMonth() && tDate.getFullYear() === d.getFullYear() && t.type === 'ingreso';
    }).reduce((sum, t) => sum + t.total, 0);

    const dayExpense = safeEntries.filter(t => {
      const tDate = new Date(t.date.length === 10 ? t.date + 'T12:00:00' : t.date);
      return tDate.getDate() === d.getDate() && tDate.getMonth() === d.getMonth() && tDate.getFullYear() === d.getFullYear() && t.type === 'egreso';
    }).reduce((sum, t) => sum + t.total, 0);

    return {
      name: d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric' }),
      ingresos: dayIncome,
      egresos: dayExpense
    };
  });

  return (
    <div className="animate-in fade-in duration-500 pb-12">



      {/* Anomaly Detection Widget */}
      <AnomalyWidget />

      {/* NEW Executive Dashboard */}
      <ExecutiveDashboard />

      {/* Main Grid Layout */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 shadow-inner mb-10">

        {/* Régimen General */}
        <SectionTitle title="Contabilidad Completa" badge="Régimen 14 A / 14 D3 Opción" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <ModuleTile
            title="Libro Diario"
            subtitle="Asientos Contables"
            icon={<Book />}
            colorClass="bg-blue-600"
            onClick={() => onNavigate('JOURNAL')}
          />
          <ModuleTile
            title="Libro Mayor"
            subtitle="Saldos por Cuenta"
            icon={<Landmark />}
            colorClass="bg-blue-600"
            onClick={() => onNavigate('LIBRO_MAYOR')}
          />
          <ModuleTile
            title="Balance 8 Col."
            subtitle="Tributario"
            icon={<FileSpreadsheet />}
            colorClass="bg-blue-600"
            onClick={() => onNavigate('BALANCE_8_COL')}
          />
          <ModuleTile
            title="Inv. y Balances"
            subtitle="Activos y Pasivos"
            icon={<Wallet />}
            colorClass="bg-blue-600"
          />
          <ModuleTile
            title="Conciliación"
            subtitle="Bancaria"
            icon={<Building2 />}
            colorClass="bg-indigo-500"
            onClick={() => onNavigate('BANK_RECONCILIATION')}
          />
        </div>

        {/* Régimen Simplificado */}
        <SectionTitle title="Contabilidad Simplificada" badge="Régimen Pro Pyme 14 D3 / 14 D8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <ModuleTile
            title="Libro de Caja"
            subtitle="Flujo de Efectivo"
            icon={<DollarSign />}
            colorClass="bg-emerald-600"
            onClick={() => onNavigate('LIBRO_CAJA')}
          />
          <ModuleTile
            title="Ingresos y Egresos"
            subtitle="Control Simple"
            icon={<ScrollText />}
            colorClass="bg-emerald-600"
          />
          <ModuleTile
            title="Inventario (Kardex)"
            subtitle="Control de Stock"
            icon={<Package />}
            colorClass="bg-emerald-600"
            onClick={() => onNavigate('INVENTORY')}
          />
          <ModuleTile
            title="Órdenes de Compra"
            subtitle="Gestión OC"
            icon={<Truck />}
            colorClass="bg-blue-600"
            onClick={() => onNavigate('PURCHASE_ORDERS')}
          />
          <ModuleTile
            title="Facturación"
            subtitle="Emitir DTE"
            icon={<FileText />}
            colorClass="bg-purple-600"
            onClick={() => onNavigate('INVOICING')}
          />
          <ModuleTile
            title="Cotizaciones"
            subtitle="Presupuestos"
            icon={<FileText />}
            colorClass="bg-indigo-600"
            onClick={() => onNavigate('QUOTES')}
          />
          <ModuleTile
            title="Terceros (CRM)"
            subtitle="Clientes y Prov."
            icon={<Users />}
            colorClass="bg-blue-600"
            onClick={() => onNavigate('CRM')}
          />
          <ModuleTile
            title="Conciliación Bancaria"
            subtitle="Matching Auto"
            icon={<Building2 />}
            colorClass="bg-indigo-600"
            onClick={() => onNavigate('BANK_RECONCILIATION')}
          />
          <ModuleTile
            title="Estado de Resultado"
            subtitle="Pérdidas y Ganancias"
            icon={<PieChart />}
            colorClass="bg-emerald-600"
            onClick={() => onNavigate('ESTADO_RESULTADOS')}
          />
        </div>

        {/* Enterprise Control - NEW */}
        <SectionTitle title="Control Empresarial" badge="SAP LEVEL" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ModuleTile
            title="Control Presupuestario"
            subtitle="Budget vs Real"
            icon={<DollarSign />}
            colorClass="bg-purple-600"
            onClick={() => onNavigate('BUDGET_CONTROL')}
          />
          <ModuleTile
            title="Cierre de Períodos"
            subtitle="Bloqueo Mensual"
            icon={<ScrollText />}
            colorClass="bg-slate-700"
            onClick={() => onNavigate('PERIOD_CLOSING')}
          />
          <ModuleTile
            title="Auditoría"
            subtitle="Log de Cambios"
            icon={<ShieldCheck />}
            colorClass="bg-rose-600"
            onClick={() => onNavigate('AUDIT_LOG')}
          />
          <ModuleTile
            title="Guías Despacho"
            subtitle="Traslado Mercadería"
            icon={<Truck />}
            colorClass="bg-emerald-600"
            onClick={() => onNavigate('DISPATCH_GUIDES')}
          />
          <ModuleTile
            title="Gestión Usuarios"
            subtitle="Roles y Permisos"
            icon={<Users />}
            colorClass="bg-purple-600"
            onClick={() => onNavigate('USER_MANAGEMENT')}
          />
          <ModuleTile
            title="Antigüedad Saldos"
            subtitle="CxC / CxP"
            icon={<Wallet />}
            colorClass="bg-indigo-600"
            onClick={() => onNavigate('AGING_REPORT')}
          />
          <ModuleTile
            title="Migrar BD"
            subtitle="Pasar a la Nube"
            icon={<Database />}
            colorClass="bg-slate-800"
            onClick={() => onMigrate && onMigrate()}
          />
        </div>

        {/* Inteligencia Tributaria */}
        <SectionTitle title="Inteligencia Tributaria" badge="NUEVO" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ModuleTile
            title="Radar SII"
            subtitle="Auditoría Automática"
            icon={<ShieldCheck />}
            colorClass="bg-indigo-600"
            onClick={() => onNavigate('TAX_COMPLIANCE')}
          />
        </div>

        {/* Recursos Humanos */}
        <SectionTitle title="Recursos Humanos (RRHH)" badge="Nómina" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ModuleTile
            title="Generador Liquidaciones"
            subtitle="Cálculo Automático"
            icon={<Calculator />}
            colorClass="bg-pink-600"
            onClick={() => onNavigate('PAYROLL_GENERATOR')}
          />
          <ModuleTile
            title="Ficha Colaboradores"
            subtitle="Gestión de Personal"
            icon={<Users />}
            colorClass="bg-pink-600"
            onClick={() => onNavigate('EMPLOYEES')}
          />
          <ModuleTile
            title="Libro Remuneraciones"
            subtitle="LRE (Histórico)"
            icon={<FileText />}
            colorClass="bg-pink-600"
            onClick={() => onNavigate('LIBRO_REMUNERACIONES')}
          />
        </div>

        {/* Auxiliares Tributarios */}
        <SectionTitle title="Libros Auxiliares Tributarios" badge="Obligatorios SII" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <ModuleTile
            title="Compra y Venta"
            subtitle="IEC (F29)"
            icon={<ShoppingBag />}
            colorClass="bg-orange-600"
            onClick={() => onNavigate('LIBRO_COMPRA_VENTA')}
          />
          <ModuleTile
            title="Retenciones"
            subtitle="Boletas Honorarios"
            icon={<Briefcase />}
            colorClass="bg-orange-600"
            onClick={() => onNavigate('LIBRO_RETENCIONES')}
          />
          <ModuleTile
            title="Registro RRE"
            subtitle="Rentas Empresariales"
            icon={<Book />}
            colorClass="bg-rose-600"
            onClick={() => onNavigate('LIBRO_RRE')}
          />
          <ModuleTile
            title="Activo Fijo"
            subtitle="Depreciaciones"
            icon={<Calculator />}
            colorClass="bg-slate-600"
            onClick={() => onNavigate('ACTIVO_FIJO')}
          />
        </div>

        {/* Normas IFRS */}
        <SectionTitle title="Normas Internacionales" badge="IFRS / NIIF" />
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <ModuleTile
            title="Estados Financieros"
            subtitle="Situación Financiera"
            icon={<Globe2 />}
            colorClass="bg-purple-600"
            onClick={() => onNavigate('ESTADOS_IFRS')}
          />
          <ModuleTile
            title="Notas Explicativas"
            subtitle="Revelaciones"
            icon={<ScrollText />}
            colorClass="bg-purple-600"
          />
          <ModuleTile
            title="Corrección Monetaria"
            subtitle="Ajustes IPC"
            icon={<Calculator />}
            colorClass="bg-purple-600"
          />
        </div>
      </div>

      {/* Financial Summary Section (Bottom) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Resumen Financiero Rápido</h3>
            <p className="text-gray-500 text-sm">Visión general de los últimos 7 días</p>
          </div>
          <div className="flex gap-4 mt-4 md:mt-0">
            <div className="px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
              <span className="text-xs text-emerald-600 font-bold uppercase">Ingresos</span>
              <div className="text-lg font-bold text-emerald-700">{formatCLP(income)}</div>
            </div>
            <div className="px-4 py-2 bg-rose-50 rounded-lg border border-rose-100">
              <span className="text-xs text-rose-600 font-bold uppercase">Egresos</span>
              <div className="text-lg font-bold text-rose-700">{formatCLP(expenses)}</div>
            </div>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-slate-800 mb-4">Flujo de Caja</h3>

        <div className="w-full overflow-x-auto">
          <BarChart width={1000} height={350} data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickFormatter={(value) => `$${value / 1000}k`}
            />
            <Tooltip
              formatter={(value: number) => formatCLP(value)}
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              cursor={{ fill: '#f8fafc' }}
            />
            <Bar
              dataKey="ingresos"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              name="Ingresos"
              barSize={45}
            />
            <Bar
              dataKey="egresos"
              fill="#f43f5e"
              radius={[4, 4, 0, 0]}
              name="Egresos"
              barSize={45}
            />
          </BarChart>
        </div>
      </div>
    </div>
  );
};