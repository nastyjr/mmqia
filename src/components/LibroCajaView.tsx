import React, { useState, useEffect } from 'react';
import { CashMovement, CashMovementType } from '../types/cash';
import { ArrowLeft, Plus, Wallet, TrendingUp, TrendingDown, ArrowRightLeft, Calendar, Download, Trash } from 'lucide-react';
import { Button } from './Button';
import { exportToExcel } from '../utils/excelExport';

interface LibroCajaViewProps {
    onBack: () => void;
}

export const LibroCajaView: React.FC<LibroCajaViewProps> = ({ onBack }) => {
    const [movements, setMovements] = useState<CashMovement[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // Form state
    const [newMovement, setNewMovement] = useState<Partial<CashMovement>>({
        type: 'INGRESO',
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: 0
    });

    // Load
    useEffect(() => {
        const saved = localStorage.getItem('libro_caja');
        if (saved) setMovements(JSON.parse(saved));
    }, []);

    // Save
    useEffect(() => {
        localStorage.setItem('libro_caja', JSON.stringify(movements));
    }, [movements]);

    // Calculate running balance
    const sortedMovements = [...movements].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));

    // Filter by selected month
    const selectedMonth = selectedDate.substring(0, 7);
    const monthMovements = sortedMovements.filter(m => m.date.startsWith(selectedMonth));

    // Calculate opening balance (sum of all movements before selected month)
    const openingBalance = sortedMovements
        .filter(m => m.date < selectedMonth + '-01')
        .reduce((sum, m) => sum + (m.type === 'INGRESO' ? m.amount : -m.amount), 0);

    // Current balance
    const currentBalance = sortedMovements.reduce((sum, m) => sum + (m.type === 'INGRESO' ? m.amount : -m.amount), 0);

    // Handlers
    const handleSave = () => {
        if (!newMovement.description || !newMovement.amount) {
            alert('Complete descripción y monto');
            return;
        }

        const movement: CashMovement = {
            id: crypto.randomUUID(),
            date: newMovement.date!,
            type: newMovement.type as CashMovementType,
            description: newMovement.description!,
            amount: Math.abs(Number(newMovement.amount)),
            documentRef: newMovement.documentRef,
            counterAccount: newMovement.counterAccount,
            createdAt: new Date().toISOString(),
            balanceAfter: 0 // Will be calculated on display
        };

        setMovements([...movements, movement]);
        setNewMovement({ type: 'INGRESO', date: new Date().toISOString().split('T')[0], description: '', amount: 0 });
        setIsFormOpen(false);
    };

    const handleDelete = (id: string) => {
        if (confirm('¿Eliminar este movimiento?')) {
            setMovements(movements.filter(m => m.id !== id));
        }
    };

    const handleExport = () => {
        const data = monthMovements.map((m, idx) => {
            const runningBalance = openingBalance + monthMovements.slice(0, idx + 1).reduce(
                (sum, mov) => sum + (mov.type === 'INGRESO' ? mov.amount : -mov.amount), 0
            );
            return {
                Fecha: m.date,
                Tipo: m.type,
                Descripción: m.description,
                Documento: m.documentRef || '',
                Ingreso: m.type === 'INGRESO' ? m.amount : 0,
                Egreso: m.type === 'EGRESO' ? m.amount : 0,
                Saldo: runningBalance
            };
        });
        exportToExcel(data, `Libro_Caja_${selectedMonth}`, 'Movimientos');
    };

    const formatCLP = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

    // Monthly totals
    const monthIncome = monthMovements.filter(m => m.type === 'INGRESO').reduce((sum, m) => sum + m.amount, 0);
    const monthExpense = monthMovements.filter(m => m.type === 'EGRESO').reduce((sum, m) => sum + m.amount, 0);
    const closingBalance = openingBalance + monthIncome - monthExpense;

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
                            <Wallet className="text-amber-600" /> Libro de Caja
                        </h1>
                        <p className="text-slate-500 text-sm">Control de Movimientos de Efectivo</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="month"
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        value={selectedMonth}
                        onChange={e => setSelectedDate(e.target.value + '-01')}
                    />
                    <Button variant="secondary" onClick={handleExport}>
                        <Download size={16} className="mr-2" /> Exportar
                    </Button>
                    <Button onClick={() => setIsFormOpen(true)}>
                        <Plus size={16} className="mr-2" /> Nuevo Movimiento
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-100 rounded-xl p-4">
                    <p className="text-xs font-bold text-slate-500 uppercase">Saldo Inicial</p>
                    <p className="text-xl font-bold text-slate-700">{formatCLP(openingBalance)}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp size={16} className="text-emerald-600" />
                        <p className="text-xs font-bold text-emerald-700 uppercase">Ingresos</p>
                    </div>
                    <p className="text-xl font-bold text-emerald-700">{formatCLP(monthIncome)}</p>
                </div>
                <div className="bg-rose-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingDown size={16} className="text-rose-600" />
                        <p className="text-xs font-bold text-rose-700 uppercase">Egresos</p>
                    </div>
                    <p className="text-xl font-bold text-rose-700">{formatCLP(monthExpense)}</p>
                </div>
                <div className="bg-amber-100 rounded-xl p-4">
                    <p className="text-xs font-bold text-amber-700 uppercase">Saldo Final</p>
                    <p className="text-2xl font-bold text-amber-800">{formatCLP(closingBalance)}</p>
                </div>
            </div>

            {/* Movements Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-xs">
                        <tr>
                            <th className="px-4 py-3">Fecha</th>
                            <th className="px-4 py-3">Tipo</th>
                            <th className="px-4 py-3">Descripción</th>
                            <th className="px-4 py-3">Documento</th>
                            <th className="px-4 py-3 text-right">Ingreso</th>
                            <th className="px-4 py-3 text-right">Egreso</th>
                            <th className="px-4 py-3 text-right">Saldo</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {/* Opening Balance Row */}
                        <tr className="bg-slate-50 font-medium">
                            <td className="px-4 py-2" colSpan={6}>Saldo Inicial del Período</td>
                            <td className="px-4 py-2 text-right font-bold">{formatCLP(openingBalance)}</td>
                            <td></td>
                        </tr>

                        {monthMovements.length === 0 ? (
                            <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                                No hay movimientos en este período. Haz click en "Nuevo Movimiento" para registrar.
                            </td></tr>
                        ) : monthMovements.map((mov, idx) => {
                            const runningBalance = openingBalance + monthMovements.slice(0, idx + 1).reduce(
                                (sum, m) => sum + (m.type === 'INGRESO' ? m.amount : -m.amount), 0
                            );
                            return (
                                <tr key={mov.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 text-slate-600">{mov.date}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${mov.type === 'INGRESO' ? 'bg-emerald-100 text-emerald-700' :
                                                mov.type === 'EGRESO' ? 'bg-rose-100 text-rose-700' :
                                                    'bg-blue-100 text-blue-700'
                                            }`}>
                                            {mov.type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-700">{mov.description}</td>
                                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{mov.documentRef || '-'}</td>
                                    <td className="px-4 py-3 text-right text-emerald-600">
                                        {mov.type === 'INGRESO' ? formatCLP(mov.amount) : ''}
                                    </td>
                                    <td className="px-4 py-3 text-right text-rose-600">
                                        {mov.type === 'EGRESO' ? formatCLP(mov.amount) : ''}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold">{formatCLP(runningBalance)}</td>
                                    <td className="px-4 py-3">
                                        <button onClick={() => handleDelete(mov.id)} className="text-red-400 hover:text-red-600">
                                            <Trash size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}

                        {/* Closing Balance Row */}
                        <tr className="bg-amber-50 font-bold">
                            <td className="px-4 py-3" colSpan={6}>Saldo Final del Período</td>
                            <td className="px-4 py-3 text-right text-amber-800">{formatCLP(closingBalance)}</td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* New Movement Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Wallet className="text-amber-600" /> Nuevo Movimiento de Caja
                        </h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Fecha</label>
                                    <input
                                        type="date"
                                        className="w-full border rounded-lg p-2 text-sm"
                                        value={newMovement.date}
                                        onChange={e => setNewMovement({ ...newMovement, date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Tipo</label>
                                    <select
                                        className="w-full border rounded-lg p-2 text-sm"
                                        value={newMovement.type}
                                        onChange={e => setNewMovement({ ...newMovement, type: e.target.value as CashMovementType })}
                                    >
                                        <option value="INGRESO">💰 Ingreso</option>
                                        <option value="EGRESO">💸 Egreso</option>
                                        <option value="TRASPASO">🔄 Traspaso</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Descripción</label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg p-2 text-sm"
                                    placeholder="Venta en efectivo, Pago proveedor, etc."
                                    value={newMovement.description}
                                    onChange={e => setNewMovement({ ...newMovement, description: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Monto ($)</label>
                                    <input
                                        type="number"
                                        className="w-full border rounded-lg p-2 text-sm"
                                        placeholder="50000"
                                        value={newMovement.amount || ''}
                                        onChange={e => setNewMovement({ ...newMovement, amount: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Documento Ref.</label>
                                    <input
                                        type="text"
                                        className="w-full border rounded-lg p-2 text-sm"
                                        placeholder="Fac #123, Recibo, etc."
                                        value={newMovement.documentRef || ''}
                                        onChange={e => setNewMovement({ ...newMovement, documentRef: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant="secondary" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSave}>Guardar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
