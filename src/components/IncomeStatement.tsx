import React, { useMemo, useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { AppView, JournalEntry } from '../types';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, PieChart, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart as RePie, Pie } from 'recharts';

export const IncomeStatement: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { journalEntries } = useAccounting();
    const [period, setPeriod] = useState(new Date().getFullYear());

    const financials = useMemo(() => {
        // Filter by year
        const entries = journalEntries.filter(e => e.date.startsWith(period.toString()));

        let sales = 0;
        let cogs = 0; // Cost of Goods Sold
        let adminExpenses = 0;
        let financialExpenses = 0;
        let taxes = 0;

        entries.forEach(entry => {
            entry.lines.forEach(line => {
                // Determine account type based on ID prefix (standard Chilean plan)
                // 4.x.xx = Ingresos
                // 5.x.xx = Costos
                // 6.x.xx = Gastos

                if (line.accountId.startsWith('4')) {
                    sales += line.credit - line.debit;
                } else if (line.accountId.startsWith('5')) { // Costos
                    cogs += line.debit - line.credit;
                } else if (line.accountId.startsWith('6')) { // Gastos
                    if (line.accountName.toLowerCase().includes('impuesto')) {
                        taxes += line.debit - line.credit;
                    } else if (line.accountName.toLowerCase().includes('interés') || line.accountName.toLowerCase().includes('banco')) {
                        financialExpenses += line.debit - line.credit;
                    } else {
                        adminExpenses += line.debit - line.credit;
                    }
                }
            });
        });

        const grossMargin = sales - cogs;
        const operationalResult = grossMargin - adminExpenses;
        const netResult = operationalResult - financialExpenses - taxes;

        return {
            sales,
            cogs,
            grossMargin,
            adminExpenses,
            financialExpenses,
            taxes,
            operationalResult,
            netResult
        };
    }, [journalEntries, period]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
    };

    const waterfallData = [
        { name: 'Ventas', value: financials.sales, fill: '#10b981' }, // Green
        { name: 'Costos', value: -financials.cogs, fill: '#f43f5e' }, // Red
        { name: 'Mrg Bruto', value: financials.grossMargin, fill: '#3b82f6', isTotal: true }, // Blue
        { name: 'Gt. Admin', value: -financials.adminExpenses, fill: '#f43f5e' },
        { name: 'Gt. Finan', value: -financials.financialExpenses, fill: '#f43f5e' },
        { name: 'Utilidad', value: financials.netResult, fill: (financials.netResult >= 0 ? '#10b981' : '#ef4444'), isTotal: true },
    ];

    // Custom label for waterfall logic
    const renderCustomizedLabel = (props: any) => {
        const { x, y, width, value } = props;
        return (
            <text x={x + width / 2} y={y - 10} fill="#64748b" textAnchor="middle" fontSize={10} fontWeight="bold">
                {formatCurrency(Math.abs(value))}
            </text>
        );
    };

    return (
        <div className="animate-in slide-in-from-right duration-500">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Estado de Resultados</h1>
                        <p className="text-slate-500 text-sm">Resumen de Pérdidas y Ganancias - Año {period}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(parseInt(e.target.value))}
                        className="p-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value={2025}>2025</option>
                        <option value={2024}>2024</option>
                        <option value={2023}>2023</option>
                    </select>
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 text-sm font-medium">
                        <Download size={16} /> Exportar PDF
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-slate-500 text-xs font-bold uppercase mb-1">Total Ventas</p>
                    <h3 className="text-2xl font-bold text-emerald-600 flex items-center gap-2">
                        {formatCurrency(financials.sales)}
                        <TrendingUp size={20} />
                    </h3>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-slate-500 text-xs font-bold uppercase mb-1">Margen Bruto</p>
                    <h3 className="text-2xl font-bold text-blue-600">
                        {formatCurrency(financials.grossMargin)}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                        {financials.sales > 0 ? ((financials.grossMargin / financials.sales) * 100).toFixed(1) : 0}% sobre ventas
                    </p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-slate-500 text-xs font-bold uppercase mb-1">Gastos Operacionales</p>
                    <h3 className="text-2xl font-bold text-rose-500">
                        {formatCurrency(financials.adminExpenses + financials.financialExpenses)}
                    </h3>
                </div>
                <div className={`p-6 rounded-2xl shadow-sm border ${financials.netResult >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                    <p className={`${financials.netResult >= 0 ? 'text-emerald-800' : 'text-red-800'} text-xs font-bold uppercase mb-1`}>Utilidad Neta</p>
                    <h3 className={`text-2xl font-bold ${financials.netResult >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {formatCurrency(financials.netResult)}
                    </h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Visual Chart (Waterfall Style) */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <PieChart size={20} className="text-blue-500" /> Composición del Resultado
                    </h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={waterfallData}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                <YAxis hide />
                                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                    {waterfallData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Vertical Report Table */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <DollarSign size={20} className="text-emerald-500" /> Detalle
                    </h3>

                    <div className="space-y-4 text-sm">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                            <span className="text-slate-600">(+) Ingresos de Explotación</span>
                            <span className="font-bold text-slate-800">{formatCurrency(financials.sales)}</span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                            <span className="text-slate-600">(-) Costos Directos</span>
                            <span className="font-medium text-rose-500">({formatCurrency(financials.cogs)})</span>
                        </div>
                        <div className="flex justify-between items-center py-2 bg-slate-50 rounded px-2">
                            <span className="font-bold text-slate-800">(=) Margen Bruto</span>
                            <span className="font-bold text-blue-700">{formatCurrency(financials.grossMargin)}</span>
                        </div>
                        <div className="flex justify-between items-center pb-2 pt-2 border-b border-slate-100">
                            <span className="text-slate-600">(-) GAV (Adm. y Ventas)</span>
                            <span className="font-medium text-rose-500">({formatCurrency(financials.adminExpenses)})</span>
                        </div>
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                            <span className="text-slate-600">(-) Gastos Financieros</span>
                            <span className="font-medium text-rose-500">({formatCurrency(financials.financialExpenses)})</span>
                        </div>
                        <div className="flex justify-between items-center py-3 bg-slate-100 rounded px-2 mt-4">
                            <span className="font-bold text-slate-900 text-base">(=) Utilidad del Ejercicio</span>
                            <span className={`font-bold text-lg ${financials.netResult >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {formatCurrency(financials.netResult)}
                            </span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
