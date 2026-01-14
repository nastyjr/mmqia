import React, { useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { INITIAL_ACCOUNTS, Account } from '../types';
import { ArrowLeft, Download, FileSpreadsheet } from 'lucide-react';

interface BalanceRow {
    account: Account;
    debit: number;
    credit: number;
    debtor: number;
    creditor: number;
    asset: number;
    liability: number;
    loss: number;
    gain: number;
}

export const Balance8ColumnasView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { journalEntries } = useAccounting();

    const data = useMemo(() => {
        const rows: BalanceRow[] = INITIAL_ACCOUNTS.map(acc => {
            let debit = 0;
            let credit = 0;

            // Sum debits and credits for this account
            journalEntries.forEach(entry => {
                entry.lines.filter(l => l.accountId === acc.code).forEach(l => {
                    debit += l.debit;
                    credit += l.credit;
                });
            });

            // Skip if no movement
            if (debit === 0 && credit === 0) return null;

            // Calculated columns
            const debtor = debit > credit ? debit - credit : 0;
            const creditor = credit > debit ? credit - debit : 0;

            let asset = 0;
            let liability = 0;
            let loss = 0;
            let gain = 0;

            // Classification Logic
            if (acc.type === 'Activo') {
                asset = debtor;
            } else if (acc.type === 'Pasivo' || acc.type === 'Patrimonio') {
                liability = creditor;
            } else if (acc.type === 'Gastos' || acc.type === 'Costos') {
                loss = debtor;
            } else if (acc.type === 'Ingresos') {
                gain = creditor;
            }

            return {
                account: acc,
                debit,
                credit,
                debtor,
                creditor,
                asset,
                liability,
                loss,
                gain
            };
        }).filter((r): r is BalanceRow => r !== null);

        // Totals
        const totals = rows.reduce((acc, row) => ({
            debit: acc.debit + row.debit,
            credit: acc.credit + row.credit,
            debtor: acc.debtor + row.debtor,
            creditor: acc.creditor + row.creditor,
            asset: acc.asset + row.asset,
            liability: acc.liability + row.liability,
            loss: acc.loss + row.loss,
            gain: acc.gain + row.gain
        }), { debit: 0, credit: 0, debtor: 0, creditor: 0, asset: 0, liability: 0, loss: 0, gain: 0 });

        // Calculate Result (Utilidad/Pérdida)
        // Profit = Gain - Loss
        // Should also equal Asset - Liability (Accounting Equation: A = L + E + (R - Exp))
        // Actually Result = Gain - Loss.
        // And Net Equity change should balance Asset vs Liability columns if we add Result to Liability side (as Equity).
        const result = totals.gain - totals.loss;

        return { rows, totals, result };
    }, [journalEntries]);

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
                            <FileSpreadsheet className="text-blue-600" /> Balance Tributario
                        </h1>
                        <p className="text-slate-500 text-sm">8 Columnas - Norma SII</p>
                    </div>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 text-sm font-medium">
                    <Download size={16} /> Exportar Excel
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-xs uppercase">
                            <tr>
                                <th className="px-4 py-3 min-w-[200px]" rowSpan={2}>Cuentas</th>
                                <th className="px-4 py-3 text-center bg-blue-50 border-x border-slate-200" colSpan={2}>Saldos Totales</th>
                                <th className="px-4 py-3 text-center bg-indigo-50 border-x border-slate-200" colSpan={2}>Saldos del Ejercicio</th>
                                <th className="px-4 py-3 text-center bg-emerald-50 border-x border-slate-200" colSpan={2}>Inventario</th>
                                <th className="px-4 py-3 text-center bg-orange-50 border-x border-slate-200" colSpan={2}>Resultado</th>
                            </tr>
                            <tr>
                                <th className="px-2 py-2 text-right bg-blue-50/50">Débito</th>
                                <th className="px-2 py-2 text-right bg-blue-50/50 border-r border-slate-200">Crédito</th>
                                <th className="px-2 py-2 text-right bg-indigo-50/50">Deudor</th>
                                <th className="px-2 py-2 text-right bg-indigo-50/50 border-r border-slate-200">Acreedor</th>
                                <th className="px-2 py-2 text-right bg-emerald-50/50">Activo</th>
                                <th className="px-2 py-2 text-right bg-emerald-50/50 border-r border-slate-200">Pasivo</th>
                                <th className="px-2 py-2 text-right bg-orange-50/50">Pérdida</th>
                                <th className="px-2 py-2 text-right bg-orange-50/50 border-r border-slate-200">Ganancia</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.rows.map((row) => (
                                <tr key={row.account.code} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-2 font-medium text-slate-700">
                                        <div className="flex flex-col">
                                            <span>{row.account.name}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">{row.account.code}</span>
                                        </div>
                                    </td>
                                    {/* Saldos Totales */}
                                    <td className="px-2 py-2 text-right tabular-nums text-slate-600">{formatCLP(row.debit)}</td>
                                    <td className="px-2 py-2 text-right tabular-nums text-slate-600 border-r border-slate-100">{formatCLP(row.credit)}</td>
                                    {/* Saldos Ejercicio */}
                                    <td className="px-2 py-2 text-right tabular-nums font-medium text-slate-800">{formatCLP(row.debtor)}</td>
                                    <td className="px-2 py-2 text-right tabular-nums font-medium text-slate-800 border-r border-slate-100">{formatCLP(row.creditor)}</td>
                                    {/* Inventario */}
                                    <td className="px-2 py-2 text-right tabular-nums text-emerald-600 bg-emerald-50/10">{formatCLP(row.asset)}</td>
                                    <td className="px-2 py-2 text-right tabular-nums text-emerald-600 bg-emerald-50/10 border-r border-slate-100">{formatCLP(row.liability)}</td>
                                    {/* Resultado */}
                                    <td className="px-2 py-2 text-right tabular-nums text-rose-600 bg-orange-50/10">{formatCLP(row.loss)}</td>
                                    <td className="px-2 py-2 text-right tabular-nums text-emerald-600 bg-orange-50/10">{formatCLP(row.gain)}</td>
                                </tr>
                            ))}

                            {/* Subtotals Row */}
                            <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                                <td className="px-4 py-3 text-slate-800 uppercase">Totales</td>
                                <td className="px-2 py-3 text-right">{formatCLP(data.totals.debit)}</td>
                                <td className="px-2 py-3 text-right border-r border-slate-300">{formatCLP(data.totals.credit)}</td>

                                <td className="px-2 py-3 text-right">{formatCLP(data.totals.debtor)}</td>
                                <td className="px-2 py-3 text-right border-r border-slate-300">{formatCLP(data.totals.creditor)}</td>

                                <td className="px-2 py-3 text-right text-emerald-700">{formatCLP(data.totals.asset)}</td>
                                <td className="px-2 py-3 text-right text-emerald-700 border-r border-slate-300">{formatCLP(data.totals.liability)}</td>

                                <td className="px-2 py-3 text-right text-rose-700">{formatCLP(data.totals.loss)}</td>
                                <td className="px-2 py-3 text-right text-emerald-700">{formatCLP(data.totals.gain)}</td>
                            </tr>

                            {/* Result Row (Adjustment to balance) */}
                            <tr className="bg-slate-50 font-bold text-blue-700">
                                <td className="px-4 py-3 uppercase">
                                    {data.result >= 0 ? 'Utilidad del Ejercicio' : 'Pérdida del Ejercicio'}
                                </td>
                                {/* Skip Totales/Saldos cols */}
                                <td colSpan={4} className="border-r border-slate-200"></td>

                                {/* Add result to Liability side if Profit, to Asset side if Loss (to balance columns visually? No, standard 8 col puts result at bottom to make sums equal) */}
                                {/* Actually, to make sums equal:
                                    If Profit (Asset > Liability, Gain > Loss): Add Profit to Liability & Loss columns to balance them?
                                    Actually standard presentation:
                                    Activo vs Pasivo+Utilidad
                                    Perdida+Utilidad vs Ganancia
                                */}
                                <td className="px-2 py-3 text-right"></td>
                                <td className="px-2 py-3 text-right border-r border-slate-300">
                                    {data.result >= 0 ? formatCLP(data.result) : ''}
                                </td>

                                <td className="px-2 py-3 text-right">
                                    {data.result >= 0 ? formatCLP(data.result) : ''}
                                </td>
                                <td className="px-2 py-3 text-right"></td>
                            </tr>

                            {/* Grand Totals (Proof of Square) */}
                            <tr className="bg-slate-800 text-white font-bold uppercase text-xs">
                                <td className="px-4 py-3">Totales Iguales</td>
                                <td className="px-2 py-3 text-right">{formatCLP(data.totals.debit)}</td>
                                <td className="px-2 py-3 text-right border-r border-slate-600">{formatCLP(data.totals.credit)}</td>

                                <td className="px-2 py-3 text-right">{formatCLP(data.totals.debtor)}</td>
                                <td className="px-2 py-3 text-right border-r border-slate-600">{formatCLP(data.totals.creditor)}</td>

                                {/* Balanced Inventory */}
                                <td className="px-2 py-3 text-right">
                                    {formatCLP(data.totals.asset)}
                                </td>
                                <td className="px-2 py-3 text-right border-r border-slate-600">
                                    {formatCLP(data.totals.liability + (data.result > 0 ? data.result : 0))}
                                </td>

                                {/* Balanced Result */}
                                <td className="px-2 py-3 text-right">
                                    {formatCLP(data.totals.loss + (data.result > 0 ? data.result : 0))}
                                </td>
                                <td className="px-2 py-3 text-right">
                                    {formatCLP(data.totals.gain)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
