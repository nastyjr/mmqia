import React, { useMemo, useRef } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { INITIAL_ACCOUNTS, Account } from '../types';
import { ArrowLeft, Download, FileSpreadsheet, Printer, FileText, Calendar } from 'lucide-react';

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
    const tableRef = useRef<HTMLDivElement>(null);

    const data = useMemo(() => {
        const rows: BalanceRow[] = INITIAL_ACCOUNTS.map(acc => {
            let debit = 0;
            let credit = 0;

            journalEntries.forEach(entry => {
                entry.lines.filter(l => l.accountId === acc.code).forEach(l => {
                    debit += l.debit;
                    credit += l.credit;
                });
            });

            if (debit === 0 && credit === 0) return null;

            const debtor = debit > credit ? debit - credit : 0;
            const creditor = credit > debit ? credit - debit : 0;

            let asset = 0;
            let liability = 0;
            let loss = 0;
            let gain = 0;

            if (acc.type === 'Activo') {
                asset = debtor;
            } else if (acc.type === 'Pasivo' || acc.type === 'Patrimonio') {
                liability = creditor;
            } else if (acc.type === 'Gastos' || acc.type === 'Costos') {
                loss = debtor;
            } else if (acc.type === 'Ingresos') {
                gain = creditor;
            }

            return { account: acc, debit, credit, debtor, creditor, asset, liability, loss, gain };
        }).filter((r): r is BalanceRow => r !== null);

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

        const result = totals.gain - totals.loss;
        return { rows, totals, result };
    }, [journalEntries]);

    const formatCLP = (val: number) => val === 0 ? '-' : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);
    const formatNum = (val: number) => val === 0 ? '0' : val.toString();

    // Export to Excel - Professional SII Format
    const exportToExcel = () => {
        const today = new Date();
        const formatDate = (d: Date) => d.toLocaleDateString('es-CL');
        const fmtMoney = (v: number) => v === 0 ? '-' : '$' + v.toLocaleString('es-CL');

        // Get period from journal entries
        const dates = journalEntries.map(e => e.date).filter(Boolean).sort();
        const periodStart = dates[0] || today.toISOString().split('T')[0];
        const periodEnd = dates[dates.length - 1] || today.toISOString().split('T')[0];

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
    body { font-family: Arial, sans-serif; font-size: 10pt; }
    .header { text-align: center; margin-bottom: 20px; }
    .company { font-size: 14pt; font-weight: bold; }
    .title { font-size: 12pt; font-weight: bold; margin: 10px 0; }
    .period { font-size: 10pt; color: #666; }
    table { border-collapse: collapse; width: 100%; margin-top: 15px; }
    th, td { border: 1px solid #000; padding: 4px 8px; }
    th { background-color: #d9e8fb; font-weight: bold; text-align: center; font-size: 9pt; }
    .subheader { background-color: #e8f0fe; }
    td { text-align: right; font-size: 9pt; }
    td:first-child, td:nth-child(2) { text-align: left; }
    .totals { background-color: #f5f5f5; font-weight: bold; }
    .result { background-color: #e6ffe6; font-weight: bold; }
    .final { background-color: #333; color: white; font-weight: bold; }
    .col-code { width: 80px; }
    .col-name { width: 250px; }
    .col-num { width: 90px; }
    .section-header { background-color: #1a365d; color: white; font-weight: bold; text-align: center; }
    .footer { margin-top: 30px; font-size: 8pt; color: #666; text-align: center; }
</style>
</head>
<body>

<div class="header">
    <div class="company">MCONSULTORES SOFTWARE</div>
    <div class="title">BALANCE TRIBUTARIO DE 8 COLUMNAS</div>
    <div class="period">Período: ${periodStart} al ${periodEnd}</div>
    <div class="period">Generado: ${formatDate(today)}</div>
</div>

<table>
    <thead>
        <tr class="section-header">
            <th colspan="2">CUENTAS</th>
            <th colspan="2">SUMAS</th>
            <th colspan="2">SALDOS</th>
            <th colspan="2">INVENTARIO</th>
            <th colspan="2">RESULTADO</th>
        </tr>
        <tr class="subheader">
            <th class="col-code">Código</th>
            <th class="col-name">Nombre de Cuenta</th>
            <th class="col-num">Débitos</th>
            <th class="col-num">Créditos</th>
            <th class="col-num">Deudor</th>
            <th class="col-num">Acreedor</th>
            <th class="col-num">Activo</th>
            <th class="col-num">Pasivo</th>
            <th class="col-num">Pérdida</th>
            <th class="col-num">Ganancia</th>
        </tr>
    </thead>
    <tbody>
        ${data.rows.map(row => `
        <tr>
            <td>${row.account.code}</td>
            <td>${row.account.name}</td>
            <td>${fmtMoney(row.debit)}</td>
            <td>${fmtMoney(row.credit)}</td>
            <td>${fmtMoney(row.debtor)}</td>
            <td>${fmtMoney(row.creditor)}</td>
            <td>${fmtMoney(row.asset)}</td>
            <td>${fmtMoney(row.liability)}</td>
            <td>${fmtMoney(row.loss)}</td>
            <td>${fmtMoney(row.gain)}</td>
        </tr>
        `).join('')}
        <tr class="totals">
            <td></td>
            <td><strong>SUMAS</strong></td>
            <td>${fmtMoney(data.totals.debit)}</td>
            <td>${fmtMoney(data.totals.credit)}</td>
            <td>${fmtMoney(data.totals.debtor)}</td>
            <td>${fmtMoney(data.totals.creditor)}</td>
            <td>${fmtMoney(data.totals.asset)}</td>
            <td>${fmtMoney(data.totals.liability)}</td>
            <td>${fmtMoney(data.totals.loss)}</td>
            <td>${fmtMoney(data.totals.gain)}</td>
        </tr>
        <tr class="result">
            <td></td>
            <td><strong>${data.result >= 0 ? 'UTILIDAD DEL EJERCICIO' : 'PÉRDIDA DEL EJERCICIO'}</strong></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
            <td>${data.result >= 0 ? fmtMoney(data.result) : ''}</td>
            <td>${data.result >= 0 ? fmtMoney(data.result) : fmtMoney(Math.abs(data.result))}</td>
            <td></td>
        </tr>
        <tr class="final">
            <td></td>
            <td><strong>TOTALES IGUALES</strong></td>
            <td>${fmtMoney(data.totals.debit)}</td>
            <td>${fmtMoney(data.totals.credit)}</td>
            <td>${fmtMoney(data.totals.debtor)}</td>
            <td>${fmtMoney(data.totals.creditor)}</td>
            <td>${fmtMoney(data.totals.asset)}</td>
            <td>${fmtMoney(data.totals.liability + (data.result > 0 ? data.result : 0))}</td>
            <td>${fmtMoney(data.totals.loss + (data.result > 0 ? data.result : 0))}</td>
            <td>${fmtMoney(data.totals.gain)}</td>
        </tr>
    </tbody>
</table>

<div class="footer">
    <p>Documento generado automáticamente - Balance Tributario conforme normativa SII Chile</p>
    <p>MCONSULTORES SOFTWARE - Soluciones a su alcance</p>
</div>

</body>
</html>
        `;

        const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Balance_8_Columnas_${today.toISOString().split('T')[0]}.xls`;
        link.click();
    };

    // Print / Export to PDF
    const handlePrint = () => {
        const printContent = tableRef.current;
        if (!printContent) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Por favor, permite las ventanas emergentes para imprimir');
            return;
        }

        const today = new Date().toLocaleDateString('es-CL');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Balance Tributario 8 Columnas</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: Arial, sans-serif; 
                        font-size: 10px; 
                        padding: 20px;
                        color: #333;
                    }
                    .header { 
                        text-align: center; 
                        margin-bottom: 20px;
                        border-bottom: 2px solid #333;
                        padding-bottom: 10px;
                    }
                    .header h1 { font-size: 16px; margin-bottom: 5px; }
                    .header p { font-size: 11px; color: #666; }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        font-size: 9px;
                    }
                    th, td { 
                        border: 1px solid #ccc; 
                        padding: 4px 6px; 
                        text-align: right;
                    }
                    th { 
                        background: #f0f0f0; 
                        font-weight: bold;
                        text-align: center;
                    }
                    th:first-child, td:first-child { text-align: left; }
                    .totals { background: #e8e8e8; font-weight: bold; }
                    .result { background: #d4edda; font-weight: bold; }
                    .final { background: #333; color: white; font-weight: bold; }
                    .positive { color: #28a745; }
                    .negative { color: #dc3545; }
                    @media print {
                        body { padding: 10px; }
                        @page { size: landscape; margin: 10mm; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>BALANCE TRIBUTARIO - 8 COLUMNAS</h1>
                    <p>Norma SII Chile | Generado: ${today}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th rowspan="2" style="min-width: 180px;">Cuentas</th>
                            <th colspan="2">Saldos Totales</th>
                            <th colspan="2">Saldos del Ejercicio</th>
                            <th colspan="2">Inventario</th>
                            <th colspan="2">Resultado</th>
                        </tr>
                        <tr>
                            <th>Débito</th>
                            <th>Crédito</th>
                            <th>Deudor</th>
                            <th>Acreedor</th>
                            <th>Activo</th>
                            <th>Pasivo</th>
                            <th>Pérdida</th>
                            <th>Ganancia</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.rows.map(row => `
                            <tr>
                                <td><strong>${row.account.code}</strong> ${row.account.name}</td>
                                <td>${formatCLP(row.debit)}</td>
                                <td>${formatCLP(row.credit)}</td>
                                <td>${formatCLP(row.debtor)}</td>
                                <td>${formatCLP(row.creditor)}</td>
                                <td>${formatCLP(row.asset)}</td>
                                <td>${formatCLP(row.liability)}</td>
                                <td class="negative">${formatCLP(row.loss)}</td>
                                <td class="positive">${formatCLP(row.gain)}</td>
                            </tr>
                        `).join('')}
                        <tr class="totals">
                            <td>TOTALES</td>
                            <td>${formatCLP(data.totals.debit)}</td>
                            <td>${formatCLP(data.totals.credit)}</td>
                            <td>${formatCLP(data.totals.debtor)}</td>
                            <td>${formatCLP(data.totals.creditor)}</td>
                            <td>${formatCLP(data.totals.asset)}</td>
                            <td>${formatCLP(data.totals.liability)}</td>
                            <td class="negative">${formatCLP(data.totals.loss)}</td>
                            <td class="positive">${formatCLP(data.totals.gain)}</td>
                        </tr>
                        <tr class="result">
                            <td>${data.result >= 0 ? 'UTILIDAD DEL EJERCICIO' : 'PÉRDIDA DEL EJERCICIO'}</td>
                            <td colspan="4"></td>
                            <td></td>
                            <td>${data.result >= 0 ? formatCLP(data.result) : ''}</td>
                            <td>${data.result >= 0 ? formatCLP(data.result) : ''}</td>
                            <td></td>
                        </tr>
                        <tr class="final">
                            <td>TOTALES IGUALES</td>
                            <td>${formatCLP(data.totals.debit)}</td>
                            <td>${formatCLP(data.totals.credit)}</td>
                            <td>${formatCLP(data.totals.debtor)}</td>
                            <td>${formatCLP(data.totals.creditor)}</td>
                            <td>${formatCLP(data.totals.asset)}</td>
                            <td>${formatCLP(data.totals.liability + (data.result > 0 ? data.result : 0))}</td>
                            <td>${formatCLP(data.totals.loss + (data.result > 0 ? data.result : 0))}</td>
                            <td>${formatCLP(data.totals.gain)}</td>
                        </tr>
                    </tbody>
                </table>
                <script>
                    window.onload = function() { window.print(); window.close(); }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const currentDate = new Date().toLocaleDateString('es-CL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className="animate-in fade-in slide-in-from-right duration-300 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="text-slate-600" size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <FileSpreadsheet className="text-blue-600" size={22} />
                            Balance Tributario - 8 Columnas
                        </h1>
                        <p className="text-slate-500 text-sm flex items-center gap-2">
                            <Calendar size={12} /> {currentDate} | Norma SII Chile
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 text-sm"
                    >
                        <Printer size={14} /> Imprimir / PDF
                    </button>
                    <button
                        onClick={exportToExcel}
                        className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
                    >
                        <Download size={14} /> Exportar Excel
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Total Débitos</p>
                    <p className="text-lg font-bold text-slate-800 mt-1">{formatCLP(data.totals.debit)}</p>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Total Créditos</p>
                    <p className="text-lg font-bold text-slate-800 mt-1">{formatCLP(data.totals.credit)}</p>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Total Activos</p>
                    <p className="text-lg font-bold text-emerald-600 mt-1">{formatCLP(data.totals.asset)}</p>
                </div>
                <div className={`rounded-lg border p-4 ${data.result >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">
                        {data.result >= 0 ? 'Utilidad' : 'Pérdida'}
                    </p>
                    <p className={`text-lg font-bold mt-1 ${data.result >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCLP(Math.abs(data.result))}
                    </p>
                </div>
            </div>

            {/* Table */}
            <div ref={tableRef} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-xs uppercase">
                            <tr>
                                <th className="px-4 py-3 min-w-[200px]" rowSpan={2}>Cuentas</th>
                                <th className="px-3 py-2 text-center bg-blue-50 border-x border-slate-200" colSpan={2}>Saldos Totales</th>
                                <th className="px-3 py-2 text-center bg-indigo-50 border-x border-slate-200" colSpan={2}>Saldos del Ejercicio</th>
                                <th className="px-3 py-2 text-center bg-emerald-50 border-x border-slate-200" colSpan={2}>Inventario</th>
                                <th className="px-3 py-2 text-center bg-orange-50 border-x border-slate-200" colSpan={2}>Resultado</th>
                            </tr>
                            <tr>
                                <th className="px-2 py-2 text-right bg-blue-50/50 text-[10px]">Débito</th>
                                <th className="px-2 py-2 text-right bg-blue-50/50 border-r border-slate-200 text-[10px]">Crédito</th>
                                <th className="px-2 py-2 text-right bg-indigo-50/50 text-[10px]">Deudor</th>
                                <th className="px-2 py-2 text-right bg-indigo-50/50 border-r border-slate-200 text-[10px]">Acreedor</th>
                                <th className="px-2 py-2 text-right bg-emerald-50/50 text-[10px]">Activo</th>
                                <th className="px-2 py-2 text-right bg-emerald-50/50 border-r border-slate-200 text-[10px]">Pasivo</th>
                                <th className="px-2 py-2 text-right bg-orange-50/50 text-[10px]">Pérdida</th>
                                <th className="px-2 py-2 text-right bg-orange-50/50 text-[10px]">Ganancia</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.rows.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-16 text-center text-slate-400">
                                        <FileText className="mx-auto mb-3 text-slate-300" size={40} />
                                        <p className="font-medium">No hay movimientos registrados</p>
                                        <p className="text-sm mt-1">Registra asientos en el Libro Diario para ver el balance</p>
                                    </td>
                                </tr>
                            ) : (
                                <>
                                    {data.rows.map((row) => (
                                        <tr key={row.account.code} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-2">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-700">{row.account.name}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono">{row.account.code}</span>
                                                </div>
                                            </td>
                                            <td className="px-2 py-2 text-right tabular-nums text-slate-600 text-xs">{formatCLP(row.debit)}</td>
                                            <td className="px-2 py-2 text-right tabular-nums text-slate-600 border-r border-slate-100 text-xs">{formatCLP(row.credit)}</td>
                                            <td className="px-2 py-2 text-right tabular-nums font-medium text-slate-800 text-xs">{formatCLP(row.debtor)}</td>
                                            <td className="px-2 py-2 text-right tabular-nums font-medium text-slate-800 border-r border-slate-100 text-xs">{formatCLP(row.creditor)}</td>
                                            <td className="px-2 py-2 text-right tabular-nums text-emerald-600 bg-emerald-50/10 text-xs">{formatCLP(row.asset)}</td>
                                            <td className="px-2 py-2 text-right tabular-nums text-emerald-600 bg-emerald-50/10 border-r border-slate-100 text-xs">{formatCLP(row.liability)}</td>
                                            <td className="px-2 py-2 text-right tabular-nums text-rose-600 bg-orange-50/10 text-xs">{formatCLP(row.loss)}</td>
                                            <td className="px-2 py-2 text-right tabular-nums text-emerald-600 bg-orange-50/10 text-xs">{formatCLP(row.gain)}</td>
                                        </tr>
                                    ))}

                                    {/* Totals Row */}
                                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                                        <td className="px-4 py-3 text-slate-800 uppercase text-xs">Totales</td>
                                        <td className="px-2 py-3 text-right text-xs">{formatCLP(data.totals.debit)}</td>
                                        <td className="px-2 py-3 text-right border-r border-slate-300 text-xs">{formatCLP(data.totals.credit)}</td>
                                        <td className="px-2 py-3 text-right text-xs">{formatCLP(data.totals.debtor)}</td>
                                        <td className="px-2 py-3 text-right border-r border-slate-300 text-xs">{formatCLP(data.totals.creditor)}</td>
                                        <td className="px-2 py-3 text-right text-emerald-700 text-xs">{formatCLP(data.totals.asset)}</td>
                                        <td className="px-2 py-3 text-right text-emerald-700 border-r border-slate-300 text-xs">{formatCLP(data.totals.liability)}</td>
                                        <td className="px-2 py-3 text-right text-rose-700 text-xs">{formatCLP(data.totals.loss)}</td>
                                        <td className="px-2 py-3 text-right text-emerald-700 text-xs">{formatCLP(data.totals.gain)}</td>
                                    </tr>

                                    {/* Result Row */}
                                    <tr className="bg-blue-50 font-bold text-blue-700">
                                        <td className="px-4 py-3 uppercase text-xs">
                                            {data.result >= 0 ? 'Utilidad del Ejercicio' : 'Pérdida del Ejercicio'}
                                        </td>
                                        <td colSpan={4} className="border-r border-slate-200"></td>
                                        <td className="px-2 py-3 text-right text-xs"></td>
                                        <td className="px-2 py-3 text-right border-r border-slate-300 text-xs">
                                            {data.result >= 0 ? formatCLP(data.result) : ''}
                                        </td>
                                        <td className="px-2 py-3 text-right text-xs">
                                            {data.result >= 0 ? formatCLP(data.result) : ''}
                                        </td>
                                        <td className="px-2 py-3 text-right text-xs"></td>
                                    </tr>

                                    {/* Grand Totals */}
                                    <tr className="bg-slate-800 text-white font-bold uppercase text-xs">
                                        <td className="px-4 py-3">Totales Iguales</td>
                                        <td className="px-2 py-3 text-right">{formatCLP(data.totals.debit)}</td>
                                        <td className="px-2 py-3 text-right border-r border-slate-600">{formatCLP(data.totals.credit)}</td>
                                        <td className="px-2 py-3 text-right">{formatCLP(data.totals.debtor)}</td>
                                        <td className="px-2 py-3 text-right border-r border-slate-600">{formatCLP(data.totals.creditor)}</td>
                                        <td className="px-2 py-3 text-right">{formatCLP(data.totals.asset)}</td>
                                        <td className="px-2 py-3 text-right border-r border-slate-600">
                                            {formatCLP(data.totals.liability + (data.result > 0 ? data.result : 0))}
                                        </td>
                                        <td className="px-2 py-3 text-right">
                                            {formatCLP(data.totals.loss + (data.result > 0 ? data.result : 0))}
                                        </td>
                                        <td className="px-2 py-3 text-right">{formatCLP(data.totals.gain)}</td>
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer Note */}
            <div className="mt-4 text-xs text-slate-400 text-center">
                Balance generado automáticamente desde los asientos del Libro Diario | Formato SII Chile
            </div>
        </div>
    );
};
