import React, { useState, useRef, useEffect } from 'react';
import {
    Sparkles,
    LogOut,
    ChevronDown,
    Grid,
    Database,
    CloudLightning,
    LayoutDashboard,
    FileText,
    Settings,
    Building2,
    UserCircle,
    Users,
    Search
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { InactivityMonitor } from './InactivityMonitor';
import { AppView } from '../types';
import { VirtualCFO } from './VirtualCFO';
import { BackupRestoreModal } from './BackupRestoreModal';
import { GlobalSearch } from './GlobalSearch';
import { NotificationCenter } from './NotificationCenter';

const NavButton: React.FC<{ icon: React.ReactNode; label: string; active: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${active ? 'bg-slate-100 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
    >
        {icon}
        {label}
    </button>
);

// Enhanced Dropdown Item Interface
interface DropdownItem {
    label: string;
    type?: 'item' | 'header' | 'divider';
    action?: () => void;
}

// Dropdown Component for Navigation
const NavDropdown: React.FC<{
    title: string;
    items: DropdownItem[];
    active?: boolean;
}> = ({ title, items, active }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${active || isOpen
                    ? 'bg-slate-800 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
            >
                {title}
                <ChevronDown size={14} className={`ml-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 left-0 mt-2 w-72 max-h-[80vh] overflow-y-auto rounded-lg shadow-xl bg-white ring-1 ring-black ring-opacity-5 animate-in fade-in zoom-in-95 duration-100 origin-top-left">
                    <div className="py-2" role="menu" aria-orientation="vertical">
                        {items.map((item, index) => {
                            if (item.type === 'header') {
                                return (
                                    <div key={index} className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 mt-1 mb-1">
                                        {item.label}
                                    </div>
                                );
                            }
                            if (item.type === 'divider') {
                                return <div key={index} className="h-px bg-slate-200 my-1 mx-2"></div>;
                            }
                            return (
                                <button
                                    key={index}
                                    className="block w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 border-l-4 border-transparent hover:border-blue-600 transition-colors"
                                    role="menuitem"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setIsOpen(false);
                                        if (item.action) item.action();
                                    }}
                                >
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

interface LayoutProps {
    children: React.ReactNode;
    currentView: AppView;
    setCurrentView: (view: AppView) => void;
    onOpenNewEntry: () => void;
    onOpenSII: () => void;
    onOpenBankImport: () => void;
    isSIIConnected: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, setCurrentView, onOpenNewEntry, onOpenSII, onOpenBankImport, isSIIConnected }) => {
    const { user, logout } = useAuth();
    const { activeCompany, companies, setActiveCompany, addCompany } = useCompany();
    const [isCFOOpen, setIsCFOOpen] = useState(false);
    const [isBackupOpen, setIsBackupOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // Global search keyboard shortcut
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(true);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    if (!user) return <>{children}</>;

    return (
        <div className="min-h-screen flex flex-col font-sans text-slate-900 bg-slate-50">
            <InactivityMonitor timeoutMinutes={10} />

            {/* Top Navigation Bar */}
            <nav className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center gap-8">
                            {/* Logo */}
                            <div
                                className="flex-shrink-0 flex items-center gap-2 cursor-pointer"
                                onClick={() => setCurrentView(AppView.DASHBOARD)}
                            >
                                <div className="p-2 bg-indigo-600 rounded-lg">
                                    <Grid className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-none">MCONSULTORES SOFTWARE</h1>
                                    <p className="text-[10px] text-slate-500 font-medium">SOLUCIONES A SU ALCANCE</p>
                                </div>
                            </div>

                            {/* Desktop Menu */}
                            <div className="hidden md:flex md:items-center md:space-x-2">

                                <NavButton icon={<LayoutDashboard size={20} />} label="Inicio" active={currentView === AppView.DASHBOARD} onClick={() => setCurrentView(AppView.DASHBOARD)} />
                                <NavButton icon={<Users size={20} />} label="Directorio" active={currentView === AppView.CRM} onClick={() => setCurrentView(AppView.CRM)} />

                                <NavDropdown
                                    title="Contabilidad"
                                    items={[
                                        { label: 'Ingreso de Comprobantes', type: 'header' },
                                        { label: 'Nuevo Asiento', action: () => onOpenNewEntry() },
                                        { label: 'Importar Cartola Bancaria (CSV)', action: () => onOpenBankImport() },
                                        { label: 'Consultas', type: 'header' },
                                        { label: 'Libro Diario', action: () => setCurrentView(AppView.JOURNAL) },
                                        { label: 'Plan de Cuentas', action: () => setCurrentView(AppView.COA) },
                                    ]}
                                />

                                <NavDropdown
                                    title="Libros"
                                    items={[
                                        { label: 'Régimen General / 14A', type: 'header' },
                                        { label: 'Libro Diario', action: () => setCurrentView(AppView.JOURNAL) },
                                        { label: 'Libro Mayor', action: () => setCurrentView(AppView.LIBRO_MAYOR) },
                                        { label: 'Balance 8 Columnas', action: () => setCurrentView(AppView.BALANCE_8_COL) },
                                        { label: '', type: 'divider' },
                                        { label: 'Régimen Pro Pyme', type: 'header' },
                                        { label: 'Libro de Caja', action: () => setCurrentView(AppView.LIBRO_CAJA) },
                                        { label: 'Ingresos y Egresos', action: () => setCurrentView(AppView.LIBRO_CAJA) },
                                        { label: '', type: 'divider' },
                                        { label: 'Auxiliares', type: 'header' },
                                        { label: 'Libro de Compra/Venta', action: () => setCurrentView(AppView.LIBRO_COMPRA_VENTA) },
                                        { label: 'Libro de Remuneraciones (LRE)', action: () => setCurrentView(AppView.LIBRO_REMUNERACIONES) },
                                        { label: 'Libro de Retenciones', action: () => setCurrentView(AppView.LIBRO_RETENCIONES) },
                                        { label: 'Registro Rentas Emp. (RRE)', action: () => setCurrentView(AppView.LIBRO_RRE) },
                                        { label: 'Activo Fijo', action: () => setCurrentView(AppView.ACTIVO_FIJO) },
                                        { label: '', type: 'divider' },
                                        { label: 'Internacional', type: 'header' },
                                        { label: 'Estados Financieros IFRS', action: () => setCurrentView(AppView.ESTADOS_IFRS) },
                                    ]}
                                />

                                <NavDropdown
                                    title="Declaraciones Juradas"
                                    items={[
                                        { label: 'Mensuales', type: 'header' },
                                        { label: 'F29 (IVA / PPM)', action: () => setCurrentView(AppView.F29) },
                                        { label: 'F50 (Impuestos Varios)', action: () => setCurrentView(AppView.F50) },
                                        { label: '', type: 'divider' },
                                        { label: 'Operación Renta 2026', type: 'header' },
                                        { label: 'DJ 1887 (Sueldos)', action: () => setCurrentView(AppView.DJ_1887) },
                                        { label: 'DJ 1879 (Honorarios)', action: () => setCurrentView(AppView.DJ_1879) },
                                        { label: 'DJ 1926 (Base Imponible)', action: () => setCurrentView(AppView.DJ_1926) },
                                        { label: 'F22 (Formulario Renta)', action: () => setCurrentView(AppView.F22) },
                                        { label: '', type: 'divider' },
                                        { label: 'Resultados Tributarios', type: 'header' },
                                        { label: 'Renta Líquida (RLI)', action: () => setCurrentView(AppView.RENTA_LIQUIDA) },
                                        { label: 'Capital Propio (CPT)', action: () => setCurrentView(AppView.CAPITAL_PROPIO) },
                                    ]}
                                />

                                <NavDropdown
                                    title="Reportes"
                                    items={[
                                        { label: 'Gestión', type: 'header' },
                                        { label: 'Estado de Resultado', action: () => setCurrentView(AppView.ESTADO_RESULTADOS) },
                                        { label: 'Flujo de Caja', action: () => setCurrentView(AppView.INSIGHTS) },
                                        { label: 'Cuentas por Cobrar', action: () => setCurrentView(AppView.LIBRO_MAYOR) },
                                        { label: 'Cuentas por Pagar', action: () => setCurrentView(AppView.LIBRO_MAYOR) },
                                        { label: '', type: 'divider' },
                                        { label: 'Ejecutivo', type: 'header' },
                                        { label: 'Dashboard Inteligente', action: () => setCurrentView(AppView.EXECUTIVE_DASHBOARD) },
                                        { label: 'Auditoría de Actividad', action: () => setCurrentView(AppView.AUDIT_LOG) },
                                    ]}
                                />

                            </div>
                        </div>

                        <div className="flex items-center gap-4">

                            {/* Configuration Menu (New Phase 6) */}
                            <NavDropdown
                                title={<Settings size={20} className="text-slate-600" />}
                                items={[
                                    { label: 'Sistema', type: 'header' },
                                    { label: 'Gestión de Usuarios', action: () => setCurrentView(AppView.USER_MANAGEMENT) },
                                    { label: 'Registro de Auditoría', action: () => setCurrentView(AppView.AUDIT_LOG) },
                                    { label: '', type: 'divider' },
                                    { label: 'Datos', type: 'header' },
                                    { label: 'Backup & Restore', action: () => setIsBackupOpen(true) },
                                ]}
                            />

                            {/* Connection Status Button */}
                            <button
                                onClick={onOpenSII}
                                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded shadow-sm transition-all ${isSIIConnected
                                    ? 'bg-blue-900 text-white hover:bg-blue-800'
                                    : 'bg-white border border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400'
                                    }`}
                            >
                                {isSIIConnected ? (
                                    <>
                                        <CloudLightning size={14} className="text-yellow-400" />
                                        <span>SII Conectado</span>
                                    </>
                                ) : (
                                    <>
                                        <Database size={14} />
                                        <span>Conectar SII</span>
                                    </>
                                )}
                            </button>

                            <div className="hidden md:block text-right">
                                <div className="text-xs font-bold text-slate-500 uppercase flex items-center justify-end gap-1">
                                    Empresa Activa <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                </div>
                                <div className="text-sm font-bold text-slate-800">{user.name}</div>

                            </div>

                            <button className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded shadow-sm hover:bg-emerald-700 transition-colors">
                                <Sparkles size={14} /> IA
                            </button>

                            <div className="h-8 w-px bg-slate-200 mx-1"></div>

                            <NavDropdown
                                title={<LogOut size={20} className="text-slate-500" />}
                                items={[
                                    { label: 'Cerrar Sesión', action: logout },
                                ]}
                            />



                            {/* Company Selector */}
                            <div className="hidden md:flex items-center ml-4 mr-2 border-l border-r border-indigo-700/30 px-4">
                                <button
                                    className="flex items-center gap-2 text-indigo-100 hover:text-white transition-colors"
                                    onClick={() => {
                                        // Simple prompt for now to add company, in real app would be a modal
                                        const action = window.prompt("Escribe 'NUEVA' para crear empresa o el ID de la empresa a cambiar:\n\nEmpresas disponibles:\n" + companies.map(c => `${c.id === activeCompany?.id ? '✅' : '⭕️'} ${c.name}`).join('\n'));

                                        if (action === 'NUEVA') {
                                            const name = window.prompt("Nombre de la nueva empresa:");
                                            const rut = window.prompt("RUT de la empresa:");
                                            if (name && rut) {
                                                addCompany({ name, rut, industry: 'General' });
                                                alert("Empresa creada. Ahora puedes cambiar a ella.");
                                            }
                                        } else if (action) {
                                            // Find by name match roughly or exact ID (user won't know ID, so let's match name)
                                            const target = companies.find(c => c.name.includes(action) || c.id === action);
                                            if (target) {
                                                if (confirm(`¿Cambiar a ${target.name}? La página se recargará.`)) {
                                                    setActiveCompany(target);
                                                }
                                            }
                                        }
                                    }}
                                >
                                    <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                                        <Building2 size={16} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[10px] text-indigo-300 font-medium uppercase tracking-wider">Empresa Activa</p>
                                        <p className="text-sm font-bold truncate max-w-[150px]">{activeCompany?.name || 'Cargando...'}</p>
                                    </div>
                                    <ChevronDown size={14} className="opacity-50" />
                                </button>
                            </div>

                            {/* Search Button */}
                            <button
                                onClick={() => setIsSearchOpen(true)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
                                title="Búsqueda Global (Cmd+K)"
                            >
                                <Search size={20} className="text-slate-600" />
                                <kbd className="hidden sm:inline px-1.5 py-0.5 text-[10px] bg-slate-100 border border-slate-300 rounded text-slate-600">
                                    ⌘K
                                </kbd>
                            </button>

                            {/* Notifications */}
                            <NotificationCenter onNavigate={setCurrentView} />
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="flex-grow px-8 py-6 overflow-auto">
                {children}
            </main>

            {/* Modals */}
            <VirtualCFO isOpen={isCFOOpen} onClose={() => setIsCFOOpen(false)} />
            <BackupRestoreModal isOpen={isBackupOpen} onClose={() => setIsBackupOpen(false)} />
            <GlobalSearch
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                onNavigate={setCurrentView}
            />
            <InactivityMonitor />
        </div>
    );
};
