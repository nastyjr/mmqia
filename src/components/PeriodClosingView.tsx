import React, { useState, useEffect, useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { INITIAL_ACCOUNTS } from '../types';
import { PeriodClosure } from '../types/period-closing';
import { ArrowLeft, Lock, Unlock, AlertCircle, CheckCircle2, Calendar, FileText } from 'lucide-react';
import { Button } from './Button';

export const PeriodClosingView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { journalEntries, addJournalEntry } = useAccounting();
    const [closures, setClosures] = useState<PeriodClosure[]>([]);
    const [isClosing, setIsClosing] = useState(false);

    const formatCLP = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(val);

    // Load closures from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('period_closures');
        if (saved) setClosures(JSON.parse(saved));
    }, []);

    // Save closures to localStorage
    useEffect(() => {
        localStorage.setItem('period_closures', JSON.stringify(closures));
    }, [closures]);

    // Generate list of last 6 months
    const periods = useMemo(() => {
        const months: Array<{ month: string; displayName: string }> = [];
        const now = new Date();

        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = date.toISOString().slice(0, 7);
            const displayName = date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
            months.push({ month: monthKey, displayName });
        }

        return months;
    }, []);

    // Calculate net profit for a given month
    const calculateNetProfit = (month: string) => {
        let ingresos = 0;
        let gastos = 0;
        let costos = 0;

        journalEntries.forEach(entry => {
            if (entry.date.startsWith(month)) {
                entry.lines.forEach(line => {
                    const account = INITIAL_ACCOUNTS.find(a => a.code === line.accountId);
                    if (!account) return;

                    if (account.type === 'Ingresos') {
                        ingresos += line.credit - line.debit;
                    } else if (account.type === 'Gastos') {
                        gastos += line.debit - line.credit;
                    } else if (account.type === 'Costos') {
                        costos += line.debit - line.credit;
                    }
                });
            }
        });

        return ingresos - gastos - costos;
    };

    // Check if period is closed
    const isPeriodClosed = (month: string) => {
        return closures.some(c => c.month === month && c.status === 'CLOSED');
    };

    // Close a period
    const handleClosePeriod = (month: string) => {
        if (isPeriodClosed(month)) {
            alert('Este período ya está cerrado');
            return;
        }

        // Check for unbalanced entries
        const unbalanced = journalEntries.some(entry => {
            if (!entry.date.startsWith(month)) return false;
            const totalDebit = entry.lines.reduce((sum, line) => sum + line.debit, 0);
            const totalCredit = entry.lines.reduce((sum, line) => sum + line.credit, 0);
            return Math.abs(totalDebit - totalCredit) > 0.01;
        });

        if (unbalanced) {
            alert('❌ Hay asientos desbalanceados en este período. Corrige antes de cerrar.');
            return;
        }

        setIsClosing(true);

        const netProfit = calculateNetProfit(month);

        //  Generate closing entry
        const closingEntryId = crypto.randomUUID();
        const [year, monthNum] = month.split('-');
        const lastDayOfMonth = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
        const closingDate = `${month}-${lastDayOfMonth}`;

        // Determine accounts to close
        const ingresosAccounts = INITIAL_ACCOUNTS.filter(a => a.type === 'Ingresos' && a.isImputable);
        const gastosAccounts = INITIAL_ACCOUNTS.filter(a => a.type === 'Gastos' && a.isImputable);
        const costosAccounts = INITIAL_ACCOUNTS.filter(a => a.type === 'Costos' && a.isImputable);

        const lines: Array<{ accountId: string; debit: number; credit: number }> = [];

        // Close Ingresos (debit to zero them out)
        ingresosAccounts.forEach(acc => {
            const balance = journalEntries
                .filter(e => e.date.startsWith(month))
                .reduce((sum, e) => {
                    const line = e.lines.find(l => l.accountId === acc.code);
                    if (!line) return sum;
                    return sum + line.credit - line.debit;
                }, 0);

            if (Math.abs(balance) > 0.01) {
                lines.push({ accountId: acc.code, debit: Math.abs(balance), credit: 0 });
            }
        });

        // Close Gastos (credit to zero them out)
        gastosAccounts.forEach(acc => {
            const balance = journalEntries
                .filter(e => e.date.startsWith(month))
                .reduce((sum, e) => {
                    const line = e.lines.find(l => l.accountId === acc.code);
                    if (!line) return sum;
                    return sum + line.debit - line.credit;
                }, 0);

            if (Math.abs(balance) > 0.01) {
                lines.push({ accountId: acc.code, debit: 0, credit: Math.abs(balance) });
            }
        });

        // Close Costos (credit to zero them out)
        costosAccounts.forEach(acc => {
            const balance = journalEntries
                .filter(e => e.date.startsWith(month))
                .reduce((sum, e) => {
                    const line = e.lines.find(l => l.accountId === acc.code);
                    if (!line) return sum;
                    return sum + line.debit - line.credit;
                }, 0);

            if (Math.abs(balance) > 0.01) {
                lines.push({ accountId: acc.code, debit: 0, credit: Math.abs(balance) });
            }
        });

        // Transfer to Retained Earnings (assuming 3.1.02 exists or using generic equity account)
        if (netProfit >= 0) {
            // Profit: Credit Retained Earnings
            lines.push({ accountId: '3.1.02', debit: 0, credit: Math.abs(netProfit) });
        } else {
            // Loss: Debit Retained Earnings
            lines.push({ accountId: '3.1.02', debit: Math.abs(netProfit), credit: 0 });
        }

        const closingEntry = {
            id: closingEntryId,
            date: closingDate,
            gloss: `Cierre de Resultados - ${periods.find(p => p.month === month)?.displayName}`,
            lines,
            rut: undefined,
            costCenter: undefined,
            isManual: false
        };

        addJournalEntry(closingEntry);

        // Create closure record
        const closure: PeriodClosure = {
            id: crypto.randomUUID(),
            month,
            closedAt: new Date().toISOString(),
            closedBy: 'Administrador',
            closingEntryId,
            status: 'CLOSED',
            netProfit
        };

        setClosures([...closures, closure]);
        setIsClosing(false);
        alert(`✅ Período ${periods.find(p => p.month === month)?.displayName} cerrado exitosamente`);
    };

    return (
        <div className="pb-12">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft className="text-slate-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Cierre de Períodos Contables</h1>
                    <p className="text-slate-500 text-sm">Bloqueo mensual y generación de asientos de cierre</p>
                </div>
            </div>

            {/* Info Alert */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6 flex gap-3">
                <AlertCircle className="text-blue-600 flex-shrink-0" size={20} />
                <div className="text-sm text-blue-900">
                    <p className="font-bold mb-1">¿Qué hace el cierre de período?</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-800">
                        <li>Genera asiento automático que cierra las cuentas de resultado (Ingresos, Costos, Gastos)</li>
                        <li>Traspasa la Utilidad/Pérdida al Patrimonio (Utilidades Retenidas)</li>
                        <li>Bloquea la edición de asientos de ese mes</li>
                        <li>Registra quién y cuándo cerró el período</li>
                    </ul>
                </div>
            </div>

            {/* Periods Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b-2 border-slate-200">
                        <tr>
                            <th className="px-4 py-3 text-left font-bold text-slate-700">Período</th>
                            <th className="px-4 py-3 text-right font-bold text-slate-700">Resultado del Mes</th>
                            <th className="px-4 py-3 text-center font-bold text-slate-700">Estado</th>
                            <th className="px-4 py-3 text-center font-bold text-slate-700">Fecha Cierre</th>
                            <th className="px-4 py-3 text-center font-bold text-slate-700">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {periods.map((period) => {
                            const closure = closures.find(c => c.month === period.month);
                            const netProfit = closure?.netProfit || calculateNetProfit(period.month);
                            const isClosed = closure?.status === 'CLOSED';

                            return (
                                <tr key={period.month} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 font-medium text-slate-700 flex items-center gap-2">
                                        <Calendar size={16} className="text-slate-400" />
                                        {period.displayName}
                                    </td>
                                    <td className={`px-4 py-3 text-right font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {formatCLP(netProfit)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {isClosed ? (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-700 text-white rounded-full text-xs font-bold">
                                                <Lock size={12} /> CERRADO
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                                                <Unlock size={12} /> ABIERTO
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center text-slate-500 text-xs">
                                        {closure?.closedAt
                                            ? new Date(closure.closedAt).toLocaleDateString('es-CL')
                                            : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {isClosed ? (
                                            <button
                                                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 mx-auto"
                                                onClick={() => {
                                                    const entry = journalEntries.find(e => e.id === closure?.closingEntryId);
                                                    if (entry) {
                                                        alert(`Asiento de Cierre:\nFecha: ${entry.date}\nGlosa: ${entry.gloss}\n\nRevisar en Libro Diario`);
                                                    }
                                                }}
                                            >
                                                <FileText size={12} /> Ver Asiento
                                            </button>
                                        ) : (
                                            <Button
                                                onClick={() => handleClosePeriod(period.month)}
                                                disabled={isClosing}
                                            >
                                                <Lock size={14} className="mr-1" /> Cerrar Período
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
