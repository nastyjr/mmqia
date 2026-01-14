import React, { useState, useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { INITIAL_ACCOUNTS } from '../types';
import { ArrowLeft, FileText, Printer, Download } from 'lucide-react';
import { exportToExcel } from '../utils/excelExport';

type StatementTab = 'BALANCE' | 'INCOME' | 'EQUITY' | 'CASHFLOW';
type IFRSStandard = 'FULL' | 'PYMES';

export const IFRSFinancialStatementsView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { journalEntries } = useAccounting();
    const [activeTab, setActiveTab] = useState<StatementTab>('INCOME');
    const [standard, setStandard] = useState<IFRSStandard>('PYMES');

    const formatCLP = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(val);

    const handlePrint = () => {
        window.print();
    };

    const handleExport = () => {
        if (activeTab === 'INCOME') {
            const data = [
                ...incomeStatement.revenues.filter(acc => acc.isImputable && Math.abs(accountBalances[acc.code] || 0) > 0).map(acc => ({
                    Tipo: 'Ingreso',
                    Cuenta: acc.name,
                    Código: acc.code,
                    Monto: Math.abs(accountBalances[acc.code] || 0)
                })),
                ...incomeStatement.costs.filter(acc => acc.isImputable && Math.abs(accountBalances[acc.code] || 0) > 0).map(acc => ({
                    Tipo: 'Costo',
                    Cuenta: acc.name,
                    Código: acc.code,
                    Monto: -Math.abs(accountBalances[acc.code] || 0)
                })),
                ...incomeStatement.expenses.filter(acc => acc.isImputable && Math.abs(accountBalances[acc.code] || 0) > 0).map(acc => ({
                    Tipo: 'Gasto',
                    Cuenta: acc.name,
                    Código: acc.code,
                    Monto: -Math.abs(accountBalances[acc.code] || 0)
                })),
                {
                    Tipo: 'RESULTADO',
                    Cuenta: 'Utilidad/Pérdida del Ejercicio',
                    Código: '-',
                    Monto: incomeStatement.netProfit
                }
            ];
            exportToExcel(data, `Estado_Resultados_${new Date().toISOString().split('T')[0]}`, 'Resultados');
        } else if (activeTab === 'BALANCE') {
            const data = [
                ...balanceSheet.assets.filter(acc => acc.isImputable && Math.abs(accountBalances[acc.code] || 0) > 0).map(acc => ({
                    Tipo: 'Activo',
                    Cuenta: acc.name,
                    Código: acc.code,
                    Monto: accountBalances[acc.code] || 0
                })),
                ...balanceSheet.liabilities.filter(acc => acc.isImputable && Math.abs(accountBalances[acc.code] || 0) > 0).map(acc => ({
                    Tipo: 'Pasivo',
                    Cuenta: acc.name,
                    Código: acc.code,
                    Monto: Math.abs(accountBalances[acc.code] || 0)
                })),
                ...balanceSheet.equity.filter(acc => acc.isImputable).map(acc => ({
                    Tipo: 'Patrimonio',
                    Cuenta: acc.name,
                    Código: acc.code,
                    Monto: Math.abs(accountBalances[acc.code] || 0)
                })),
                {
                    Tipo: 'Patrimonio',
                    Cuenta: 'Resultado del Ejercicio',
                    Código: '-',
                    Monto: incomeStatement.netProfit
                }
            ];
            exportToExcel(data, `Balance_General_${new Date().toISOString().split('T')[0]}`, 'Balance');
        }
    };

    // Calculate account balances
    const accountBalances = useMemo(() => {
        const balances: Record<string, number> = {};

        journalEntries.forEach(entry => {
            entry.lines.forEach(line => {
                if (!balances[line.accountId]) balances[line.accountId] = 0;
                balances[line.accountId] += line.debit - line.credit;
            });
        });

        return balances;
    }, [journalEntries]);

    // Balance Sheet
    const balanceSheet = useMemo(() => {
        const assets = INITIAL_ACCOUNTS.filter(a => a.type === 'Activo');
        const liabilities = INITIAL_ACCOUNTS.filter(a => a.type === 'Pasivo');
        const equity = INITIAL_ACCOUNTS.filter(a => a.type === 'Patrimonio');

        const totalAssets = assets.reduce((sum, acc) => sum + (accountBalances[acc.code] || 0), 0);
        const totalLiabilities = liabilities.reduce((sum, acc) => sum + Math.abs(accountBalances[acc.code] || 0), 0);
        const totalEquity = equity.reduce((sum, acc) => sum + Math.abs(accountBalances[acc.code] || 0), 0);

        return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity };
    }, [accountBalances]);

    // Income Statement
    const incomeStatement = useMemo(() => {
        const revenues = INITIAL_ACCOUNTS.filter(a => a.type === 'Ingresos');
        const costs = INITIAL_ACCOUNTS.filter(a => a.type === 'Costos');
        const expenses = INITIAL_ACCOUNTS.filter(a => a.type === 'Gastos');

        const totalRevenues = revenues.reduce((sum, acc) => sum + Math.abs(accountBalances[acc.code] || 0), 0);
        const totalCosts = costs.reduce((sum, acc) => sum + Math.abs(accountBalances[acc.code] || 0), 0);
        const totalExpenses = expenses.reduce((sum, acc) => sum + Math.abs(accountBalances[acc.code] || 0), 0);

        const grossProfit = totalRevenues - totalCosts;
        const netProfit = grossProfit - totalExpenses;

        return { revenues, costs, expenses, totalRevenues, totalCosts, totalExpenses, grossProfit, netProfit };
    }, [accountBalances]);

    const currentDate = new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="pb-12">
            <div className="flex items-center justify-between mb-6 print:hidden">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Estados Financieros</h1>
                        <p className="text-slate-500 text-sm">Normas Internacionales de Información Financiera</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Standard Selector */}
                    <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                        <button
                            onClick={() => setStandard('PYMES')}
                            className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${standard === 'PYMES' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            IFRS PYMES
                        </button>
                        <button
                            onClick={() => setStandard('FULL')}
                            className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${standard === 'FULL' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            IFRS Completo
                        </button>
                    </div>

                    {/* Export Button */}
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                    >
                        <Download size={16} />
                        Exportar Excel
                    </button>

                    {/* Print Button */}
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
                    >
                        <Printer size={16} />
                        Imprimir
                    </button>
                </div>
            </div>

            {/* Standard Badge (shown in print) */}
            <div className="hidden print:block text-center mb-4">
                <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded">
                    {standard === 'PYMES' ? 'Preparado bajo IFRS para PYMES (Chile)' : 'Preparado bajo IFRS Completo'}
                </span>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-slate-300 print:hidden">
                <button
                    onClick={() => setActiveTab('INCOME')}
                    className={`px-4 py-2 font-semibold border-b-2 transition-colors ${activeTab === 'INCOME' ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Estado de Resultados Integrales
                </button>
                <button
                    onClick={() => setActiveTab('BALANCE')}
                    className={`px-4 py-2 font-semibold border-b-2 transition-colors ${activeTab === 'BALANCE' ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Estado de Situación Financiera
                </button>
                <button
                    onClick={() => setActiveTab('EQUITY')}
                    className={`px-4 py-2 font-semibold border-b-2 transition-colors ${activeTab === 'EQUITY' ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Cambios en el Patrimonio
                </button>
                <button
                    onClick={() => setActiveTab('CASHFLOW')}
                    className={`px-4 py-2 font-semibold border-b-2 transition-colors ${activeTab === 'CASHFLOW' ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Flujo de Efectivo
                </button>
            </div>

            {/* Income Statement - Formal Format */}
            {activeTab === 'INCOME' && (
                <div className="bg-white border border-slate-300 max-w-4xl mx-auto">
                    <div className="border-b border-slate-300 p-6 text-center bg-slate-50">
                        <h2 className="text-xl font-bold text-slate-800 mb-1">TU EMPRESA S.A.</h2>
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">ESTADO DE RESULTADOS INTEGRALES</h3>
                        <p className="text-sm text-slate-600">Por el período terminado al {currentDate}</p>
                        <p className="text-xs text-slate-500 mt-1">(Cifras expresadas en Pesos Chilenos)</p>
                        {standard === 'FULL' && (
                            <p className="text-xs text-slate-500 italic mt-2">Preparado de acuerdo con IFRS emitidas por el IASB</p>
                        )}
                    </div>

                    <div className="p-8">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-slate-800">
                                    <th className="text-left font-bold py-2">CONCEPTO</th>
                                    <th className="text-right font-bold py-2 w-40">NOTA</th>
                                    <th className="text-right font-bold py-2 w-48">M$</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* INGRESOS */}
                                <tr className="border-t border-slate-200">
                                    <td colSpan={3} className="py-3 font-bold text-slate-700 uppercase">Ingresos de Actividades Ordinarias</td>
                                </tr>
                                {incomeStatement.revenues
                                    .filter(acc => acc.isImputable && Math.abs(accountBalances[acc.code] || 0) > 0)
                                    .map(acc => (
                                        <tr key={acc.code}>
                                            <td className="py-1.5 pl-6 text-slate-700">{acc.name}</td>
                                            <td className="text-right text-slate-500">{acc.code}</td>
                                            <td className="text-right font-mono text-slate-800">{formatCLP(Math.abs(accountBalances[acc.code] || 0))}</td>
                                        </tr>
                                    ))}
                                <tr className="border-t border-slate-400">
                                    <td className="py-2 pl-6 font-bold text-slate-800">Total Ingresos de Actividades Ordinarias</td>
                                    <td></td>
                                    <td className="text-right font-mono font-bold text-slate-800">{formatCLP(incomeStatement.totalRevenues)}</td>
                                </tr>

                                {/* COSTO DE VENTAS */}
                                <tr className="border-t border-slate-200">
                                    <td colSpan={3} className="py-3 font-bold text-slate-700 uppercase">Costo de Ventas</td>
                                </tr>
                                {incomeStatement.costs
                                    .filter(acc => acc.isImputable && Math.abs(accountBalances[acc.code] || 0) > 0)
                                    .map(acc => (
                                        <tr key={acc.code}>
                                            <td className="py-1.5 pl-6 text-slate-700">{acc.name}</td>
                                            <td className="text-right text-slate-500">{acc.code}</td>
                                            <td className="text-right font-mono text-slate-800">({formatCLP(Math.abs(accountBalances[acc.code] || 0))})</td>
                                        </tr>
                                    ))}
                                <tr className="border-t border-slate-400">
                                    <td className="py-2 pl-6 font-bold text-slate-800">Total Costo de Ventas</td>
                                    <td></td>
                                    <td className="text-right font-mono font-bold text-slate-800">({formatCLP(incomeStatement.totalCosts)})</td>
                                </tr>

                                {/* GANANCIA BRUTA */}
                                <tr className="border-t-2 border-slate-600 bg-slate-50">
                                    <td className="py-3 pl-6 font-bold text-slate-900">GANANCIA BRUTA</td>
                                    <td></td>
                                    <td className="text-right font-mono font-bold text-lg text-slate-900">{formatCLP(incomeStatement.grossProfit)}</td>
                                </tr>

                                {/* GASTOS */}
                                <tr className="border-t border-slate-200">
                                    <td colSpan={3} className="py-3 font-bold text-slate-700 uppercase">Gastos de Administración y Ventas</td>
                                </tr>
                                {incomeStatement.expenses
                                    .filter(acc => acc.isImputable && Math.abs(accountBalances[acc.code] || 0) > 0)
                                    .map(acc => (
                                        <tr key={acc.code}>
                                            <td className="py-1.5 pl-6 text-slate-700">{acc.name}</td>
                                            <td className="text-right text-slate-500">{acc.code}</td>
                                            <td className="text-right font-mono text-slate-800">({formatCLP(Math.abs(accountBalances[acc.code] || 0))})</td>
                                        </tr>
                                    ))}
                                <tr className="border-t border-slate-400">
                                    <td className="py-2 pl-6 font-bold text-slate-800">Total Gastos</td>
                                    <td></td>
                                    <td className="text-right font-mono font-bold text-slate-800">({formatCLP(incomeStatement.totalExpenses)})</td>
                                </tr>

                                {/* RESULTADO DEL EJERCICIO */}
                                <tr className="border-t-4 border-double border-slate-900 bg-slate-100">
                                    <td className="py-4 pl-6 font-bold text-lg text-slate-900">
                                        {incomeStatement.netProfit >= 0 ? 'GANANCIA (PÉRDIDA) DEL EJERCICIO' : 'PÉRDIDA DEL EJERCICIO'}
                                    </td>
                                    <td></td>
                                    <td className={`text-right font-mono font-bold text-xl ${incomeStatement.netProfit >= 0 ? 'text-slate-900' : 'text-red-700'}`}>
                                        {incomeStatement.netProfit >= 0 ? formatCLP(incomeStatement.netProfit) : `(${formatCLP(Math.abs(incomeStatement.netProfit))})`}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="border-t border-slate-300 p-4 bg-slate-50 text-xs text-slate-600 text-center">
                        Las notas adjuntas forman parte integral de estos estados financieros.
                    </div>
                </div>
            )}

            {/* Balance Sheet - Formal Format */}
            {activeTab === 'BALANCE' && (
                <div className="bg-white border border-slate-300 max-w-5xl mx-auto">
                    <div className="border-b border-slate-300 p-6 text-center bg-slate-50">
                        <h2 className="text-xl font-bold text-slate-800 mb-1">TU EMPRESA S.A.</h2>
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">ESTADO DE SITUACIÓN FINANCIERA</h3>
                        <p className="text-sm text-slate-600">Al {currentDate}</p>
                        <p className="text-xs text-slate-500 mt-1">(Expresado en Pesos Chilenos)</p>
                    </div>

                    <div className="p-8">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-slate-800">
                                    <th className="text-left font-bold py-2">ACTIVOS</th>
                                    <th className="text-right font-bold py-2 w-40">NOTA</th>
                                    <th className="text-right font-bold py-2 w-48">M$</th>
                                </tr>
                            </thead>
                            <tbody>
                                {balanceSheet.assets
                                    .filter(acc => acc.isImputable && Math.abs(accountBalances[acc.code] || 0) > 0)
                                    .map(acc => (
                                        <tr key={acc.code}>
                                            <td className="py-1.5 pl-4 text-slate-700">{acc.name}</td>
                                            <td className="text-right text-slate-500">{acc.code}</td>
                                            <td className="text-right font-mono text-slate-800">{formatCLP(accountBalances[acc.code] || 0)}</td>
                                        </tr>
                                    ))}
                                <tr className="border-t-2 border-slate-900 bg-slate-100">
                                    <td className="py-3 pl-4 font-bold text-slate-900">TOTAL ACTIVOS</td>
                                    <td></td>
                                    <td className="text-right font-mono font-bold text-lg text-slate-900">{formatCLP(balanceSheet.totalAssets)}</td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="h-8"></div>

                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-slate-800">
                                    <th className="text-left font-bold py-2">PASIVOS Y PATRIMONIO</th>
                                    <th className="text-right font-bold py-2 w-40">NOTA</th>
                                    <th className="text-right font-bold py-2 w-48">M$</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-t border-slate-200">
                                    <td colSpan={3} className="py-2 font-bold text-slate-700 uppercase">Pasivos</td>
                                </tr>
                                {balanceSheet.liabilities
                                    .filter(acc => acc.isImputable && Math.abs(accountBalances[acc.code] || 0) > 0)
                                    .map(acc => (
                                        <tr key={acc.code}>
                                            <td className="py-1.5 pl-4 text-slate-700">{acc.name}</td>
                                            <td className="text-right text-slate-500">{acc.code}</td>
                                            <td className="text-right font-mono text-slate-800">{formatCLP(Math.abs(accountBalances[acc.code] || 0))}</td>
                                        </tr>
                                    ))}
                                <tr className="border-t border-slate-400">
                                    <td className="py-2 pl-4 font-bold text-slate-800">Total Pasivos</td>
                                    <td></td>
                                    <td className="text-right font-mono font-bold text-slate-800">{formatCLP(balanceSheet.totalLiabilities)}</td>
                                </tr>

                                <tr className="border-t border-slate-200">
                                    <td colSpan={3} className="py-2 font-bold text-slate-700 uppercase">Patrimonio</td>
                                </tr>
                                {balanceSheet.equity
                                    .filter(acc => acc.isImputable)
                                    .map(acc => (
                                        <tr key={acc.code}>
                                            <td className="py-1.5 pl-4 text-slate-700">{acc.name}</td>
                                            <td className="text-right text-slate-500">{acc.code}</td>
                                            <td className="text-right font-mono text-slate-800">{formatCLP(Math.abs(accountBalances[acc.code] || 0))}</td>
                                        </tr>
                                    ))}
                                <tr>
                                    <td className="py-1.5 pl-4 text-slate-700">Resultado del Ejercicio</td>
                                    <td className="text-right text-slate-500">-</td>
                                    <td className="text-right font-mono text-slate-800">{formatCLP(incomeStatement.netProfit)}</td>
                                </tr>
                                <tr className="border-t border-slate-400">
                                    <td className="py-2 pl-4 font-bold text-slate-800">Total Patrimonio</td>
                                    <td></td>
                                    <td className="text-right font-mono font-bold text-slate-800">{formatCLP(balanceSheet.totalEquity + incomeStatement.netProfit)}</td>
                                </tr>

                                <tr className="border-t-2 border-slate-900 bg-slate-100">
                                    <td className="py-3 pl-4 font-bold text-slate-900">TOTAL PASIVOS Y PATRIMONIO</td>
                                    <td></td>
                                    <td className="text-right font-mono font-bold text-lg text-slate-900">{formatCLP(balanceSheet.totalLiabilities + balanceSheet.totalEquity + incomeStatement.netProfit)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="border-t border-slate-300 p-4 bg-slate-50 text-xs text-slate-600 text-center">
                        Las notas adjuntas forman parte integral de estos estados financieros.
                    </div>
                </div>
            )}

            {/* Equity Changes */}
            {activeTab === 'EQUITY' && (
                <div className="bg-white border border-slate-300 max-w-4xl mx-auto">
                    <div className="border-b border-slate-300 p-6 text-center bg-slate-50">
                        <h2 className="text-xl font-bold text-slate-800 mb-1">TU EMPRESA S.A.</h2>
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">ESTADO DE CAMBIOS EN EL PATRIMONIO</h3>
                        <p className="text-sm text-slate-600">Por el período terminado al {currentDate}</p>
                        <p className="text-xs text-slate-500 mt-1">(Expresado en Pesos Chilenos)</p>
                    </div>

                    <div className="p-8">
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b-2 border-slate-800">
                                    <td className="font-bold py-2">Saldo Inicial del Período</td>
                                    <td className="text-right font-mono font-bold py-2">{formatCLP(balanceSheet.totalEquity)}</td>
                                </tr>
                                <tr>
                                    <td className="py-2 pl-6">Resultado del Ejercicio</td>
                                    <td className="text-right font-mono py-2">{formatCLP(incomeStatement.netProfit)}</td>
                                </tr>
                                <tr className="border-t-2 border-slate-900 bg-slate-100">
                                    <td className="font-bold py-3">Saldo Final del Período</td>
                                    <td className="text-right font-mono font-bold text-lg py-3">{formatCLP(balanceSheet.totalEquity + incomeStatement.netProfit)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="border-t border-slate-300 p-4 bg-slate-50 text-xs text-slate-600 text-center">
                        Las notas adjuntas forman parte integral de estos estados financieros.
                    </div>
                </div>
            )}

            {/* Cash Flow */}
            {activeTab === 'CASHFLOW' && (
                <div className="bg-white border border-slate-300 max-w-4xl mx-auto">
                    <div className="border-b border-slate-300 p-6 text-center bg-slate-50">
                        <h2 className="text-xl font-bold text-slate-800 mb-1">TU EMPRESA S.A.</h2>
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">ESTADO DE FLUJOS DE EFECTIVO</h3>
                        <p className="text-sm text-slate-600">Por el período terminado al {currentDate}</p>
                        <p className="text-xs text-slate-500 mt-1">(Método Directo - Expresado en Pesos Chilenos)</p>
                    </div>

                    <div className="p-8">
                        <table className="w-full text-sm">
                            <tbody>
                                <tr className="border-b-2 border-slate-800">
                                    <td className="font-bold py-2 uppercase">Flujos de Efectivo de Actividades de Operación</td>
                                    <td className="text-right font-mono font-bold py-2 w-48"></td>
                                </tr>
                                <tr>
                                    <td className="py-2 pl-6">Efectivo y Equivalentes al Efectivo</td>
                                    <td className="text-right font-mono py-2">{formatCLP((accountBalances['1.1.01'] || 0) + (accountBalances['1.1.03'] || 0))}</td>
                                </tr>
                                <tr className="border-t-2 border-slate-900 bg-slate-100">
                                    <td className="font-bold py-3">Efectivo Neto Provisto por (Utilizado en) Actividades de Operación</td>
                                    <td className="text-right font-mono font-bold text-lg py-3">{formatCLP((accountBalances['1.1.01'] || 0) + (accountBalances['1.1.03'] || 0))}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="border-t border-slate-300 p-4 bg-slate-50 text-xs text-slate-600 text-center">
                        Las notas adjuntas forman parte integral de estos estados financieros.
                    </div>
                </div>
            )}
        </div>
    );
};
