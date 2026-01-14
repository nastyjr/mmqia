import React, { useState, useEffect } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { FixedAsset, ASSET_CATEGORIES } from '../types/fixed-assets'; // You'll need to adjust path if necessary
import { INITIAL_ACCOUNTS } from '../types';
import { ArrowLeft, Plus, Trash, Calculator, Save, FileText, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from './Button'; // Assuming we have a Button component
import { JournalEntry } from '../types';

export const FixedAssetsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { saveEntry } = useAccounting();
    const [assets, setAssets] = useState<FixedAsset[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [ipcFactor, setIpcFactor] = useState(0.0); // 0% default

    // Form State
    const [newItem, setNewItem] = useState<Partial<FixedAsset>>({
        purchaseDate: new Date().toISOString().split('T')[0],
        usefulLifeYears: 3,
        purchaseValue: 0,
        residualValue: 0
    });

    // Load from LocalStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('fixed_assets_db');
        if (saved) {
            setAssets(JSON.parse(saved));
        }
    }, []);

    // Save to LocalStorage on change
    useEffect(() => {
        localStorage.setItem('fixed_assets_db', JSON.stringify(assets));
    }, [assets]);

    const handleAddAsset = () => {
        if (!newItem.name || !newItem.purchaseValue) return;

        const category = ASSET_CATEGORIES.find(c => c.id === newItem.assetAccountId);
        const lifeYears = newItem.usefulLifeYears || (category ? category.lifeYears : 3);

        const asset: FixedAsset = {
            id: crypto.randomUUID(),
            name: newItem.name,
            description: newItem.description,
            purchaseDate: newItem.purchaseDate!,
            purchaseValue: Number(newItem.purchaseValue),
            residualValue: Number(newItem.residualValue) || 0,
            usefulLifeYears: lifeYears,
            usefulLifeMonths: lifeYears * 12,
            status: 'ACTIVE',
            assetAccountId: newItem.assetAccountId || '1.2.01', // Default Muebles
            accumulatedDepreciation: 0,
            accumulatedCM: 0,
            currentValue: Number(newItem.purchaseValue),
            lastDepreciationDate: undefined
        };

        setAssets([...assets, asset]);
        setNewItem({
            purchaseDate: new Date().toISOString().split('T')[0],
            usefulLifeYears: 3,
            purchaseValue: 0,
            residualValue: 0
        });
        setIsModalOpen(false);
    };

    const handleDelete = (id: string) => {
        if (confirm('¿Eliminar este activo?')) {
            setAssets(assets.filter(a => a.id !== id));
        }
    };

    const calculateDepreciation = () => {
        // Simple Linear Depreciation Logic with CM
        // In real world, this is complex (monthly factors).
        // Here we simulate a "Period Depreciation" based on IPC input.

        const updatedAssets = assets.map(asset => {
            if (asset.status !== 'ACTIVE') return asset;

            // 1. Corrección Monetaria
            const cmAmount = Math.round(asset.currentValue * (ipcFactor / 100));
            const valueWithCM = asset.currentValue + cmAmount;

            // 2. Depreciation
            // Depreciable Amount = Updated Value - Residual
            // Dep = Depreciable Amount / Remaining Life (Simplified: Annual / 12 * 1)
            // Let's assume this is a MONTHLY calculation
            const monthlyDep = Math.round((valueWithCM - asset.residualValue) / asset.usefulLifeMonths);

            // Check if fully depreciated
            if (asset.accumulatedDepreciation + monthlyDep >= valueWithCM - asset.residualValue) {
                // Final adjustment
                return {
                    ...asset,
                    accumulatedCM: asset.accumulatedCM + cmAmount,
                    accumulatedDepreciation: valueWithCM - asset.residualValue,
                    currentValue: asset.residualValue, // Book value = Residual
                    status: 'FULLY_DEPRECIATED' as const
                };
            }

            return {
                ...asset,
                accumulatedCM: asset.accumulatedCM + cmAmount,
                accumulatedDepreciation: asset.accumulatedDepreciation + monthlyDep,
                currentValue: valueWithCM - monthlyDep
            };
        });

        setAssets(updatedAssets);
        alert(`Cálculo realizado. CM aplicada: ${ipcFactor}%. Depreciación calculada.`);
    };

    const generateAccountingEntry = async () => {
        // Calculate totals for the entry
        // We need the DELTAS, but our simple state update above overwrites.
        // For this demo, let's just calculate the entry based on a hypothetical "Run" 
        // Or better, let's just sum up the last calculation difference? 
        // Simplification: We will just generate an entry for "Estimate" based on current assets.

        let totalDep = 0;
        let totalCM = 0;

        assets.forEach(asset => {
            if (asset.status !== 'ACTIVE') return;
            // Re-calculate simplistic monthly amounts for the entry
            const cm = Math.round(asset.currentValue * (ipcFactor / 100));
            const updatedVal = asset.currentValue + cm;
            const dep = Math.round((updatedVal - asset.residualValue) / asset.usefulLifeMonths);
            totalDep += dep;
            totalCM += cm;
        });

        if (totalDep === 0 && totalCM === 0) {
            alert("No hay valores para contabilizar.");
            return;
        }

        const newEntry: JournalEntry = {
            id: crypto.randomUUID(),
            date: new Date().toISOString().split('T')[0],
            glosa: `Reconocimiento Depreciación y CM (IPC ${ipcFactor}%)`,
            type: 'traspaso', // Ajuste is usually traspaso
            total: totalDep + totalCM, // Not exactly, logic below
            lines: [
                // 1. Corrección Monetaria (Increase Asset)
                // Debit: Asset Account (various) 
                // Credit: CM Result (Gain/Loss account)
                // For simplicity, we lump all assets into their categories
            ],
            createdAt: new Date().toISOString()
        };

        // Build lines
        const lines = [];

        // 1. CM Lines (Debit Asset, Credit CM Income)
        // Group by account
        const cmByAccount: Record<string, number> = {};
        assets.forEach(a => {
            if (!cmByAccount[a.assetAccountId]) cmByAccount[a.assetAccountId] = 0;
            cmByAccount[a.assetAccountId] += Math.round(a.currentValue * (ipcFactor / 100));
        });

        // Add Asset Debits for CM
        let totalCMVal = 0;
        Object.entries(cmByAccount).forEach(([accId, amount]) => {
            if (amount > 0) {
                const acc = INITIAL_ACCOUNTS.find(a => a.code === accId);
                lines.push({
                    id: crypto.randomUUID(),
                    accountId: accId,
                    accountName: acc?.name || 'Activo Fijo',
                    debit: amount,
                    credit: 0
                });
                totalCMVal += amount;
            }
        });

        // Credit CM Account
        if (totalCMVal > 0) {
            lines.push({
                id: crypto.randomUUID(),
                accountId: '6.1.11', // Corrección Monetaria (Account we added)
                accountName: 'Corrección Monetaria', // If it's Gain, it should be credit. 
                // Wait, if Asset increases, it's a Gain for the company (Inflation adjustment). 
                // In Chile, "Corrección Monetaria" account is Net. If Credit > Debit it's Profit.
                debit: 0,
                credit: totalCMVal
            });
        }

        // 2. Depreciation Lines
        // Debit: Depreciation Expense (6.1.10)
        // Credit: Accumulated Depreciation (1.2.99)
        if (totalDep > 0) {
            lines.push({
                id: crypto.randomUUID(),
                accountId: '6.1.10',
                accountName: 'Depreciación del Ejercicio',
                debit: totalDep,
                credit: 0
            });
            lines.push({
                id: crypto.randomUUID(),
                accountId: '1.2.99',
                accountName: 'Depreciación Acumulada',
                debit: 0,
                credit: totalDep
            });
        }

        newEntry.lines = lines;
        newEntry.total = totalDep + totalCMVal; // Just a sum of interactions

        await saveEntry(newEntry);
        // Apply changes to local state to reflect that we "posted" it?
        calculateDepreciation(); // Update the local view values
    };

    const formatCLP = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

    return (
        <div className="animate-in fade-in slide-in-from-right duration-300 pb-12">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <Calculator className="text-slate-600" /> Registro de Activo Fijo
                        </h1>
                        <p className="text-slate-500 text-sm">Control de Bienes, Depreciación y CM</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => {
                        // Demo data
                        setAssets([
                            {
                                id: '1', name: 'MacBook Pro M3', purchaseDate: '2024-01-15', purchaseValue: 1500000,
                                residualValue: 0, usefulLifeYears: 3, usefulLifeMonths: 36, status: 'ACTIVE',
                                assetAccountId: '1.2.02', accumulatedDepreciation: 250000, accumulatedCM: 15000, currentValue: 1265000
                            }
                        ]);
                    }}>
                        <FileText size={16} className="mr-2" /> Cargar Demo
                    </Button>
                    <Button onClick={() => setIsModalOpen(true)}>
                        <Plus size={16} className="mr-2" /> Nuevo Activo
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><TrendingUp size={20} /></div>
                        <span className="text-xs font-bold text-slate-400 uppercase">Valor Bruto Total</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-800">
                        {formatCLP(assets.reduce((sum, a) => sum + a.purchaseValue, 0))}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Costo Histórico de Adquisición</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><Calculator size={20} /></div>
                        <span className="text-xs font-bold text-slate-400 uppercase">Depreciación Acum.</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-600">
                        {formatCLP(assets.reduce((sum, a) => sum + a.accumulatedDepreciation, 0))}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Desgaste total reconocido</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Save size={20} /></div>
                        <span className="text-xs font-bold text-slate-400 uppercase">Valor Libro (Neto)</span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-600">
                        {formatCLP(assets.reduce((sum, a) => sum + a.currentValue, 0))}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Valor actual tras ajustes</p>
                </div>
            </div>

            {/* Tools Section */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 mb-8">
                <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                    <Calculator size={18} /> Procesos de Cierre
                </h3>
                <div className="flex flex-wrap items-end gap-4">
                    <div>
                        <label className="block text-xs font-bold text-indigo-700 mb-1">Variación IPC (%)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={ipcFactor}
                            onChange={e => setIpcFactor(Number(e.target.value))}
                            className="bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm w-32 focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <Button variant="secondary" onClick={calculateDepreciation}>
                        Previsualizar Cálculo
                    </Button>
                    <Button onClick={generateAccountingEntry}>
                        <Save size={16} className="mr-2" /> Contabilizar (Generar Asiento)
                    </Button>
                </div>
                <p className="text-xs text-indigo-500 mt-3 flex items-center gap-1">
                    <AlertCircle size={12} />
                    Esto actualizará los valores de los activos y generará un asiento contable automático en el Libro Diario.
                </p>
            </div>

            {/* Assets Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3">Activo</th>
                                <th className="px-4 py-3">Compra</th>
                                <th className="px-4 py-3 text-right">Valor Compra</th>
                                <th className="px-4 py-3 text-right">CM Acum.</th>
                                <th className="px-4 py-3 text-right">Valor Actualizado</th>
                                <th className="px-4 py-3 text-right">Dep. Acum.</th>
                                <th className="px-4 py-3 text-right">Valor Libro</th>
                                <th className="px-4 py-3 text-center">Vida Útil</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {assets.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                                        No hay activos registrados. Añade uno para comenzar.
                                    </td>
                                </tr>
                            ) : (
                                assets.map(asset => (
                                    <tr key={asset.id} className="hover:bg-slate-50 group">
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-slate-800">{asset.name}</div>
                                            <div className="text-xs text-slate-500">{ASSET_CATEGORIES.find(c => c.id === asset.assetAccountId)?.name || asset.assetAccountId}</div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {asset.purchaseDate}
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-600">
                                            {formatCLP(asset.purchaseValue)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-blue-600 font-medium bg-blue-50/30">
                                            {formatCLP(asset.accumulatedCM)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-slate-800 font-bold">
                                            {formatCLP(asset.purchaseValue + asset.accumulatedCM)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-orange-600 font-medium bg-orange-50/30">
                                            {formatCLP(asset.accumulatedDepreciation)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-emerald-700 font-bold bg-emerald-50/30">
                                            {formatCLP(asset.currentValue)}
                                        </td>
                                        <td className="px-4 py-3 text-center text-slate-500 text-xs">
                                            {Math.round(asset.usefulLifeMonths)} mes(es)
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => handleDelete(asset.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                                                <Trash size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* New Asset Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Nuevo Activo Fijo</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre / Descripción</label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    placeholder="Ej: Notebook Dell XPS"
                                    value={newItem.name || ''}
                                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Compra</label>
                                    <input
                                        type="date"
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newItem.purchaseDate}
                                        onChange={e => setNewItem({ ...newItem, purchaseDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Costo Neto ($)</label>
                                    <input
                                        type="number"
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="0"
                                        value={newItem.purchaseValue === 0 ? '' : newItem.purchaseValue}
                                        onChange={e => setNewItem({ ...newItem, purchaseValue: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                                    <select
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newItem.assetAccountId || ''}
                                        onChange={e => {
                                            const cat = ASSET_CATEGORIES.find(c => c.id === e.target.value);
                                            setNewItem({
                                                ...newItem,
                                                assetAccountId: e.target.value,
                                                usefulLifeYears: cat ? cat.lifeYears : 3
                                            });
                                        }}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {ASSET_CATEGORIES.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Vida Útil (Años)</label>
                                    <input
                                        type="number"
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={newItem.usefulLifeYears}
                                        onChange={e => setNewItem({ ...newItem, usefulLifeYears: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                            <Button onClick={handleAddAsset}>Guardar Activo</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
