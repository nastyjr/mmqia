import React, { useState, useEffect } from 'react';
import { AuditEntry, AuditAction, AuditModule } from '../types/audit';
import { ArrowLeft, Search, Download, Shield, Eye, Calendar, Filter, User, FileText, History } from 'lucide-react';
import { Button } from './Button';
import { exportToExcel } from '../utils/excelExport';

interface AuditLogViewProps {
    onBack: () => void;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ onBack }) => {
    const [entries, setEntries] = useState<AuditEntry[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterModule, setFilterModule] = useState<AuditModule | 'ALL'>('ALL');
    const [filterAction, setFilterAction] = useState<AuditAction | 'ALL'>('ALL');
    const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

    // Load
    useEffect(() => {
        const saved = localStorage.getItem('audit_log');
        if (saved) {
            setEntries(JSON.parse(saved));
        } else {
            // Generate some demo entries
            generateDemoEntries();
        }
    }, []);

    const generateDemoEntries = () => {
        const demoEntries: AuditEntry[] = [
            {
                id: crypto.randomUUID(),
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                action: 'CREATE',
                module: 'ACCOUNTING',
                entityType: 'JournalEntry',
                entityId: 'JE-001',
                description: 'Creación de asiento contable: Compra de insumos',
                userId: 'admin',
                userName: 'Administrador',
            },
            {
                id: crypto.randomUUID(),
                timestamp: new Date(Date.now() - 7200000).toISOString(),
                action: 'CREATE',
                module: 'INVOICING',
                entityType: 'Invoice',
                entityId: 'FAC-001',
                description: 'Emisión de Factura #1 a Cliente ABC Ltda',
                userId: 'admin',
                userName: 'Administrador',
            },
            {
                id: crypto.randomUUID(),
                timestamp: new Date(Date.now() - 10800000).toISOString(),
                action: 'UPDATE',
                module: 'INVENTORY',
                entityType: 'Product',
                entityId: 'PROD-001',
                description: 'Modificación de stock: Notebook HP (-2 unidades)',
                userId: 'admin',
                userName: 'Administrador',
                beforeData: JSON.stringify({ stock: 10 }),
                afterData: JSON.stringify({ stock: 8 })
            },
            {
                id: crypto.randomUUID(),
                timestamp: new Date(Date.now() - 86400000).toISOString(),
                action: 'LOGIN',
                module: 'AUTH',
                entityType: 'User',
                entityId: 'admin',
                description: 'Inicio de sesión exitoso',
                userId: 'admin',
                userName: 'Administrador',
                ipAddress: '192.168.1.100'
            },
            {
                id: crypto.randomUUID(),
                timestamp: new Date(Date.now() - 172800000).toISOString(),
                action: 'EXPORT',
                module: 'ACCOUNTING',
                entityType: 'Report',
                entityId: 'BALANCE-DIC',
                description: 'Exportación de Balance 8 Columnas Diciembre 2024',
                userId: 'admin',
                userName: 'Administrador',
            }
        ];
        setEntries(demoEntries);
        localStorage.setItem('audit_log', JSON.stringify(demoEntries));
    };

    // Filter entries
    const filteredEntries = entries.filter(e => {
        const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.entityId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.userName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesModule = filterModule === 'ALL' || e.module === filterModule;
        const matchesAction = filterAction === 'ALL' || e.action === filterAction;
        return matchesSearch && matchesModule && matchesAction;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const handleExport = () => {
        const data = filteredEntries.map(e => ({
            Fecha: new Date(e.timestamp).toLocaleString('es-CL'),
            Acción: e.action,
            Módulo: e.module,
            Entidad: e.entityType,
            ID: e.entityId,
            Descripción: e.description,
            Usuario: e.userName,
            IP: e.ipAddress || '-'
        }));
        exportToExcel(data, 'Audit_Log_' + new Date().toISOString().split('T')[0], 'Auditoría');
    };

    const getActionColor = (action: AuditAction) => {
        switch (action) {
            case 'CREATE': return 'bg-emerald-100 text-emerald-700';
            case 'UPDATE': return 'bg-blue-100 text-blue-700';
            case 'DELETE': return 'bg-rose-100 text-rose-700';
            case 'LOGIN': return 'bg-purple-100 text-purple-700';
            case 'LOGOUT': return 'bg-slate-100 text-slate-700';
            case 'EXPORT': return 'bg-amber-100 text-amber-700';
            case 'PERIOD_CLOSE': return 'bg-indigo-100 text-indigo-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getModuleIcon = (module: AuditModule) => {
        switch (module) {
            case 'ACCOUNTING': return '📚';
            case 'INVENTORY': return '📦';
            case 'CRM': return '👥';
            case 'INVOICING': return '🧾';
            case 'PAYROLL': return '💰';
            case 'FIXED_ASSETS': return '🏢';
            case 'AUTH': return '🔐';
            case 'SETTINGS': return '⚙️';
            default: return '📄';
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-right duration-300 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Shield className="text-indigo-600" /> Registro de Auditoría
                        </h1>
                        <p className="text-slate-500 text-sm">Historial completo de acciones en el sistema</p>
                    </div>
                </div>
                <Button variant="secondary" onClick={handleExport}>
                    <Download size={16} className="mr-2" /> Exportar
                </Button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex-grow relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar en descripción, ID, usuario..."
                            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-slate-400" />
                        <select
                            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                            value={filterModule}
                            onChange={e => setFilterModule(e.target.value as AuditModule | 'ALL')}
                        >
                            <option value="ALL">Todos los módulos</option>
                            <option value="ACCOUNTING">Contabilidad</option>
                            <option value="INVENTORY">Inventario</option>
                            <option value="CRM">CRM</option>
                            <option value="INVOICING">Facturación</option>
                            <option value="PAYROLL">Remuneraciones</option>
                            <option value="FIXED_ASSETS">Activo Fijo</option>
                            <option value="AUTH">Autenticación</option>
                        </select>
                        <select
                            className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                            value={filterAction}
                            onChange={e => setFilterAction(e.target.value as AuditAction | 'ALL')}
                        >
                            <option value="ALL">Todas las acciones</option>
                            <option value="CREATE">Creación</option>
                            <option value="UPDATE">Modificación</option>
                            <option value="DELETE">Eliminación</option>
                            <option value="LOGIN">Inicio Sesión</option>
                            <option value="EXPORT">Exportación</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-700">{entries.filter(e => e.action === 'CREATE').length}</p>
                    <p className="text-xs text-emerald-600 uppercase font-bold">Creaciones</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-blue-700">{entries.filter(e => e.action === 'UPDATE').length}</p>
                    <p className="text-xs text-blue-600 uppercase font-bold">Modificaciones</p>
                </div>
                <div className="bg-rose-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-rose-700">{entries.filter(e => e.action === 'DELETE').length}</p>
                    <p className="text-xs text-rose-600 uppercase font-bold">Eliminaciones</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-purple-700">{entries.filter(e => e.action === 'LOGIN').length}</p>
                    <p className="text-xs text-purple-600 uppercase font-bold">Sesiones</p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-xs">
                        <tr>
                            <th className="px-4 py-3">Fecha/Hora</th>
                            <th className="px-4 py-3">Acción</th>
                            <th className="px-4 py-3">Módulo</th>
                            <th className="px-4 py-3">Descripción</th>
                            <th className="px-4 py-3">Usuario</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredEntries.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                <History size={40} className="mx-auto mb-2 opacity-50" />
                                No hay registros de auditoría que coincidan con los filtros.
                            </td></tr>
                        ) : filteredEntries.map(entry => (
                            <tr key={entry.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-slate-400" />
                                        <div>
                                            <div className="font-medium">{new Date(entry.timestamp).toLocaleDateString('es-CL')}</div>
                                            <div className="text-xs text-slate-400">{new Date(entry.timestamp).toLocaleTimeString('es-CL')}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${getActionColor(entry.action)}`}>
                                        {entry.action}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="flex items-center gap-2">
                                        <span>{getModuleIcon(entry.module)}</span>
                                        <span className="text-slate-700 font-medium">{entry.module}</span>
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="font-medium text-slate-700">{entry.description}</div>
                                    <div className="text-xs text-slate-400">{entry.entityType} | {entry.entityId}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <User size={14} className="text-slate-400" />
                                        <span className="font-medium text-slate-600">{entry.userName}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    {(entry.beforeData || entry.afterData) && (
                                        <button
                                            onClick={() => setSelectedEntry(entry)}
                                            className="text-indigo-600 hover:text-indigo-800 text-xs flex items-center gap-1"
                                        >
                                            <Eye size={14} /> Ver Cambios
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
                    Mostrando {filteredEntries.length} de {entries.length} registros
                </div>
            </div>

            {/* Detail Modal */}
            {selectedEntry && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <History className="text-indigo-600" /> Detalle de Cambios
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase">Entidad</p>
                                <p className="font-mono bg-slate-100 p-2 rounded text-sm">
                                    {selectedEntry.entityType} | {selectedEntry.entityId}
                                </p>
                            </div>
                            {selectedEntry.beforeData && (
                                <div>
                                    <p className="text-xs font-bold text-rose-500 uppercase">Antes</p>
                                    <pre className="bg-rose-50 p-3 rounded text-xs overflow-auto max-h-32 text-rose-800">
                                        {JSON.stringify(JSON.parse(selectedEntry.beforeData), null, 2)}
                                    </pre>
                                </div>
                            )}
                            {selectedEntry.afterData && (
                                <div>
                                    <p className="text-xs font-bold text-emerald-500 uppercase">Después</p>
                                    <pre className="bg-emerald-50 p-3 rounded text-xs overflow-auto max-h-32 text-emerald-800">
                                        {JSON.stringify(JSON.parse(selectedEntry.afterData), null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end mt-6">
                            <Button variant="secondary" onClick={() => setSelectedEntry(null)}>Cerrar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
