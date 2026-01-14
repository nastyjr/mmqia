import React, { useEffect, useState } from 'react';
import { taxEngine, CPTResult } from '../services/taxEngine';
import { ArrowLeft, Edit2, Check, X, Printer, Calculator, Lock } from 'lucide-react';

interface CapitalPropioProps {
    onBack: () => void;
}

export const CapitalPropioView: React.FC<CapitalPropioProps> = ({ onBack }) => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [cptData, setCptData] = useState<CPTResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [manualOverrides, setManualOverrides] = useState<Record<string, number>>({});
    const [editingCode, setEditingCode] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');

    useEffect(() => {
        loadData();
    }, [year, manualOverrides]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await taxEngine.calculateCPT(year, '14D3', manualOverrides);
            setCptData(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const startEditing = (code: string, currentValue: number) => {
        setEditingCode(code);
        setEditValue(currentValue.toString());
    };

    const saveEdit = (code: string) => {
        const val = parseInt(editValue);
        if (!isNaN(val)) {
            setManualOverrides({ ...manualOverrides, [code]: val });
        }
        setEditingCode(null);
    };

    if (loading) return <div className="p-8 text-center font-mono text-sm">Cargando Formulario...</div>;

    const formatCurrency = (amount: number) => amount.toLocaleString('es-CL');

    const renderSection = (title: string, items: any[], type: 'ACTIVO' | 'PASIVO') => (
        <div className="mb-8">
            <div className="bg-neutral-100 border-y border-neutral-400 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-neutral-800 flex justify-between">
                <span>{title}</span>
                <span>VALOR TRIBUTARIO</span>
            </div>

            <table className="w-full text-sm border-collapse">
                <thead>
                    <tr className="text-[10px] text-neutral-500 text-left border-b border-neutral-300">
                        <th className="px-4 py-2 font-medium w-1/2">CUENTA CONTABLE</th>
                        <th className="px-4 py-2 text-right font-medium w-1/4">VALOR FINANCIERO</th>
                        <th className="px-4 py-2 text-right font-medium w-1/4">VALOR TRIBUTARIO</th>
                        <th className="w-8"></th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item) => {
                        const isModified = item.financialValue !== item.taxValue;
                        const isEditing = editingCode === item.code;

                        return (
                            <tr key={item.code} className="border-b border-neutral-200 hover:bg-yellow-50/50 group">
                                <td className="px-4 py-1.5 align-middle">
                                    <div className="flex flex-col">
                                        <span className="text-neutral-800 font-medium">{item.name}</span>
                                        <span className="text-[9px] text-neutral-400 font-mono">{item.code}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-1.5 text-right font-mono text-neutral-500 align-middle">
                                    {formatCurrency(item.financialValue)}
                                </td>
                                <td className="px-4 py-1.5 text-right font-mono font-bold text-neutral-900 align-middle relative">
                                    {isEditing ? (
                                        <div className="flex items-center justify-end gap-1 absolute right-2 top-0.5 bg-white shadow-md p-1 rounded border border-neutral-400 z-10">
                                            <input
                                                autoFocus
                                                type="number"
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value)}
                                                className="w-24 text-right text-xs border-neutral-300 rounded px-1 py-0.5 focus:ring-1 focus:ring-black"
                                            />
                                            <button onClick={() => saveEdit(item.code)} className="text-green-600 hover:bg-green-50 p-0.5"><Check size={12} /></button>
                                            <button onClick={() => setEditingCode(null)} className="text-red-500 hover:bg-red-50 p-0.5"><X size={12} /></button>
                                        </div>
                                    ) : (
                                        <span className={isModified ? 'bg-neutral-200 px-1' : ''}>
                                            {formatCurrency(item.taxValue)}
                                        </span>
                                    )}
                                </td>
                                <td className="text-center align-middle">
                                    <button onClick={() => startEditing(item.code, item.taxValue)} className="text-neutral-300 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                                        <Edit2 size={12} />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr className="bg-neutral-50 font-bold text-neutral-800 text-xs border-b border-neutral-400">
                        <td className="px-4 py-2 uppercase text-right" colSpan={2}>Total {type === 'ACTIVO' ? 'Activos' : 'Pasivos'}</td>
                        <td className="px-4 py-2 text-right font-mono">
                            {formatCurrency(type === 'ACTIVO' ? cptData?.totalAssetsTax || 0 : cptData?.totalLiabilitiesTax || 0)}
                        </td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );

    return (
        <div className="min-h-screen bg-neutral-100 pb-20 font-sans">
            <div className="max-w-5xl mx-auto py-8">

                {/* TOOLBAR */}
                <div className="flex justify-between items-center mb-6 no-print">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="p-2 hover:bg-neutral-200 rounded border border-neutral-300 bg-white text-neutral-600 transition-colors">
                            <ArrowLeft size={16} />
                        </button>
                        <h1 className="text-lg font-bold text-neutral-700">Determinación Capital Propio</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 text-white text-xs font-medium rounded hover:bg-black transition-colors">
                            <Printer size={14} /> Imprimir Hoja de Trabajo
                        </button>
                    </div>
                </div>

                {/* OFFICIAL FORM CONTAINER */}
                <div className="bg-white shadow-sm border border-neutral-400 p-8 min-h-[800px]">

                    {/* FORM HEADER */}
                    <div className="border-b-2 border-neutral-800 pb-4 mb-8 flex justify-between items-end">
                        <div>
                            <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight uppercase">Capital Propio Tributario</h2>
                            <p className="text-xs font-bold text-neutral-500 uppercase mt-1">Método del Activo (Balance General 8 Columnas)</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold text-neutral-900">AÑO TRIBUTARIO {year + 1}</p>
                            <p className="text-xs text-neutral-500">Recuadro N° 14 (Simplificado)</p>
                        </div>
                    </div>

                    {/* MAIN CONTENT */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            {renderSection('I. Total de Activos', cptData?.details.assets || [], 'ACTIVO')}
                        </div>
                        <div>
                            {renderSection('II. Pasivo Exigible', cptData?.details.liabilities || [], 'PASIVO')}
                        </div>
                    </div>

                    {/* DETERMINATION SUMMARY */}
                    <div className="mt-8 border border-neutral-500">
                        <div className="grid grid-cols-12 text-sm border-b border-neutral-300 bg-neutral-50 font-bold text-neutral-600">
                            <div className="col-span-8 px-4 py-2 border-r border-neutral-300 text-right uppercase text-xs tracking-wide">Concepto</div>
                            <div className="col-span-1 border-r border-neutral-300 text-center py-2 text-xs">Código</div>
                            <div className="col-span-3 text-center py-2 text-xs">Valor</div>
                        </div>

                        {/* Positive Row */}
                        <div className="grid grid-cols-12 text-sm border-b border-neutral-300">
                            <div className="col-span-8 px-4 py-2 border-r border-neutral-300 text-right font-medium text-neutral-800">Total Activos Tributarios</div>
                            <div className="col-span-1 border-r border-neutral-300 flex items-center justify-center text-xs text-neutral-500"></div>
                            <div className="col-span-3 px-4 py-2 text-right font-mono text-neutral-900">{formatCurrency(cptData?.totalAssetsTax || 0)}</div>
                        </div>

                        {/* Negative Row */}
                        <div className="grid grid-cols-12 text-sm border-b border-neutral-300">
                            <div className="col-span-8 px-4 py-2 border-r border-neutral-300 text-right font-medium text-neutral-800">Menos: Pasivo Exigible</div>
                            <div className="col-span-1 border-r border-neutral-300 flex items-center justify-center text-xs text-neutral-500"></div>
                            <div className="col-span-3 px-4 py-2 text-right font-mono text-neutral-900">({formatCurrency(cptData?.totalLiabilitiesTax || 0)})</div>
                        </div>

                        {/* Final Result */}
                        <div className="grid grid-cols-12 text-base font-bold bg-neutral-100">
                            <div className="col-span-8 px-4 py-3 border-r border-neutral-400 text-right uppercase text-neutral-900 flex items-center justify-end gap-2">
                                <Lock size={14} className="text-neutral-400" /> Capital Propio Tributario Final
                            </div>
                            <div className="col-span-1 border-r border-neutral-400 flex items-center justify-center font-mono text-sm text-neutral-800">
                                645
                            </div>
                            <div className="col-span-3 px-4 py-3 text-right font-mono text-neutral-900 border border-black m-[-1px] z-10 bg-white">
                                {formatCurrency(cptData?.cpt || 0)}
                            </div>
                        </div>
                    </div>

                    {/* LOCK INFO */}
                    <div className="mt-8 flex items-start gap-3 bg-neutral-50 p-4 border border-neutral-200">
                        <Lock size={16} className="text-neutral-400 mt-0.5" />
                        <div className="text-xs text-neutral-500 space-y-1">
                            <p className="font-bold uppercase text-neutral-600">Control de Integridad</p>
                            <p>El Capital Propio Tributario calculado debe coincidir con el Patrimonio Financiero ajustado por las agregaciones y deducciones de la RLI y cuentas de patrimonio.</p>
                            <p>Diferencias pueden indicar inconsistencias en la razonabilidad del Patrimonio (Recuadro 14).</p>
                        </div>
                    </div>

                    <div className="mt-8 pt-4 border-t border-dotted border-neutral-400 flex justify-between text-neutral-400 text-[10px] font-mono uppercase">
                        <span>Sistema de Auditoría Tributaria</span>
                        <span>Documento Interno - No Válido como DJ</span>
                    </div>

                </div>
            </div>
        </div>
    );
};
