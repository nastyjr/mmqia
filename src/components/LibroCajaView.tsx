import React, { useState, useEffect, useMemo } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { ArrowLeft, Plus, Wallet, TrendingUp, TrendingDown, Calendar, Download, Printer, FileText, Search, Filter, X, DollarSign, ArrowUpRight, ArrowDownRight, Banknote, Receipt } from 'lucide-react';

interface CashMovement {
    id: string;
    date: string;
    type: 'INGRESO' | 'EGRESO';
    description: string;
    amount: number;
    documentType?: string;
    documentNumber?: string;
    counterparty?: string;
    createdAt: string;
}

interface LibroCajaViewProps {
    onBack: () => void;
}

// Cash account codes to filter from Libro Diario
const CASH_ACCOUNT_CODES = ['1.1.10.1', '1.1.01', '1.1.10'];

export const LibroCajaView: React.FC<LibroCajaViewProps> = ({ onBack }) => {
    const { journalEntries } = useAccounting();

    // Local movements (manual entries)
    const [manualMovements, setManualMovements] = useState<CashMovement[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlyManual, setShowOnlyManual] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        type: 'INGRESO' as 'INGRESO' | 'EGRESO',
        description: '',
        amount: '',
        documentType: '',
        documentNumber: '',
        counterparty: ''
    });

    // Load manual movements from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('libro_caja_movements');
        if (saved) setManualMovements(JSON.parse(saved));
    }, []);

    // Save manual movements
    useEffect(() => {
        localStorage.setItem('libro_caja_movements', JSON.stringify(manualMovements));
    }, [manualMovements]);

    // Extract cash movements from Journal Entries
    const journalCashMovements = useMemo((): CashMovement[] => {
        const movements: CashMovement[] = [];

        journalEntries.forEach(entry => {
            entry.lines.forEach(line => {
                // Check if this line affects a cash account
                const isCashAccount = CASH_ACCOUNT_CODES.some(code =>
                    line.accountId?.startsWith(code) || line.accountId === code
                );

                if (isCashAccount && (line.debit > 0 || line.credit > 0)) {
                    movements.push({
                        id: `je-${entry.id}-${line.id}`,
                        date: entry.date,
                        type: line.debit > 0 ? 'INGRESO' : 'EGRESO',
                        description: entry.glosa || 'Movimiento desde Libro Diario',
                        amount: line.debit > 0 ? line.debit : line.credit,
                        documentType: 'ASIENTO',
                        documentNumber: entry.id?.substring(0, 8) || '',
                        counterparty: '',
                        createdAt: entry.createdAt || entry.date
                    });
                }
            });
        });

        return movements;
    }, [journalEntries]);

    // Combine and sort all movements
    const allMovements = useMemo(() => {
        const combined = showOnlyManual
            ? manualMovements
            : [...journalCashMovements, ...manualMovements];

        return combined.sort((a, b) => {
            const dateCompare = a.date.localeCompare(b.date);
            if (dateCompare !== 0) return dateCompare;
            return a.createdAt.localeCompare(b.createdAt);
        });
    }, [journalCashMovements, manualMovements, showOnlyManual]);

    // Filter by month and search
    const filteredMovements = useMemo(() => {
        return allMovements.filter(m => {
            const matchesMonth = m.date.startsWith(selectedMonth);
            const matchesSearch = searchTerm === '' ||
                m.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                m.counterparty?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                m.documentNumber?.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesMonth && matchesSearch;
        });
    }, [allMovements, selectedMonth, searchTerm]);

    // Calculate balances
    const openingBalance = useMemo(() => {
        const monthStart = selectedMonth + '-01';
        return allMovements
            .filter(m => m.date < monthStart)
            .reduce((sum, m) => sum + (m.type === 'INGRESO' ? m.amount : -m.amount), 0);
    }, [allMovements, selectedMonth]);

    const monthIncome = filteredMovements
        .filter(m => m.type === 'INGRESO')
        .reduce((sum, m) => sum + m.amount, 0);

    const monthExpense = filteredMovements
        .filter(m => m.type === 'EGRESO')
        .reduce((sum, m) => sum + m.amount, 0);

    const closingBalance = openingBalance + monthIncome - monthExpense;

    // Handlers
    const handleSave = () => {
        if (!formData.description.trim() || !formData.amount) {
            alert('Por favor complete descripción y monto');
            return;
        }

        const movement: CashMovement = {
            id: crypto.randomUUID(),
            date: formData.date,
            type: formData.type,
            description: formData.description.trim(),
            amount: Math.abs(Number(formData.amount)),
            documentType: formData.documentType || undefined,
            documentNumber: formData.documentNumber || undefined,
            counterparty: formData.counterparty || undefined,
            createdAt: new Date().toISOString()
        };

        setManualMovements([...manualMovements, movement]);
        resetForm();
        setIsFormOpen(false);
    };

    const resetForm = () => {
        setFormData({
            date: new Date().toISOString().split('T')[0],
            type: 'INGRESO',
            description: '',
            amount: '',
            documentType: '',
            documentNumber: '',
            counterparty: ''
        });
    };

    const handleDelete = (id: string) => {
        if (id.startsWith('je-')) {
            alert('Este movimiento proviene del Libro Diario. Para eliminarlo, edite el asiento original.');
            return;
        }
        if (confirm('¿Eliminar este movimiento?')) {
            setManualMovements(manualMovements.filter(m => m.id !== id));
        }
    };

    const formatCLP = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);
    const formatDate = (date: string) => new Date(date + 'T12:00:00').toLocaleDateString('es-CL');

    // Get month name
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const [year, month] = selectedMonth.split('-');
    const monthName = monthNames[parseInt(month) - 1] + ' ' + year;

    // Export to Excel (HTML format)
    const handleExport = () => {
        const today = new Date().toLocaleDateString('es-CL');
        let runningBalance = openingBalance;

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
    body { font-family: Arial, sans-serif; font-size: 10pt; padding: 20px; }
    .header { text-align: center; margin-bottom: 25px; border-bottom: 3px solid #d97706; padding-bottom: 15px; }
    .company { font-size: 14pt; font-weight: bold; color: #1e293b; }
    .title { font-size: 13pt; font-weight: bold; color: #d97706; margin: 8px 0; }
    .period { font-size: 10pt; color: #64748b; }
    .summary { display: flex; gap: 20px; margin-bottom: 20px; }
    .summary-box { flex: 1; padding: 12px; border-radius: 8px; }
    .summary-box.income { background: #d1fae5; }
    .summary-box.expense { background: #fee2e2; }
    .summary-box.balance { background: #fef3c7; }
    .summary-label { font-size: 9pt; color: #64748b; text-transform: uppercase; }
    .summary-value { font-size: 14pt; font-weight: bold; }
    table { border-collapse: collapse; width: 100%; margin-top: 15px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 9pt; }
    th { background: linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%); font-weight: bold; text-align: center; }
    td { text-align: right; }
    td:nth-child(1), td:nth-child(2), td:nth-child(3), td:nth-child(4) { text-align: left; }
    .opening { background: #f1f5f9; font-weight: bold; }
    .closing { background: #fef3c7; font-weight: bold; }
    .income { color: #059669; }
    .expense { color: #dc2626; }
    .footer { margin-top: 30px; font-size: 8pt; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; }
</style>
</head>
<body>
<div class="header">
    <div class="company">MCONSULTORES SOFTWARE</div>
    <div class="title">LIBRO DE CAJA</div>
    <div class="period">Período: ${monthName}</div>
    <div class="period">Generado: ${today}</div>
</div>

<table style="width: 60%; margin-bottom: 20px; border: none;">
    <tr>
        <td style="border: none; background: #d1fae5; padding: 10px; border-radius: 6px;">
            <div style="font-size: 9pt; color: #047857;">TOTAL INGRESOS</div>
            <div style="font-size: 14pt; font-weight: bold; color: #047857;">${formatCLP(monthIncome)}</div>
        </td>
        <td style="border: none; width: 20px;"></td>
        <td style="border: none; background: #fee2e2; padding: 10px; border-radius: 6px;">
            <div style="font-size: 9pt; color: #dc2626;">TOTAL EGRESOS</div>
            <div style="font-size: 14pt; font-weight: bold; color: #dc2626;">${formatCLP(monthExpense)}</div>
        </td>
        <td style="border: none; width: 20px;"></td>
        <td style="border: none; background: #fef3c7; padding: 10px; border-radius: 6px;">
            <div style="font-size: 9pt; color: #b45309;">SALDO FINAL</div>
            <div style="font-size: 14pt; font-weight: bold; color: #b45309;">${formatCLP(closingBalance)}</div>
        </td>
    </tr>
</table>

<table>
    <thead>
        <tr>
            <th style="width: 80px;">Fecha</th>
            <th>Descripción</th>
            <th style="width: 100px;">Documento</th>
            <th style="width: 120px;">Contraparte</th>
            <th style="width: 100px;">Ingreso</th>
            <th style="width: 100px;">Egreso</th>
            <th style="width: 110px;">Saldo</th>
        </tr>
    </thead>
    <tbody>
        <tr class="opening">
            <td colspan="6">SALDO INICIAL DEL PERÍODO</td>
            <td>${formatCLP(openingBalance)}</td>
        </tr>
        ${filteredMovements.map(m => {
            runningBalance += m.type === 'INGRESO' ? m.amount : -m.amount;
            return `
        <tr>
            <td>${formatDate(m.date)}</td>
            <td>${m.description}</td>
            <td>${m.documentType ? `${m.documentType} ${m.documentNumber || ''}` : '-'}</td>
            <td>${m.counterparty || '-'}</td>
            <td class="income">${m.type === 'INGRESO' ? formatCLP(m.amount) : ''}</td>
            <td class="expense">${m.type === 'EGRESO' ? formatCLP(m.amount) : ''}</td>
            <td>${formatCLP(runningBalance)}</td>
        </tr>`;
        }).join('')}
        <tr class="closing">
            <td colspan="4">SALDO FINAL DEL PERÍODO</td>
            <td class="income">${formatCLP(monthIncome)}</td>
            <td class="expense">${formatCLP(monthExpense)}</td>
            <td>${formatCLP(closingBalance)}</td>
        </tr>
    </tbody>
</table>

<div class="footer">
    <p>Libro de Caja generado automáticamente - Conforme normativa SII Chile</p>
    <p>MCONSULTORES SOFTWARE - Soluciones a su alcance</p>
</div>
</body>
</html>`;

        const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Libro_Caja_${selectedMonth}.xls`;
        link.click();
    };

    // Print
    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Por favor permite las ventanas emergentes para imprimir');
            return;
        }

        let runningBalance = openingBalance;
        const today = new Date().toLocaleDateString('es-CL');

        printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
    <title>Libro de Caja - ${monthName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 9pt; padding: 15px; }
        .header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #d97706; padding-bottom: 10px; }
        .title { font-size: 14pt; font-weight: bold; }
        .subtitle { font-size: 10pt; color: #666; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; font-size: 8pt; }
        th, td { border: 1px solid #999; padding: 4px 6px; }
        th { background: #f0f0f0; font-weight: bold; text-align: center; }
        td { text-align: right; }
        td:nth-child(1), td:nth-child(2), td:nth-child(3), td:nth-child(4) { text-align: left; }
        .opening, .closing { background: #f5f5f5; font-weight: bold; }
        .income { color: #059669; }
        .expense { color: #dc2626; }
        @media print { @page { size: landscape; margin: 10mm; } }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">LIBRO DE CAJA - ${monthName.toUpperCase()}</div>
        <div class="subtitle">Generado: ${today}</div>
    </div>
    <table>
        <thead>
            <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th>Documento</th>
                <th>Contraparte</th>
                <th>Ingreso</th>
                <th>Egreso</th>
                <th>Saldo</th>
            </tr>
        </thead>
        <tbody>
            <tr class="opening">
                <td colspan="6">SALDO INICIAL</td>
                <td>${formatCLP(openingBalance)}</td>
            </tr>
            ${filteredMovements.map(m => {
            runningBalance += m.type === 'INGRESO' ? m.amount : -m.amount;
            return `
            <tr>
                <td>${formatDate(m.date)}</td>
                <td>${m.description}</td>
                <td>${m.documentType ? `${m.documentType} ${m.documentNumber || ''}` : '-'}</td>
                <td>${m.counterparty || '-'}</td>
                <td class="income">${m.type === 'INGRESO' ? formatCLP(m.amount) : ''}</td>
                <td class="expense">${m.type === 'EGRESO' ? formatCLP(m.amount) : ''}</td>
                <td>${formatCLP(runningBalance)}</td>
            </tr>`;
        }).join('')}
            <tr class="closing">
                <td colspan="4">SALDO FINAL</td>
                <td class="income">${formatCLP(monthIncome)}</td>
                <td class="expense">${formatCLP(monthExpense)}</td>
                <td>${formatCLP(closingBalance)}</td>
            </tr>
        </tbody>
    </table>
    <script>window.onload = function() { window.print(); }</script>
</body>
</html>`);
        printWindow.document.close();
    };

    return (
        <div className="animate-in fade-in slide-in-from-right duration-300 min-h-screen bg-gradient-to-br from-amber-50/30 via-white to-slate-50/50">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-sm border-b border-amber-100 sticky top-0 z-10">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={onBack} className="p-2 hover:bg-amber-50 rounded-full transition-colors">
                                <ArrowLeft className="text-slate-600" size={20} />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-200">
                                        <Banknote className="text-white" size={20} />
                                    </div>
                                    Libro de Caja
                                </h1>
                                <p className="text-slate-500 text-sm">Control de Movimientos en Efectivo • {monthName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="month"
                                className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
                                value={selectedMonth}
                                onChange={e => setSelectedMonth(e.target.value)}
                            />
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-2 px-3 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-sm"
                            >
                                <Printer size={14} /> Imprimir
                            </button>
                            <button
                                onClick={handleExport}
                                className="flex items-center gap-2 px-3 py-2 text-white bg-amber-600 rounded-lg hover:bg-amber-700 text-sm font-medium shadow-lg shadow-amber-200"
                            >
                                <Download size={14} /> Exportar Excel
                            </button>
                            <button
                                onClick={() => setIsFormOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 text-white bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg hover:from-amber-600 hover:to-amber-700 text-sm font-medium shadow-lg shadow-amber-200"
                            >
                                <Plus size={16} /> Nuevo Movimiento
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                                <DollarSign className="text-slate-600" size={18} />
                            </div>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Saldo Inicial</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-800 tabular-nums">{formatCLP(openingBalance)}</p>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl p-5 border border-emerald-100">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-200">
                                <ArrowUpRight className="text-white" size={18} />
                            </div>
                            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Ingresos</span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-700 tabular-nums">{formatCLP(monthIncome)}</p>
                        <p className="text-xs text-emerald-600 mt-1">{filteredMovements.filter(m => m.type === 'INGRESO').length} movimientos</p>
                    </div>

                    <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 rounded-2xl p-5 border border-rose-100">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-200">
                                <ArrowDownRight className="text-white" size={18} />
                            </div>
                            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wide">Egresos</span>
                        </div>
                        <p className="text-2xl font-bold text-rose-700 tabular-nums">{formatCLP(monthExpense)}</p>
                        <p className="text-xs text-rose-600 mt-1">{filteredMovements.filter(m => m.type === 'EGRESO').length} movimientos</p>
                    </div>

                    <div className="bg-gradient-to-br from-amber-100 to-amber-200/50 rounded-2xl p-5 border border-amber-200 shadow-lg shadow-amber-100">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-300">
                                <Wallet className="text-white" size={18} />
                            </div>
                            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Saldo Final</span>
                        </div>
                        <p className="text-2xl font-bold text-amber-900 tabular-nums">{formatCLP(closingBalance)}</p>
                        <p className={`text-xs mt-1 ${closingBalance >= openingBalance ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {closingBalance >= openingBalance ? '↑' : '↓'} {formatCLP(Math.abs(closingBalance - openingBalance))} vs inicial
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl border border-slate-100 p-4 mb-4 flex items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar por descripción, documento..."
                            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showOnlyManual}
                            onChange={e => setShowOnlyManual(e.target.checked)}
                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                        />
                        Solo movimientos manuales
                    </label>
                    <div className="text-sm text-slate-500">
                        {filteredMovements.length} movimientos
                    </div>
                </div>

                {/* Movements Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Fecha</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Tipo</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Descripción</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Documento</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wide">Contraparte</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-emerald-700 uppercase tracking-wide">Ingreso</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-rose-700 uppercase tracking-wide">Egreso</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wide">Saldo</th>
                                <th className="px-4 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {/* Opening Balance */}
                            <tr className="bg-slate-50">
                                <td colSpan={7} className="px-4 py-3 font-semibold text-slate-700">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-slate-400" />
                                        Saldo Inicial del Período
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-slate-800 tabular-nums">{formatCLP(openingBalance)}</td>
                                <td></td>
                            </tr>

                            {filteredMovements.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-16 text-center">
                                        <Wallet className="mx-auto mb-3 text-slate-300" size={40} />
                                        <p className="text-slate-500 font-medium">No hay movimientos en este período</p>
                                        <p className="text-slate-400 text-sm mt-1">Haz clic en "Nuevo Movimiento" para registrar</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredMovements.map((mov, idx) => {
                                    const runningBalance = openingBalance + filteredMovements.slice(0, idx + 1).reduce(
                                        (sum, m) => sum + (m.type === 'INGRESO' ? m.amount : -m.amount), 0
                                    );
                                    const isFromJournal = mov.id.startsWith('je-');

                                    return (
                                        <tr key={mov.id} className="hover:bg-amber-50/30 transition-colors">
                                            <td className="px-4 py-3 text-slate-600 tabular-nums">{formatDate(mov.date)}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${mov.type === 'INGRESO'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-rose-100 text-rose-700'
                                                    }`}>
                                                    {mov.type === 'INGRESO' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                                    {mov.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-700">{mov.description}</div>
                                                {isFromJournal && (
                                                    <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                                        Libro Diario
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-slate-500 text-xs">
                                                {mov.documentType ? `${mov.documentType} ${mov.documentNumber || ''}` : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">{mov.counterparty || '-'}</td>
                                            <td className="px-4 py-3 text-right font-medium text-emerald-600 tabular-nums">
                                                {mov.type === 'INGRESO' ? formatCLP(mov.amount) : ''}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-rose-600 tabular-nums">
                                                {mov.type === 'EGRESO' ? formatCLP(mov.amount) : ''}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-slate-800 tabular-nums">{formatCLP(runningBalance)}</td>
                                            <td className="px-4 py-3">
                                                {!isFromJournal && (
                                                    <button
                                                        onClick={() => handleDelete(mov.id)}
                                                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                                                        title="Eliminar"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}

                            {/* Closing Balance */}
                            <tr className="bg-gradient-to-r from-amber-50 to-amber-100/50 font-bold">
                                <td colSpan={5} className="px-4 py-4 text-amber-900">
                                    <div className="flex items-center gap-2">
                                        <Wallet size={16} className="text-amber-600" />
                                        Saldo Final del Período
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-right text-emerald-700 tabular-nums">{formatCLP(monthIncome)}</td>
                                <td className="px-4 py-4 text-right text-rose-700 tabular-nums">{formatCLP(monthExpense)}</td>
                                <td className="px-4 py-4 text-right text-amber-900 text-lg tabular-nums">{formatCLP(closingBalance)}</td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="mt-4 text-center text-xs text-slate-400">
                    Libro de Caja generado automáticamente • Los movimientos del Libro Diario se sincronizan automáticamente
                </div>
            </div>

            {/* New Movement Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
                        <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Banknote size={20} /> Nuevo Movimiento de Caja
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Fecha</label>
                                    <input
                                        type="date"
                                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Tipo</label>
                                    <select
                                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value as 'INGRESO' | 'EGRESO' })}
                                    >
                                        <option value="INGRESO">💰 Ingreso</option>
                                        <option value="EGRESO">💸 Egreso</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Descripción *</label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
                                    placeholder="Venta en efectivo, Pago proveedor, etc."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Monto *</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-slate-400">$</span>
                                        <input
                                            type="number"
                                            className="w-full border border-slate-200 rounded-lg p-2.5 pl-7 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
                                            placeholder="50000"
                                            value={formData.amount}
                                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Contraparte</label>
                                    <input
                                        type="text"
                                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
                                        placeholder="Cliente, Proveedor, etc."
                                        value={formData.counterparty}
                                        onChange={e => setFormData({ ...formData, counterparty: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Tipo Documento</label>
                                    <select
                                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
                                        value={formData.documentType}
                                        onChange={e => setFormData({ ...formData, documentType: e.target.value })}
                                    >
                                        <option value="">Sin documento</option>
                                        <option value="BOLETA">Boleta</option>
                                        <option value="FACTURA">Factura</option>
                                        <option value="RECIBO">Recibo</option>
                                        <option value="VALE">Vale de Caja</option>
                                        <option value="OTRO">Otro</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1.5">Nº Documento</label>
                                    <input
                                        type="text"
                                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
                                        placeholder="123456"
                                        value={formData.documentNumber}
                                        onChange={e => setFormData({ ...formData, documentNumber: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3">
                            <button
                                onClick={() => { setIsFormOpen(false); resetForm(); }}
                                className="px-4 py-2 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 text-white bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg hover:from-amber-600 hover:to-amber-700 text-sm font-medium"
                            >
                                Guardar Movimiento
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
