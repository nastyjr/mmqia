import React, { useState, useEffect, useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { ArrowLeft, Plus, Download, Printer, Search, X, ChevronDown } from 'lucide-react';

interface CashMovement {
    id: string;
    correlativo: number;
    fecha: string;
    detalle: string;
    tipoDoc: string;
    numDoc: string;
    rut: string;
    entrada: number;
    salida: number;
    saldo: number;
    createdAt: string;
}

interface LibroCajaViewProps {
    onBack: () => void;
}

const CASH_ACCOUNT_CODES = ['1.1.10.1', '1.1.01', '1.1.10'];

export const LibroCajaView: React.FC<LibroCajaViewProps> = ({ onBack }) => {
    const { journalEntries } = useAccounting();
    const [manualMovements, setManualMovements] = useState<Omit<CashMovement, 'saldo'>[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
    const [searchTerm, setSearchTerm] = useState('');

    // Form
    const [form, setForm] = useState({
        fecha: new Date().toISOString().split('T')[0],
        detalle: '',
        tipoDoc: '',
        numDoc: '',
        rut: '',
        tipo: 'entrada' as 'entrada' | 'salida',
        monto: ''
    });

    useEffect(() => {
        const saved = localStorage.getItem('libro_caja_sii');
        if (saved) setManualMovements(JSON.parse(saved));
    }, []);

    useEffect(() => {
        localStorage.setItem('libro_caja_sii', JSON.stringify(manualMovements));
    }, [manualMovements]);

    // Extract from Libro Diario
    const journalMovements = useMemo(() => {
        const movements: Omit<CashMovement, 'saldo'>[] = [];
        journalEntries.forEach(entry => {
            entry.lines.forEach(line => {
                const isCash = CASH_ACCOUNT_CODES.some(c => line.accountId?.startsWith(c));
                if (isCash && (line.debit > 0 || line.credit > 0)) {
                    movements.push({
                        id: `je-${entry.id}-${line.id}`,
                        correlativo: 0,
                        fecha: entry.date,
                        detalle: entry.glosa || 'Asiento contable',
                        tipoDoc: 'ASIENTO',
                        numDoc: entry.id?.substring(0, 8) || '',
                        rut: '',
                        entrada: line.debit || 0,
                        salida: line.credit || 0,
                        createdAt: entry.createdAt || entry.date
                    });
                }
            });
        });
        return movements;
    }, [journalEntries]);

    // Combine and calculate
    const allMovements = useMemo(() => {
        const combined = [...journalMovements, ...manualMovements]
            .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.createdAt.localeCompare(b.createdAt));

        const monthStart = selectedMonth + '-01';
        const beforeMonth = combined.filter(m => m.fecha < monthStart);
        const inMonth = combined.filter(m => m.fecha.startsWith(selectedMonth));

        // Calculate opening balance
        let saldoAnterior = beforeMonth.reduce((s, m) => s + m.entrada - m.salida, 0);

        // Filter by search and add correlativo + saldo
        let correlativo = 1;
        const withSaldo: CashMovement[] = inMonth
            .filter(m => {
                if (!searchTerm) return true;
                const term = searchTerm.toLowerCase();
                return m.detalle.toLowerCase().includes(term) ||
                    m.numDoc.toLowerCase().includes(term) ||
                    m.rut.toLowerCase().includes(term);
            })
            .map(m => {
                saldoAnterior += m.entrada - m.salida;
                return { ...m, correlativo: correlativo++, saldo: saldoAnterior };
            });

        return {
            saldoInicial: beforeMonth.reduce((s, m) => s + m.entrada - m.salida, 0),
            movements: withSaldo,
            totalEntradas: withSaldo.reduce((s, m) => s + m.entrada, 0),
            totalSalidas: withSaldo.reduce((s, m) => s + m.salida, 0),
            saldoFinal: saldoAnterior
        };
    }, [journalMovements, manualMovements, selectedMonth, searchTerm]);

    const handleSave = () => {
        if (!form.detalle || !form.monto) {
            alert('Complete detalle y monto');
            return;
        }
        const monto = Math.abs(Number(form.monto));
        const movement: Omit<CashMovement, 'saldo'> = {
            id: crypto.randomUUID(),
            correlativo: 0,
            fecha: form.fecha,
            detalle: form.detalle,
            tipoDoc: form.tipoDoc,
            numDoc: form.numDoc,
            rut: form.rut,
            entrada: form.tipo === 'entrada' ? monto : 0,
            salida: form.tipo === 'salida' ? monto : 0,
            createdAt: new Date().toISOString()
        };
        setManualMovements([...manualMovements, movement]);
        setForm({ fecha: new Date().toISOString().split('T')[0], detalle: '', tipoDoc: '', numDoc: '', rut: '', tipo: 'entrada', monto: '' });
        setIsFormOpen(false);
    };

    const handleDelete = (id: string) => {
        if (id.startsWith('je-')) {
            alert('Movimiento del Libro Diario. Edite el asiento original.');
            return;
        }
        if (confirm('¿Eliminar?')) {
            setManualMovements(manualMovements.filter(m => m.id !== id));
        }
    };

    const fmt = (n: number) => n === 0 ? '-' : new Intl.NumberFormat('es-CL').format(n);
    const fmtDate = (d: string) => {
        const [y, m, day] = d.split('-');
        return `${day}/${m}/${y}`;
    };

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const [year, month] = selectedMonth.split('-');
    const periodoTexto = `${monthNames[parseInt(month) - 1]} ${year}`;

    // Export Excel SII Format
    const handleExport = () => {
        const hoy = new Date().toLocaleDateString('es-CL');
        const html = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
body{font-family:Arial,sans-serif;font-size:9pt;margin:20px}
h2{text-align:center;margin:0;font-size:12pt}
.info{text-align:center;font-size:9pt;color:#666;margin-bottom:15px}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #000;padding:4px 6px;font-size:8pt}
th{background:#f0f0f0;font-weight:bold;text-align:center}
td{text-align:right}
td:nth-child(1),td:nth-child(2),td:nth-child(3),td:nth-child(4),td:nth-child(5){text-align:left}
.total{background:#e0e0e0;font-weight:bold}
.header-row{background:#333;color:#fff;font-weight:bold}
</style></head><body>
<h2>LIBRO DE CAJA</h2>
<p class="info">Período: ${periodoTexto} | RUT Empresa: ____________ | Generado: ${hoy}</p>
<table>
<thead>
<tr class="header-row">
<th style="width:30px">N°</th>
<th style="width:70px">Fecha</th>
<th>Detalle de la Operación</th>
<th style="width:60px">Tipo Doc.</th>
<th style="width:70px">N° Doc.</th>
<th style="width:80px">RUT</th>
<th style="width:80px">Entradas</th>
<th style="width:80px">Salidas</th>
<th style="width:90px">Saldo</th>
</tr>
</thead>
<tbody>
<tr><td></td><td></td><td colspan="4"><strong>SALDO ANTERIOR</strong></td><td></td><td></td><td style="text-align:right"><strong>${fmt(allMovements.saldoInicial)}</strong></td></tr>
${allMovements.movements.map(m => `
<tr>
<td style="text-align:center">${m.correlativo}</td>
<td>${fmtDate(m.fecha)}</td>
<td>${m.detalle}</td>
<td>${m.tipoDoc || '-'}</td>
<td>${m.numDoc || '-'}</td>
<td>${m.rut || '-'}</td>
<td>${fmt(m.entrada)}</td>
<td>${fmt(m.salida)}</td>
<td>${fmt(m.saldo)}</td>
</tr>`).join('')}
<tr class="total">
<td colspan="6" style="text-align:right">TOTALES DEL MES</td>
<td>${fmt(allMovements.totalEntradas)}</td>
<td>${fmt(allMovements.totalSalidas)}</td>
<td>${fmt(allMovements.saldoFinal)}</td>
</tr>
</tbody>
</table>
<p style="font-size:7pt;color:#666;margin-top:20px;text-align:center">
Libro de Caja conforme a normativa SII Chile - Resolución Ex. N° 129/2014<br>
Firma del Contribuyente: __________________ | Firma del Contador: __________________
</p>
</body></html>`;
        const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Libro_Caja_${selectedMonth}.xls`;
        link.click();
    };

    const handlePrint = () => {
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.write(`
<!DOCTYPE html><html><head><title>Libro de Caja - ${periodoTexto}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:8pt;padding:10mm}
h1{text-align:center;font-size:11pt;margin-bottom:2mm}
.info{text-align:center;font-size:8pt;margin-bottom:4mm;color:#555}
table{width:100%;border-collapse:collapse}
th,td{border:1px solid #000;padding:2px 4px;font-size:7pt}
th{background:#eee;text-align:center}
td{text-align:right}
td:nth-child(-n+6){text-align:left}
.total{background:#ddd;font-weight:bold}
@media print{@page{size:landscape;margin:8mm}}
</style></head><body>
<h1>LIBRO DE CAJA</h1>
<p class="info">Período: ${periodoTexto} | Generado: ${new Date().toLocaleDateString('es-CL')}</p>
<table>
<thead><tr>
<th>N°</th><th>Fecha</th><th>Detalle</th><th>Tipo</th><th>N° Doc</th><th>RUT</th><th>Entradas</th><th>Salidas</th><th>Saldo</th>
</tr></thead>
<tbody>
<tr><td></td><td></td><td colspan="4"><strong>SALDO ANTERIOR</strong></td><td></td><td></td><td><strong>${fmt(allMovements.saldoInicial)}</strong></td></tr>
${allMovements.movements.map(m => `<tr>
<td style="text-align:center">${m.correlativo}</td><td>${fmtDate(m.fecha)}</td><td>${m.detalle}</td>
<td>${m.tipoDoc || '-'}</td><td>${m.numDoc || '-'}</td><td>${m.rut || '-'}</td>
<td>${fmt(m.entrada)}</td><td>${fmt(m.salida)}</td><td>${fmt(m.saldo)}</td>
</tr>`).join('')}
<tr class="total"><td colspan="6" style="text-align:right">TOTALES</td>
<td>${fmt(allMovements.totalEntradas)}</td><td>${fmt(allMovements.totalSalidas)}</td><td>${fmt(allMovements.saldoFinal)}</td></tr>
</tbody></table>
<script>window.onload=function(){window.print()}</script>
</body></html>`);
        w.document.close();
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="p-1.5 hover:bg-slate-100 rounded-lg">
                            <ArrowLeft size={18} className="text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-lg font-semibold text-slate-800">Libro de Caja</h1>
                            <p className="text-xs text-slate-500">Formato SII Chile</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(e.target.value)}
                            className="text-sm border border-slate-200 rounded px-2 py-1.5 bg-white"
                        />
                        <button onClick={handlePrint} className="text-sm px-3 py-1.5 border border-slate-200 rounded hover:bg-slate-50 flex items-center gap-1">
                            <Printer size={14} /> Imprimir
                        </button>
                        <button onClick={handleExport} className="text-sm px-3 py-1.5 bg-slate-800 text-white rounded hover:bg-slate-700 flex items-center gap-1">
                            <Download size={14} /> Excel
                        </button>
                        <button onClick={() => setIsFormOpen(true)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1">
                            <Plus size={14} /> Agregar
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-4">
                {/* Period Info */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-sm text-slate-500">Período:</span>
                            <span className="ml-2 font-semibold text-slate-800">{periodoTexto}</span>
                        </div>
                        <div className="flex gap-6 text-sm">
                            <div>
                                <span className="text-slate-500">Saldo Inicial:</span>
                                <span className="ml-2 font-medium">${fmt(allMovements.saldoInicial)}</span>
                            </div>
                            <div>
                                <span className="text-slate-500">Entradas:</span>
                                <span className="ml-2 font-medium text-green-700">${fmt(allMovements.totalEntradas)}</span>
                            </div>
                            <div>
                                <span className="text-slate-500">Salidas:</span>
                                <span className="ml-2 font-medium text-red-700">${fmt(allMovements.totalSalidas)}</span>
                            </div>
                            <div>
                                <span className="text-slate-500">Saldo Final:</span>
                                <span className="ml-2 font-bold text-slate-800">${fmt(allMovements.saldoFinal)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="mb-3">
                    <div className="relative max-w-xs">
                        <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded bg-white"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-800 text-white text-xs">
                                <th className="px-3 py-2.5 text-center w-12">N°</th>
                                <th className="px-3 py-2.5 text-left w-24">Fecha</th>
                                <th className="px-3 py-2.5 text-left">Detalle de la Operación</th>
                                <th className="px-3 py-2.5 text-left w-20">Tipo Doc.</th>
                                <th className="px-3 py-2.5 text-left w-20">N° Doc.</th>
                                <th className="px-3 py-2.5 text-left w-24">RUT</th>
                                <th className="px-3 py-2.5 text-right w-24">Entradas</th>
                                <th className="px-3 py-2.5 text-right w-24">Salidas</th>
                                <th className="px-3 py-2.5 text-right w-28">Saldo</th>
                                <th className="w-8"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {/* Opening Balance */}
                            <tr className="bg-slate-50">
                                <td className="px-3 py-2"></td>
                                <td className="px-3 py-2"></td>
                                <td className="px-3 py-2 font-medium text-slate-700" colSpan={4}>SALDO ANTERIOR</td>
                                <td className="px-3 py-2"></td>
                                <td className="px-3 py-2"></td>
                                <td className="px-3 py-2 text-right font-bold text-slate-800">{fmt(allMovements.saldoInicial)}</td>
                                <td></td>
                            </tr>

                            {allMovements.movements.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                                        Sin movimientos en este período
                                    </td>
                                </tr>
                            ) : (
                                allMovements.movements.map(m => (
                                    <tr key={m.id} className="hover:bg-slate-50">
                                        <td className="px-3 py-2 text-center text-slate-500">{m.correlativo}</td>
                                        <td className="px-3 py-2 text-slate-600 tabular-nums">{fmtDate(m.fecha)}</td>
                                        <td className="px-3 py-2 text-slate-800">
                                            {m.detalle}
                                            {m.id.startsWith('je-') && (
                                                <span className="ml-1 text-[10px] px-1 py-0.5 bg-blue-100 text-blue-600 rounded">LD</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-slate-600 text-xs">{m.tipoDoc || '-'}</td>
                                        <td className="px-3 py-2 text-slate-600 text-xs">{m.numDoc || '-'}</td>
                                        <td className="px-3 py-2 text-slate-600 text-xs font-mono">{m.rut || '-'}</td>
                                        <td className="px-3 py-2 text-right text-green-700 tabular-nums">{m.entrada > 0 ? fmt(m.entrada) : ''}</td>
                                        <td className="px-3 py-2 text-right text-red-700 tabular-nums">{m.salida > 0 ? fmt(m.salida) : ''}</td>
                                        <td className="px-3 py-2 text-right font-medium tabular-nums">{fmt(m.saldo)}</td>
                                        <td className="px-2 py-2">
                                            {!m.id.startsWith('je-') && (
                                                <button onClick={() => handleDelete(m.id)} className="text-slate-400 hover:text-red-600">
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}

                            {/* Totals */}
                            <tr className="bg-slate-100 font-bold">
                                <td className="px-3 py-2.5" colSpan={6}>
                                    <span className="text-slate-700">TOTALES DEL MES</span>
                                </td>
                                <td className="px-3 py-2.5 text-right text-green-700 tabular-nums">{fmt(allMovements.totalEntradas)}</td>
                                <td className="px-3 py-2.5 text-right text-red-700 tabular-nums">{fmt(allMovements.totalSalidas)}</td>
                                <td className="px-3 py-2.5 text-right text-slate-800 tabular-nums">{fmt(allMovements.saldoFinal)}</td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <p className="text-xs text-slate-400 text-center mt-4">
                    Libro de Caja • Conforme Resolución SII Ex. N° 129/2014 • LD = Libro Diario
                </p>
            </main>

            {/* Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                        <div className="px-4 py-3 border-b border-slate-200">
                            <h3 className="font-semibold text-slate-800">Nuevo Movimiento</h3>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">Fecha</label>
                                    <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })}
                                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">Tipo</label>
                                    <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value as any })}
                                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm">
                                        <option value="entrada">Entrada</option>
                                        <option value="salida">Salida</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 block mb-1">Detalle *</label>
                                <input type="text" value={form.detalle} onChange={e => setForm({ ...form, detalle: e.target.value })}
                                    placeholder="Descripción del movimiento"
                                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">Monto *</label>
                                    <input type="number" value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })}
                                        placeholder="50000"
                                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">RUT Contraparte</label>
                                    <input type="text" value={form.rut} onChange={e => setForm({ ...form, rut: e.target.value })}
                                        placeholder="12.345.678-9"
                                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">Tipo Documento</label>
                                    <select value={form.tipoDoc} onChange={e => setForm({ ...form, tipoDoc: e.target.value })}
                                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm">
                                        <option value="">-</option>
                                        <option value="BOLETA">Boleta</option>
                                        <option value="FACTURA">Factura</option>
                                        <option value="NCV">N. Crédito Venta</option>
                                        <option value="NDV">N. Débito Venta</option>
                                        <option value="RECIBO">Recibo</option>
                                        <option value="VALE">Vale Caja</option>
                                        <option value="CHEQUE">Cheque</option>
                                        <option value="TRANSF">Transferencia</option>
                                        <option value="OTRO">Otro</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">N° Documento</label>
                                    <input type="text" value={form.numDoc} onChange={e => setForm({ ...form, numDoc: e.target.value })}
                                        placeholder="123456"
                                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm" />
                                </div>
                            </div>
                        </div>
                        <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
                            <button onClick={() => setIsFormOpen(false)} className="px-3 py-1.5 text-sm border border-slate-200 rounded hover:bg-slate-50">
                                Cancelar
                            </button>
                            <button onClick={handleSave} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
