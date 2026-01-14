
import React, { useState, useEffect } from 'react';
import { JournalEntry } from '../types';
import { Button } from './Button';
import { Printer, Download, Save, RefreshCw, Calculator, AlertTriangle } from 'lucide-react';

interface Formulario29ViewProps {
  entries: JournalEntry[];
  onBack: () => void;
}

// Helper component for a Form line
const F29Line = ({ 
    label, 
    code, 
    value, 
    type = 'normal', 
    readOnly = true,
    onChange
}: { 
    label: string, 
    code: string, 
    value: number, 
    type?: 'normal' | 'header' | 'total' | 'subtotal',
    readOnly?: boolean,
    onChange?: (val: number) => void
}) => {
    return (
        <div className={`flex items-center text-xs border-b border-gray-200 ${type === 'total' ? 'bg-yellow-50 font-bold' : type === 'subtotal' ? 'bg-gray-50 font-semibold' : 'hover:bg-gray-50'}`}>
            <div className="flex-grow px-3 py-1.5 text-gray-700 truncate">{label}</div>
            <div className="w-12 px-1 py-1.5 text-center text-gray-500 font-mono border-l border-r border-gray-200 bg-gray-50 select-none">{code}</div>
            <div className="w-32 px-2 py-0.5 border-r border-gray-200 relative">
                <div className="absolute left-2 top-1.5 text-gray-400 font-light">$</div>
                <input 
                    type="number"
                    readOnly={readOnly}
                    value={value}
                    onChange={(e) => onChange && onChange(Number(e.target.value))}
                    className={`w-full text-right bg-transparent outline-none ${readOnly ? 'cursor-default' : 'cursor-text text-blue-700 font-bold'}`}
                />
            </div>
            <div className="w-8 text-center text-gray-400 font-bold">
                {type === 'total' ? '=' : type === 'subtotal' ? '' : '+'}
            </div>
        </div>
    );
};

export const Formulario29View: React.FC<Formulario29ViewProps> = ({ entries, onBack }) => {
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(false);

    // Form Data State
    const [ppmRate, setPpmRate] = useState(1.5);
    
    // Calculated Values
    const [salesNet, setSalesNet] = useState(0);
    const [salesVat, setSalesVat] = useState(0);
    const [purchasesNet, setPurchasesNet] = useState(0);
    const [purchasesVat, setPurchasesVat] = useState(0);
    
    // Effects to calculate from entries
    useEffect(() => {
        calculateFromEntries();
    }, [entries, month, year]);

    const calculateFromEntries = () => {
        setLoading(true);
        // Filter entries for selected period
        const periodEntries = entries.filter(e => {
            const d = new Date(e.date);
            return d.getMonth() + 1 === month && d.getFullYear() === year;
        });

        // 1. Calculate SALES (Ingresos)
        // Assumption: 'ingreso' entries are GROSS (include IVA)
        const totalSalesGross = periodEntries
            .filter(e => e.type === 'ingreso')
            .reduce((acc, curr) => acc + curr.total, 0);
        
        const calculatedSalesNet = Math.round(totalSalesGross / 1.19);
        const calculatedSalesVat = totalSalesGross - calculatedSalesNet;

        // 2. Calculate PURCHASES (Egresos)
        // Assumption: 'egreso' entries are GROSS
        const totalPurchasesGross = periodEntries
            .filter(e => e.type === 'egreso')
            .reduce((acc, curr) => acc + curr.total, 0);

        const calculatedPurchasesNet = Math.round(totalPurchasesGross / 1.19);
        const calculatedPurchasesVat = totalPurchasesGross - calculatedPurchasesNet;

        setSalesNet(calculatedSalesNet);
        setSalesVat(calculatedSalesVat);
        setPurchasesNet(calculatedPurchasesNet);
        setPurchasesVat(calculatedPurchasesVat);

        setTimeout(() => setLoading(false), 500); // Simulate calc time
    };

    // Derived Calculations
    const totalDebits = salesVat; // Code 538
    const totalCredits = purchasesVat; // Code 537
    const taxResult = totalDebits - totalCredits; // Code 89 or 77
    const ppmAmount = Math.round(salesNet * (ppmRate / 100)); // Code 62
    
    // Determine Total to Pay
    const totalToPay = (taxResult > 0 ? taxResult : 0) + ppmAmount;

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        Formulario 29 
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded border border-blue-200">Declaración Mensual</span>
                    </h2>
                    <p className="text-gray-500">Impuesto al Valor Agregado (IVA) y Pagos Provisionales (PPM)</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={onBack}>Volver</Button>
                    <Button variant="secondary"><Printer size={16} className="mr-2" /> Imprimir</Button>
                    <Button><Save size={16} className="mr-2" /> Guardar Declaración</Button>
                </div>
            </div>

            {/* Control Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-500 uppercase">Periodo Tributario</label>
                        <div className="flex items-center gap-2">
                            <select 
                                value={month} 
                                onChange={(e) => setMonth(Number(e.target.value))}
                                className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                {Array.from({length: 12}, (_, i) => (
                                    <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('es-CL', {month: 'long'})}</option>
                                ))}
                            </select>
                            <input 
                                type="number" 
                                value={year} 
                                onChange={(e) => setYear(Number(e.target.value))}
                                className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>
                    <div className="h-8 w-px bg-gray-300 mx-2"></div>
                     <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-500 uppercase">Moneda</label>
                        <span className="text-sm font-bold text-gray-800">CLP (Pesos Chilenos)</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                     <div className="flex flex-col items-end mr-4">
                        <label className="text-xs font-bold text-gray-500 uppercase">Estado Cálculo</label>
                        {loading ? (
                            <span className="text-sm text-blue-600 flex items-center gap-1"><RefreshCw size={14} className="animate-spin"/> Calculando...</span>
                        ) : (
                            <span className="text-sm text-emerald-600 flex items-center gap-1"><Calculator size={14}/> Actualizado</span>
                        )}
                    </div>
                    <button 
                        onClick={calculateFromEntries}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors"
                    >
                        <RefreshCw size={14} /> Recalcular desde Libros
                    </button>
                </div>
            </div>

            {/* Form Simulation Container */}
            <div className="flex-grow bg-slate-100 rounded-xl border border-slate-300 p-6 overflow-auto shadow-inner">
                <div className="max-w-4xl mx-auto bg-white shadow-2xl min-h-[800px] relative">
                    
                    {/* Official Header Look */}
                    <div className="border-b-2 border-black p-4 bg-gray-50">
                        <div className="flex justify-between items-end mb-2">
                            <h1 className="text-2xl font-extrabold tracking-tighter">FORMULARIO 29</h1>
                            <div className="text-right">
                                <div className="text-xs font-bold uppercase tracking-widest text-gray-500">Versión Internet</div>
                                <div className="text-xl font-bold font-mono">V 1.10</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-12 gap-0 border border-black text-center text-xs">
                            <div className="col-span-3 border-r border-black p-1 bg-gray-200 font-bold">ROL UNICO TRIBUTARIO</div>
                            <div className="col-span-9 p-1 font-mono text-lg tracking-widest bg-white">76.123.456-7</div>
                        </div>
                    </div>

                    {/* DÉBITOS Y VENTAS */}
                    <div className="border-b border-gray-400">
                        <div className="bg-blue-900 text-white px-2 py-1 text-xs font-bold uppercase flex justify-between">
                            <span>Débitos y Ventas</span>
                            <span>Sección 1</span>
                        </div>
                        
                        <F29Line label="Exportaciones" code="585" value={0} />
                        <F29Line label="Ventas y/o Servicios Prestados Exentos o No Gravados" code="586" value={0} />
                        <F29Line label="Facturas Emitidas por Ventas y Servicios del Giro (Neto)" code="503" value={salesNet} />
                        <F29Line label="Boletas de Ventas y Servicios (Total)" code="110" value={0} />
                        <F29Line label="Notas de Débito Emitidas" code="512" value={0} />
                        <F29Line label="Notas de Crédito Emitidas" code="513" value={0} type="normal" />
                        
                        {/* Subtotal Débito */}
                        <div className="mt-2 border-t-2 border-black"></div>
                        <F29Line label="TOTAL DÉBITOS (Impuesto Determinado)" code="538" value={totalDebits} type="total" />
                    </div>

                     {/* CRÉDITOS Y COMPRAS */}
                    <div className="border-b border-gray-400 mt-4">
                        <div className="bg-blue-900 text-white px-2 py-1 text-xs font-bold uppercase flex justify-between">
                            <span>Créditos y Compras</span>
                            <span>Sección 2</span>
                        </div>
                        
                        <F29Line label="Facturas Recibidas del Giro y Facturas de Compra (Neto)" code="519" value={purchasesNet} />
                        <F29Line label="Facturas Activo Fijo" code="524" value={0} />
                        <F29Line label="Notas de Débito Recibidas" code="527" value={0} />
                        <F29Line label="Notas de Crédito Recibidas" code="528" value={0} />
                        <F29Line label="Importaciones del Giro" code="534" value={0} />
                        
                        <div className="mt-2 border-t-2 border-black"></div>
                        {/* Use 537 for Total Credits */}
                        <F29Line label="TOTAL CRÉDITOS" code="537" value={totalCredits} type="total" />
                    </div>

                    {/* RESULTADO IVA */}
                    <div className="bg-gray-100 p-4 border-b border-gray-400">
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                {taxResult > 0 ? (
                                    <div className="bg-red-50 border border-red-200 p-2 rounded">
                                        <div className="text-xs text-red-600 font-bold uppercase mb-1">Impuesto Determinado (A Pagar)</div>
                                        <div className="flex justify-between items-center">
                                            <span className="font-mono text-gray-500 font-bold border p-1 bg-white">089</span>
                                            <span className="text-xl font-bold text-gray-800">$ {taxResult.toLocaleString('es-CL')}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-green-50 border border-green-200 p-2 rounded opacity-50">
                                         <div className="text-xs text-green-600 font-bold uppercase mb-1">Remanente Crédito Fiscal</div>
                                         <div className="flex justify-between items-center">
                                            <span className="font-mono text-gray-500 font-bold border p-1 bg-white">077</span>
                                            <span className="text-xl font-bold text-gray-800">$ 0</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                             <div>
                                {taxResult <= 0 && (
                                    <div className="bg-green-50 border border-green-200 p-2 rounded">
                                         <div className="text-xs text-green-600 font-bold uppercase mb-1">Remanente Crédito Fiscal</div>
                                         <div className="flex justify-between items-center">
                                            <span className="font-mono text-gray-500 font-bold border p-1 bg-white">077</span>
                                            <span className="text-xl font-bold text-gray-800">$ {Math.abs(taxResult).toLocaleString('es-CL')}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* IMPUESTO A LA RENTA (PPM) */}
                    <div className="border-b border-gray-400 mt-4">
                        <div className="bg-blue-900 text-white px-2 py-1 text-xs font-bold uppercase flex justify-between">
                            <span>Impuesto a la Renta (PPM)</span>
                            <span>Sección 3</span>
                        </div>
                        
                        <div className="flex items-center text-xs border-b border-gray-200 p-1">
                             <div className="flex-grow px-2 py-1.5 text-gray-700">PPM Neto Determinado</div>
                             <div className="flex items-center gap-2">
                                <label className="text-gray-500">Tasa %</label>
                                <input 
                                    type="number" 
                                    value={ppmRate} 
                                    onChange={(e) => setPpmRate(Number(e.target.value))}
                                    className="w-16 border border-gray-300 rounded px-1 text-right"
                                    step="0.1"
                                />
                             </div>
                             <div className="w-12 px-1 py-1.5 text-center text-gray-500 font-mono bg-gray-50 mx-2 border">062</div>
                             <div className="w-32 px-2 font-bold text-right text-blue-800">
                                $ {ppmAmount.toLocaleString('es-CL')}
                             </div>
                        </div>
                         <F29Line label="Retención 2da Categoría (Honorarios)" code="151" value={0} readOnly={false} />
                    </div>

                    {/* TOTAL A PAGAR */}
                    <div className="bg-slate-800 text-white p-6 mt-8 mb-8 mx-4 rounded-lg shadow-lg">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold uppercase tracking-widest">Total a Pagar en Plazo Legal</h3>
                                <div className="text-sm text-slate-300 mt-1">Suma de Línea 89 (IVA) + Línea 62 (PPM) + Otros</div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="font-mono text-xl bg-slate-700 px-3 py-1 rounded border border-slate-600">Code 091</span>
                                <span className="text-4xl font-bold text-emerald-400">$ {totalToPay.toLocaleString('es-CL')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Disclaimer */}
                    <div className="p-4 text-center text-xs text-gray-400">
                        <p>Esta es una simulación basada en los registros contables actuales.</p>
                        <p>Los valores deben ser verificados con los documentos tributarios electrónicos (DTE) en el portal del SII.</p>
                    </div>

                </div>
            </div>
        </div>
    );
};
