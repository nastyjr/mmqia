import React, { useState, useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { ArrowLeft, Upload, Check, Link as LinkIcon, AlertCircle, Sparkles } from 'lucide-react';
import { JournalEntry } from '../types';
import { reconciliationEngine, type MatchScore } from '../services/reconciliationEngine';

interface BankLine {
    id: string;
    date: string;
    description: string;
    amount: number; // positive = income, negative = expense
    matchedEntryId?: string;
}

export const BankReconciliation: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    // Integrate with Persistence Context
    const { journalEntries, bankTransactions, reconciliationMatches, addBankTransaction, addReconciliationMatch } = useAccounting();

    // Local UI State
    const [selectedBankLine, setSelectedBankLine] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Filter Journal Entries that are likely "Banco" movements and not yet reconciled (mock logic)
    // We assume any entry hitting account "1.1.01" (Banco) is a candidate.
    const bookEntries = useMemo(() => journalEntries.filter(e =>
        e.lines.some(l => l.accountName.toLowerCase().includes('banco') || l.accountId === '1.1.01')
    ), [journalEntries]);

    // Compute Bank Lines from persistent transactions and matches
    const bankLines = useMemo(() => {
        return bankTransactions.map(tx => {
            const match = reconciliationMatches.find(m => m.bank_transaction_id === tx.id);
            return {
                id: tx.id,
                date: tx.date,
                description: tx.description,
                amount: tx.amount,
                matchedEntryId: match?.journal_entry_id
            };
        });
    }, [bankTransactions, reconciliationMatches]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n').filter(l => l.trim().length > 0);

            // Skip header and process
            const promises = lines.slice(1).map(async (line) => {
                const [date, desc, amountStr] = line.split(';');
                if (!date || !desc) return;

                const amount = parseInt(amountStr.replace(/[^0-9-]/g, '')) || 0;

                // Save to DB
                await addBankTransaction({
                    date,
                    description: desc,
                    amount,
                    status: 'PENDING'
                });
            });

            await Promise.all(promises);
            setIsUploading(false);
            alert('Cartola subida exitosamente.');
        };
        reader.readAsText(file);
    };

    const handleMatch = async (entryId: string) => {
        if (!selectedBankLine) return;

        await addReconciliationMatch({
            bank_transaction_id: selectedBankLine,
            journal_entry_id: entryId,
            confidence: 'MANUAL',
            match_date: new Date().toISOString()
        });

        setSelectedBankLine(null);
    };

    const autoReconcile = async () => {
        const unmatchedBankLines = bankLines.filter(bl => !bl.matchedEntryId);
        const unmatchedEntries = bookEntries.filter(e =>
            !reconciliationMatches.some(m => m.journal_entry_id === e.id)
        );

        const autoMatches = reconciliationEngine.autoMatch(
            unmatchedBankLines,
            unmatchedEntries.map(e => ({
                id: e.id,
                date: e.date,
                glosa: e.glosa,
                total: e.total,
                lines: e.lines
            }))
        );

        let count = 0;
        for (const match of autoMatches) {
            // Save match to DB
            await addReconciliationMatch({
                bank_transaction_id: match.bankLineId,
                journal_entry_id: match.entryId,
                confidence: match.confidence,
                match_date: new Date().toISOString()
            });
            count++;

            // Learn the pattern
            const line = unmatchedBankLines.find(l => l.id === match.bankLineId);
            const entry = bookEntries.find(e => e.id === match.entryId);
            if (line && entry) {
                reconciliationEngine.learnMatch(line, {
                    id: entry.id,
                    date: entry.date,
                    glosa: entry.glosa,
                    total: entry.total,
                    lines: entry.lines
                });
            }
        }

        alert(`✅ Auto-conciliados: ${count} movimientos con alta confianza`);
    };

    const formatMoney = (val: number) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);
    };

    // State for View-time matching
    const [viewMatches, setViewMatches] = useState<any[]>([]);

    // Effect to load matches when selecting a line (since findMatches is now async)
    React.useEffect(() => {
        let active = true;
        if (!selectedBankLine) return;

        const selectedLine = bankLines.find(bl => bl.id === selectedBankLine);
        if (!selectedLine) return;

        const load = async () => {
            const matches = await reconciliationEngine.findMatches(
                selectedLine,
                bookEntries.map(e => ({
                    id: e.id,
                    date: e.date,
                    glosa: e.glosa,
                    total: e.total,
                    lines: e.lines
                }))
            );
            if (active) setViewMatches(matches);
        };
        load();

        return () => { active = false; };
    }, [selectedBankLine, bankLines, bookEntries]);

    return (
        <div className="animate-in fade-in duration-500 h-[calc(100vh-100px)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <LinkIcon className="text-indigo-600" /> Conciliación Bancaria
                        </h1>
                        <p className="text-slate-500 text-sm">Empareja tu Cartola Bancaria con tu Contabilidad (Persistente)</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {bankLines.length > 0 && (
                        <button
                            onClick={autoReconcile}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold transition-all shadow-md hover:shadow-lg"
                        >
                            <LinkIcon size={16} /> Auto-Conciliar Magic
                        </button>
                    )}
                    <div className="relative overflow-hidden inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <Upload size={16} className={`text-slate-600 ${isUploading ? 'animate-bounce' : ''}`} />
                        <span className="text-sm font-medium text-slate-700">{isUploading ? 'Subiendo...' : 'Subir Cartola (CSV)'}</span>
                        <input disabled={isUploading} type="file" onChange={handleFileUpload} accept=".csv" className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                </div>
            </div>

            {/* Main Split View */}
            {bankLines.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 mx-10 mb-10">
                    <div className="p-4 bg-indigo-50 rounded-full mb-4">
                        <Upload className="h-10 w-10 text-indigo-500" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700">Sube tu Cartola Bancaria</h3>
                    <p className="text-slate-500 max-w-sm text-center">Importa el archivo CSV de tu banco para comenzar el cruce de información automático.</p>
                </div>
            ) : (
                <div className="flex-grow grid grid-cols-2 gap-6 overflow-hidden min-h-0">

                    {/* Left: Bank (Cartola) */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                🏦 Movimientos del Banco <span className="text-xs bg-slate-200 px-2 py-0.5 rounded-full text-slate-600">{bankLines.filter(l => !l.matchedEntryId).length} Pendientes</span>
                            </h3>
                        </div>
                        <div className="overflow-y-auto flex-grow p-2 space-y-2">
                            {bankLines.map(line => (
                                <div
                                    key={line.id}
                                    onClick={() => !line.matchedEntryId && setSelectedBankLine(line.id)}
                                    className={`p-3 rounded-lg border transition-all cursor-pointer ${line.matchedEntryId
                                        ? 'bg-green-50 border-green-100 opacity-60'
                                        : selectedBankLine === line.id
                                            ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400 shadow-md transform scale-[1.01]'
                                            : 'bg-white border-slate-100 hover:border-indigo-300'
                                        }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-bold text-slate-700 text-sm">{line.description}</div>
                                            <div className="text-xs text-slate-400">{line.date}</div>
                                        </div>
                                        <div className={`font-mono text-sm font-bold ${line.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {formatMoney(line.amount)}
                                        </div>
                                    </div>
                                    {line.matchedEntryId && (
                                        <div className="mt-1 flex items-center gap-1 text-[10px] text-green-700 font-bold uppercase">
                                            <Check size={10} /> Conciliado
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Accounting (Contabilidad) */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                📖 Libro Contable <span className="text-xs bg-slate-200 px-2 py-0.5 rounded-full text-slate-600">{bookEntries.length} Registros</span>
                            </h3>
                        </div>
                        <div className="overflow-y-auto flex-grow p-2 space-y-2">
                            {bookEntries.map(entry => (
                                <div
                                    key={entry.id}
                                    className={`p-3 rounded-lg border bg-white border-slate-100 transition-all ${selectedBankLine // Assuming user wants to match
                                        ? 'hover:border-green-400 hover:shadow-md cursor-pointer'
                                        : ''
                                        }`}
                                    onClick={() => handleMatch(entry.id)}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-bold text-slate-500">#{entry.id.slice(0, 6)}</span>
                                        <span className="text-xs text-slate-400">{entry.date}</span>
                                    </div>
                                    <div className="text-sm font-medium text-slate-800 mb-1">{entry.glosa}</div>
                                    <div className="flex justify-between items-center">
                                        <div className="text-xs text-slate-500 truncate max-w-[150px]">
                                            {/* Show the bank implication */}
                                            {entry.lines.find(l => l.accountName.toLowerCase().includes('banco'))?.accountName || 'Banco'}
                                        </div>
                                        <div className="font-mono text-sm font-bold text-slate-700">
                                            {formatMoney(entry.total)}
                                        </div>
                                    </div>

                                    {selectedBankLine && (() => {
                                        // Use pre-loaded matches from state
                                        const currentMatch = viewMatches.find(m => m.entryId === entry.id);
                                        if (!currentMatch) return null;

                                        const confidenceColors = {
                                            'HIGH': 'bg-green-50 border-green-200 text-green-700',
                                            'MEDIUM': 'bg-yellow-50 border-yellow-200 text-yellow-700',
                                            'LOW': 'bg-gray-50 border-gray-200 text-gray-600'
                                        };

                                        return (
                                            <div className={`mt-2 p-2 rounded border ${confidenceColors[currentMatch.confidence as keyof typeof confidenceColors]}`}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-bold uppercase">{currentMatch.confidence} Confidence</span>
                                                    <span className="text-sm font-bold">{currentMatch.score}%</span>
                                                </div>
                                                <div className="text-[10px] space-y-0.5">
                                                    {currentMatch.reasons.map((reason: string, i: number) => (
                                                        <div key={i}>• {reason}</div>
                                                    ))}
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleMatch(entry.id);
                                                    }}
                                                    className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1.5 rounded transition-colors"
                                                >
                                                    ✓ Confirmar Conciliación
                                                </button>
                                            </div>
                                        );
                                    })()}
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};
