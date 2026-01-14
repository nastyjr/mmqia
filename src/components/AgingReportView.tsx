import React, { useState, useEffect, useMemo } from 'react';
import { Invoice } from '../types/invoicing';
import { PurchaseOrder } from '../types/purchase-order';
import { ArrowLeft, DollarSign, Clock, AlertTriangle, AlertCircle, TrendingUp, Filter, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { exportToExcel } from '../utils/excelExport';

interface AgingReportViewProps {
    onBack: () => void;
}

interface AgingBucket {
    label: string;
    range: [number, number]; // days
    color: string;
    bgColor: string;
}

const AGING_BUCKETS: AgingBucket[] = [
    { label: 'Vigente', range: [-999, 0], color: 'text-emerald-700', bgColor: 'bg-emerald-50' },
    { label: '1-30 días', range: [1, 30], color: 'text-blue-700', bgColor: 'bg-blue-50' },
    { label: '31-60 días', range: [31, 60], color: 'text-amber-700', bgColor: 'bg-amber-50' },
    { label: '61-90 días', range: [61, 90], color: 'text-orange-700', bgColor: 'bg-orange-50' },
    { label: '+90 días', range: [91, 9999], color: 'text-rose-700', bgColor: 'bg-rose-50' }
];

export const AgingReportView: React.FC<AgingReportViewProps> = ({ onBack }) => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
    const [activeTab, setActiveTab] = useState<'receivables' | 'payables'>('receivables');

    // Load data
    useEffect(() => {
        const savedInvoices = localStorage.getItem('invoicing_db');
        if (savedInvoices) setInvoices(JSON.parse(savedInvoices));

        const savedPurchases = localStorage.getItem('purchase_orders');
        if (savedPurchases) setPurchases(JSON.parse(savedPurchases));
    }, []);

    const formatCLP = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

    const getDaysOverdue = (dueDate: string) => {
        const today = new Date();
        const due = new Date(dueDate);
        return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    };

    const getBucket = (daysOverdue: number) => {
        return AGING_BUCKETS.find(b => daysOverdue >= b.range[0] && daysOverdue <= b.range[1]) || AGING_BUCKETS[4];
    };

    // Receivables analysis (Cuentas por Cobrar)
    const receivablesData = useMemo(() => {
        const pending = invoices.filter(i => i.status === 'ISSUED' && i.type !== 'NOTA_CREDITO');

        const byBucket = AGING_BUCKETS.map(bucket => {
            const items = pending.filter(inv => {
                const days = getDaysOverdue(inv.dueDate);
                return days >= bucket.range[0] && days <= bucket.range[1];
            });
            const total = items.reduce((sum, i) => sum + i.total, 0);
            return { ...bucket, items, total, count: items.length };
        });

        const totalReceivables = pending.reduce((sum, i) => sum + i.total, 0);
        const overdueTotal = pending.filter(i => getDaysOverdue(i.dueDate) > 0).reduce((sum, i) => sum + i.total, 0);

        return { byBucket, totalReceivables, overdueTotal, pending };
    }, [invoices]);

    // Payables analysis (Cuentas por Pagar - from Purchase Orders)
    const payablesData = useMemo(() => {
        const pending = purchases.filter(p => p.status === 'RECEIVED');

        // Assuming 30 days payment terms from receipt date
        const byBucket = AGING_BUCKETS.map(bucket => {
            const items = pending.filter(po => {
                const receiptDate = po.receiptDate || po.date;
                const dueDate = new Date(new Date(receiptDate).getTime() + 30 * 24 * 60 * 60 * 1000);
                const days = getDaysOverdue(dueDate.toISOString().split('T')[0]);
                return days >= bucket.range[0] && days <= bucket.range[1];
            });
            const total = items.reduce((sum, p) => sum + p.total, 0);
            return { ...bucket, items, total, count: items.length };
        });

        const totalPayables = pending.reduce((sum, p) => sum + p.total, 0);
        const overdueTotal = pending.filter(p => {
            const receiptDate = p.receiptDate || p.date;
            const dueDate = new Date(new Date(receiptDate).getTime() + 30 * 24 * 60 * 60 * 1000);
            return getDaysOverdue(dueDate.toISOString().split('T')[0]) > 0;
        }).reduce((sum, p) => sum + p.total, 0);

        return { byBucket, totalPayables, overdueTotal, pending };
    }, [purchases]);

    const currentData = activeTab === 'receivables' ? receivablesData : payablesData;

    const handleExport = () => {
        if (activeTab === 'receivables') {
            const data = receivablesData.pending.map(inv => ({
                'Folio': inv.folio,
                'Fecha': inv.date,
                'Vencimiento': inv.dueDate,
                'Cliente': inv.customerName,
                'RUT': inv.customerRut,
                'Total': inv.total,
                'Días Vencido': getDaysOverdue(inv.dueDate),
                'Categoría': getBucket(getDaysOverdue(inv.dueDate)).label
            }));
            exportToExcel(data, 'Cuentas_por_Cobrar', 'CxC');
        } else {
            const data = payablesData.pending.map(po => ({
                'N° OC': po.number,
                'Fecha Recepción': po.receiptDate || po.date,
                'Proveedor': po.supplierName,
                'RUT': po.supplierRut,
                'Total': po.total
            }));
            exportToExcel(data, 'Cuentas_por_Pagar', 'CxP');
        }
    };

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
                            <Clock className="text-indigo-600" /> Antigüedad de Saldos
                        </h1>
                        <p className="text-slate-500 text-sm">Análisis de cuentas por cobrar y pagar</p>
                    </div>
                </div>
                <Button variant="secondary" onClick={handleExport}>
                    Exportar Excel
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button
                    onClick={() => setActiveTab('receivables')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'receivables'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                >
                    Cuentas por Cobrar (CxC)
                </button>
                <button
                    onClick={() => setActiveTab('payables')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'payables'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                >
                    Cuentas por Pagar (CxP)
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-indigo-50 rounded-xl p-5 border-2 border-indigo-200">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="text-indigo-600" size={20} />
                        <span className="text-sm font-bold text-indigo-700">
                            {activeTab === 'receivables' ? 'Total por Cobrar' : 'Total por Pagar'}
                        </span>
                    </div>
                    <p className="text-3xl font-bold text-indigo-800">
                        {formatCLP(activeTab === 'receivables' ? receivablesData.totalReceivables : payablesData.totalPayables)}
                    </p>
                </div>
                <div className="bg-rose-50 rounded-xl p-5 border-2 border-rose-200">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="text-rose-600" size={20} />
                        <span className="text-sm font-bold text-rose-700">Vencido</span>
                    </div>
                    <p className="text-3xl font-bold text-rose-800">
                        {formatCLP(activeTab === 'receivables' ? receivablesData.overdueTotal : payablesData.overdueTotal)}
                    </p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-5 border-2 border-emerald-200">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="text-emerald-600" size={20} />
                        <span className="text-sm font-bold text-emerald-700">Documentos</span>
                    </div>
                    <p className="text-3xl font-bold text-emerald-800">
                        {activeTab === 'receivables' ? receivablesData.pending.length : payablesData.pending.length}
                    </p>
                </div>
            </div>

            {/* Aging Buckets */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
                {currentData.byBucket.map(bucket => (
                    <div key={bucket.label} className={`rounded-xl p-4 ${bucket.bgColor} border-2`}>
                        <p className={`text-xs font-bold uppercase ${bucket.color}`}>{bucket.label}</p>
                        <p className={`text-xl font-bold ${bucket.color}`}>{formatCLP(bucket.total)}</p>
                        <p className="text-xs text-slate-500 mt-1">{bucket.count} documentos</p>
                    </div>
                ))}
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b bg-slate-50">
                    <h3 className="font-bold text-slate-700">
                        {activeTab === 'receivables' ? 'Detalle Cuentas por Cobrar' : 'Detalle Cuentas por Pagar'}
                    </h3>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b uppercase text-xs">
                        <tr>
                            <th className="px-4 py-3">{activeTab === 'receivables' ? 'Folio' : 'N° OC'}</th>
                            <th className="px-4 py-3">Fecha</th>
                            <th className="px-4 py-3">{activeTab === 'receivables' ? 'Cliente' : 'Proveedor'}</th>
                            <th className="px-4 py-3 text-right">Total</th>
                            <th className="px-4 py-3">Vencimiento</th>
                            <th className="px-4 py-3">Antigüedad</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {activeTab === 'receivables' ? (
                            receivablesData.pending.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                    No hay cuentas por cobrar pendientes
                                </td></tr>
                            ) : receivablesData.pending.sort((a, b) => getDaysOverdue(b.dueDate) - getDaysOverdue(a.dueDate)).map(inv => {
                                const days = getDaysOverdue(inv.dueDate);
                                const bucket = getBucket(days);
                                return (
                                    <tr key={inv.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-mono font-bold">{inv.folio}</td>
                                        <td className="px-4 py-3">{inv.date}</td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{inv.customerName}</div>
                                            <div className="text-xs text-slate-400">{inv.customerRut}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold">{formatCLP(inv.total)}</td>
                                        <td className="px-4 py-3">{inv.dueDate}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${bucket.bgColor} ${bucket.color}`}>
                                                {days <= 0 ? 'Vigente' : `${days} días`}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            payablesData.pending.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                    No hay cuentas por pagar pendientes
                                </td></tr>
                            ) : payablesData.pending.map(po => {
                                const receiptDate = po.receiptDate || po.date;
                                const dueDate = new Date(new Date(receiptDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                                const days = getDaysOverdue(dueDate);
                                const bucket = getBucket(days);
                                return (
                                    <tr key={po.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-mono font-bold">{po.number}</td>
                                        <td className="px-4 py-3">{receiptDate}</td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{po.supplierName}</div>
                                            <div className="text-xs text-slate-400">{po.supplierRut}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold">{formatCLP(po.total)}</td>
                                        <td className="px-4 py-3">{dueDate}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${bucket.bgColor} ${bucket.color}`}>
                                                {days <= 0 ? 'Vigente' : `${days} días`}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
