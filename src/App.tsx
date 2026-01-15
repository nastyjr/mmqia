import React, { useState } from 'react';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { AccountingEntryForm } from './components/AccountingEntryForm';
import { LibroDiarioView } from './components/LibroDiarioView';
import { LibroMayorView } from './components/LibroMayorView';
import { PlanDeCuentasView } from './components/PlanDeCuentasView';
import { GenericBookView, ColumnDef } from './components/GenericBookView';
import { Formulario29View } from './components/Formulario29View';
import { FormularioF22, FormularioF50, DJ1887View, DJ1879View, DJ1926View } from './components/TaxForms';
import { SIIConnect } from './components/SIIConnect';
import { JournalEntry, AppView, INITIAL_ACCOUNTS } from './types';
import { PayrollProvider } from './context/PayrollContext';
import { EmployeeManager } from './components/EmployeeManager';
import { PayrollBookView } from './components/PayrollBookView';
import { InvoicingView } from './components/InvoicingView';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CompanyProvider } from './context/CompanyContext';
import { AccountingProvider, useAccounting } from './context/AccountingContext';
import { Layout } from './components/Layout';
import { IncomeStatement } from './components/IncomeStatement';
import { TaxComplianceRadar } from './components/TaxComplianceRadar';
import { BankReconciliation } from './components/BankReconciliation';
import { PayrollGenerator } from './components/PayrollGenerator';
import { FinancialInsights } from './components/FinancialInsights';
import { Balance8ColumnasView } from './components/Balance8ColumnasView';
import { FixedAssetsView } from './components/FixedAssetsView';
import { InventoryView } from './components/InventoryView';
import { CRMView } from './components/CRMView';
import { BankReconciliationView } from './components/BankReconciliationView';
import { IFRSFinancialStatementsView } from './components/IFRSFinancialStatementsView';
import { BudgetControlView } from './components/BudgetControlView';
import { PeriodClosingView } from './components/PeriodClosingView';
import { ForecastingView } from './components/ForecastingView';
import { LibroCompraVentaView } from './components/LibroCompraVentaView';
import { LibroCajaView } from './components/LibroCajaView';
import { AuditLogView } from './components/AuditLogView';
import { PurchaseOrdersView } from './components/PurchaseOrdersView';
import { OnboardingWizard } from './components/OnboardingWizard';
import { QuotesView } from './components/QuotesView';
import { DispatchGuidesView } from './components/DispatchGuidesView';
import { UserManagementView } from './components/UserManagementView';
import { AgingReportView } from './components/AgingReportView';
import { MigrationTool } from './components/MigrationTool';
import { AIAssistantWidget } from './components/AIAssistantWidget';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { RentaLiquidaView } from './components/RentaLiquidaView';
import { CapitalPropioView } from './components/CapitalPropioView';

// --- COLUMN DEFINITIONS FOR BOOKS ---

const COLS_CAJA: ColumnDef[] = [
  { header: 'Fecha', key: 'date', width: '100px' },
  { header: 'N° Comprobante', key: 'id', width: '120px' },
  { header: 'Glosa / Detalle', key: 'glosa', width: '300px' },
  { header: 'Ingresos ($)', key: 'income', isNumeric: true, width: '120px' },
  { header: 'Egresos ($)', key: 'expense', isNumeric: true, width: '120px' },
  { header: 'Saldo ($)', key: 'balance', isNumeric: true, width: '120px' }
];

const COLS_MAYOR: ColumnDef[] = [
  { header: 'Código', key: 'code', width: '100px' },
  { header: 'Cuenta Contable', key: 'name', width: '300px' },
  { header: 'Débitos ($)', key: 'debit', isNumeric: true, width: '120px' },
  { header: 'Créditos ($)', key: 'credit', isNumeric: true, width: '120px' },
  { header: 'Saldo Deudor', key: 'debtor', isNumeric: true, width: '120px' },
  { header: 'Saldo Acreedor', key: 'creditor', isNumeric: true, width: '120px' }
];

const COLS_REMUNERACIONES: ColumnDef[] = [
  { header: 'Periodo', key: 'period', width: '80px' },
  { header: 'RUT', key: 'rut', width: '100px' },
  { header: 'Nombre Empleado', key: 'name', width: '200px' },
  { header: 'Días', key: 'days', isNumeric: true, width: '60px' },
  { header: 'Sueldo Base', key: 'base', isNumeric: true, width: '110px' },
  { header: 'Gratificación', key: 'bonus', isNumeric: true, width: '110px' },
  { header: 'Tot. Imponible', key: 'taxable', isNumeric: true, width: '110px' },
  { header: 'Salud (7%)', key: 'health', isNumeric: true, width: '100px' },
  { header: 'AFP', key: 'pension', isNumeric: true, width: '100px' },
  { header: 'AFC', key: 'afc', isNumeric: true, width: '80px' },
  { header: 'Impuesto Único', key: 'tax', isNumeric: true, width: '100px' },
  { header: 'Alcance Líquido', key: 'net', isNumeric: true, width: '120px' }
];

const COLS_COMPRA_VENTA: ColumnDef[] = [
  { header: 'Tipo Doc', key: 'docType', width: '80px' },
  { header: 'Folio', key: 'folio', width: '80px' },
  { header: 'Fecha', key: 'date', width: '100px' },
  { header: 'RUT', key: 'rut', width: '100px' },
  { header: 'Razón Social', key: 'name', width: '200px' },
  { header: 'Monto Exento', key: 'exempt', isNumeric: true, width: '110px' },
  { header: 'Monto Neto', key: 'net', isNumeric: true, width: '110px' },
  { header: 'IVA (19%)', key: 'vat', isNumeric: true, width: '110px' },
  { header: 'Total', key: 'total', isNumeric: true, width: '120px' }
];

const COLS_RETENCIONES: ColumnDef[] = [
  { header: 'Folio', key: 'folio', width: '80px' },
  { header: 'Fecha', key: 'date', width: '100px' },
  { header: 'RUT', key: 'rut', width: '100px' },
  { header: 'Nombre Prestador', key: 'name', width: '200px' },
  { header: 'Bruto ($)', key: 'gross', isNumeric: true, width: '120px' },
  { header: 'Retención (13.75%)', key: 'retention', isNumeric: true, width: '120px' },
  { header: 'Líquido ($)', key: 'net', isNumeric: true, width: '120px' }
];

const COLS_RRE: ColumnDef[] = [
  { header: 'Año Com.', key: 'year', width: '80px' },
  { header: 'Detalle', key: 'detail', width: '200px' },
  { header: 'RAI (Rentas Afectas)', key: 'rai', isNumeric: true, width: '130px' },
  { header: 'DDAN (Deprec.)', key: 'ddan', isNumeric: true, width: '130px' },
  { header: 'REX (Exentas)', key: 'rex', isNumeric: true, width: '130px' },
  { header: 'SAC (Créditos)', key: 'sac', isNumeric: true, width: '130px' },
  { header: 'STUT (Saldo Total)', key: 'stut', isNumeric: true, width: '130px' }
];

const COLS_ACTIVO_FIJO: ColumnDef[] = [
  { header: 'Código', key: 'code', width: '80px' },
  { header: 'Descripción', key: 'desc', width: '200px' },
  { header: 'Vida Útil (Meses)', key: 'life', isNumeric: true, width: '100px' },
  { header: 'Valor Compra', key: 'cost', isNumeric: true, width: '120px' },
  { header: 'Corr. Monetaria', key: 'cm', isNumeric: true, width: '120px' },
  { header: 'Dep. Ejercicio', key: 'dep', isNumeric: true, width: '120px' },
  { header: 'Valor Libro', key: 'bookVal', isNumeric: true, width: '120px' }
];

const COLS_IFRS: ColumnDef[] = [
  { header: 'Rubro / Clasificación', key: 'item', width: '300px' },
  { header: 'Nota', key: 'note', width: '60px' },
  { header: 'Año Actual ($)', key: 'current', isNumeric: true, width: '150px' },
  { header: 'Año Anterior ($)', key: 'previous', isNumeric: true, width: '150px' }
];


import { BankImport } from './components/BankImport';

import { initReactors } from './services/reactors';

const MainContent: React.FC = () => {
  const { user } = useAuth();
  const { journalEntries, saveEntry, deleteEntry } = useAccounting();
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSIIModalOpen, setIsSIIModalOpen] = useState(false);
  const [isBankImportOpen, setIsBankImportOpen] = useState(false);
  const [isMigrationOpen, setIsMigrationOpen] = useState(false);
  const [isSIIConnected, setIsSIIConnected] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | undefined>(undefined);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Initialize Reactors
  React.useEffect(() => {
    initReactors();
  }, []);

  // Check if onboarding should show
  React.useEffect(() => {
    const completed = localStorage.getItem('onboarding_completed');
    if (!completed) {
      setShowOnboarding(true);
    }
  }, []);

  if (!user) {
    return <Auth onLogin={() => { }} />;
  }

  const handleSaveEntry = async (newEntry: JournalEntry) => {
    try {
      await saveEntry(newEntry);
      setEditingEntry(undefined);
      setIsModalOpen(false);
    } catch (e) {
      // Error handling is inside saveEntry via alert, but we can add more UI feedback here
    }
  };

  return (
    <Layout
      currentView={currentView}
      setCurrentView={setCurrentView}
      onOpenNewEntry={() => setIsModalOpen(true)}
      onOpenSII={() => setIsSIIModalOpen(true)}
      onOpenBankImport={() => setIsBankImportOpen(true)}
      isSIIConnected={isSIIConnected}
    >
      {currentView === AppView.DASHBOARD && (
        <Dashboard
          entries={journalEntries}
          onNavigate={(view) => setCurrentView(view)}
          onMigrate={() => setIsMigrationOpen(true)}
        />
      )}

      {currentView === AppView.JOURNAL && (
        <LibroDiarioView
          entries={journalEntries}
          onNewEntry={() => setIsModalOpen(true)}
          onGoBack={() => setCurrentView(AppView.DASHBOARD)}
          onEditEntry={(entry) => {
            setEditingEntry(entry);
            setIsModalOpen(true);
          }}
          onDeleteEntry={async (id) => {
            try {
              await deleteEntry(id);
            } catch (e) {
              // Error already shown in context
            }
          }}
        />
      )}

      {currentView === AppView.COA && (
        <div className="space-y-4">
          <button onClick={() => setCurrentView(AppView.DASHBOARD)} className="text-sm text-slate-500 hover:text-slate-800 font-medium flex items-center">
            ← Volver al Inicio
          </button>
          <PlanDeCuentasView accounts={INITIAL_ACCOUNTS} />
        </div>
      )}

      {/* --- Declaraciones Juradas y Formularios --- */}

      {currentView === AppView.F29 && (
        <Formulario29View
          entries={journalEntries}
          onBack={() => setCurrentView(AppView.DASHBOARD)}
        />
      )}

      {currentView === AppView.F50 && (
        <FormularioF50 onBack={() => setCurrentView(AppView.DASHBOARD)} />
      )}

      {currentView === AppView.F22 && (
        <FormularioF22 onBack={() => setCurrentView(AppView.DASHBOARD)} />
      )}

      {currentView === AppView.DJ_1887 && (
        <DJ1887View onBack={() => setCurrentView(AppView.DASHBOARD)} />
      )}

      {currentView === AppView.DJ_1879 && (
        <DJ1879View onBack={() => setCurrentView(AppView.DASHBOARD)} />
      )}

      {currentView === AppView.DJ_1926 && (
        <DJ1926View onBack={() => setCurrentView(AppView.DASHBOARD)} />
      )}

      {/* --- Vistas de Libros Específicos --- */}

      {currentView === AppView.LIBRO_CAJA && (
        <LibroCajaView onBack={() => setCurrentView(AppView.DASHBOARD)} />
      )}

      {currentView === AppView.LIBRO_MAYOR && (
        <LibroMayorView
          entries={journalEntries}
          accounts={INITIAL_ACCOUNTS}
          onBack={() => setCurrentView(AppView.DASHBOARD)}
        />
      )}

      {currentView === AppView.LIBRO_REMUNERACIONES && (
        <GenericBookView
          title="Libro de Remuneraciones"
          subtitle="Cumplimiento Laboral (LRE - Dirección del Trabajo)"
          columns={COLS_REMUNERACIONES}
          data={journalEntries
            .filter(e => e.glosa.toLowerCase().includes('remuneración') || e.lines.some(l => l.accountId === '4.1.04'))
            .map(e => {
              // Heuristic mapping from the accounting entry back to columns
              const salary = e.lines.find(l => l.accountName.includes('Sueldos Base'))?.debit || 0;
              const grat = e.lines.find(l => l.accountName.includes('Gratificaciones'))?.debit || 0;
              const health = e.lines.find(l => l.accountName.includes('Instituciones Previsionales'))?.credit || 0;
              // Note: Health/AFP usually bunched in 2.1.04 in my simple generator, so this is approx
              return {
                period: new Date(e.date).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }),
                rut: 'N/A', // Not stored in entry header yet, would need parsing glosa or improvement
                name: e.glosa.split('-')[0] || 'Empleado',
                days: 30,
                base: salary.toLocaleString(),
                bonus: grat.toLocaleString(),
                taxable: (salary + grat).toLocaleString(),
                health: 0, // Hard to extract individual components from bundled line without metadata
                pension: 0,
                afc: 0,
                tax: e.lines.find(l => l.accountId === '2.1.05')?.credit.toLocaleString() || 0,
                net: e.lines.find(l => l.accountId === '2.1.06')?.credit.toLocaleString() || 0
              };
            })}
          onBack={() => setCurrentView(AppView.DASHBOARD)}
        />
      )}

      {currentView === AppView.LIBRO_COMPRA_VENTA && (
        <LibroCompraVentaView onBack={() => setCurrentView(AppView.DASHBOARD)} />
      )}

      {currentView === AppView.LIBRO_RETENCIONES && (
        <GenericBookView
          title="Libro de Retenciones"
          subtitle="Boletas de Honorarios Electrónicas"
          columns={COLS_RETENCIONES}
          data={journalEntries
            .filter(e => e.lines.some(l => l.accountId === '2.1.05' && e.glosa.toLowerCase().includes('honorarios')))
            .map(e => ({
              folio: 'S/N',
              date: e.date,
              rut: e.lines[0].rut || 'S/R',
              name: e.glosa,
              gross: e.total.toLocaleString(),
              retention: (e.lines.find(l => l.accountId === '2.1.05')?.credit || 0).toLocaleString(),
              net: (e.total - (e.lines.find(l => l.accountId === '2.1.05')?.credit || 0)).toLocaleString()
            }))}
          onBack={() => setCurrentView(AppView.DASHBOARD)}
        />
      )}

      {currentView === AppView.LIBRO_RRE && (
        <GenericBookView
          title="Registro de Rentas Empresariales (RRE)"
          subtitle="Control de Rentas Afectas, Exentas y Créditos (RAI, DDAN, REX, SAC)"
          columns={COLS_RRE}
          data={[]}
          onBack={() => setCurrentView(AppView.DASHBOARD)}
        />
      )}

      {currentView === AppView.ACTIVO_FIJO && (
        <FixedAssetsView onBack={() => setCurrentView(AppView.DASHBOARD)} />
      )}

      {currentView === AppView.INVENTORY && (
        <InventoryView onBack={() => setCurrentView(AppView.DASHBOARD)} />
      )}

      {currentView === AppView.CRM && (
        <CRMView onBack={() => setCurrentView(AppView.DASHBOARD)} />
      )}

      {currentView === AppView.BANK_RECONCILIATION && (
        <BankReconciliationView onBack={() => setCurrentView(AppView.DASHBOARD)} />
      )}

      {currentView === AppView.ESTADOS_IFRS && (
        <IFRSFinancialStatementsView onBack={() => setCurrentView(AppView.DASHBOARD)} />
      )}

      {currentView === AppView.ESTADO_RESULTADOS && (
        <IncomeStatement onBack={() => setCurrentView(AppView.DASHBOARD)} />
      )}

      {currentView === AppView.INSIGHTS && (
        <FinancialInsights onBack={() => setCurrentView(AppView.DASHBOARD)} />
      )}

      {currentView === AppView.BALANCE_8_COL && (
        <Balance8ColumnasView onBack={() => setCurrentView(AppView.DASHBOARD)} />
      )}

      {currentView === AppView.TAX_COMPLIANCE && (
        <TaxComplianceRadar onBack={() => setCurrentView(AppView.DASHBOARD)} />
      )}

      {currentView === AppView.BANK_RECONCILIATION && (
        <BankReconciliationView onBack={() => setCurrentView(AppView.DASHBOARD)} />
      )}

      {currentView === AppView.PAYROLL_GENERATOR && (
        <PayrollGenerator onBack={() => setCurrentView(AppView.DASHBOARD)} />
      )}

      {currentView === AppView.BUDGET_CONTROL && (
        <BudgetControlView onBack={() => setCurrentView(AppView.DASHBOARD)} />
      )}

      {currentView === AppView.PERIOD_CLOSING && (
        <PeriodClosingView onBack={() => setCurrentView(AppView.DASHBOARD)} />
      )}

      {currentView === AppView.FORECASTING && (
        <ForecastingView onBack={() => setCurrentView(AppView.DASHBOARD)} />
      )}

      {currentView === AppView.EMPLOYEES && (
        <EmployeeManager onBack={() => setCurrentView(AppView.DASHBOARD)} />
      )}

      {currentView === AppView.LIBRO_REMUNERACIONES && (
        <PayrollBookView onBack={() => setCurrentView(AppView.DASHBOARD)} />
      )}

      {currentView === AppView.INVOICING && (
        <InvoicingView onBack={() => setCurrentView(AppView.DASHBOARD)} />
      )}

      {/* Modals */}
      <AccountingEntryForm
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEntry(undefined);
        }}
        onSave={handleSaveEntry}
        accounts={INITIAL_ACCOUNTS}
        initialData={editingEntry}
      />

      {currentView === AppView.AUDIT_LOG && (
        <AuditLogView onBack={() => setCurrentView(AppView.DASHBOARD)} />
      )}

      {currentView === AppView.PURCHASE_ORDERS && (
        <PurchaseOrdersView onBack={() => setCurrentView(AppView.DASHBOARD)} />
      )}

      {currentView === AppView.QUOTES && (
        <QuotesView onBack={() => setCurrentView(AppView.DASHBOARD)} />
      )}

      {currentView === AppView.DISPATCH_GUIDES && (
        <DispatchGuidesView onBack={() => setCurrentView(AppView.DASHBOARD)} />
      )}

      {currentView === AppView.USER_MANAGEMENT && (
        <UserManagementView onBack={() => setCurrentView(AppView.DASHBOARD)} />
      )}

      {currentView === AppView.AGING_REPORT && (
        <AgingReportView onBack={() => setCurrentView(AppView.DASHBOARD)} />
      )}

      {currentView === AppView.EXECUTIVE_DASHBOARD && (
        <ExecutiveDashboard />
      )}

      {currentView === AppView.RENTA_LIQUIDA && (
        <RentaLiquidaView onBack={() => setCurrentView(AppView.DASHBOARD)} />
      )}

      {currentView === AppView.CAPITAL_PROPIO && (
        <CapitalPropioView onBack={() => setCurrentView(AppView.DASHBOARD)} />
      )}

      <SIIConnect
        isOpen={isSIIModalOpen}
        onClose={() => setIsSIIModalOpen(false)}
        onConnect={(status) => setIsSIIConnected(status)}
        isConnected={isSIIConnected}
      />

      {/* Hidden trigger for migration - can lead to a settings page later */}
      {isMigrationOpen && (
        <MigrationTool onClose={() => setIsMigrationOpen(false)} />
      )}

      {isBankImportOpen && (
        <BankImport onClose={() => setIsBankImportOpen(false)} />
      )}

      <OnboardingWizard
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onNavigate={(view) => {
          setShowOnboarding(false);
          setCurrentView(view as AppView);
        }}
      />
      <AIAssistantWidget />
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <CompanyProvider>
        <AccountingProvider>
          <PayrollProvider>
            <MainContent />
          </PayrollProvider>
        </AccountingProvider>
      </CompanyProvider>
    </AuthProvider>
  );
};

export default App;