import React, { useState } from 'react';
import { usePayroll } from '../context/PayrollContext';
import { useAccounting } from '../context/AccountingContext';
import { calculatePayroll, PayrollInput } from '../services/payrollCalculator';
import { JournalEntry, JournalEntryLine } from '../types';
import { Users, CheckCircle2, Play, DollarSign, Loader2, ArrowLeft } from 'lucide-react';

export const PayrollBatchRunner: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { employees, addPayrollProcess } = usePayroll();
    const { saveEntry } = useAccounting();

    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [completed, setCompleted] = useState(false);
    const [log, setLog] = useState<string[]>([]);
    const [totalCost, setTotalCost] = useState(0);

    const activeEmployees = employees.filter(e => e.isActive);

    const runBatch = async () => {
        setProcessing(true);
        setLog([]);
        setTotalCost(0);
        let currentCost = 0;

        const today = new Date().toISOString().split('T')[0];
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const batchId = crypto.randomUUID();

        // Simulate centralized entry lines accumulator
        const allLines: JournalEntryLine[] = [];

        for (let i = 0; i < activeEmployees.length; i++) {
            const emp = activeEmployees[i];
            setProgress(((i + 1) / activeEmployees.length) * 100);

            // Artificial delay for UX
            await new Promise(r => setTimeout(r, 600));

            // 1. Calculate
            const input: PayrollInput = {
                baseSalary: emp.contract.baseSalary,
                hasGratification: emp.contract.gratificationLegal,
                contractType: emp.contract.type as any,
                afpName: emp.contract.afp,
                fonasa: emp.contract.healthSystem === 'FONASA',
                isapreAmount: emp.contract.isapreAmount || 0,
                colacion: emp.contract.colacion || 0,
                movilizacion: emp.contract.movilizacion || 0
            };

            const result = calculatePayroll(input);
            currentCost += result.employerCost;
            setLog(prev => [`✅ ${emp.names} ${emp.fatherName}: Líquido ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(result.liquid)}`, ...prev]);

            // 2. Save Process Record
            const processRecord: any = {
                id: crypto.randomUUID(),
                month: currentMonth,
                year: currentYear,
                employeeId: emp.id,
                calculations: result,
                status: 'PROCESSED'
            };
            addPayrollProcess(processRecord);

            // 3. Accumulate Journal Lines
            allLines.push(
                {
                    id: crypto.randomUUID(), accountId: '6.1.01', accountName: 'Sueldos Base',
                    debit: result.baseSalary, credit: 0, costCenterId: '100'
                },
                {
                    id: crypto.randomUUID(), accountId: '6.1.01', accountName: 'Gratificaciones',
                    debit: result.gratification, credit: 0, costCenterId: '100'
                },
                {
                    id: crypto.randomUUID(), accountId: '6.1.01', accountName: 'Movilización y Colación',
                    debit: result.nonTaxableIncome, credit: 0, costCenterId: '100'
                },
                {
                    id: crypto.randomUUID(), accountId: '6.1.01', accountName: 'Aporte Patronal',
                    debit: result.sis + result.afcEmployer + result.mutual, credit: 0, costCenterId: '100'
                },
                {
                    id: crypto.randomUUID(), accountId: '2.1.04', accountName: 'Instituciones Previsionales',
                    debit: 0, credit: result.afpAmount + result.healthTotal + result.afcWorker + result.sis + result.afcEmployer + result.mutual
                },
                {
                    id: crypto.randomUUID(), accountId: '2.1.05', accountName: 'Impuesto Único',
                    debit: 0, credit: result.tax
                },
                {
                    id: crypto.randomUUID(), accountId: '2.1.06', accountName: 'Sueldos por Pagar',
                    debit: 0, credit: result.liquid
                }
            );
        }

        // 4. Create Centralized Entry
        const centralizedEntry: JournalEntry = {
            id: batchId,
            date: today,
            glosa: `Centralización Nómina ${new Date().toLocaleString('es-CL', { month: 'long' })} (Masiva)`,
            type: 'egreso',
            lines: allLines.filter(l => (l.debit + l.credit) > 0),
            total: currentCost,
            createdAt: new Date().toISOString(),
            status: 'posted'
        };
        await saveEntry(centralizedEntry);

        setTotalCost(currentCost);
        setCompleted(true);
        setProcessing(false);
    };

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft className="text-slate-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <div className="p-2 bg-pink-100 rounded-lg text-pink-600"><Users size={24} /></div>
                        Procesador Masivo de Nómina
                    </h1>
                    <p className="text-slate-500 text-sm">Automáticamente calcula y centraliza los sueldos de todos los colaboradores activos.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* STATUS CARD */}
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 relative overflow-hidden">
                    {!completed ? (
                        <>
                            <div className="flex justify-between items-center mb-6">
                                <div className="text-sm font-bold text-slate-400 uppercase tracking-widest">Estado Actual</div>
                                <div className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">
                                    {activeEmployees.length} Colaboradores Activos
                                </div>
                            </div>

                            <div className="mb-8 text-center">
                                <div className="text-6xl font-black text-slate-800 mb-2">{Math.round(progress)}%</div>
                                <div className="text-slate-400 font-medium">Progreso del Lote</div>
                            </div>

                            {processing ? (
                                <div className="w-full bg-slate-100 rounded-full h-4 mb-4 overflow-hidden relative">
                                    <div className="h-full bg-pink-500 transition-all duration-300 relative overflow-hidden" style={{ width: `${progress}%` }}>
                                        <div className="absolute inset-0 bg-white/30 w-full h-full animate-[shimmer_1s_infinite] skew-x-12"></div>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={runBatch}
                                    disabled={activeEmployees.length === 0}
                                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-black transition-all transform hover:scale-[1.02] flex items-center justify-center gap-3 shadow-2xl shadow-slate-200"
                                >
                                    <Play fill="currentColor" /> Iniciar Proceso (AI)
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-8 animate-in zoom-in duration-500">
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 size={40} strokeWidth={3} />
                            </div>
                            <h2 className="text-3xl font-bold text-slate-800 mb-2">¡Proceso Exitoso!</h2>
                            <p className="text-slate-500 mb-6">Se han generado todas las liquidaciones y el asiento contable.</p>

                            <div className="bg-slate-50 p-4 rounded-xl mb-6">
                                <div className="text-xs uppercase text-slate-400 font-bold mb-1">Costo Total Empresa</div>
                                <div className="text-2xl font-mono font-bold text-slate-800">
                                    {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(totalCost)}
                                </div>
                            </div>

                            <button onClick={onBack} className="text-slate-500 font-bold hover:text-slate-800">Volver al Menú</button>
                        </div>
                    )}
                </div>

                {/* LOG TERMINAL */}
                <div className="bg-slate-900 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col h-[500px]">
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-4">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="ml-2 text-xs font-mono text-slate-400">Payroll_Process_Log_v2.0</span>
                    </div>

                    <div className="flex-1 overflow-y-auto font-mono text-xs space-y-2">
                        {log.length === 0 && !processing && !completed && (
                            <div className="text-slate-500 italic">Esperando inicio del proceso...</div>
                        )}
                        {log.map((entry, i) => (
                            <div key={i} className="text-green-400 animate-in slide-in-from-left-2 fade-in duration-300 border-l-2 border-green-800 pl-2">
                                {entry}
                            </div>
                        ))}
                        {processing && (
                            <div className="text-pink-400 flex items-center gap-2 mt-4">
                                <Loader2 className="animate-spin" size={14} /> Procesando siguiente legajo...
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
};
