import React, { useState, useMemo } from 'react';
import { JournalEntry, Account } from '../types';
import { Search, ArrowLeft, Download, ChevronRight, FileSpreadsheet } from 'lucide-react';

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

    return (
        <div className="flex h-full bg-gray-50">
            {/* Left Panel - Account List */}
            <div className="w-96 bg-white border-r flex flex-col">
                {/* Header */}
                <div className="p-4 border-b">
                    <div className="flex items-center justify-between mb-3">
                        <h1 className="text-lg font-semibold text-gray-900">Libro Mayor</h1>
                        <button
                            onClick={onBack}
                            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                        >
                            <ArrowLeft size={14} /> Volver
                        </button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
                        <input
                            type="text"
                            placeholder="Buscar cuenta..."
                            className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border-0 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <label className="flex items-center gap-2 mt-2 text-xs text-gray-500 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showOnlyWithMovements}
                            onChange={(e) => setShowOnlyWithMovements(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Solo con movimientos
                    </label>
                </div>

                {/* Account List */}
                <div className="flex-1 overflow-auto">
                    {filteredAccounts.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            No hay cuentas
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {filteredAccounts.map((acc) => (
                                <button
                                    key={acc.code}
                                    onClick={() => setSelectedAccount(acc.code)}
                                    className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors ${selectedAccount === acc.code ? 'bg-blue-50 border-l-2 border-blue-600' : ''
                                        }`}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                                {acc.code}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {acc.transactions.length} mov
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-900 truncate mt-1">{acc.name}</p>
                                    </div>
                                    <div className="text-right ml-3">
                                        <p className={`text-sm font-medium ${acc.balance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                                            {fmt(Math.abs(acc.balance))}
                                        </p>
                                        <p className="text-[10px] text-gray-400 uppercase">
                                            {acc.balance > 0 ? 'Deudor' : acc.balance < 0 ? 'Acreedor' : ''}
                                        </p>
                                    </div>
                                    <ChevronRight size={14} className="text-gray-300 ml-2 flex-shrink-0" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Totals */}
                <div className="p-3 border-t bg-gray-50 text-xs">
                    <div className="flex justify-between text-gray-500">
                        <span>Total Débitos:</span>
                        <span className="font-mono">{fmt(totals.debit)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500 mt-1">
                        <span>Total Créditos:</span>
                        <span className="font-mono">{fmt(totals.credit)}</span>
                    </div>
                    <button
                        onClick={exportCSV}
                        className="w-full mt-3 py-1.5 text-center bg-white border border-gray-200 rounded text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1"
                    >
                        <Download size={12} /> Exportar CSV
                    </button>
                </div>
            </div>

            {/* Right Panel - Account Detail */}
            <div className="flex-1 flex flex-col min-w-0">
                {selectedAccountData ? (
                    <>
                        {/* Account Header */}
                        <div className="bg-white border-b px-6 py-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                            {selectedAccountData.code}
                                        </span>
                                    </div>
                                    <h2 className="text-lg font-medium text-gray-900 mt-2">
                                        {selectedAccountData.name}
                                    </h2>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-semibold text-gray-900">
                                        {fmt(Math.abs(selectedAccountData.balance))}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Saldo {selectedAccountData.balance >= 0 ? 'Deudor' : 'Acreedor'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-6 mt-4 text-sm">
                                <div>
                                    <span className="text-gray-500">Débitos: </span>
                                    <span className="font-medium">{fmt(selectedAccountData.totalDebit)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Créditos: </span>
                                    <span className="font-medium">{fmt(selectedAccountData.totalCredit)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Movimientos: </span>
                                    <span className="font-medium">{selectedAccountData.transactions.length}</span>
                                </div>
                            </div>
                        </div>

                        {/* Transactions Table */}
                        <div className="flex-1 overflow-auto p-6">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b">
                                        <th className="pb-3 font-medium">Fecha</th>
                                        <th className="pb-3 font-medium">Descripción</th>
                                        <th className="pb-3 font-medium text-right">Debe</th>
                                        <th className="pb-3 font-medium text-right">Haber</th>
                                        <th className="pb-3 font-medium text-right">Saldo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {selectedAccountData.transactions.map((tx, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="py-3 font-mono text-gray-600 w-28">
                                                {new Date(tx.date).toLocaleDateString('es-CL')}
                                            </td>
                                            <td className="py-3 text-gray-900">{tx.glosa}</td>
                                            <td className="py-3 text-right font-mono text-green-700 w-28">
                                                {tx.debit > 0 ? fmt(tx.debit) : ''}
                                            </td>
                                            <td className="py-3 text-right font-mono text-red-600 w-28">
                                                {tx.credit > 0 ? fmt(tx.credit) : ''}
                                            </td>
                                            <td className="py-3 text-right font-mono font-medium w-28">
                                                {fmt(tx.runningBalance)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <FileSpreadsheet size={48} strokeWidth={1} className="mb-4" />
                        <p className="text-lg">Selecciona una cuenta</p>
                        <p className="text-sm mt-1">
                            {filteredAccounts.length} cuentas disponibles
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
