import React, { useState, useMemo } from 'react';
import { JournalEntry, Account } from '../types';
import { Button } from './Button';
import { Search, ArrowLeft, Download, Printer, BookOpen, ChevronDown, ChevronUp, Calculator, Filter } from 'lucide-react';

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
    const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<'all' | 'withBalance' | 'withMovements'>('withMovements');

    // Calculate account summaries from journal entries
    const accountSummaries = useMemo((): AccountSummary[] => {
        const summaryMap = new Map<string, AccountSummary>();

        // Initialize all accounts
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

        // Process all journal entries sorted by date
        const sortedEntries = [...entries].sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        sortedEntries.forEach(entry => {
            entry.lines.forEach(line => {
                let summary = summaryMap.get(line.accountId);

                // If account doesn't exist in list, create it
                if (!summary) {
                    summary = {
                        code: line.accountId,
                        name: line.accountName || 'Cuenta no encontrada',
                        totalDebit: 0,
                        totalCredit: 0,
                        balance: 0,
                        transactions: []
                    };
                    summaryMap.set(line.accountId, summary);
                }

                // Add transaction
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
    }, [entries, accounts]);

    // Filter accounts based on search and filter type
    const filteredAccounts = useMemo(() => {
        return accountSummaries.filter(acc => {
            // Search filter
            const matchesSearch =
                acc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                acc.name.toLowerCase().includes(searchTerm.toLowerCase());

            // Type filter
            let matchesFilter = true;
            if (filterType === 'withBalance') {
                matchesFilter = acc.balance !== 0;
            } else if (filterType === 'withMovements') {
                matchesFilter = acc.transactions.length > 0;
            }

            return matchesSearch && matchesFilter;
        });
    }, [accountSummaries, searchTerm, filterType]);

    // Calculate totals
    const totals = useMemo(() => {
        return filteredAccounts.reduce((acc, item) => ({
            debit: acc.debit + item.totalDebit,
            credit: acc.credit + item.totalCredit,
            debtorBalance: acc.debtorBalance + (item.balance > 0 ? item.balance : 0),
            creditorBalance: acc.creditorBalance + (item.balance < 0 ? Math.abs(item.balance) : 0)
        }), { debit: 0, credit: 0, debtorBalance: 0, creditorBalance: 0 });
    }, [filteredAccounts]);

    const formatCurrency = (amount: number) => {
        return amount.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });
    };

    const exportToCSV = () => {
        const headers = ['Código', 'Cuenta', 'Débitos', 'Créditos', 'Saldo Deudor', 'Saldo Acreedor'];
        const rows = filteredAccounts.map(acc => [
            acc.code,
            acc.name,
            acc.totalDebit,
            acc.totalCredit,
            acc.balance > 0 ? acc.balance : 0,
            acc.balance < 0 ? Math.abs(acc.balance) : 0
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `libro_mayor_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <BookOpen className="text-blue-600" size={28} />
                        Libro Mayor
                    </h2>
                    <p className="text-gray-500">Saldos acumulados por cuenta contable</p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={onBack}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300 transition-colors flex items-center gap-2"
                    >
                        <ArrowLeft size={16} /> Volver
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
                    >
                        <Printer size={16} /> Imprimir
                    </button>
                    <Button onClick={exportToCSV}>
                        <Download size={16} className="mr-2" /> Exportar Excel
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg">
                    <p className="text-blue-100 text-sm">Total Débitos</p>
                    <p className="text-2xl font-bold">{formatCurrency(totals.debit)}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-lg">
                    <p className="text-purple-100 text-sm">Total Créditos</p>
                    <p className="text-2xl font-bold">{formatCurrency(totals.credit)}</p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-lg">
                    <p className="text-green-100 text-sm">Saldos Deudores</p>
                    <p className="text-2xl font-bold">{formatCurrency(totals.debtorBalance)}</p>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white shadow-lg">
                    <p className="text-orange-100 text-sm">Saldos Acreedores</p>
                    <p className="text-2xl font-bold">{formatCurrency(totals.creditorBalance)}</p>
                </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex gap-4">
                <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por código o nombre de cuenta..."
                        className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter size={16} className="text-gray-500" />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as any)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">Todas las cuentas</option>
                        <option value="withMovements">Con movimientos</option>
                        <option value="withBalance">Con saldo</option>
                    </select>
                </div>
            </div>

            {/* Accounts Count */}
            <div className="mb-4 text-sm text-gray-600 flex items-center gap-2">
                <Calculator size={16} />
                <span>Mostrando <strong>{filteredAccounts.length}</strong> cuentas del plan de cuentas</span>
            </div>

            {/* Accounts List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-grow">
                <div className="overflow-auto max-h-[calc(100vh-450px)]">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-28">Código</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Cuenta</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider w-32">Débitos</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider w-32">Créditos</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider w-32">Saldo Deudor</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider w-32">Saldo Acreedor</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-20">Detalle</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredAccounts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center text-gray-500">
                                        <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                                        <p className="font-medium">No hay cuentas con movimientos</p>
                                        <p className="text-sm text-gray-400 mt-1">Los saldos aparecerán aquí cuando se registren asientos en el Libro Diario</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredAccounts.map((acc) => (
                                    <React.Fragment key={acc.code}>
                                        <tr
                                            className={`hover:bg-blue-50 transition-colors cursor-pointer ${expandedAccount === acc.code ? 'bg-blue-50' : ''}`}
                                            onClick={() => setExpandedAccount(expandedAccount === acc.code ? null : acc.code)}
                                        >
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="font-mono text-sm font-bold text-blue-700">{acc.code}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-gray-900 font-medium">{acc.name}</span>
                                                {acc.transactions.length > 0 && (
                                                    <span className="ml-2 text-xs text-gray-400">({acc.transactions.length} mov.)</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-sm">
                                                {acc.totalDebit > 0 ? formatCurrency(acc.totalDebit) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-sm">
                                                {acc.totalCredit > 0 ? formatCurrency(acc.totalCredit) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-sm font-bold text-green-700">
                                                {acc.balance > 0 ? formatCurrency(acc.balance) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-sm font-bold text-red-700">
                                                {acc.balance < 0 ? formatCurrency(Math.abs(acc.balance)) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {acc.transactions.length > 0 && (
                                                    <button className="text-blue-600 hover:text-blue-800">
                                                        {expandedAccount === acc.code ? (
                                                            <ChevronUp size={18} />
                                                        ) : (
                                                            <ChevronDown size={18} />
                                                        )}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>

                                        {/* Expanded Transaction Details */}
                                        {expandedAccount === acc.code && acc.transactions.length > 0 && (
                                            <tr>
                                                <td colSpan={7} className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-4">
                                                    <div className="text-xs font-bold text-gray-600 mb-3 uppercase">
                                                        Movimientos de: {acc.name}
                                                    </div>
                                                    <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                                                        <thead className="bg-white">
                                                            <tr>
                                                                <th className="px-3 py-2 text-left font-semibold text-gray-600">Fecha</th>
                                                                <th className="px-3 py-2 text-left font-semibold text-gray-600">Glosa</th>
                                                                <th className="px-3 py-2 text-right font-semibold text-gray-600">Debe</th>
                                                                <th className="px-3 py-2 text-right font-semibold text-gray-600">Haber</th>
                                                                <th className="px-3 py-2 text-right font-semibold text-gray-600">Saldo</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-gray-100">
                                                            {acc.transactions.map((tx, idx) => (
                                                                <tr key={idx} className="hover:bg-gray-50">
                                                                    <td className="px-3 py-2 font-mono">{new Date(tx.date).toLocaleDateString('es-CL')}</td>
                                                                    <td className="px-3 py-2 text-gray-700">{tx.glosa}</td>
                                                                    <td className="px-3 py-2 text-right font-mono text-green-700">
                                                                        {tx.debit > 0 ? formatCurrency(tx.debit) : ''}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right font-mono text-red-700">
                                                                        {tx.credit > 0 ? formatCurrency(tx.credit) : ''}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right font-mono font-bold">
                                                                        {formatCurrency(tx.runningBalance)}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                        {/* Totals Row */}
                        {filteredAccounts.length > 0 && (
                            <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                                <tr className="font-bold">
                                    <td colSpan={2} className="px-4 py-3 text-right text-sm uppercase text-gray-700">Totales:</td>
                                    <td className="px-4 py-3 text-right font-mono text-sm">{formatCurrency(totals.debit)}</td>
                                    <td className="px-4 py-3 text-right font-mono text-sm">{formatCurrency(totals.credit)}</td>
                                    <td className="px-4 py-3 text-right font-mono text-sm text-green-700">{formatCurrency(totals.debtorBalance)}</td>
                                    <td className="px-4 py-3 text-right font-mono text-sm text-red-700">{formatCurrency(totals.creditorBalance)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
};
