import React, { useState, useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { BankTransaction, ReconciliationMatch, MatchStatus } from '../types/bank-reconciliation';
import { ArrowLeft, Upload, PlayCircle, CheckCircle2, AlertCircle, XCircle, FileText } from 'lucide-react';
import { Button } from './Button';

export const BankReconciliationView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const {
        journalEntries,
        bankTransactions,
        setBankTransactions,
        reconciliationMatches: matches,
        setReconciliationMatches: setMatches
    } = useAccounting();

    const [csvInput, setCsvInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Parse CSV format: Date, Description, Debit, Credit, Balance
    const handleImportCSV = () => {
        const lines = csvInput.trim().split('\n');
        const transactions: BankTransaction[] = [];

        lines.forEach((line, idx) => {
            if (idx === 0) return; // Skip header
            const parts = line.split(',').map(p => p.trim());
            if (parts.length < 5) return;

            transactions.push({
                id: crypto.randomUUID(),
                date: parts[0],
                description: parts[1],
                debit: parseFloat(parts[2]) || 0,
                credit: parseFloat(parts[3]) || 0,
                balance: parseFloat(parts[4]) || 0
            });
        });

        setBankTransactions(transactions);
        setCsvInput('');
    };

    // Intelligent Matching Engine
    const runReconciliation = () => {
        setIsProcessing(true);
        const newMatches: ReconciliationMatch[] = [];
        const matchedEntryIds = new Set<string>();

        // Get all Cash/Bank journal entries
        const cashBankEntries = journalEntries.filter(entry =>
            entry.lines.some(line =>
                line.accountId === '1.1.01' || line.accountId === '1.1.03'
            )
        );

        // Match bank transactions
        bankTransactions.forEach(bankTx => {
            let bestMatch: { entryId: string; confidence: number; reason: string } | null = null;

            cashBankEntries.forEach(entry => {
                if (matchedEntryIds.has(entry.id)) return;

                const cashLine = entry.lines.find(l => l.accountId === '1.1.01' || l.accountId === '1.1.03');
                if (!cashLine) return;

                const entryAmount = cashLine.debit > 0 ? cashLine.debit : cashLine.credit;
                const bankAmount = bankTx.debit > 0 ? bankTx.debit : bankTx.credit;

                // Exact match: same date + same amount
                if (entry.date === bankTx.date && Math.abs(entryAmount - bankAmount) < 1) {
                    bestMatch = { entryId: entry.id, confidence: 100, reason: 'Exact match (date + amount)' };
                    return;
                }

                // Fuzzy match: ±3 days + same amount
                const daysDiff = Math.abs(
                    (new Date(entry.date).getTime() - new Date(bankTx.date).getTime()) / (1000 * 60 * 60 * 24)
                );
                if (daysDiff <= 3 && Math.abs(entryAmount - bankAmount) < 1) {
                    if (!bestMatch || bestMatch.confidence < 80) {
                        bestMatch = { entryId: entry.id, confidence: 80, reason: `Fuzzy match (±${Math.round(daysDiff)} days)` };
                    }
                }
            });

            if (bestMatch) {
                matchedEntryIds.add(bestMatch.entryId);
                newMatches.push({
                    id: crypto.randomUUID(),
                    bankTransactionId: bankTx.id,
                    journalEntryId: bestMatch.entryId,
                    status: 'MATCHED',
                    confidence: bestMatch.confidence,
                    matchReason: bestMatch.reason
                });
            } else {
                newMatches.push({
                    id: crypto.randomUUID(),
                    bankTransactionId: bankTx.id,
                    status: 'BANK_ONLY',
                    confidence: 0,
                    matchReason: 'No matching journal entry found'
                });
            }
        });

        // Find unmatched book entries
        cashBankEntries.forEach(entry => {
            if (!matchedEntryIds.has(entry.id)) {
                newMatches.push({
                    id: crypto.randomUUID(),
                    journalEntryId: entry.id,
                    status: 'BOOKS_ONLY',
                    confidence: 0,
                    matchReason: 'Not found in bank statement'
                });
            }
        });

        setMatches(newMatches);
        setIsProcessing(false);
    };

    const formatCLP = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

    const matchedItems = useMemo(() => matches.filter(m => m.status === 'MATCHED'), [matches]);
    const bankOnlyItems = useMemo(() => matches.filter(m => m.status === 'BANK_ONLY'), [matches]);
    const booksOnlyItems = useMemo(() => matches.filter(m => m.status === 'BOOKS_ONLY'), [matches]);

    return (
        <div className="animate-in fade-in slide-in-from-right duration-300 pb-12">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <FileText className="text-blue-600" /> Conciliación Bancaria
                        </h1>
                        <p className="text-slate-500 text-sm">Matching automático Banco vs Libros</p>
                    </div>
                </div>
            </div>

            {/* Import Section */}
            {bankTransactions.length === 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                            <Upload size={24} />
                        </div>
                        <div className="flex-grow">
                            <h3 className="font-bold text-slate-800 mb-2">Importar Cartola Bancaria</h3>
                            <p className="text-sm text-slate-600 mb-4">
                                Pega aquí los movimientos de tu banco. Formato CSV: Fecha, Descripción, Cargo, Abono, Saldo
                            </p>
                            <textarea
                                className="w-full border border-slate-300 rounded-lg p-3 text-sm font-mono h-32 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Ejemplo:&#10;Fecha,Descripción,Cargo,Abono,Saldo&#10;2024-12-01,Transferencia recibida,0,500000,1000000&#10;2024-12-02,Pago proveedor,200000,0,800000"
                                value={csvInput}
                                onChange={e => setCsvInput(e.target.value)}
                            />
                            <div className="flex justify-between items-center mt-4">
                                <p className="text-xs text-slate-500">
                                    💡 Tip: Descarga tu Cartola como CSV desde tu banco online
                                </p>
                                <Button onClick={handleImportCSV} disabled={!csvInput.trim()}>
                                    <Upload size={16} className="mr-2" /> Importar Movimientos
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Reconciliation Dashboard */}
            {bankTransactions.length > 0 && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <FileText size={16} className="text-slate-400" />
                                <span className="text-xs font-bold text-slate-500 uppercase">Banco</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-800">{bankTransactions.length}</p>
                        </div>
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 size={16} className="text-emerald-600" />
                                <span className="text-xs font-bold text-emerald-700 uppercase">Conciliados</span>
                            </div>
                            <p className="text-2xl font-bold text-emerald-700">{matchedItems.length}</p>
                        </div>
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertCircle size={16} className="text-amber-600" />
                                <span className="text-xs font-bold text-amber-700 uppercase">Solo en Banco</span>
                            </div>
                            <p className="text-2xl font-bold text-amber-700">{bankOnlyItems.length}</p>
                        </div>
                        <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <XCircle size={16} className="text-rose-600" />
                                <span className="text-xs font-bold text-rose-700 uppercase">Solo en Libros</span>
                            </div>
                            <p className="text-2xl font-bold text-rose-700">{booksOnlyItems.length}</p>
                        </div>
                    </div>

                    {/* Action Button */}
                    {matches.length === 0 && (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-6 text-center">
                            <PlayCircle className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                            <h3 className="font-bold text-blue-800 mb-2">Listo para Conciliar</h3>
                            <p className="text-blue-600 text-sm mb-4">
                                Se analizarán {bankTransactions.length} movimientos bancarios contra tus asientos contables.
                            </p>
                            <Button onClick={runReconciliation} disabled={isProcessing}>
                                {isProcessing ? 'Procesando...' : 'Ejecutar Conciliación Automática'}
                            </Button>
                        </div>
                    )}

                    {/* Results Tables */}
                    {matches.length > 0 && (
                        <div className="space-y-6">
                            {/* Matched */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="bg-emerald-50 border-b border-emerald-100 p-4">
                                    <h3 className="font-bold text-emerald-800 flex items-center gap-2">
                                        <CheckCircle2 size={18} /> Conciliados ({matchedItems.length})
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead className="bg-slate-50 text-slate-600 border-b">
                                            <tr>
                                                <th className="px-4 py-2 text-left">Fecha Banco</th>
                                                <th className="px-4 py-2 text-left">Descripción</th>
                                                <th className="px-4 py-2 text-right">Monto</th>
                                                <th className="px-4 py-2 text-left">Match</th>
                                                <th className="px-4 py-2 text-center">Confianza</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {matchedItems.map(match => {
                                                const bankTx = bankTransactions.find(b => b.id === match.bankTransactionId);
                                                const entry = journalEntries.find(e => e.id === match.journalEntryId);
                                                return (
                                                    <tr key={match.id} className="hover:bg-emerald-50/30">
                                                        <td className="px-4 py-3 text-slate-600">{bankTx?.date}</td>
                                                        <td className="px-4 py-3">
                                                            <div className="font-medium text-slate-800">{bankTx?.description}</div>
                                                            <div className="text-[10px] text-slate-500">→ {entry?.glosa}</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-mono text-slate-800">
                                                            {formatCLP((bankTx?.debit || 0) + (bankTx?.credit || 0))}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-600 text-[10px]">{match.matchReason}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                                                {match.confidence}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Bank Only */}
                            {bankOnlyItems.length > 0 && (
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="bg-amber-50 border-b border-amber-100 p-4">
                                        <h3 className="font-bold text-amber-800 flex items-center gap-2">
                                            <AlertCircle size={18} /> Solo en Banco - No Contabilizado ({bankOnlyItems.length})
                                        </h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead className="bg-slate-50 text-slate-600 border-b">
                                                <tr>
                                                    <th className="px-4 py-2 text-left">Fecha</th>
                                                    <th className="px-4 py-2 text-left">Descripción</th>
                                                    <th className="px-4 py-2 text-right">Cargo</th>
                                                    <th className="px-4 py-2 text-right">Abono</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {bankOnlyItems.map(match => {
                                                    const bankTx = bankTransactions.find(b => b.id === match.bankTransactionId);
                                                    return (
                                                        <tr key={match.id} className="hover:bg-amber-50/30">
                                                            <td className="px-4 py-3 text-slate-600">{bankTx?.date}</td>
                                                            <td className="px-4 py-3 text-slate-800">{bankTx?.description}</td>
                                                            <td className="px-4 py-3 text-right font-mono text-slate-800">
                                                                {bankTx?.debit ? formatCLP(bankTx.debit) : '-'}
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-mono text-slate-800">
                                                                {bankTx?.credit ? formatCLP(bankTx.credit) : '-'}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Books Only */}
                            {booksOnlyItems.length > 0 && (
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="bg-rose-50 border-b border-rose-100 p-4">
                                        <h3 className="font-bold text-rose-800 flex items-center gap-2">
                                            <XCircle size={18} /> Solo en Libros - No en Banco ({booksOnlyItems.length})
                                        </h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead className="bg-slate-50 text-slate-600 border-b">
                                                <tr>
                                                    <th className="px-4 py-2 text-left">Fecha</th>
                                                    <th className="px-4 py-2 text-left">Glosa</th>
                                                    <th className="px-4 py-2 text-right">Monto</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {booksOnlyItems.map(match => {
                                                    const entry = journalEntries.find(e => e.id === match.journalEntryId);
                                                    return (
                                                        <tr key={match.id} className="hover:bg-rose-50/30">
                                                            <td className="px-4 py-3 text-slate-600">{entry?.date}</td>
                                                            <td className="px-4 py-3 text-slate-800">{entry?.glosa}</td>
                                                            <td className="px-4 py-3 text-right font-mono text-slate-800">
                                                                {formatCLP(entry?.total || 0)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Reset Button */}
                            <div className="text-center">
                                <Button variant="secondary" onClick={() => { setBankTransactions([]); setMatches([]); }}>
                                    Nueva Conciliación
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
