import React, { useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { INITIAL_ACCOUNTS } from '../types';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, Zap, Package, Users, Building2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const ExecutiveDashboard: React.FC = () => {
    const { journalEntries } = useAccounting();

    const formatCLP = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(val);

    // Calculate monthly data for last 6 months
    const monthlyData = useMemo(() => {
        const now = new Date();
        const months: Array<{
            month: string;
            ingresos: number;
            gastos: number;
            costos: number;
            utilidad: number;
        }> = [];

        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = date.toISOString().slice(0, 7); // "2024-11"
            const monthName = date.toLocaleDateString('es-CL', { month: 'short' });

            let ingresos = 0;
            let gastos = 0;
            let costos = 0;

            journalEntries.forEach(entry => {
                if (entry.date.startsWith(monthKey)) {
                    entry.lines.forEach(line => {
                        const account = INITIAL_ACCOUNTS.find(a => a.code === line.accountId);
                        if (!account) return;

                        if (account.type === 'Ingresos') {
                            ingresos += line.credit - line.debit;
                        } else if (account.type === 'Gastos') {
                            gastos += line.debit - line.credit;
                        } else if (account.type === 'Costos') {
                            costos += line.debit - line.credit;
                        }
                    });
                }
            });

            months.push({
                month: monthName,
                ingresos: Math.abs(ingresos),
                gastos: Math.abs(gastos),
                costos: Math.abs(costos),
                utilidad: ingresos - gastos - costos
            });
        }

        return months;
    }, [journalEntries]);

    // Current month KPIs
    const currentMonth = useMemo(() => {
        const latest = monthlyData[monthlyData.length - 1];
        const previous = monthlyData[monthlyData.length - 2];

        return {
            ingresos: latest?.ingresos || 0,
            gastos: latest?.gastos || 0,
            costos: latest?.costos || 0,
            utilidad: latest?.utilidad || 0,
            margen: latest?.ingresos > 0 ? (latest.utilidad / latest.ingresos) * 100 : 0,
            ingresosChange: previous ? ((latest.ingresos - previous.ingresos) / previous.ingresos) * 100 : 0,
            gastosChange: previous ? ((latest.gastos - previous.gastos) / previous.gastos) * 100 : 0
        };
    }, [monthlyData]);

    // Cash balance
    const cashBalance = useMemo(() => {
        let balance = 0;
        journalEntries.forEach(entry => {
            entry.lines.forEach(line => {
                if (line.accountId === '1.1.01' || line.accountId === '1.1.03') {
                    balance += line.debit - line.credit;
                }
            });
        });
        return balance;
    }, [journalEntries]);

    // Top 5 expenses this month
    const topExpenses = useMemo(() => {
        const now = new Date();
        const currentMonthKey = now.toISOString().slice(0, 7);
        const expenseMap: Record<string, { name: string; amount: number }> = {};

        journalEntries.forEach(entry => {
            if (entry.date.startsWith(currentMonthKey)) {
                entry.lines.forEach(line => {
                    const account = INITIAL_ACCOUNTS.find(a => a.code === line.accountId);
                    if (account && account.type === 'Gastos' && account.isImputable) {
                        if (!expenseMap[account.code]) {
                            expenseMap[account.code] = { name: account.name, amount: 0 };
                        }
                        expenseMap[account.code].amount += line.debit - line.credit;
                    }
                });
            }
        });

        return Object.values(expenseMap)
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);
    }, [journalEntries]);

    // Alerts
    const alerts = useMemo(() => {
        const alertList: Array<{ type: 'danger' | 'warning' | 'success'; message: string }> = [];

        // Low cash alert
        if (cashBalance < 500000) {
            alertList.push({ type: 'danger', message: `Caja baja: Solo ${formatCLP(cashBalance)} disponibles` });
        }

        // Expense increase alert
        if (currentMonth.gastosChange > 10) {
            alertList.push({ type: 'warning', message: `Gastos subieron ${currentMonth.gastosChange.toFixed(1)}% vs mes anterior` });
        }

        // Good margin alert
        if (currentMonth.margen > 20) {
            alertList.push({ type: 'success', message: `Excelente margen neto de ${currentMonth.margen.toFixed(1)}%` });
        }

        // Negative profit
        if (currentMonth.utilidad < 0) {
            alertList.push({ type: 'danger', message: `Pérdida del mes: ${formatCLP(Math.abs(currentMonth.utilidad))}` });
        }

        return alertList;
    }, [cashBalance, currentMonth]);

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-800">Dashboard Ejecutivo</h1>
                <p className="text-slate-500">Visión integral de tu negocio</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Utilidad del Mes */}
                <div className={`rounded-2xl p-6 shadow-lg border-2 ${currentMonth.utilidad >= 0 ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400' : 'bg-gradient-to-br from-rose-500 to-rose-600 border-rose-400'}`}>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-white/80 text-sm font-medium">Utilidad del Mes</span>
                        {currentMonth.utilidad >= 0 ?
                            <TrendingUp className="text-white" size={24} /> :
                            <TrendingDown className="text-white" size={24} />
                        }
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{formatCLP(currentMonth.utilidad)}</p>
                    <p className="text-white/70 text-xs">Margen: {currentMonth.margen.toFixed(1)}%</p>
                </div>

                {/* Ingresos */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-slate-600 text-sm font-medium">Ingresos del Mes</span>
                        <DollarSign className="text-blue-600" size={24} />
                    </div>
                    <p className="text-3xl font-bold text-blue-700 mb-1">{formatCLP(currentMonth.ingresos)}</p>
                    <p className={`text-xs flex items-center gap-1 ${currentMonth.ingresosChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {currentMonth.ingresosChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {Math.abs(currentMonth.ingresosChange).toFixed(1)}% vs mes anterior
                    </p>
                </div>

                {/* Gastos */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-amber-200">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-slate-600 text-sm font-medium">Gastos del Mes</span>
                        <AlertCircle className="text-amber-600" size={24} />
                    </div>
                    <p className="text-3xl font-bold text-amber-700 mb-1">{formatCLP(currentMonth.gastos)}</p>
                    <p className={`text-xs flex items-center gap-1 ${currentMonth.gastosChange > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {currentMonth.gastosChange > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {Math.abs(currentMonth.gastosChange).toFixed(1)}% vs mes anterior
                    </p>
                </div>

                {/* Caja */}
                <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-purple-200">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-slate-600 text-sm font-medium">Caja + Bancos</span>
                        <Zap className="text-purple-600" size={24} />
                    </div>
                    <p className="text-3xl font-bold text-purple-700 mb-1">{formatCLP(cashBalance)}</p>
                    <p className="text-xs text-slate-500">Disponible inmediato</p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trend Chart */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Tendencia Últimos 6 Meses</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="month" stroke="#94a3b8" />
                            <YAxis stroke="#94a3b8" tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`} />
                            <Tooltip formatter={(val: number) => formatCLP(val)} />
                            <Legend />
                            <Line type="monotone" dataKey="ingresos" stroke="#3b82f6" strokeWidth={3} name="Ingresos" />
                            <Line type="monotone" dataKey="gastos" stroke="#f59e0b" strokeWidth={3} name="Gastos" />
                            <Line type="monotone" dataKey="utilidad" stroke="#10b981" strokeWidth={3} name="Utilidad" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Expenses */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Top 5 Gastos del Mes</h3>
                    <div className="space-y-3">
                        {topExpenses.map((expense, idx) => (
                            <div key={idx} className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-600 font-medium truncate">{expense.name}</span>
                                    <span className="text-slate-800 font-bold">{formatCLP(expense.amount)}</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-rose-400 to-rose-600 rounded-full"
                                        style={{ width: `${(expense.amount / topExpenses[0].amount) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Alerts */}
            {alerts.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <AlertCircle className="text-slate-600" size={20} />
                        Alertas Inteligentes
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {alerts.map((alert, idx) => (
                            <div
                                key={idx}
                                className={`p-4 rounded-lg border-2 ${alert.type === 'danger' ? 'bg-rose-50 border-rose-200 text-rose-800' :
                                    alert.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                                        'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    }`}
                            >
                                <p className="text-sm font-medium">{alert.message}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Financial Ratios Analysis Panel */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <TrendingUp className="text-indigo-600" size={20} />
                    Análisis de Ratios Financieros
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Liquidez */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wide border-b border-slate-200 pb-2">
                            💧 Liquidez
                        </h4>

                        {(() => {
                            // Calculate current assets and liabilities
                            const currentAssets = ['1.1.01', '1.1.02', '1.1.03', '1.1.04', '1.1.05', '1.1.06'].reduce((sum, code) => {
                                const account = INITIAL_ACCOUNTS.find(a => a.code === code);
                                if (!account) return sum;
                                let balance = 0;
                                journalEntries.forEach(entry => {
                                    entry.lines.forEach(line => {
                                        if (line.accountId === code) {
                                            balance += line.debit - line.credit;
                                        }
                                    });
                                });
                                return sum + balance;
                            }, 0);

                            const currentLiabilities = ['2.1.01', '2.1.02', '2.1.03', '2.1.04'].reduce((sum, code) => {
                                const account = INITIAL_ACCOUNTS.find(a => a.code === code);
                                if (!account) return sum;
                                let balance = 0;
                                journalEntries.forEach(entry => {
                                    entry.lines.forEach(line => {
                                        if (line.accountId === code) {
                                            balance += line.credit - line.debit;
                                        }
                                    });
                                });
                                return sum + Math.abs(balance);
                            }, 0);

                            const inventory = (() => {
                                let balance = 0;
                                journalEntries.forEach(entry => {
                                    entry.lines.forEach(line => {
                                        if (line.accountId === '1.1.06') {
                                            balance += line.debit - line.credit;
                                        }
                                    });
                                });
                                return balance;
                            })();

                            const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
                            const acidTest = currentLiabilities > 0 ? (currentAssets - inventory) / currentLiabilities : 0;

                            return (
                                <>
                                    <div className="bg-slate-50 rounded-lg p-3">
                                        <p className="text-xs text-slate-600 mb-1">Razón Corriente</p>
                                        <p className={`text-2xl font-bold ${currentRatio >= 1.5 ? 'text-emerald-600' : currentRatio >= 1 ? 'text-amber-600' : 'text-rose-600'}`}>
                                            {currentRatio.toFixed(2)}
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-1">
                                            {currentRatio >= 1.5 ? '✅ Excelente' : currentRatio >= 1 ? '⚠️ Aceptable' : '❌ Bajo'}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-3">
                                        <p className="text-xs text-slate-600 mb-1">Prueba Ácida</p>
                                        <p className={`text-2xl font-bold ${acidTest >= 1 ? 'text-emerald-600' : acidTest >= 0.8 ? 'text-amber-600' : 'text-rose-600'}`}>
                                            {acidTest.toFixed(2)}
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-1">
                                            {acidTest >= 1 ? '✅ Sólido' : acidTest >= 0.8 ? '⚠️ Moderado' : '❌ Riesgo'}
                                        </p>
                                    </div>
                                </>
                            );
                        })()}
                    </div>

                    {/* Rentabilidad */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wide border-b border-slate-200 pb-2">
                            📈 Rentabilidad
                        </h4>

                        {(() => {
                            const totalAssets = INITIAL_ACCOUNTS
                                .filter(a => a.type === 'Activo' && a.isImputable)
                                .reduce((sum, acc) => {
                                    let balance = 0;
                                    journalEntries.forEach(entry => {
                                        entry.lines.forEach(line => {
                                            if (line.accountId === acc.code) {
                                                balance += line.debit - line.credit;
                                            }
                                        });
                                    });
                                    return sum + balance;
                                }, 0);

                            const totalEquity = INITIAL_ACCOUNTS
                                .filter(a => a.type === 'Patrimonio' && a.isImputable)
                                .reduce((sum, acc) => {
                                    let balance = 0;
                                    journalEntries.forEach(entry => {
                                        entry.lines.forEach(line => {
                                            if (line.accountId === acc.code) {
                                                balance += line.credit - line.debit;
                                            }
                                        });
                                    });
                                    return sum + Math.abs(balance);
                                }, 0);

                            const netProfit = currentMonth.utilidad;
                            const roa = totalAssets > 0 ? (netProfit / totalAssets) * 100 : 0;
                            const roe = (totalEquity + netProfit) > 0 ? (netProfit / (totalEquity + netProfit)) * 100 : 0;

                            return (
                                <>
                                    <div className="bg-slate-50 rounded-lg p-3">
                                        <p className="text-xs text-slate-600 mb-1">ROA (Return on Assets)</p>
                                        <p className={`text-2xl font-bold ${roa >= 5 ? 'text-emerald-600' : roa >= 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                                            {roa.toFixed(1)}%
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-1">Retorno s/ Activos</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-3">
                                        <p className="text-xs text-slate-600 mb-1">ROE (Return on Equity)</p>
                                        <p className={`text-2xl font-bold ${roe >= 15 ? 'text-emerald-600' : roe >= 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                                            {roe.toFixed(1)}%
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-1">Retorno s/ Patrimonio</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-3">
                                        <p className="text-xs text-slate-600 mb-1">Margen Neto</p>
                                        <p className={`text-2xl font-bold ${currentMonth.margen >= 20 ? 'text-emerald-600' : currentMonth.margen >= 10 ? 'text-amber-600' : 'text-rose-600'}`}>
                                            {currentMonth.margen.toFixed(1)}%
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-1">Utilidad / Ingresos</p>
                                    </div>
                                </>
                            );
                        })()}
                    </div>

                    {/* Endeudamiento */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wide border-b border-slate-200 pb-2">
                            ⚖️ Endeudamiento
                        </h4>

                        {(() => {
                            const totalAssets = INITIAL_ACCOUNTS
                                .filter(a => a.type === 'Activo' && a.isImputable)
                                .reduce((sum, acc) => {
                                    let balance = 0;
                                    journalEntries.forEach(entry => {
                                        entry.lines.forEach(line => {
                                            if (line.accountId === acc.code) {
                                                balance += line.debit - line.credit;
                                            }
                                        });
                                    });
                                    return sum + balance;
                                }, 0);

                            const totalLiabilities = INITIAL_ACCOUNTS
                                .filter(a => a.type === 'Pasivo' && a.isImputable)
                                .reduce((sum, acc) => {
                                    let balance = 0;
                                    journalEntries.forEach(entry => {
                                        entry.lines.forEach(line => {
                                            if (line.accountId === acc.code) {
                                                balance += line.credit - line.debit;
                                            }
                                        });
                                    });
                                    return sum + Math.abs(balance);
                                }, 0);

                            const totalEquity = totalAssets - totalLiabilities;
                            const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
                            const debtToEquity = totalEquity > 0 ? (totalLiabilities / totalEquity) * 100 : 0;

                            return (
                                <>
                                    <div className="bg-slate-50 rounded-lg p-3">
                                        <p className="text-xs text-slate-600 mb-1">Razón de Deuda</p>
                                        <p className={`text-2xl font-bold ${debtRatio <= 50 ? 'text-emerald-600' : debtRatio <= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                                            {debtRatio.toFixed(1)}%
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-1">
                                            {debtRatio <= 50 ? '✅ Bajo' : debtRatio <= 70 ? '⚠️ Moderado' : '❌ Alto'}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-3">
                                        <p className="text-xs text-slate-600 mb-1">Deuda / Patrimonio</p>
                                        <p className={`text-2xl font-bold ${debtToEquity <= 100 ? 'text-emerald-600' : debtToEquity <= 200 ? 'text-amber-600' : 'text-rose-600'}`}>
                                            {debtToEquity.toFixed(1)}%
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-1">Apalancamiento</p>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>

                {/* Legend */}
                <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-600">
                        <strong>Interpretación:</strong>
                        <span className="ml-2">✅ = Excelente</span>
                        <span className="ml-2">⚠️ = Revisar</span>
                        <span className="ml-2">❌ = Crítico</span>
                    </p>
                </div>
            </div>
        </div>
    );
};
