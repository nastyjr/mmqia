import React, { useState, useEffect } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { usePayroll } from '../context/PayrollContext';
import { JournalEntry, JournalEntryLine, INITIAL_COST_CENTERS } from '../types';
import { Users, Calculator, ArrowRight, Save, DollarSign, ArrowLeft, Building2, FileText, CheckCircle2 } from 'lucide-react';
import { calculatePayroll, PayrollInput, AFPS } from '../services/payrollCalculator';



export const PayrollGenerator: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { saveEntry } = useAccounting();
    const { employees, addPayrollProcess } = usePayroll(); // NEW
    const [step, setStep] = useState(1);

    // --- INPUTS ---
    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [employeeName, setEmployeeName] = useState('');

    const handleEmployeeSelect = (empId: string) => {
        setSelectedEmployeeId(empId);
        const emp = employees.find(e => e.id === empId);
        if (emp) {
            setEmployeeName(`${emp.names} ${emp.fatherName}`);
            setRut(emp.rut);
            setContractType(emp.contract.type as any);
            setBaseSalary(emp.contract.baseSalary);
            setHasGratification(emp.contract.gratificationLegal);
            setSelectedAFP(emp.contract.afp);
            setFonasa(emp.contract.healthSystem === 'FONASA');
            setIsapreAmount(emp.contract.isapreAmount || 0);
            setColacion(emp.contract.colacion || 0);
            setMovilizacion(emp.contract.movilizacion || 0);
        }
    };
    const [rut, setRut] = useState('');
    const [contractType, setContractType] = useState<'INDEFINIDO' | 'PLAZO_FIJO'>('INDEFINIDO');
    const [baseSalary, setBaseSalary] = useState<number>(0);
    const [hasGratification, setHasGratification] = useState(true);
    const [selectedAFP, setSelectedAFP] = useState(AFPS[1].name); // Modelo default
    const [fonasa, setFonasa] = useState(true);
    const [isapreAmount, setIsapreAmount] = useState<number>(0); // In CLP for simplicity, usually UF
    const [colacion, setColacion] = useState<number>(0);
    const [movilizacion, setMovilizacion] = useState<number>(0);

    // --- OUTPUTS ---
    const [result, setResult] = useState<any>(null);

    const formatCLP = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);



    // ... class begins ...

    const calculate = () => {
        const input: PayrollInput = {
            baseSalary,
            hasGratification,
            contractType,
            afpName: selectedAFP,
            fonasa,
            isapreAmount,
            colacion,
            movilizacion
        };

        const calculatedResult = calculatePayroll(input);
        setResult(calculatedResult);
        setStep(2);
    };

    const handleSave = async () => {
        if (!result) return;
        const today = new Date().toISOString().split('T')[0];

        // Centralization Entry
        const lines: JournalEntryLine[] = [
            // GASTOS (DEBE)
            {
                id: crypto.randomUUID(), accountId: '6.1.01', accountName: 'Sueldos Base',
                debit: result.baseSalary, credit: 0, costCenterId: '100' // Admin default
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
                id: crypto.randomUUID(), accountId: '6.1.01', accountName: 'Aporte Patronal (SIS/AFC/Mutual)',
                debit: result.sis + result.afcEmployer + result.mutual, credit: 0, costCenterId: '100'
            },

            // PASIVOS (HABER)
            {
                id: crypto.randomUUID(), accountId: '2.1.04', accountName: 'Instituciones Previsionales (AFP/Salud/Mutual/AFC)',
                debit: 0,
                // Sum of all deductions + employer cost parts
                credit: result.afpAmount + result.healthTotal + result.afcWorker + result.sis + result.afcEmployer + result.mutual
            },
            {
                id: crypto.randomUUID(), accountId: '2.1.05', accountName: 'Impuesto Único por Pagar',
                debit: 0, credit: result.tax
            },
            {
                id: crypto.randomUUID(), accountId: '2.1.06', accountName: 'Sueldos por Pagar (Líquido)',
                debit: 0, credit: result.liquid
            }
        ].filter(l => (l.debit + l.credit) > 0);

        const newEntry: JournalEntry = {
            id: crypto.randomUUID(),
            date: today,
            glosa: `Remuneración ${employeeName} - ${new Date().toLocaleString('es-CL', { month: 'long' })}`,
            type: 'egreso', // Should be traspaso (provision) usually but let's assume immediate impact context or keep standard
            lines,
            total: result.employerCost,
            createdAt: new Date().toISOString(),
            status: 'posted'
        };
        await saveEntry(newEntry);

        // --- NEW: SAVE TO HISTORY ---
        const processId = crypto.randomUUID();
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        const payrollProcess: any = { // Utilizing 'any' temporarily to bypass strict type check if needed, but structure matches
            id: processId,
            month: currentMonth,
            year: currentYear,
            employeeId: selectedEmployeeId || 'manual',
            // Snapshot of calculations
            calculations: {
                baseSalary: result.baseSalary,
                gratification: result.gratification,
                totalTaxable: result.taxableIncome,
                totalNonTaxable: result.nonTaxableIncome,
                afpAmount: result.afpAmount,
                healthAmount: result.healthTotal,
                afcAmount: result.afcWorker,
                tax: result.tax,
                totalDiscounts: result.totalDiscounts,
                liquidSalary: result.liquid,
                employerCost: result.employerCost
            },
            status: 'PROCESSED'
        };

        if (addPayrollProcess) {
            addPayrollProcess(payrollProcess);
        }

        onBack();
    };

    return (
        <div className="animate-in fade-in slide-in-from-right duration-500 max-w-5xl mx-auto pb-12">

            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft className="text-slate-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Users className="text-pink-600" /> Generador de Liquidaciones Pro
                    </h1>
                    <p className="text-slate-500 text-sm">Normativa Chilena 2024-2025 (Topes, Traspasos y UTM)</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* --- LEFT COLUMN: INPUT FORM --- */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <FileText size={20} className="text-pink-500" /> Datos del Contrato
                        </h3>

                        <div className="space-y-4">
                            {/* NEW: Employee Selector */}
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Cargar Colaborador (Opcional)</label>
                                <select
                                    value={selectedEmployeeId}
                                    onChange={(e) => handleEmployeeSelect(e.target.value)}
                                    className="w-full bg-white border border-blue-200 text-blue-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-semibold"
                                >
                                    <option value="">-- Seleccionar para Auto-completar --</option>
                                    {employees.filter(e => e.isActive).map(e => (
                                        <option key={e.id} value={e.id}>{e.rut} - {e.names} {e.fatherName}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Trabajador</label>
                                <input type="text" value={employeeName} onChange={e => setEmployeeName(e.target.value)} className="input-std w-full" placeholder="Ej: Marcela Paz" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo Contrato</label>
                                    <select value={contractType} onChange={e => setContractType(e.target.value as any)} className="input-std w-full">
                                        <option value="INDEFINIDO">Indefinido</option>
                                        <option value="PLAZO_FIJO">Plazo Fijo</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">AFP</label>
                                    <select value={selectedAFP} onChange={e => setSelectedAFP(e.target.value)} className="input-std w-full">
                                        {AFPS.map(a => <option key={a.name} value={a.name}>{a.name} ({a.rate}%)</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Previsión Salud</label>
                                <div className="flex bg-slate-100 rounded-lg p-1 mb-2">
                                    <button
                                        onClick={() => setFonasa(true)}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${fonasa ? 'bg-white shadow text-pink-600' : 'text-slate-500'}`}
                                    >
                                        FONASA (7%)
                                    </button>
                                    <button
                                        onClick={() => setFonasa(false)}
                                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${!fonasa ? 'bg-white shadow text-pink-600' : 'text-slate-500'}`}
                                    >
                                        ISAPRE
                                    </button>
                                </div>
                                {!fonasa && (
                                    <div className="animate-in fade-in">
                                        <label className="block text-xs text-slate-400 mb-1">Plan Pactado (CLP)</label>
                                        <input
                                            type="number"
                                            value={isapreAmount}
                                            onChange={e => setIsapreAmount(Number(e.target.value))}
                                            className="input-std w-full font-mono text-sm"
                                            placeholder="Valor plan en pesos"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <DollarSign size={20} className="text-emerald-500" /> Remuneración
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sueldo Base Mensual</label>
                                <input type="number" value={baseSalary} onChange={e => setBaseSalary(Number(e.target.value))} className="input-std w-full font-bold text-slate-700" />
                            </div>

                            <div className="flex items-center gap-2">
                                <input type="checkbox" checked={hasGratification} onChange={e => setHasGratification(e.target.checked)} id="grat" className="rounded text-pink-600 focus:ring-pink-500" />
                                <label htmlFor="grat" className="text-sm text-slate-700">Incluir Gratificación Legal (Tope 4.75 IMM)</label>
                            </div>

                            <div className="h-px bg-slate-100 my-2"></div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Colación</label>
                                    <input type="number" value={colacion} onChange={e => setColacion(Number(e.target.value))} className="input-std w-full" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Movilización</label>
                                    <input type="number" value={movilizacion} onChange={e => setMovilizacion(Number(e.target.value))} className="input-std w-full" />
                                </div>
                            </div>

                            <button onClick={calculate} className="w-full bg-pink-600 text-white py-3 rounded-xl font-bold hover:bg-pink-700 transition-all shadow-lg shadow-pink-200 hover:shadow-pink-300 transform hover:-translate-y-0.5 mt-4">
                                Calcular Liquidación
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- RIGHT COLUMN: PREVIEW --- */}
                <div className="lg:col-span-7">
                    {result ? (
                        <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-700">
                            {/* Paper Header */}
                            <div className="bg-slate-800 text-white p-6 relative overflow-hidden">
                                <div className="relative z-10 flex justify-between items-start">
                                    <div>
                                        <h2 className="text-xl font-bold">Liquidación de Sueldo</h2>
                                        <p className="text-slate-400 text-sm">Detalle de Haberes y Descuentos</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-mono font-bold text-emerald-400">{formatCLP(result.liquid)}</div>
                                        <div className="text-xs text-slate-400 uppercase tracking-widest">Líquido a Pagar</div>
                                    </div>
                                </div>
                                <div className="absolute -right-10 -top-10 bg-white/5 w-40 h-40 rounded-full blur-3xl"></div>
                            </div>

                            <div className="p-6 grid grid-cols-2 gap-8 text-sm">
                                {/* HABERES */}
                                <div>
                                    <h4 className="font-bold text-emerald-700 mb-3 border-b border-emerald-100 pb-1">Haberes</h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span>Sueldo Base</span>
                                            <span className="font-mono">{formatCLP(result.baseSalary)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Gratificación Legal</span>
                                            <span className="font-mono">{formatCLP(result.gratification)}</span>
                                        </div>
                                        <div className="flex justify-between font-semibold text-slate-600 bg-slate-50 px-2 rounded">
                                            <span>Total Imponible</span>
                                            <span className="font-mono">{formatCLP(result.taxableIncome)}</span>
                                        </div>
                                        <div className="mt-4 pt-2 border-t border-slate-100"></div>
                                        <div className="flex justify-between text-slate-500">
                                            <span>Movilización</span>
                                            <span className="font-mono">{formatCLP(result.nonTaxableIncome / 2)}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-500">
                                            <span>Colación</span>
                                            <span className="font-mono">{formatCLP(result.nonTaxableIncome / 2)}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-slate-800 mt-2 bg-emerald-50 px-2 py-1 rounded">
                                            <span>Total Haberes</span>
                                            <span className="font-mono">{formatCLP(result.totalHaberes)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* DESCUENTOS */}
                                <div>
                                    <h4 className="font-bold text-rose-700 mb-3 border-b border-rose-100 pb-1">Descuentos</h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span>AFP {result.afpName}</span>
                                            <span className="font-mono text-rose-600">{formatCLP(result.afpAmount)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Salud ({fonasa ? 'Fonasa' : 'Isapre'})</span>
                                            <span className="font-mono text-rose-600">{formatCLP(result.healthTotal)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Seg. Cesantía {result.afcWorker > 0 ? '(0.6%)' : '(0%)'}</span>
                                            <span className="font-mono text-rose-600">{formatCLP(result.afcWorker)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Impuesto Único</span>
                                            <span className="font-mono text-rose-600">{formatCLP(result.tax)}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-slate-800 mt-auto bg-rose-50 px-2 py-1 rounded pt-6 self-end">
                                            <span>Total Descuentos</span>
                                            <span className="font-mono">{formatCLP(result.totalDiscounts)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* COSTO EMPRESA FOOTER */}
                            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 text-xs text-slate-500">
                                <div className="flex justify-between items-center">
                                    <div className="flex gap-4">
                                        <span>SIS: {formatCLP(result.sis)}</span>
                                        <span>AFC Empleador: {formatCLP(result.afcEmployer)}</span>
                                        <span>Mutual: {formatCLP(result.mutual)}</span>
                                    </div>
                                    <div className="font-bold">Costo Empresa Total: {formatCLP(result.employerCost)}</div>
                                </div>
                            </div>

                            <button onClick={handleSave} className="w-full bg-slate-900 text-white py-4 font-bold hover:bg-black transition-colors flex items-center justify-center gap-2">
                                <Save size={18} /> Centralizar Remuneraciones (Generar Asiento)
                            </button>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-2xl min-h-[400px]">
                            <Building2 size={64} className="mb-4 opacity-50" />
                            <p className="font-medium">Complete el formulario para visualizar</p>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .input-std {
                    border: 1px solid #e2e8f0;
                    border-radius: 0.5rem;
                    padding: 0.5rem 0.75rem;
                    font-size: 0.875rem;
                    outline: none;
                    transition: all 0.2s;
                }
                .input-std:focus {
                    border-color: #db2777;
                    box-shadow: 0 0 0 3px rgba(219, 39, 119, 0.1);
                }
            `}</style>
        </div>
    );
};
