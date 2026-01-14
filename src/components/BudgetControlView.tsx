import React, { useState, useEffect, useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { INITIAL_ACCOUNTS } from '../types';
import { Budget, BudgetVariance } from '../types/budget';
import { ArrowLeft, Plus, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Download } from 'lucide-react';
import { Button } from './Button';
import { exportToExcel } from '../utils/excelExport';

export const BudgetControlView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { journalEntries } = useAccounting();
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
    const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
    const [newBudget, setNewBudget] = useState<{ accountId: string; amount: number }>({
        accountId: '',
        amount: 0
    });

    const formatCLP = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(val);

    // Load budgets from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('budgets');
        if (saved) setBudgets(JSON.parse(saved));
    }, []);

    // Save budgets to localStorage
    useEffect(() => {
        localStorage.setItem('budgets', JSON.stringify(budgets));
    }, [budgets]);

    // Get budgetable accounts (Gastos y Costos)
    const budgetableAccounts = useMemo(() => {
        return INITIAL_ACCOUNTS.filter(acc =>
            acc.isImputable && (acc.type === 'Gastos' || acc.type === 'Costos')
        );
    }, []);

    // Calculate actual spending for selected month
    const actualSpending = useMemo(() => {
        const spending: Record<string, number> = {};

        journalEntries.forEach(entry => {
            if (entry.date.startsWith(selectedMonth)) {
                entry.lines.forEach(line => {
                    const account = INITIAL_ACCOUNTS.find(a => a.code === line.accountId);
                    if (account && (account.type === 'Gastos' || account.type === 'Costos')) {
                        if (!spending[line.accountId]) spending[line.accountId] = 0;
                        spending[line.accountId] += line.debit - line.credit;
                    }
                });
            }
        });

        return spending;
    }, [journalEntries, selectedMonth]);

    // Calculate variance analysis
    const varianceAnalysis = useMemo(() => {
        const monthBudgets = budgets.filter(b => b.month === selectedMonth);

        const variances: BudgetVariance[] = monthBudgets.map(budget => {
            const account = INITIAL_ACCOUNTS.find(a => a.code === budget.accountId);
            const actual = Math.abs(actualSpending[budget.accountId] || 0);
            const variance = budget.amount - actual;
            const variancePercent = budget.amount > 0 ? (variance / budget.amount) * 100 : 0;

            let status: 'OK' | 'WARNING' | 'EXCEEDED' = 'OK';
            if (actual > budget.amount) status = 'EXCEEDED';
            else if (actual >= budget.amount * 0.9) status = 'WARNING';

            return {
                accountId: budget.accountId,
                accountName: account?.name || '',
                budgeted: budget.amount,
                actual,
                variance,
                variancePercent,
                status
            };
        });

        return variances.sort((a, b) => Math.abs(b.actual) - Math.abs(a.actual));
    }, [budgets, selectedMonth, actualSpending]);

    // Summary stats
    const summary = useMemo(() => {
        const totalBudgeted = varianceAnalysis.reduce((sum, v) => sum + v.budgeted, 0);
        const totalActual = varianceAnalysis.reduce((sum, v) => sum + v.actual, 0);
        const exceeded = varianceAnalysis.filter(v => v.status === 'EXCEEDED').length;
        const warnings = varianceAnalysis.filter(v => v.status === 'WARNING').length;

        return { totalBudgeted, totalActual, exceeded, warnings };
    }, [varianceAnalysis]);

    const handleSaveBudget = () => {
        if (!newBudget.accountId || newBudget.amount <= 0) return;

        const existingIndex = budgets.findIndex(b =>
            b.accountId === newBudget.accountId && b.month === selectedMonth
        );

        if (existingIndex >= 0) {
            const updated = [...budgets];
            updated[existingIndex].amount = newBudget.amount;
            setBudgets(updated);
        } else {
            setBudgets([...budgets, {
                id: crypto.randomUUID(),
                accountId: newBudget.accountId,
                month: selectedMonth,
                amount: newBudget.amount
            }]);
        }

        setIsBudgetModalOpen(false);
        setNewBudget({ accountId: '', amount: 0 });
    };

    const handleExport = () => {
        const data = varianceAnalysis.map(v => ({
            Cuenta: v.accountName,
            Presupuestado: v.budgeted,
            Real: v.actual,
            'Variación $': v.variance,
            'Variación %': `${v.variancePercent.toFixed(1)}%`,
            Estado: v.status === 'OK' ? '✅ OK' : v.status === 'WARNING' ? '⚠️ Alerta' : '❌ Excedido'
        }));
        exportToExcel(data, `Presupuesto_${selectedMonth}`, 'Análisis');
    };

    return (
        <div className="pb-12">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft className="text-slate-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Control Presupuestario</h1>
                    <p className="text-slate-500 text-sm">Análisis Budget vs Real</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl p-5 border-2 border-blue-200 shadow-sm">
                    <p className="text-xs text-slate-500 mb-1">Presupuestado Total</p>
                    <p className="text-2xl font-bold text-blue-700">{formatCLP(summary.totalBudgeted)}</p>
                </div>
                <div className="bg-white rounded-xl p-5 border-2 border-amber-200 shadow-sm">
                    <p className="text-xs text-slate-500 mb-1">Real Total</p>
                    <p className="text-2xl font-bold text-amber-700">{formatCLP(summary.totalActual)}</p>
                </div>
                <div className={`rounded-xl p-5 shadow-sm ${summary.exceeded > 0 ? 'bg-rose-100 border-2 border-rose-300' : 'bg-emerald-100 border-2 border-emerald-300'}`}>
                    <p className="text-xs text-slate-600 mb-1 flex items-center gap-1">
                        {summary.exceeded > 0 ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
                        Cuentas Excedidas
                    </p>
                    <p className={`text-2xl font-bold ${summary.exceeded > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{summary.exceeded}</p>
                </div>
                <div className="bg-amber-100 rounded-xl p-5 border-2 border-amber-300 shadow-sm">
                    <p className="text-xs text-amber-800 mb-1 flex items-center gap-1">
                        <AlertTriangle size={12} />
                        Alertas (90%+)
                    </p>
                    <p className="text-2xl font-bold text-amber-800">{summary.warnings}</p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex gap-3 items-center">
                    <label className="text-sm font-medium text-slate-700">Período:</label>
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={handleExport}>
                        <Download size={16} className="mr-2" /> Exportar Excel
                    </Button>
                    <Button onClick={() => setIsBudgetModalOpen(true)}>
                        <Plus size={16} className="mr-2" /> Definir Presupuesto
                    </Button>
                </div>
            </div>

            {/* Variance Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b-2 border-slate-200">
                        <tr>
                            <th className="px-4 py-3 text-left font-bold text-slate-700">Cuenta</th>
                            <th className="px-4 py-3 text-right font-bold text-slate-700">Presupuestado</th>
                            <th className="px-4 py-3 text-right font-bold text-slate-700">Real</th>
                            <th className="px-4 py-3 text-right font-bold text-slate-700">Variación</th>
                            <th className="px-4 py-3 text-right font-bold text-slate-700">%</th>
                            <th className="px-4 py-3 text-center font-bold text-slate-700">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {varianceAnalysis.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                                    <p className="mb-2">No hay presupuestos definidos para este mes</p>
                                    <Button onClick={() => setIsBudgetModalOpen(true)}>Definir Presupuesto</Button>
                                </td>
                            </tr>
                        ) : (
                            varianceAnalysis.map((variance, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 font-medium text-slate-700">{variance.accountName}</td>
                                    <td className="px-4 py-3 text-right text-slate-600">{formatCLP(variance.budgeted)}</td>
                                    <td className="px-4 py-3 text-right font-bold text-slate-800">{formatCLP(variance.actual)}</td>
                                    <td className={`px-4 py-3 text-right font-bold ${variance.variance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {formatCLP(variance.variance)}
                                    </td>
                                    <td className={`px-4 py-3 text-right font-bold ${variance.variancePercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {variance.variancePercent.toFixed(1)}%
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {variance.status === 'OK' && <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">🟢 OK</span>}
                                        {variance.status === 'WARNING' && <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">🟡 Alerta</span>}
                                        {variance.status === 'EXCEEDED' && <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-bold">🔴 Excedido</span>}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Budget Modal */}
            {isBudgetModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Definir Presupuesto - {selectedMonth}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Cuenta</label>
                                <select
                                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newBudget.accountId}
                                    onChange={(e) => setNewBudget({ ...newBudget, accountId: e.target.value })}
                                >
                                    <option value="">Selecciona una cuenta...</option>
                                    {budgetableAccounts.map(acc => (
                                        <option key={acc.code} value={acc.code}>{acc.code} - {acc.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Monto Presupuestado</label>
                                <input
                                    type="number"
                                    className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="$1,000,000"
                                    value={newBudget.amount || ''}
                                    onChange={(e) => setNewBudget({ ...newBudget, amount: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant="secondary" onClick={() => setIsBudgetModalOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSaveBudget}>Guardar Presupuesto</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
