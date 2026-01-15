import React, { useState, useMemo } from 'react';
import { JournalEntry, Account } from '../types';
import { Button } from './Button';
import { Search, ArrowLeft, Download, ChevronDown, ChevronUp } from 'lucide-react';

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
    const [showOnlyWithMovements, setShowOnlyWithMovements] = useState(true);

    // Calculate account summaries from journal entries
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

        const sortedEntries = [...entries].sort((a, b) =>
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
    }, [entries, accounts]);

    const filteredAccounts = useMemo(() => {
        return accountSummaries.filter(acc => {
            const matchesSearch =
                acc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                acc.name.toLowerCase().includes(searchTerm.toLowerCase());
            const hasMovements = !showOnlyWithMovements || acc.transactions.length > 0;
            return matchesSearch && hasMovements;
        });
    }, [accountSummaries, searchTerm, showOnlyWithMovements]);

    const totals = useMemo(() => {
        return filteredAccounts.reduce((acc, item) => ({
            debit: acc.debit + item.totalDebit,
            credit: acc.credit + item.totalCredit,
        }), { debit: 0, credit: 0 });
    }, [filteredAccounts]);

    const fmt = (n: number) => n === 0 ? '-' : n.toLocaleString('es-CL');

    const exportCSV = () => {
        const rows = [
            ['Código', 'Cuenta', 'Débitos', 'Créditos', 'Saldo'].join(','),
            ...filteredAccounts.map(a => [a.code, `"${a.name}"`, a.totalDebit, a.totalCredit, a.balance].join(','))
        ].join('\n');
        const blob = new Blob([rows], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `libro_mayor_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-4 pb-4 border-b">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Libro Mayor</h2>
                    <p className="text-sm text-gray-500">Saldos por cuenta contable</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={onBack} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">
                        <ArrowLeft size={16} className="inline mr-1" /> Volver
                    </button>
                    <Button onClick={exportCSV} variant="secondary" className="text-sm">
                        <Download size={14} className="mr-1" /> CSV
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center mb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar cuenta..."
                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:border-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={showOnlyWithMovements}
                        onChange={(e) => setShowOnlyWithMovements(e.target.checked)}
                        className="rounded border-gray-300"
                    />
                    Solo con movimientos
                </label>
                <span className="text-xs text-gray-400 ml-auto">{filteredAccounts.length} cuentas</span>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto border border-gray-200 rounded">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                        <tr className="border-b border-gray-200">
                            <th className="text-left px-3 py-2 font-medium text-gray-600 w-24">Código</th>
                            <th className="text-left px-3 py-2 font-medium text-gray-600">Cuenta</th>
                            <th className="text-right px-3 py-2 font-medium text-gray-600 w-28">Débitos</th>
                            <th className="text-right px-3 py-2 font-medium text-gray-600 w-28">Créditos</th>
                            <th className="text-right px-3 py-2 font-medium text-gray-600 w-28">Saldo</th>
                            <th className="w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAccounts.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-12 text-gray-400">
                                    No hay cuentas con movimientos
                                </td>
                            </tr>
                        ) : (
                            filteredAccounts.map((acc) => (
                                <React.Fragment key={acc.code}>
                                    <tr
                                        className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${expandedAccount === acc.code ? 'bg-blue-50' : ''}`}
                                        onClick={() => setExpandedAccount(expandedAccount === acc.code ? null : acc.code)}
                                    >
                                        <td className="px-3 py-2 font-mono text-blue-700">{acc.code}</td>
                                        <td className="px-3 py-2 text-gray-900">{acc.name}</td>
                                        <td className="px-3 py-2 text-right font-mono text-gray-700">{fmt(acc.totalDebit)}</td>
                                        <td className="px-3 py-2 text-right font-mono text-gray-700">{fmt(acc.totalCredit)}</td>
                                        <td className={`px-3 py-2 text-right font-mono font-medium ${acc.balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                                            {fmt(Math.abs(acc.balance))}{acc.balance < 0 ? ' (A)' : acc.balance > 0 ? ' (D)' : ''}
                                        </td>
                                        <td className="px-2 text-gray-400">
                                            {acc.transactions.length > 0 && (
                                                expandedAccount === acc.code ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                            )}
                                        </td>
                                    </tr>

                                    {expandedAccount === acc.code && acc.transactions.length > 0 && (
                                        <tr>
                                            <td colSpan={6} className="bg-gray-50 px-6 py-3">
                                                <table className="w-full text-xs">
                                                    <thead>
                                                        <tr className="text-gray-500">
                                                            <th className="text-left py-1 w-24">Fecha</th>
                                                            <th className="text-left py-1">Glosa</th>
                                                            <th className="text-right py-1 w-24">Debe</th>
                                                            <th className="text-right py-1 w-24">Haber</th>
                                                            <th className="text-right py-1 w-24">Saldo</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {acc.transactions.map((tx, i) => (
                                                            <tr key={i} className="border-t border-gray-100">
                                                                <td className="py-1.5 font-mono text-gray-600">{new Date(tx.date).toLocaleDateString('es-CL')}</td>
                                                                <td className="py-1.5 text-gray-700 truncate max-w-xs">{tx.glosa}</td>
                                                                <td className="py-1.5 text-right font-mono">{tx.debit > 0 ? fmt(tx.debit) : ''}</td>
                                                                <td className="py-1.5 text-right font-mono">{tx.credit > 0 ? fmt(tx.credit) : ''}</td>
                                                                <td className="py-1.5 text-right font-mono font-medium">{fmt(tx.runningBalance)}</td>
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
                    {filteredAccounts.length > 0 && (
                        <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                            <tr className="font-medium">
                                <td colSpan={2} className="px-3 py-2 text-right text-gray-600">Totales:</td>
                                <td className="px-3 py-2 text-right font-mono">{fmt(totals.debit)}</td>
                                <td className="px-3 py-2 text-right font-mono">{fmt(totals.credit)}</td>
                                <td className="px-3 py-2 text-right font-mono">{fmt(totals.debit - totals.credit)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
};
