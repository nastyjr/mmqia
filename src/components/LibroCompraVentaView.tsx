import React, { useState, useEffect } from 'react';
import { PurchaseInvoice, SalesInvoice, DocumentType, TaxType, IECPeriodSummary } from '../types/iec';
import { ArrowLeft, Plus, Search, FileText, Download, TrendingUp, TrendingDown, DollarSign, Calendar, Building2, Trash } from 'lucide-react';
import { Button } from './Button';
import { exportToExcel } from '../utils/excelExport';

interface LibroCompraVentaViewProps {
    onBack: () => void;
}

export const LibroCompraVentaView: React.FC<LibroCompraVentaViewProps> = ({ onBack }) => {
    // State
    const [activeTab, setActiveTab] = useState<'VENTAS' | 'COMPRAS' | 'RESUMEN'>('VENTAS');
    const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([]);
    const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    });

    // Modals
    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
    const [newPurchase, setNewPurchase] = useState<Partial<PurchaseInvoice>>({
        documentType: 'FACTURA',
        taxType: 'AFECTA',
        date: new Date().toISOString().split('T')[0]
    });

    // Load from localStorage
    useEffect(() => {
        const savedSales = localStorage.getItem('iec_sales');
        const savedPurchases = localStorage.getItem('iec_purchases');
        if (savedSales) setSalesInvoices(JSON.parse(savedSales));
        if (savedPurchases) setPurchaseInvoices(JSON.parse(savedPurchases));
    }, []);

    // Save to localStorage
    useEffect(() => {
        localStorage.setItem('iec_sales', JSON.stringify(salesInvoices));
    }, [salesInvoices]);

    useEffect(() => {
        localStorage.setItem('iec_purchases', JSON.stringify(purchaseInvoices));
    }, [purchaseInvoices]);

    // Filter by period
    const filteredSales = salesInvoices.filter(s => s.period === selectedPeriod);
    const filteredPurchases = purchaseInvoices.filter(p => p.period === selectedPeriod);

    // Calculate summary
    const summary: IECPeriodSummary = {
        period: selectedPeriod,
        salesCount: filteredSales.length,
        salesNet: filteredSales.reduce((sum, s) => sum + s.netAmount, 0),
        salesIva: filteredSales.reduce((sum, s) => sum + s.ivaAmount, 0),
        salesTotal: filteredSales.reduce((sum, s) => sum + s.totalAmount, 0),
        purchasesCount: filteredPurchases.length,
        purchasesNet: filteredPurchases.reduce((sum, p) => sum + p.netAmount, 0),
        purchasesIva: filteredPurchases.filter(p => p.taxType === 'AFECTA').reduce((sum, p) => sum + p.ivaAmount, 0),
        purchasesTotal: filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0),
        ivaBalance: 0,
        previousBalance: 0,
        toPay: 0
    };
    summary.ivaBalance = summary.salesIva - summary.purchasesIva;
    summary.toPay = Math.max(0, summary.ivaBalance - summary.previousBalance);

    // Handlers
    const handleSavePurchase = () => {
        if (!newPurchase.folio || !newPurchase.supplierRut || !newPurchase.netAmount) {
            alert('Complete los campos obligatorios');
            return;
        }

        const ivaRate = newPurchase.taxType === 'AFECTA' ? 0.19 : 0;
        const netAmount = Number(newPurchase.netAmount);
        const ivaAmount = Math.round(netAmount * ivaRate);

        const purchase: PurchaseInvoice = {
            id: crypto.randomUUID(),
            date: newPurchase.date!,
            documentType: newPurchase.documentType as DocumentType,
            folio: Number(newPurchase.folio),
            supplierRut: newPurchase.supplierRut!,
            supplierName: newPurchase.supplierName || 'Sin Nombre',
            netAmount,
            exemptAmount: newPurchase.taxType === 'EXENTA' ? netAmount : 0,
            ivaAmount,
            totalAmount: netAmount + ivaAmount,
            taxType: newPurchase.taxType as TaxType,
            period: newPurchase.date!.substring(0, 7).replace('-', ''),
            createdAt: new Date().toISOString(),
            source: 'manual'
        };

        setPurchaseInvoices([...purchaseInvoices, purchase]);
        setIsPurchaseModalOpen(false);
        setNewPurchase({ documentType: 'FACTURA', taxType: 'AFECTA', date: new Date().toISOString().split('T')[0] });
    };

    const handleDeletePurchase = (id: string) => {
        if (confirm('¿Eliminar este registro?')) {
            setPurchaseInvoices(purchaseInvoices.filter(p => p.id !== id));
        }
    };

    const handleExportSales = () => {
        const data = filteredSales.map(s => ({
            Fecha: s.date,
            Tipo: s.documentType,
            Folio: s.folio,
            RUT: s.customerRut,
            'Razón Social': s.customerName,
            Neto: s.netAmount,
            Exento: s.exemptAmount,
            IVA: s.ivaAmount,
            Total: s.totalAmount
        }));
        exportToExcel(data, `Libro_Ventas_${selectedPeriod}`, 'Ventas');
    };

    const handleExportPurchases = () => {
        const data = filteredPurchases.map(p => ({
            Fecha: p.date,
            Tipo: p.documentType,
            Folio: p.folio,
            RUT: p.supplierRut,
            'Razón Social': p.supplierName,
            Neto: p.netAmount,
            Exento: p.exemptAmount,
            IVA: p.ivaAmount,
            Total: p.totalAmount,
            'Tipo IVA': p.taxType
        }));
        exportToExcel(data, `Libro_Compras_${selectedPeriod}`, 'Compras');
    };

    const formatCLP = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);
    const formatPeriod = (p: string) => {
        const year = p.substring(0, 4);
        const month = p.substring(4, 6);
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return `${months[parseInt(month) - 1]} ${year}`;
    };

    // Get available periods
    const allPeriods = [...new Set([
        ...salesInvoices.map(s => s.period),
        ...purchaseInvoices.map(p => p.period),
        selectedPeriod
    ])].sort().reverse();

    return (
        <div className="animate-in fade-in slide-in-from-right duration-300 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <FileText className="text-orange-600" /> Libro de Compra y Venta
                        </h1>
                        <p className="text-slate-500 text-sm">Registro de IVA - IEC (Información Electrónica de Compras)</p>
                    </div>
                </div>

                {/* Period Selector */}
                <div className="flex items-center gap-3">
                    <Calendar className="text-slate-400" size={18} />
                    <select
                        value={selectedPeriod}
                        onChange={e => setSelectedPeriod(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-medium"
                    >
                        {allPeriods.map(p => (
                            <option key={p} value={p}>{formatPeriod(p)}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit mb-6">
                {(['VENTAS', 'COMPRAS', 'RESUMEN'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === tab ? 'bg-white shadow text-orange-700' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {tab === 'VENTAS' && <TrendingUp className="inline mr-2" size={16} />}
                        {tab === 'COMPRAS' && <TrendingDown className="inline mr-2" size={16} />}
                        {tab === 'RESUMEN' && <DollarSign className="inline mr-2" size={16} />}
                        {tab}
                    </button>
                ))}
            </div>

            {/* VENTAS Tab */}
            {activeTab === 'VENTAS' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                        <div className="text-sm text-slate-600">
                            <span className="font-bold text-slate-800">{filteredSales.length}</span> documentos |
                            IVA Débito: <span className="font-bold text-emerald-600">{formatCLP(summary.salesIva)}</span>
                        </div>
                        <Button variant="secondary" onClick={handleExportSales}>
                            <Download size={16} className="mr-2" /> Exportar Excel
                        </Button>
                    </div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3">Fecha</th>
                                <th className="px-4 py-3">Tipo</th>
                                <th className="px-4 py-3">Folio</th>
                                <th className="px-4 py-3">RUT</th>
                                <th className="px-4 py-3">Razón Social</th>
                                <th className="px-4 py-3 text-right">Neto</th>
                                <th className="px-4 py-3 text-right">IVA</th>
                                <th className="px-4 py-3 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredSales.length === 0 ? (
                                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                                    No hay ventas registradas en este período. Las facturas emitidas desde Facturación aparecerán aquí automáticamente.
                                </td></tr>
                            ) : filteredSales.sort((a, b) => a.date.localeCompare(b.date)).map(sale => (
                                <tr key={sale.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 text-slate-600">{sale.date}</td>
                                    <td className="px-4 py-3">
                                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold">{sale.documentType}</span>
                                    </td>
                                    <td className="px-4 py-3 font-mono">{sale.folio}</td>
                                    <td className="px-4 py-3 font-mono text-slate-500">{sale.customerRut}</td>
                                    <td className="px-4 py-3 font-medium">{sale.customerName}</td>
                                    <td className="px-4 py-3 text-right">{formatCLP(sale.netAmount)}</td>
                                    <td className="px-4 py-3 text-right text-emerald-600">{formatCLP(sale.ivaAmount)}</td>
                                    <td className="px-4 py-3 text-right font-bold">{formatCLP(sale.totalAmount)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-50 font-bold">
                            <tr>
                                <td colSpan={5} className="px-4 py-3 text-right">TOTALES:</td>
                                <td className="px-4 py-3 text-right">{formatCLP(summary.salesNet)}</td>
                                <td className="px-4 py-3 text-right text-emerald-600">{formatCLP(summary.salesIva)}</td>
                                <td className="px-4 py-3 text-right">{formatCLP(summary.salesTotal)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}

            {/* COMPRAS Tab */}
            {activeTab === 'COMPRAS' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                        <div className="text-sm text-slate-600">
                            <span className="font-bold text-slate-800">{filteredPurchases.length}</span> documentos |
                            IVA Crédito: <span className="font-bold text-blue-600">{formatCLP(summary.purchasesIva)}</span>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={handleExportPurchases}>
                                <Download size={16} className="mr-2" /> Exportar
                            </Button>
                            <Button onClick={() => setIsPurchaseModalOpen(true)}>
                                <Plus size={16} className="mr-2" /> Agregar Compra
                            </Button>
                        </div>
                    </div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3">Fecha</th>
                                <th className="px-4 py-3">Tipo</th>
                                <th className="px-4 py-3">Folio</th>
                                <th className="px-4 py-3">RUT Proveedor</th>
                                <th className="px-4 py-3">Razón Social</th>
                                <th className="px-4 py-3 text-right">Neto</th>
                                <th className="px-4 py-3 text-right">IVA</th>
                                <th className="px-4 py-3 text-right">Total</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredPurchases.length === 0 ? (
                                <tr><td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                                    No hay compras registradas en este período. Haz click en "Agregar Compra" para registrar.
                                </td></tr>
                            ) : filteredPurchases.sort((a, b) => a.date.localeCompare(b.date)).map(purchase => (
                                <tr key={purchase.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 text-slate-600">{purchase.date}</td>
                                    <td className="px-4 py-3">
                                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">{purchase.documentType}</span>
                                    </td>
                                    <td className="px-4 py-3 font-mono">{purchase.folio}</td>
                                    <td className="px-4 py-3 font-mono text-slate-500">{purchase.supplierRut}</td>
                                    <td className="px-4 py-3 font-medium">{purchase.supplierName}</td>
                                    <td className="px-4 py-3 text-right">{formatCLP(purchase.netAmount)}</td>
                                    <td className="px-4 py-3 text-right text-blue-600">{formatCLP(purchase.ivaAmount)}</td>
                                    <td className="px-4 py-3 text-right font-bold">{formatCLP(purchase.totalAmount)}</td>
                                    <td className="px-4 py-3">
                                        <button onClick={() => handleDeletePurchase(purchase.id)} className="text-red-400 hover:text-red-600">
                                            <Trash size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-50 font-bold">
                            <tr>
                                <td colSpan={5} className="px-4 py-3 text-right">TOTALES:</td>
                                <td className="px-4 py-3 text-right">{formatCLP(summary.purchasesNet)}</td>
                                <td className="px-4 py-3 text-right text-blue-600">{formatCLP(summary.purchasesIva)}</td>
                                <td className="px-4 py-3 text-right">{formatCLP(summary.purchasesTotal)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}

            {/* RESUMEN Tab */}
            {activeTab === 'RESUMEN' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* IVA Débito */}
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl p-6 shadow-lg">
                        <div className="flex items-center gap-3 mb-4">
                            <TrendingUp size={24} />
                            <h3 className="text-lg font-bold">IVA Débito (Ventas)</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-emerald-100">
                                <span>Documentos</span>
                                <span className="font-bold text-white">{summary.salesCount}</span>
                            </div>
                            <div className="flex justify-between text-emerald-100">
                                <span>Total Neto</span>
                                <span className="font-bold text-white">{formatCLP(summary.salesNet)}</span>
                            </div>
                            <div className="h-px bg-emerald-400/30"></div>
                            <div className="flex justify-between text-xl">
                                <span>IVA Débito</span>
                                <span className="font-bold">{formatCLP(summary.salesIva)}</span>
                            </div>
                        </div>
                    </div>

                    {/* IVA Crédito */}
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 shadow-lg">
                        <div className="flex items-center gap-3 mb-4">
                            <TrendingDown size={24} />
                            <h3 className="text-lg font-bold">IVA Crédito (Compras)</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-blue-100">
                                <span>Documentos</span>
                                <span className="font-bold text-white">{summary.purchasesCount}</span>
                            </div>
                            <div className="flex justify-between text-blue-100">
                                <span>Total Neto</span>
                                <span className="font-bold text-white">{formatCLP(summary.purchasesNet)}</span>
                            </div>
                            <div className="h-px bg-blue-400/30"></div>
                            <div className="flex justify-between text-xl">
                                <span>IVA Crédito</span>
                                <span className="font-bold">{formatCLP(summary.purchasesIva)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Balance */}
                    <div className="lg:col-span-2 bg-slate-900 text-white rounded-xl p-6 shadow-lg">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <DollarSign /> Resumen F29 - {formatPeriod(selectedPeriod)}
                        </h3>
                        <div className="grid grid-cols-3 gap-6">
                            <div className="text-center">
                                <p className="text-slate-400 text-sm uppercase">IVA Débito</p>
                                <p className="text-2xl font-bold text-emerald-400">{formatCLP(summary.salesIva)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-slate-400 text-sm uppercase">IVA Crédito</p>
                                <p className="text-2xl font-bold text-blue-400">{formatCLP(summary.purchasesIva)}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-slate-400 text-sm uppercase">
                                    {summary.ivaBalance >= 0 ? 'A Pagar' : 'Remanente'}
                                </p>
                                <p className={`text-3xl font-bold ${summary.ivaBalance >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                    {formatCLP(Math.abs(summary.ivaBalance))}
                                </p>
                            </div>
                        </div>
                        <div className="mt-6 pt-6 border-t border-slate-700 flex justify-center gap-4">
                            <Button variant="secondary" onClick={handleExportSales}>Exportar Ventas</Button>
                            <Button variant="secondary" onClick={handleExportPurchases}>Exportar Compras</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Purchase Modal */}
            {isPurchaseModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Building2 className="text-blue-600" /> Registrar Compra
                        </h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Fecha</label>
                                    <input
                                        type="date"
                                        className="w-full border rounded-lg p-2 text-sm"
                                        value={newPurchase.date}
                                        onChange={e => setNewPurchase({ ...newPurchase, date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Folio</label>
                                    <input
                                        type="number"
                                        className="w-full border rounded-lg p-2 text-sm"
                                        placeholder="Nº Folio"
                                        value={newPurchase.folio || ''}
                                        onChange={e => setNewPurchase({ ...newPurchase, folio: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Tipo Doc</label>
                                    <select
                                        className="w-full border rounded-lg p-2 text-sm"
                                        value={newPurchase.documentType}
                                        onChange={e => setNewPurchase({ ...newPurchase, documentType: e.target.value as DocumentType })}
                                    >
                                        <option value="FACTURA">Factura</option>
                                        <option value="FACTURA_EXENTA">Factura Exenta</option>
                                        <option value="NOTA_CREDITO">Nota de Crédito</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Tipo IVA</label>
                                    <select
                                        className="w-full border rounded-lg p-2 text-sm"
                                        value={newPurchase.taxType}
                                        onChange={e => setNewPurchase({ ...newPurchase, taxType: e.target.value as TaxType })}
                                    >
                                        <option value="AFECTA">IVA Recuperable</option>
                                        <option value="EXENTA">Exenta</option>
                                        <option value="NO_RECUPERABLE">IVA No Recuperable</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">RUT Proveedor</label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg p-2 text-sm"
                                    placeholder="12.345.678-9"
                                    value={newPurchase.supplierRut || ''}
                                    onChange={e => setNewPurchase({ ...newPurchase, supplierRut: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Razón Social</label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg p-2 text-sm"
                                    placeholder="Nombre del Proveedor"
                                    value={newPurchase.supplierName || ''}
                                    onChange={e => setNewPurchase({ ...newPurchase, supplierName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Monto Neto ($)</label>
                                <input
                                    type="number"
                                    className="w-full border rounded-lg p-2 text-sm"
                                    placeholder="100000"
                                    value={newPurchase.netAmount || ''}
                                    onChange={e => setNewPurchase({ ...newPurchase, netAmount: Number(e.target.value) })}
                                />
                                {newPurchase.netAmount && newPurchase.taxType === 'AFECTA' && (
                                    <p className="text-xs text-slate-500 mt-1">
                                        IVA (19%): {formatCLP(Math.round(Number(newPurchase.netAmount) * 0.19))} |
                                        Total: {formatCLP(Math.round(Number(newPurchase.netAmount) * 1.19))}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant="secondary" onClick={() => setIsPurchaseModalOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSavePurchase}>Guardar Compra</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
