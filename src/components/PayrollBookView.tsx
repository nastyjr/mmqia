import React, { useState } from 'react';
import { usePayroll } from '../context/PayrollContext';
import { PayrollProcess } from '../types/payroll';
import { FileText, Calendar, Search, ArrowLeft, Eye, Download, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';

export const PayrollBookView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { payrollHistory, employees } = usePayroll();
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');

    const getEmployeeName = (id: string) => {
        if (id === 'manual') return 'Empleado Manual';
        const emp = employees.find(e => e.id === id);
        return emp ? `${emp.names} ${emp.fatherName}` : 'Desconocido';
    };

    const filteredHistory = payrollHistory.filter(p =>
        p.month === selectedMonth &&
        p.year === selectedYear &&
        (getEmployeeName(p.employeeId).toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const formatCLP = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

    const handleExportExcel = () => {
        const data = filteredHistory.map(p => ({
            Mes: p.month,
            Año: p.year,
            Empleado: getEmployeeName(p.employeeId),
            'Sueldo Base': p.calculations.baseSalary,
            'Gratificación': p.calculations.gratification,
            'Total Imponible': p.calculations.totalTaxable,
            'Total No Imponible': p.calculations.totalNonTaxable,
            'Total Haberes': p.calculations.totalTaxable + p.calculations.totalNonTaxable,
            'AFP': p.calculations.afpAmount,
            'Salud': p.calculations.healthAmount,
            'AFC': p.calculations.afcAmount,
            'Impuesto': p.calculations.tax,
            'Total Descuentos': p.calculations.totalDiscounts,
            'Líquido a Pagar': p.calculations.liquidSalary
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Remuneraciones ${selectedMonth}-${selectedYear}`);
        XLSX.writeFile(wb, `Libro_Remuneraciones_${selectedMonth}_${selectedYear}.xlsx`);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft className="text-slate-600" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="text-pink-600" /> Libro de Remuneraciones Histórico
                    </h1>
                    <p className="text-slate-500 text-sm">Registro legal de liquidaciones emitidas</p>
                </div>
                <button onClick={handleExportExcel} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700 transition-colors shadow-lg shadow-green-200">
                    <Download size={18} /> Exportar Excel
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mes</label>
                    <select
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(Number(e.target.value))}
                        className="input-std w-32 border border-slate-300 rounded-lg p-2"
                    >
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('es-CL', { month: 'long' })}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Año</label>
                    <input
                        type="number"
                        value={selectedYear}
                        onChange={e => setSelectedYear(Number(e.target.value))}
                        className="input-std w-24 border border-slate-300 rounded-lg p-2"
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Buscar Empleado</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Nombre..."
                            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg"
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="px-6 py-3">Empleado</th>
                            <th className="px-6 py-3 text-right">Imponible</th>
                            <th className="px-6 py-3 text-right">No Imponible</th>
                            <th className="px-6 py-3 text-right">Tot. Haberes</th>
                            <th className="px-6 py-3 text-right text-rose-600">Descuentos</th>
                            <th className="px-6 py-3 text-right text-emerald-600">Líquido</th>
                            <th className="px-6 py-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredHistory.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                    No hay liquidaciones registradas para este periodo.
                                </td>
                            </tr>
                        ) : (
                            filteredHistory.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-800">
                                        {getEmployeeName(p.employeeId)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-slate-600">
                                        {formatCLP(p.calculations.totalTaxable)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-slate-600">
                                        {formatCLP(p.calculations.totalNonTaxable)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-slate-700 bg-slate-50/50">
                                        {formatCLP(p.calculations.totalTaxable + p.calculations.totalNonTaxable)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-rose-600">
                                        {formatCLP(p.calculations.totalDiscounts)}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600 bg-emerald-50/30">
                                        {formatCLP(p.calculations.liquidSalary)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors" title="Ver Detalle">
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold text-slate-700">
                        <tr>
                            <td className="px-6 py-3">TOTALES</td>
                            <td className="px-6 py-3 text-right">
                                {formatCLP(filteredHistory.reduce((sum, p) => sum + p.calculations.totalTaxable, 0))}
                            </td>
                            <td className="px-6 py-3 text-right">
                                {formatCLP(filteredHistory.reduce((sum, p) => sum + p.calculations.totalNonTaxable, 0))}
                            </td>
                            <td className="px-6 py-3 text-right">
                                {formatCLP(filteredHistory.reduce((sum, p) => sum + p.calculations.totalTaxable + p.calculations.totalNonTaxable, 0))}
                            </td>
                            <td className="px-6 py-3 text-right text-rose-700">
                                {formatCLP(filteredHistory.reduce((sum, p) => sum + p.calculations.totalDiscounts, 0))}
                            </td>
                            <td className="px-6 py-3 text-right text-emerald-700">
                                {formatCLP(filteredHistory.reduce((sum, p) => sum + p.calculations.liquidSalary, 0))}
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};
