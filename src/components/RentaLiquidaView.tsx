import React, { useEffect, useState } from 'react';
import { taxEngine, RLIResult, TaxAdjustment, TaxScheme } from '../services/taxEngine';
import { ArrowLeft, Save, Plus, Trash2, Printer, FileText } from 'lucide-react';

interface RentaLiquidaViewProps {
    onBack: () => void;
}

export const RentaLiquidaView: React.FC<RentaLiquidaViewProps> = ({ onBack }) => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [scheme, setScheme] = useState<TaxScheme>('14D3');
    const [rliData, setRliData] = useState<RLIResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [manualAdjustments, setManualAdjustments] = useState<TaxAdjustment[]>([]);

    useEffect(() => {
        loadData();
    }, [year, scheme]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await taxEngine.calculateRLI(year, scheme);
            setRliData(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddAdjustment = (type: 'AGREGADO' | 'DEDUCCION') => {
        const concept = prompt(`Glosa de la Partida (${type === 'AGREGADO' ? 'Agregado' : 'Deducción'}):`);
        if (!concept) return;
        const codeStr = prompt("Código F22 (Opcional):");
        const amountStr = prompt("Monto Histórico ($):");
        if (!amountStr) return;

        const amount = parseInt(amountStr);
        if (isNaN(amount)) return;

        const newAdj: TaxAdjustment = {
            id: crypto.randomUUID(),
            concept,
            type,
            amount: Math.abs(amount),
            isManual: true,
            code: codeStr ? parseInt(codeStr) : undefined
        };
        setManualAdjustments([...manualAdjustments, newAdj]);
    };

    const totalAdds = (rliData?.adjustments.filter(a => a.type === 'AGREGADO').reduce((sum, a) => sum + a.amount, 0) || 0) +
        manualAdjustments.filter(a => a.type === 'AGREGADO').reduce((sum, a) => sum + a.amount, 0);

    const totalDeducts = (rliData?.adjustments.filter(a => a.type === 'DEDUCCION').reduce((sum, a) => sum + a.amount, 0) || 0) +
        manualAdjustments.filter(a => a.type === 'DEDUCCION').reduce((sum, a) => sum + a.amount, 0);

    const financialProfit = rliData?.financialProfit || 0;
    const finalRLI = financialProfit + totalAdds - totalDeducts;

    // Tax Rate logic
    const taxRate = scheme === '14D3' ? 0.10 : 0.27;
    const estimatedTax = Math.max(0, finalRLI * taxRate);

    if (loading) return <div className="p-8 text-center font-mono text-sm">Cargando Formulario...</div>;

    const formatCurrency = (amount: number) => amount.toLocaleString('es-CL');

    return (
        <div className="min-h-screen bg-neutral-100 pb-20 font-sans">
            <div className="max-w-4xl mx-auto py-8">

                {/* TOOLBAR */}
                <div className="flex justify-between items-center mb-6 no-print">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="p-2 hover:bg-neutral-200 rounded border border-neutral-300 bg-white text-neutral-600 transition-colors">
                            <ArrowLeft size={16} />
                        </button>
                        <h1 className="text-lg font-bold text-neutral-700">Determinación Base Imponible</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={scheme}
                            onChange={(e) => setScheme(e.target.value as TaxScheme)}
                            className="text-xs font-medium border-neutral-300 rounded shadow-sm focus:ring-0 focus:border-neutral-400"
                        >
                            <option value="14D3">Pro Pyme General (14 D3)</option>
                            <option value="14A">Semi Integrado (14 A)</option>
                        </select>
                        <button className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 text-white text-xs font-medium rounded hover:bg-black transition-colors">
                            <Printer size={14} /> Imprimir
                        </button>
                    </div>
                </div>

                {/* OFFICIAL FORM CONTAINER */}
                <div className="bg-white shadow-sm border border-neutral-400 p-8 min-h-[800px]">

                    {/* FORM HEADER */}
                    <div className="border-b-2 border-neutral-800 pb-4 mb-6 flex justify-between items-end">
                        <div>
                            <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight uppercase">Base Imponible de Primera Categoría</h2>
                            <p className="text-xs font-bold text-neutral-500 uppercase mt-1">Regimen: {scheme === '14D3' ? 'Art. 14 Letra D) N° 3' : 'Art. 14 Letra A)'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold text-neutral-900">AÑO TRIBUTARIO {year + 1}</p>
                            <p className="text-xs text-neutral-500">Formulario Interno de Trabajo</p>
                        </div>
                    </div>

                    {/* RECUADRO TABLE */}
                    <div className="border border-neutral-500">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 bg-neutral-100 text-xs font-bold border-b border-neutral-500 text-neutral-700 h-8 items-center text-center">
                            <div className="col-span-8 text-left pl-4 border-r border-neutral-300 h-full flex items-center">CONCEPTO O PARTIDA</div>
                            <div className="col-span-1 border-r border-neutral-300 h-full flex items-center justify-center">COD</div>
                            <div className="col-span-3 h-full flex items-center justify-center">VALOR ($)</div>
                        </div>

                        {/* 1. FINANCIAL RESULT */}
                        <div className="grid grid-cols-12 text-sm border-b border-neutral-300 hover:bg-blue-50/10">
                            <div className="col-span-8 pl-4 py-2 border-r border-neutral-300 flex flex-col justify-center">
                                <span className="font-bold text-neutral-800">1. Resultado Financiero según Balance</span>
                                <span className="text-[10px] text-neutral-400">Total Ingresos menos Total Gastos Financieros</span>
                            </div>
                            <div className="col-span-1 border-r border-neutral-300 py-2 flex items-center justify-center font-mono text-xs text-neutral-500">
                                1637
                            </div>
                            <div className="col-span-3 py-2 px-4 text-right font-mono font-medium text-neutral-900 flex items-center justify-end">
                                {formatCurrency(financialProfit)}
                            </div>
                        </div>

                        {/* SECTION A: AGREGADOS */}
                        <div className="bg-neutral-50 border-b border-neutral-300 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-neutral-500">
                            A. Agregados a la Renta Líquida
                        </div>

                        {/* Dynamic Rows */}
                        {[...(rliData?.adjustments || []), ...manualAdjustments].filter(a => a.type === 'AGREGADO').map((adj) => (
                            <div key={adj.id} className="grid grid-cols-12 text-sm border-b border-neutral-200 hover:bg-blue-50/10 group">
                                <div className="col-span-8 pl-4 py-2 border-r border-neutral-300 flex items-center justify-between pr-4">
                                    <span className="text-neutral-700">{adj.concept}</span>
                                    {adj.isManual && <button onClick={() => setManualAdjustments(prev => prev.filter(p => p.id !== adj.id))} className="text-neutral-300 hover:text-red-600 opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>}
                                </div>
                                <div className="col-span-1 border-r border-neutral-300 py-2 flex items-center justify-center font-mono text-xs text-neutral-600">
                                    {adj.code || '-'}
                                </div>
                                <div className="col-span-3 py-2 px-4 text-right font-mono text-neutral-800 flex items-center justify-end">
                                    {formatCurrency(adj.amount)}
                                </div>
                            </div>
                        ))}

                        {/* Add Manual Button Row */}
                        <div className="grid grid-cols-12 text-xs border-b border-neutral-300 bg-white no-print">
                            <button onClick={() => handleAddAdjustment('AGREGADO')} className="col-span-12 py-1.5 text-center text-blue-600 hover:bg-blue-50 font-medium transition-colors">
                                + Agregar Partida (Agregado)
                            </button>
                        </div>

                        {/* Subtotal Agregados */}
                        <div className="grid grid-cols-12 text-sm font-bold bg-neutral-50 border-b border-neutral-300">
                            <div className="col-span-8 pl-4 py-2 text-right pr-4 text-neutral-600 uppercase text-xs tracking-wide">Total Agregados</div>
                            <div className="col-span-1 border-r border-l border-neutral-300"></div>
                            <div className="col-span-3 py-2 px-4 text-right font-mono text-neutral-900">
                                {formatCurrency(totalAdds)}
                            </div>
                        </div>


                        {/* SECTION D: DEDUCCIONES */}
                        <div className="bg-neutral-50 border-b border-neutral-300 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-neutral-500">
                            B. Deducciones a la Renta Líquida
                        </div>

                        {/* Dynamic Rows */}
                        {[...(rliData?.adjustments || []), ...manualAdjustments].filter(a => a.type === 'DEDUCCION').map((adj) => (
                            <div key={adj.id} className="grid grid-cols-12 text-sm border-b border-neutral-200 hover:bg-blue-50/10 group">
                                <div className="col-span-8 pl-4 py-2 border-r border-neutral-300 flex items-center justify-between pr-4">
                                    <span className="text-neutral-700">{adj.concept}</span>
                                    {adj.isManual && <button onClick={() => setManualAdjustments(prev => prev.filter(p => p.id !== adj.id))} className="text-neutral-300 hover:text-red-600 opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>}
                                </div>
                                <div className="col-span-1 border-r border-neutral-300 py-2 flex items-center justify-center font-mono text-xs text-neutral-600">
                                    {adj.code || '-'}
                                </div>
                                <div className="col-span-3 py-2 px-4 text-right font-mono text-neutral-800 flex items-center justify-end">
                                    ({formatCurrency(adj.amount)})
                                </div>
                            </div>
                        ))}

                        {/* Add Manual Button Row */}
                        <div className="grid grid-cols-12 text-xs border-b border-neutral-300 bg-white no-print">
                            <button onClick={() => handleAddAdjustment('DEDUCCION')} className="col-span-12 py-1.5 text-center text-blue-600 hover:bg-blue-50 font-medium transition-colors">
                                + Agregar Partida (Deducción)
                            </button>
                        </div>

                        {/* Subtotal Deducciones */}
                        <div className="grid grid-cols-12 text-sm font-bold bg-neutral-50 border-b-2 border-neutral-500">
                            <div className="col-span-8 pl-4 py-2 text-right pr-4 text-neutral-600 uppercase text-xs tracking-wide">Total Deducciones</div>
                            <div className="col-span-1 border-r border-l border-neutral-300"></div>
                            <div className="col-span-3 py-2 px-4 text-right font-mono text-neutral-900">
                                ({formatCurrency(totalDeducts)})
                            </div>
                        </div>

                        {/* FINAL RESULT */}
                        <div className="grid grid-cols-12 text-base font-bold bg-neutral-100 border-b border-neutral-300">
                            <div className="col-span-8 pl-4 py-3 border-r border-neutral-400 flex items-center text-neutral-900 uppercase">
                                Renta Líquida Imponible (Base Imponible)
                            </div>
                            <div className="col-span-1 border-r border-neutral-400 py-3 flex items-center justify-center font-mono text-sm text-neutral-800">
                                1137
                            </div>
                            <div className="col-span-3 py-3 px-4 text-right font-mono text-neutral-900 border border-black m-[-1px] z-10 bg-white">
                                {formatCurrency(finalRLI)}
                            </div>
                        </div>

                        {/* TAX CALCULATION */}
                        <div className="grid grid-cols-12 text-sm border-b border-neutral-300">
                            <div className="col-span-8 pl-4 py-2 border-r border-neutral-300 flex items-center justify-end pr-4 text-neutral-600 font-medium">
                                Impuesto Determineado ({taxRate * 100}%)
                            </div>
                            <div className="col-span-1 border-r border-neutral-300 py-2 flex items-center justify-center font-mono text-xs text-neutral-500">

                            </div>
                            <div className="col-span-3 py-2 px-4 text-right font-mono text-neutral-900">
                                {formatCurrency(estimatedTax)}
                            </div>
                        </div>

                    </div>

                    {/* FOOTER NOTES */}
                    <div className="mt-8 text-[10px] text-neutral-400 uppercase leading-relaxed font-medium">
                        <p>Nota: Los valores presentados constituyen una propuesta preliminar basada en la contabilidad simplificada.</p>
                        <p>Esta determinación debe ser validada con los antecedentes de respaldo correspondientes según el Art. 17 del Código Tributario.</p>
                    </div>

                    <div className="mt-12 pt-8 border-t border-dotted border-neutral-400 flex justify-between text-neutral-400 text-xs font-mono">
                        <span>FOLIO: {crypto.randomUUID().slice(0, 8).toUpperCase()}</span>
                        <span>FECHA EMISION: {new Date().toLocaleDateString('es-CL')}</span>
                        <span>PAGINA 1 DE 1</span>
                    </div>

                </div>
            </div>
        </div>
    );
};
