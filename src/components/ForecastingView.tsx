import React, { useMemo, useState } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { useAccounting } from '../context/AccountingContext';
import { groupEntriesByMonth, calculateProjection } from '../utils/forecasting';
import {
    ComposedChart,
    Line,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Area
} from 'recharts';

interface ForecastingViewProps {
    onBack: () => void;
}

export const ForecastingView: React.FC<ForecastingViewProps> = ({ onBack }) => {
    const { journalEntries } = useAccounting();
    const [projectionMonths, setProjectionMonths] = useState(6);

    const { chartData, metrics } = useMemo(() => {
        const historical = groupEntriesByMonth(journalEntries);
        if (historical.length === 0) return { chartData: [], metrics: null };

        const { projections, metrics: forecastMetrics } = calculateProjection(historical, projectionMonths);
        return {
            chartData: [...historical, ...projections],
            metrics: forecastMetrics
        };
    }, [journalEntries, projectionMonths]);

    // Statistics
    const currentMonth_PredictedIncome = chartData.find(d => d.isProjected)?.income || 0;
    const lastHistorical = chartData.filter(d => !d.isProjected).pop();
    const trend = lastHistorical && currentMonth_PredictedIncome > lastHistorical.income ? 'up' : 'down';

    return (
        <div className="p-6 bg-slate-50 min-h-screen animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                    >
                        <ArrowLeft className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <TrendingUp className="text-indigo-600" />
                            Proyecciones Financieras
                        </h1>
                        <p className="text-slate-500">Análisis predictivo de Ingresos y Gastos</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
                    <span className="text-sm font-medium text-slate-600">Proyectar a:</span>
                    <select
                        value={projectionMonths}
                        onChange={(e) => setProjectionMonths(Number(e.target.value))}
                        className="text-sm font-bold text-indigo-600 bg-transparent outline-none cursor-pointer"
                    >
                        <option value={3}>3 Meses</option>
                        <option value={6}>6 Meses</option>
                        <option value={12}>12 Meses</option>
                    </select>
                </div>
            </div>

            {chartData.length < 2 ? (
                <div className="flex flex-col items-center justify-center h-96 bg-white rounded-2xl shadow-sm border border-slate-200">
                    <div className="p-4 bg-yellow-50 rounded-full mb-4">
                        <TrendingUp size={32} className="text-yellow-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">Datos Insuficientes</h3>
                    <p className="text-slate-500 max-w-md text-center">
                        Necesitamos al menos 2 meses de historial contable para generar proyecciones confiables.
                        Continúa registrando movimientos para activar este módulo.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Chart */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-6">Tendencia y Proyección</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis
                                        dataKey="month"
                                        tick={{ fontSize: 12, fill: '#64748B' }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 12, fill: '#64748B' }}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                                    />
                                    <Legend />
                                    <Bar dataKey="income" name="Ingresos Reales" fill="#6366F1" barSize={20} stackId="a" />
                                    <Bar dataKey="expense" name="Gastos Reales" fill="#EF4444" barSize={20} />
                                    {/* Projected Lines */}
                                    <Line type="monotone" dataKey="income" name="Tendencia Ingresos" stroke="#818CF8" strokeDasharray="5 5" strokeWidth={2} dot={false} activeDot={false} connectNulls />
                                    <Line type="monotone" dataKey="expense" name="Tendencia Gastos" stroke="#F87171" strokeDasharray="5 5" strokeWidth={2} dot={false} activeDot={false} connectNulls />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Stats Panel */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Próximo Mes (Estimado)</h3>

                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                                            <TrendingUp size={20} />
                                        </div>
                                        {trend === 'up' ? (
                                            <span className="flex items-center text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                                Crecimiento
                                            </span>
                                        ) : (
                                            <span className="flex items-center text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                                                Estable/Baja
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-2xl font-bold text-indigo-900">
                                        ${currentMonth_PredictedIncome.toLocaleString()}
                                    </div>
                                    <p className="text-xs text-indigo-700 font-medium">Ingresos Proyectados</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                                        <p className="text-xs text-slate-500 mb-1">Promedio Ingresos</p>
                                        <p className="text-sm font-bold text-slate-800">
                                            ${Math.round(chartData.filter(d => !d.isProjected).reduce((a, b) => a + b.income, 0) / (chartData.filter(d => !d.isProjected).length || 1)).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                                        <p className="text-xs text-slate-500 mb-1">Promedio Gastos</p>
                                        <p className="text-sm font-bold text-slate-800">
                                            ${Math.round(chartData.filter(d => !d.isProjected).reduce((a, b) => a + b.expense, 0) / (chartData.filter(d => !d.isProjected).length || 1)).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-2xl shadow-lg text-white">
                            <h3 className="text-lg font-bold mb-4">📊 Calidad de la Predicción</h3>
                            {metrics ? (
                                <>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between items-center">
                                            <span className="text-indigo-100">R² (Precisión):</span>
                                            <span className="font-bold text-lg">
                                                {(metrics.rSquared * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-indigo-100">Tendencia:</span>
                                            <span className={`font-bold px-2 py-1 rounded text-xs ${metrics.trend.includes('UP') ? 'bg-green-500' :
                                                    metrics.trend.includes('DOWN') ? 'bg-red-500' : 'bg-yellow-500'
                                                }`}>
                                                {metrics.trend === 'STRONG_UP' ? '📈 Crecimiento Fuerte' :
                                                    metrics.trend === 'UP' ? '↗️ Crecimiento' :
                                                        metrics.trend === 'DOWN' ? '↘️ Decrecimiento' :
                                                            metrics.trend === 'STRONG_DOWN' ? '📉 Caída Fuerte' : '➡️ Estable'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-indigo-100">Crecimiento Mensual:</span>
                                            <span className="font-bold">{metrics.avgMonthlyGrowth > 0 ? '+' : ''}{metrics.avgMonthlyGrowth}%</span>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-indigo-400/30">
                                        <p className="text-indigo-100 text-xs leading-relaxed">
                                            {metrics.rSquared > 0.8 ? '✅ Las proyecciones son muy confiables.' :
                                                metrics.rSquared > 0.5 ? '⚠️ Las proyecciones tienen precisión moderada.' :
                                                    '❌ Datos insuficientes. Agrega más historial para mejorar precisión.'}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <p className="text-indigo-100 text-sm">Cargando métricas...</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
