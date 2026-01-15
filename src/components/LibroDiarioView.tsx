import React, { useState } from 'react';
import { JournalEntry } from '../types';
import { Button } from './Button';
import { FileText, Plus, Search, Filter, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface LibroDiarioViewProps {
    entries: JournalEntry[];
    onNewEntry: () => void;
    onGoBack: () => void;
    onEditEntry?: (entry: JournalEntry) => void;
    onDeleteEntry?: (id: string) => void;
}

export const LibroDiarioView: React.FC<LibroDiarioViewProps> = ({
    entries,
    onNewEntry,
    onGoBack,
    onEditEntry,
    onDeleteEntry
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

    // Filter entries based on search
    const filteredEntries = entries.filter(entry =>
        entry.glosa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.lines.some(line =>
            line.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            line.accountId.includes(searchTerm)
        )
    );

    const handleDelete = (entry: JournalEntry) => {
        if (window.confirm(`¿Estás seguro de eliminar el asiento "${entry.glosa}"?`)) {
            onDeleteEntry?.(entry.id);
        }
    };
    return (
        <div className="flex flex-col h-full animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Libro Diario</h2>
                    <p className="text-gray-500">Registro cronológico de movimientos contables (Normativa SII Art. 17)</p>
                </div>
                <div className="flex space-x-3">
                    <button onClick={onGoBack} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300 transition-colors">
                        Volver al Menú
                    </button>
                    <Button onClick={onNewEntry} className="shadow-lg">
                        <Plus size={20} className="mr-2" /> Nuevo Asiento
                    </Button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex gap-4">
                <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Buscar por glosa, cuenta o código..."
                    />
                </div>
                <button className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <Filter className="h-4 w-4 mr-2 text-gray-500" /> Filtros
                </button>
            </div>

            {/* Stats bar */}
            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>Mostrando {filteredEntries.length} de {entries.length} asientos</span>
                <span>Total: ${entries.reduce((sum, e) => sum + e.total, 0).toLocaleString('es-CL')}</span>
            </div>

            {filteredEntries.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-16 text-center">
                    <div className="mx-auto h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <FileText className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">{searchTerm ? 'Sin resultados' : 'Libro Diario Vacío'}</h3>
                    <p className="mt-2 text-sm text-gray-500">{searchTerm ? 'No se encontraron asientos con ese criterio.' : 'No hay asientos contables registrados.'}</p>
                    {searchTerm && <button onClick={() => setSearchTerm('')} className="mt-4 text-indigo-600 hover:underline">Limpiar búsqueda</button>}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredEntries.map((entry) => (
                        <div key={entry.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                            {/* Entry Header */}
                            <div className="bg-slate-50 px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg font-bold text-indigo-700">Asiento #{entry.id.substring(0, 8)}</span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${entry.type === 'ingreso' ? 'bg-emerald-100 text-emerald-700' :
                                            entry.type === 'egreso' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                                            }`}>{entry.type}</span>
                                    </div>
                                    <div className="text-sm text-gray-500 mt-1 font-medium">{entry.glosa}</div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-gray-900">{new Date(entry.date).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                        <div className="text-xs text-gray-400">Creado: {new Date(entry.createdAt).toLocaleDateString()}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        {onEditEntry && (
                                            <button
                                                onClick={() => onEditEntry(entry)}
                                                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title="Editar asiento"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                        )}
                                        {onDeleteEntry && (
                                            <button
                                                onClick={() => handleDelete(entry)}
                                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Eliminar asiento"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Entry Details Table */}
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead className="bg-white">
                                        <tr>
                                            <th className="px-6 py-2 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Cuenta</th>
                                            <th className="px-6 py-2 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Auxiliar</th>
                                            <th className="px-6 py-2 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Documento</th>
                                            <th className="px-6 py-2 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Debe</th>
                                            <th className="px-6 py-2 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Haber</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-50">
                                        {entry.lines.map((line) => (
                                            <tr key={line.id}>
                                                <td className="px-6 py-2 text-sm text-gray-700">
                                                    <span className="font-mono text-gray-500 mr-2">{line.accountId}</span>
                                                    {line.accountName}
                                                </td>
                                                <td className="px-6 py-2 text-sm text-gray-600 font-mono">{line.rut || '-'}</td>
                                                <td className="px-6 py-2 text-sm text-gray-600">
                                                    {line.documentType && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                            {line.documentType} {line.documentNumber}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-2 text-sm text-gray-800 text-right font-medium">
                                                    {line.debit > 0 ? `$${line.debit.toLocaleString('es-CL')}` : '-'}
                                                </td>
                                                <td className="px-6 py-2 text-sm text-gray-800 text-right font-medium">
                                                    {line.credit > 0 ? `$${line.credit.toLocaleString('es-CL')}` : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                        {/* Footer Row */}
                                        <tr className="bg-gray-50 font-bold">
                                            <td colSpan={3} className="px-6 py-2 text-right text-xs text-gray-500 uppercase">Totales</td>
                                            <td className="px-6 py-2 text-right text-sm text-gray-900 border-t-2 border-gray-200">
                                                ${entry.total.toLocaleString('es-CL')}
                                            </td>
                                            <td className="px-6 py-2 text-right text-sm text-gray-900 border-t-2 border-gray-200">
                                                ${entry.total.toLocaleString('es-CL')}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};