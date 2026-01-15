import React, { useState, useMemo } from 'react';
import { JournalEntry, Account } from '../types';
import { Search, ArrowLeft, Download, ChevronRight, FileSpreadsheet, Printer, Calendar, X } from 'lucide-react';

interface LibroMayorViewProps {
    entries: JournalEntry[];
    accounts: Account[];
    onBack: () => void;
}

interface AccountSummary {
    code: string;
    name: string;
    totalDebit: number;
    totalCredit: number;
    balance: number;
    transactions: Array<{
        date: string;
        glosa: string;
        debit: number;
        credit: number;
        runningBalance: number;
    }>;
}

export const LibroMayorView: React.FC<LibroMayorViewProps> = ({
    entries,
    accounts,
    onBack
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
    const [showOnlyWithMovements, setShowOnlyWithMovements] = useState(true);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Filter entries by date range first
    const filteredEntries = useMemo(() => {
        return entries.filter(e => {
            if (dateFrom && e.date < dateFrom) return false;
            if (dateTo && e.date > dateTo) return false;
            return true;
        });
    }, [entries, dateFrom, dateTo]);

    const accountSummaries = useMemo((): AccountSummary[] => {
        const summaryMap = new Map<string, AccountSummary>();

        accounts.forEach(acc => {
            summaryMap.set(acc.code, {
                code: acc.code,
                name: acc.name,
                totalDebit: 0,
                totalCredit: 0,
                balance: 0,
                transactions: []
            });
        });

        const sortedEntries = [...filteredEntries].sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        sortedEntries.forEach(entry => {
            entry.lines.forEach(line => {
                let summary = summaryMap.get(line.accountId);
                if (!summary) {
                    summary = {
                        code: line.accountId,
                        name: line.accountName || 'Sin nombre',
                        totalDebit: 0,
                        totalCredit: 0,
                        balance: 0,
                        transactions: []
                    };
                    summaryMap.set(line.accountId, summary);
                }

                summary.totalDebit += line.debit || 0;
                summary.totalCredit += line.credit || 0;
                summary.balance = summary.totalDebit - summary.totalCredit;

                summary.transactions.push({
                    date: entry.date,
                    glosa: entry.glosa,
                    debit: line.debit || 0,
                    credit: line.credit || 0,
                    runningBalance: summary.balance
                });
            });
        });

        return Array.from(summaryMap.values()).sort((a, b) => a.code.localeCompare(b.code));
    }, [filteredEntries, accounts]);

    const filteredAccounts = useMemo(() => {
        return accountSummaries.filter(acc => {
            const matchesSearch =
                acc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                acc.name.toLowerCase().includes(searchTerm.toLowerCase());
            const hasMovements = !showOnlyWithMovements || acc.transactions.length > 0;
            return matchesSearch && hasMovements;
        });
    }, [accountSummaries, searchTerm, showOnlyWithMovements]);

    const selectedAccountData = selectedAccount
        ? accountSummaries.find(a => a.code === selectedAccount)
        : null;

    const totals = useMemo(() => {
        return filteredAccounts.reduce((acc, item) => ({
            debit: acc.debit + item.totalDebit,
            credit: acc.credit + item.totalCredit,
        }), { debit: 0, credit: 0 });
    }, [filteredAccounts]);

    const fmt = (n: number) => n === 0 ? '-' : '$' + n.toLocaleString('es-CL');

    const exportCSV = () => {
        const rows = [
            ['Código', 'Cuenta', 'Débitos', 'Créditos', 'Saldo'].join(';'),
            ...filteredAccounts.map(a => [a.code, a.name, a.totalDebit, a.totalCredit, a.balance].join(';'))
        ].join('\n');
        const blob = new Blob(['\ufeff' + rows], { type: 'text/csv;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `libro_mayor_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const handlePrint = () => {
        window.print();
    };

    const clearDateFilter = () => {
        setDateFrom('');
        setDateTo('');
    };

    return (
        <div className="flex h-full bg-slate-50 print:bg-white">
            {/* Left Panel - Account List */}
            <div className="w-[340px] bg-white border-r border-slate-200 flex flex-col print:hidden">
                {/* Header */}
                <div className="px-4 pt-4 pb-3 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-1">
                        <h1 className="text-base font-semibold text-slate-800">Libro Mayor</h1>
                        <button
                            onClick={onBack}
                            className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100"
                        >
                            <ArrowLeft size={12} /> Volver
                        </button>
                    </div>
                    <p className="text-[11px] text-slate-400">Saldos acumulados por cuenta</p>
                </div>

                {/* Date Filter */}
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 mb-2">
                        <Calendar size={11} />
                        <span>Período</span>
                        {(dateFrom || dateTo) && (
                            <button onClick={clearDateFilter} className="ml-auto text-slate-400 hover:text-slate-600">
                                <X size={12} />
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </div>

                {/* Search */}
                <div className="px-4 py-3 border-b border-slate-100">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2 text-slate-400" size={13} />
                        <input
                            type="text"
                            placeholder="Buscar por código o nombre..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <label className="flex items-center gap-2 mt-2.5 text-[11px] text-slate-500 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={showOnlyWithMovements}
                            onChange={(e) => setShowOnlyWithMovements(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                        />
                        Mostrar solo cuentas con movimientos
                    </label>
                </div>

                {/* Account List */}
                <div className="flex-1 overflow-auto">
                    {filteredAccounts.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs">
                            Sin resultados
                        </div>
                    ) : (
                        <div>
                            {filteredAccounts.map((acc, idx) => (
                                <button
                                    key={acc.code}
                                    onClick={() => setSelectedAccount(acc.code)}
                                    className={`w-full px-4 py-2.5 text-left flex items-center gap-3 border-b border-slate-50 transition-all ${selectedAccount === acc.code
                                            ? 'bg-blue-50 border-l-2 border-l-blue-600'
                                            : 'hover:bg-slate-50 border-l-2 border-l-transparent'
                                        }`}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <code className="text-[10px] font-medium text-blue-700 bg-blue-100/60 px-1.5 py-0.5 rounded">
                                                {acc.code}
                                            </code>
                                            {acc.transactions.length > 0 && (
                                                <span className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                                                    {acc.transactions.length}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-700 truncate leading-tight">{acc.name}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className={`text-xs font-medium tabular-nums ${acc.balance > 0 ? 'text-slate-800' : acc.balance < 0 ? 'text-red-600' : 'text-slate-400'
                                            }`}>
                                            {acc.balance !== 0 ? fmt(Math.abs(acc.balance)) : '-'}
                                        </p>
                                        {acc.balance !== 0 && (
                                            <p className="text-[9px] text-slate-400 mt-0.5">
                                                {acc.balance > 0 ? 'D' : 'A'}
                                            </p>
                                        )}
                                    </div>
                                    <ChevronRight size={12} className="text-slate-300 flex-shrink-0" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/80 space-y-2">
                    <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">Débitos</span>
                        <span className="font-medium text-slate-700 tabular-nums">{fmt(totals.debit)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">Créditos</span>
                        <span className="font-medium text-slate-700 tabular-nums">{fmt(totals.credit)}</span>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={exportCSV}
                            className="flex-1 py-1.5 text-[11px] text-center bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors"
                        >
                            <Download size={11} /> CSV
                        </button>
                        <button
                            onClick={handlePrint}
                            className="flex-1 py-1.5 text-[11px] text-center bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors"
                        >
                            <Printer size={11} /> Imprimir
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Panel - Account Detail */}
            <div className="flex-1 flex flex-col min-w-0">
                {selectedAccountData ? (
                    <>
                        {/* Account Header */}
                        <div className="bg-white border-b border-slate-200 px-6 py-5 print:px-0 print:py-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <code className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded">
                                        {selectedAccountData.code}
                                    </code>
                                    <h2 className="text-lg font-medium text-slate-800 mt-2 leading-tight">
                                        {selectedAccountData.name}
                                    </h2>
                                    {(dateFrom || dateTo) && (
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            Período: {dateFrom || '∞'} — {dateTo || '∞'}
                                        </p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className={`text-2xl font-semibold tabular-nums ${selectedAccountData.balance >= 0 ? 'text-slate-800' : 'text-red-600'
                                        }`}>
                                        {fmt(Math.abs(selectedAccountData.balance))}
                                    </p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        Saldo {selectedAccountData.balance >= 0 ? 'Deudor' : 'Acreedor'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-8 mt-4 pt-4 border-t border-slate-100">
                                <div>
                                    <p className="text-[11px] text-slate-400 uppercase tracking-wide">Débitos</p>
                                    <p className="text-sm font-medium text-slate-700 tabular-nums mt-0.5">{fmt(selectedAccountData.totalDebit)}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-400 uppercase tracking-wide">Créditos</p>
                                    <p className="text-sm font-medium text-slate-700 tabular-nums mt-0.5">{fmt(selectedAccountData.totalCredit)}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-400 uppercase tracking-wide">Movimientos</p>
                                    <p className="text-sm font-medium text-slate-700 mt-0.5">{selectedAccountData.transactions.length}</p>
                                </div>
                            </div>
                        </div>

                        {/* Transactions Table */}
                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-sm print:bg-slate-100">
                                    <tr className="text-left text-[11px] text-slate-500 uppercase tracking-wide">
                                        <th className="px-6 py-3 font-medium w-28">Fecha</th>
                                        <th className="px-4 py-3 font-medium">Descripción</th>
                                        <th className="px-4 py-3 font-medium text-right w-28">Debe</th>
                                        <th className="px-4 py-3 font-medium text-right w-28">Haber</th>
                                        <th className="px-6 py-3 font-medium text-right w-32">Saldo</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-100">
                                    {selectedAccountData.transactions.map((tx, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-3 font-mono text-xs text-slate-500">
                                                {new Date(tx.date).toLocaleDateString('es-CL')}
                                            </td>
                                            <td className="px-4 py-3 text-slate-700">{tx.glosa}</td>
                                            <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-600">
                                                {tx.debit > 0 ? fmt(tx.debit) : ''}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono tabular-nums text-rose-500">
                                                {tx.credit > 0 ? fmt(tx.credit) : ''}
                                            </td>
                                            <td className="px-6 py-3 text-right font-mono tabular-nums font-medium text-slate-800">
                                                {fmt(tx.runningBalance)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 print:hidden">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                            <FileSpreadsheet size={28} strokeWidth={1.5} />
                        </div>
                        <p className="text-base font-medium text-slate-500">Selecciona una cuenta</p>
                        <p className="text-xs text-slate-400 mt-1">
                            {filteredAccounts.length} cuentas con movimientos
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
