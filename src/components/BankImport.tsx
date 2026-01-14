import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAccounting } from '../context/AccountingContext';
import { JournalEntry } from '../types';

interface ImportedTransaction {
    date: string;
    description: string;
    amount: number;
}

export const BankImport: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { saveEntry } = useAccounting();
    const [step, setStep] = useState<'upload' | 'preview'>('upload');
    const [transactions, setTransactions] = useState<ImportedTransaction[]>([]);
    const [processing, setProcessing] = useState(false);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            parseCSV(text);
        };
        reader.readAsText(file);
    };

    const parseCSV = (text: string) => {
        const lines = text.split('\n');
        // Simple parser assuming: Date;Description;Amount
        // Adjust logic based on real bank format (e.g. Banco de Chile, Santander)
        const parsed: ImportedTransaction[] = [];

        lines.forEach(line => {
            if (!line.trim()) return;
            const parts = line.split(';'); // Using semicolon common in LATAM CSVs
            if (parts.length >= 3) {
                // Simple logic to try to parse date
                const dateStr = parts[0].trim();
                const desc = parts[1].trim();
                const amountStr = parts[2].replace(/\./g, '').replace(',', '.').trim(); // Handle 1.000,00 format

                const amount = parseFloat(amountStr);

                if (!isNaN(amount)) {
                    parsed.push({
                        date: dateStr, // Keep as string or parse to standardized format
                        description: desc,
                        amount: amount
                    });
                }
            }
        });

        setTransactions(parsed);
        setStep('preview');
    };

    const handleImport = async () => {
        setProcessing(true);
        let count = 0;
        try {
            for (const tx of transactions) {
                // Create a Journal Entry for each transaction
                // Logic: 
                // - If amount < 0 (expense): Debit Expense Account / Credit Bank
                // - If amount > 0 (income): Debit Bank / Credit Income Account
                // For now, we put everything in a "Suspense" account or generic Expense/Income

                const isExpense = tx.amount < 0;
                const absAmount = Math.abs(tx.amount);

                // Generic logic, user would ideally map this
                const newEntry: JournalEntry = {
                    id: crypto.randomUUID(),
                    date: new Date().toISOString().split('T')[0], // Should parse tx.date
                    glosa: `Imp. Bansco: ${tx.description}`,
                    type: isExpense ? 'egreso' : 'ingreso',
                    total: absAmount,
                    createdAt: new Date().toISOString(),
                    lines: [
                        {
                            id: crypto.randomUUID(),
                            accountId: '1.1.02', // Banco Santander (Hardcoded for demo)
                            accountName: 'Banco Santander',
                            debit: isExpense ? 0 : absAmount,
                            credit: isExpense ? absAmount : 0
                        },
                        {
                            id: crypto.randomUUID(),
                            accountId: isExpense ? '6.1.05' : '4.1.02', // Gastos vs Ingresos
                            accountName: isExpense ? 'Gastos Generales (Por Clasificar)' : 'Ingresos Varios',
                            debit: isExpense ? absAmount : 0,
                            credit: isExpense ? 0 : absAmount
                        }
                    ]
                };

                await saveEntry(newEntry);
                count++;
            }
            alert(`Se han importado ${count} transacciones exitosamente.`);
            onClose();
        } catch (e) {
            alert('Error importando: ' + e);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <Upload size={20} className="text-blue-600" /> Importar Cartola Bancaria
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
                </div>

                <div className="p-6">
                    {step === 'upload' ? (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 flex flex-col items-center justify-center text-center hover:bg-blue-50 transition-colors cursor-pointer relative">
                            <input type="file" accept=".csv,.txt" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} />
                            <FileText className="h-12 w-12 text-gray-400 mb-4" />
                            <p className="text-lg font-medium text-gray-700">Arrastra tu archivo CSV del banco aquí</p>
                            <p className="text-sm text-gray-500 mt-2">Soporta formatos estándar (Santander, Chile, Estado)</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm">
                                <AlertTriangle size={16} />
                                <p>Se detectaron <strong>{transactions.length}</strong> movimientos. Revise antes de procesar.</p>
                            </div>

                            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-100 text-gray-600 font-medium sticky top-0">
                                        <tr>
                                            <th className="p-2">Fecha</th>
                                            <th className="p-2">Descripción</th>
                                            <th className="p-2 text-right">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {transactions.map((tx, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="p-2 text-gray-600">{tx.date}</td>
                                                <td className="p-2 font-medium text-gray-800">{tx.description}</td>
                                                <td className={`p-2 text-right font-bold ${tx.amount < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                                    {tx.amount.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button onClick={() => setStep('upload')} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                                    Volver
                                </button>
                                <button
                                    onClick={handleImport}
                                    disabled={processing}
                                    className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                >
                                    {processing ? 'Procesando...' : (
                                        <>
                                            <CheckCircle size={18} /> Confirmar Importación
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
