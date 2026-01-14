import React, { useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import { JournalEntry, INITIAL_ACCOUNTS } from '../types';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const FinancialInsights: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { journalEntries } = useAccounting();

    const data = useMemo(() => {
        // 1. Trend Data (Last 6 Months)
        const today = new Date();
        const last6Months = Array.from({ length: 6 }, (_, i) => {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            return {
                monthIndex: d.getMonth(),
                year: d.getFullYear(),
                monthLabel: d.toLocaleString('es-CL', { month: 'short' }),
                income: 0,
                expense: 0
            };
        }).reverse();

        // 2. Expense Category Breakdown
        const categoryMap = new Map<string, number>();

        journalEntries.forEach(entry => {
            // Robust Date Parsing
            // Assuming entry.date is YYYY-MM-DD or ISO string
            // We append T00:00:00 to ensure local time doesn't shift it if it is just a date string
            const dateStr = entry.date.length === 10 ? `${entry.date}T12:00:00` : entry.date;
            const entryDate = new Date(dateStr);

            const entryMonth = entryDate.getMonth();
            const entryYear = entryDate.getFullYear();

            const monthData = last6Months.find(m => m.monthIndex === entryMonth && m.year === entryYear);

            if (entry.type === 'ingreso') {
                if (monthData) monthData.income += entry.total;
            } else if (entry.type === 'egreso') {
                if (monthData) monthData.expense += entry.total;

                // Category breakdown
                entry.lines.forEach(line => {
                    // Basic heuristic: check if account is 6.x.xx (Gastos)
                    if (line.accountId.startsWith('6')) {
                        const categoryName = INITIAL_ACCOUNTS.find(a => a.code === line.accountId.substring(0, 6))?.name
                            || INITIAL_ACCOUNTS.find(a => a.code === line.accountId)?.name
                            || 'Gastos Generales';
                        categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + line.debit);
                    }
                });
            }
        });

        const categoryData = Array.from(categoryMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5

        // 3. Totals
        const totalIncome = last6Months.reduce((sum, m) => sum + m.income, 0);
        const totalExpense = last6Months.reduce((sum, m) => sum + m.expense, 0);
        const burnRate = totalExpense / 6; // Average monthly burn

        // Transform for Recharts
        const trend = last6Months.map(m => ({
            month: m.monthLabel,
            income: m.income,
            expense: m.expense
        }));

        return { trend, categories: categoryData, totalIncome, totalExpense, burnRate };
    }, [journalEntries]);

    const formatCLP = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft className="text-slate-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Activity className="text-indigo-600" /> Reportes Inteligentes
                    </h1>
                    <p className="text-slate-500 text-sm">Análisis de los últimos 6 meses</p>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                            <TrendingUp size={20} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase">Ingresos Totales</h3>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{formatCLP(data.totalIncome)}</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                            <TrendingDown size={20} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase">Gastos Totales</h3>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{formatCLP(data.totalExpense)}</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                            <Activity size={20} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase">Burn Rate (Prom/Mes)</h3>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{formatCLP(data.burnRate)}</p>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Area Chart: Income vs Expense Trend */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-700 mb-6">Tendencia de Flujo de Caja</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.trend}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(val) => `$${val / 1000}k`} />
                                <CartesianGrid vertical={false} stroke="#f1f5f9" />
                                <Tooltip formatter={(val: number) => formatCLP(val)} />
                                <Area type="monotone" dataKey="income" name="Ingresos" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
                                <Area type="monotone" dataKey="expense" name="Egresos" stroke="#f43f5e" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pie Chart: Expense Breakdown */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-700 mb-6">Distribución de Gastos (Top 5)</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.categories}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.categories.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val: number) => formatCLP(val)} />
                                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '12px', color: '#64748b' }} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                        {data.categories.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                                Sin datos suficientes
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
