import React, { useState } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { usePayroll } from '../context/PayrollContext';
import { JournalEntry, JournalEntryLine } from '../types';
import { ArrowLeft, Download, Printer, Save, Calculator, User, Building, ChevronRight } from 'lucide-react';
import { calculatePayroll, PayrollInput, AFPS } from '../services/payrollCalculator';

export const PayrollGenerator: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { saveEntry } = useAccounting();
    const { employees, addPayrollProcess } = usePayroll();

    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [employeeName, setEmployeeName] = useState('');
    const [rut, setRut] = useState('');
    const [contractType, setContractType] = useState<'INDEFINIDO' | 'PLAZO_FIJO'>('INDEFINIDO');
    const [baseSalary, setBaseSalary] = useState<number>(0);
    const [hasGratification, setHasGratification] = useState(true);
    const [selectedAFP, setSelectedAFP] = useState(AFPS[1].name);
    const [fonasa, setFonasa] = useState(true);
    const [isapreAmount, setIsapreAmount] = useState<number>(0);
    const [colacion, setColacion] = useState<number>(0);
    const [movilizacion, setMovilizacion] = useState<number>(0);
    const [result, setResult] = useState<any>(null);

    const handleEmployeeSelect = (empId: string) => {
        setSelectedEmployeeId(empId);
        const emp = employees.find(e => e.id === empId);
        if (emp) {
            setEmployeeName(`${emp.names} ${emp.fatherName}`);
            setRut(emp.rut);
            setContractType(emp.contract.type as any);
            setBaseSalary(emp.contract.baseSalary);
            setHasGratification(emp.contract.gratificationLegal);
            setSelectedAFP(emp.contract.afp);
            setFonasa(emp.contract.healthSystem === 'FONASA');
            setIsapreAmount(emp.contract.isapreAmount || 0);
            setColacion(emp.contract.colacion || 0);
            setMovilizacion(emp.contract.movilizacion || 0);
        }
    };

    const fmt = (n: number) => new Intl.NumberFormat('es-CL').format(n);

    const calculate = () => {
        if (!baseSalary) {
            alert('Ingrese el sueldo base');
            return;
        }
        const input: PayrollInput = {
            baseSalary, hasGratification, contractType,
            afpName: selectedAFP, fonasa, isapreAmount, colacion, movilizacion
        };
        setResult(calculatePayroll(input));
    };

    const handleSave = async () => {
        if (!result) return;
        const today = new Date().toISOString().split('T')[0];
        const lines: JournalEntryLine[] = [
            { id: crypto.randomUUID(), accountId: '6.1.01', accountName: 'Sueldos Base', debit: result.baseSalary, credit: 0, costCenterId: '100' },
            { id: crypto.randomUUID(), accountId: '6.1.01', accountName: 'Gratificaciones', debit: result.gratification, credit: 0, costCenterId: '100' },
            { id: crypto.randomUUID(), accountId: '6.1.01', accountName: 'Movilización y Colación', debit: result.nonTaxableIncome, credit: 0, costCenterId: '100' },
            { id: crypto.randomUUID(), accountId: '6.1.01', accountName: 'Aporte Patronal', debit: result.sis + result.afcEmployer + result.mutual, credit: 0, costCenterId: '100' },
            { id: crypto.randomUUID(), accountId: '2.1.04', accountName: 'Instituciones Previsionales', debit: 0, credit: result.afpAmount + result.healthTotal + result.afcWorker + result.sis + result.afcEmployer + result.mutual },
            { id: crypto.randomUUID(), accountId: '2.1.05', accountName: 'Impuesto Único por Pagar', debit: 0, credit: result.tax },
            { id: crypto.randomUUID(), accountId: '2.1.06', accountName: 'Sueldos por Pagar', debit: 0, credit: result.liquid }
        ].filter(l => (l.debit + l.credit) > 0);

        const newEntry: JournalEntry = {
            id: crypto.randomUUID(),
            date: today,
            glosa: `Remuneración ${employeeName || 'Trabajador'} - ${new Date().toLocaleString('es-CL', { month: 'long' })}`,
            type: 'egreso',
            lines,
            total: result.employerCost,
            createdAt: new Date().toISOString(),
            status: 'posted'
        };
        await saveEntry(newEntry);

        if (addPayrollProcess) {
            addPayrollProcess({
                id: crypto.randomUUID(),
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear(),
                employeeId: selectedEmployeeId || 'manual',
                calculations: {
                    baseSalary: result.baseSalary, gratification: result.gratification, totalTaxable: result.taxableIncome,
                    totalNonTaxable: result.nonTaxableIncome, afpAmount: result.afpAmount, healthAmount: result.healthTotal,
                    afcAmount: result.afcWorker, tax: result.tax, totalDiscounts: result.totalDiscounts,
                    liquidSalary: result.liquid, employerCost: result.employerCost
                },
                status: 'PROCESSED'
            });
        }
        onBack();
    };

    const handlePrint = () => {
        if (!result) return;
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.write(`
<!DOCTYPE html><html><head><title>Liquidación - ${employeeName || 'Trabajador'}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:9pt;padding:15mm;max-width:210mm}
.header{border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:15px}
.title{font-size:14pt;font-weight:bold}
.subtitle{font-size:9pt;color:#666;margin-top:3px}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:15px}
.info-box{background:#f5f5f5;padding:10px;border-radius:4px}
.info-box label{font-size:7pt;color:#666;text-transform:uppercase;display:block}
.info-box span{font-weight:bold;font-size:10pt}
table{width:100%;border-collapse:collapse;margin-bottom:15px}
th,td{border:1px solid #ccc;padding:6px 8px;font-size:8pt}
th{background:#f0f0f0;text-align:left;font-weight:bold}
td.num{text-align:right;font-family:monospace}
.section-title{background:#333;color:#fff;font-weight:bold}
.total-row{background:#e5e5e5;font-weight:bold}
.liquid-box{background:#000;color:#fff;padding:15px;text-align:center;margin-top:15px}
.liquid-box .amount{font-size:18pt;font-weight:bold;font-family:monospace}
.footer{margin-top:30px;display:grid;grid-template-columns:1fr 1fr;gap:50px;font-size:8pt;color:#666}
.signature{border-top:1px solid #000;padding-top:5px;margin-top:40px}
@media print{@page{margin:10mm}}
</style></head><body>
<div class="header">
    <div class="title">LIQUIDACIÓN DE SUELDO</div>
    <div class="subtitle">${new Date().toLocaleString('es-CL', { month: 'long', year: 'numeric' }).toUpperCase()}</div>
</div>
<div class="info-grid">
    <div class="info-box"><label>Trabajador</label><span>${employeeName || '-'}</span></div>
    <div class="info-box"><label>RUT</label><span>${rut || '-'}</span></div>
    <div class="info-box"><label>Tipo Contrato</label><span>${contractType === 'INDEFINIDO' ? 'Indefinido' : 'Plazo Fijo'}</span></div>
    <div class="info-box"><label>Fecha Emisión</label><span>${new Date().toLocaleDateString('es-CL')}</span></div>
</div>
<table>
    <tr class="section-title"><td colspan="2">HABERES</td></tr>
    <tr><td>Sueldo Base</td><td class="num">$${fmt(result.baseSalary)}</td></tr>
    <tr><td>Gratificación Legal</td><td class="num">$${fmt(result.gratification)}</td></tr>
    <tr><td>Movilización</td><td class="num">$${fmt(movilizacion)}</td></tr>
    <tr><td>Colación</td><td class="num">$${fmt(colacion)}</td></tr>
    <tr class="total-row"><td>Total Haberes</td><td class="num">$${fmt(result.totalHaberes)}</td></tr>
</table>
<table>
    <tr class="section-title"><td colspan="2">DESCUENTOS LEGALES</td></tr>
    <tr><td>AFP ${result.afpName}</td><td class="num">$${fmt(result.afpAmount)}</td></tr>
    <tr><td>Salud ${fonasa ? '(Fonasa 7%)' : '(Isapre)'}</td><td class="num">$${fmt(result.healthTotal)}</td></tr>
    <tr><td>Seguro Cesantía</td><td class="num">$${fmt(result.afcWorker)}</td></tr>
    <tr><td>Impuesto Único</td><td class="num">$${fmt(result.tax)}</td></tr>
    <tr class="total-row"><td>Total Descuentos</td><td class="num">$${fmt(result.totalDiscounts)}</td></tr>
</table>
<div class="liquid-box">
    <div style="font-size:8pt;margin-bottom:5px">LÍQUIDO A PAGAR</div>
    <div class="amount">$${fmt(result.liquid)}</div>
</div>
<table style="margin-top:15px">
    <tr class="section-title"><td colspan="2">COSTO EMPRESA</td></tr>
    <tr><td>SIS (1.53%)</td><td class="num">$${fmt(result.sis)}</td></tr>
    <tr><td>AFC Empleador</td><td class="num">$${fmt(result.afcEmployer)}</td></tr>
    <tr><td>Mutual (0.93%)</td><td class="num">$${fmt(result.mutual)}</td></tr>
    <tr class="total-row"><td>Costo Total Empresa</td><td class="num">$${fmt(result.employerCost)}</td></tr>
</table>
<div class="footer">
    <div><div class="signature">Firma Empleador</div></div>
    <div><div class="signature">Firma Trabajador</div></div>
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`);
        w.document.close();
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="p-1.5 hover:bg-slate-100 rounded-lg">
                            <ArrowLeft size={18} className="text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-lg font-semibold text-slate-800">Generador de Liquidaciones</h1>
                            <p className="text-xs text-slate-500">Normativa Chilena 2024-2025</p>
                        </div>
                    </div>
                    {result && (
                        <div className="flex items-center gap-2">
                            <button onClick={handlePrint} className="text-sm px-3 py-1.5 border border-slate-200 rounded hover:bg-slate-50 flex items-center gap-1">
                                <Printer size={14} /> Imprimir
                            </button>
                            <button onClick={handleSave} className="text-sm px-3 py-1.5 bg-slate-800 text-white rounded hover:bg-slate-700 flex items-center gap-1">
                                <Save size={14} /> Centralizar
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-6">
                <div className="grid grid-cols-12 gap-6">
                    {/* Left: Form */}
                    <div className="col-span-5 space-y-4">
                        {/* Employee Selector */}
                        {employees.length > 0 && (
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                                <label className="text-xs font-medium text-blue-700 block mb-1">Cargar desde Nómina</label>
                                <select
                                    value={selectedEmployeeId}
                                    onChange={e => handleEmployeeSelect(e.target.value)}
                                    className="w-full bg-white border border-blue-200 rounded px-2 py-1.5 text-sm"
                                >
                                    <option value="">Seleccionar trabajador...</option>
                                    {employees.filter(e => e.isActive).map(e => (
                                        <option key={e.id} value={e.id}>{e.rut} - {e.names} {e.fatherName}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Contract Data */}
                        <div className="bg-white border border-slate-200 rounded-lg p-4">
                            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                <User size={16} /> Datos del Trabajador
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">Nombre</label>
                                    <input type="text" value={employeeName} onChange={e => setEmployeeName(e.target.value)}
                                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm" placeholder="Nombre completo" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-slate-500 block mb-1">RUT</label>
                                        <input type="text" value={rut} onChange={e => setRut(e.target.value)}
                                            className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm" placeholder="12.345.678-9" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 block mb-1">Contrato</label>
                                        <select value={contractType} onChange={e => setContractType(e.target.value as any)}
                                            className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm">
                                            <option value="INDEFINIDO">Indefinido</option>
                                            <option value="PLAZO_FIJO">Plazo Fijo</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Salary */}
                        <div className="bg-white border border-slate-200 rounded-lg p-4">
                            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                <Calculator size={16} /> Remuneración
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">Sueldo Base *</label>
                                    <input type="number" value={baseSalary || ''} onChange={e => setBaseSalary(Number(e.target.value))}
                                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm font-medium" placeholder="500000" />
                                </div>
                                <label className="flex items-center gap-2 text-sm text-slate-600">
                                    <input type="checkbox" checked={hasGratification} onChange={e => setHasGratification(e.target.checked)}
                                        className="rounded border-slate-300" />
                                    Gratificación Legal (Tope 4.75 IMM)
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-slate-500 block mb-1">Colación</label>
                                        <input type="number" value={colacion || ''} onChange={e => setColacion(Number(e.target.value))}
                                            className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 block mb-1">Movilización</label>
                                        <input type="number" value={movilizacion || ''} onChange={e => setMovilizacion(Number(e.target.value))}
                                            className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Previsión */}
                        <div className="bg-white border border-slate-200 rounded-lg p-4">
                            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                <Building size={16} /> Previsión
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">AFP</label>
                                    <select value={selectedAFP} onChange={e => setSelectedAFP(e.target.value)}
                                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm">
                                        {AFPS.map(a => <option key={a.name} value={a.name}>{a.name} ({a.rate}%)</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 block mb-1">Sistema de Salud</label>
                                    <div className="flex border border-slate-200 rounded overflow-hidden">
                                        <button onClick={() => setFonasa(true)}
                                            className={`flex-1 py-1.5 text-xs font-medium ${fonasa ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>
                                            Fonasa (7%)
                                        </button>
                                        <button onClick={() => setFonasa(false)}
                                            className={`flex-1 py-1.5 text-xs font-medium ${!fonasa ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>
                                            Isapre
                                        </button>
                                    </div>
                                </div>
                                {!fonasa && (
                                    <div>
                                        <label className="text-xs text-slate-500 block mb-1">Plan Isapre (CLP)</label>
                                        <input type="number" value={isapreAmount || ''} onChange={e => setIsapreAmount(Number(e.target.value))}
                                            className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <button onClick={calculate}
                            className="w-full bg-slate-800 text-white py-2.5 rounded-lg font-medium hover:bg-slate-700 flex items-center justify-center gap-2">
                            <Calculator size={16} /> Calcular Liquidación
                        </button>
                    </div>

                    {/* Right: Preview */}
                    <div className="col-span-7">
                        {result ? (
                            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                                {/* Header */}
                                <div className="bg-slate-800 text-white p-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h2 className="font-semibold">Liquidación de Sueldo</h2>
                                            <p className="text-slate-400 text-xs">{new Date().toLocaleString('es-CL', { month: 'long', year: 'numeric' })}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-mono font-bold">${fmt(result.liquid)}</div>
                                            <div className="text-xs text-slate-400">Líquido a Pagar</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                                    {/* Haberes */}
                                    <div>
                                        <h4 className="font-semibold text-slate-800 mb-2 pb-1 border-b border-slate-200">Haberes</h4>
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between"><span>Sueldo Base</span><span className="font-mono">${fmt(result.baseSalary)}</span></div>
                                            <div className="flex justify-between"><span>Gratificación</span><span className="font-mono">${fmt(result.gratification)}</span></div>
                                            <div className="flex justify-between bg-slate-50 px-2 py-1 rounded font-medium">
                                                <span>Total Imponible</span><span className="font-mono">${fmt(result.taxableIncome)}</span>
                                            </div>
                                            <div className="flex justify-between text-slate-500"><span>Movilización</span><span className="font-mono">${fmt(movilizacion)}</span></div>
                                            <div className="flex justify-between text-slate-500"><span>Colación</span><span className="font-mono">${fmt(colacion)}</span></div>
                                            <div className="flex justify-between bg-green-50 px-2 py-1 rounded font-semibold text-green-800 mt-2">
                                                <span>Total Haberes</span><span className="font-mono">${fmt(result.totalHaberes)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Descuentos */}
                                    <div>
                                        <h4 className="font-semibold text-slate-800 mb-2 pb-1 border-b border-slate-200">Descuentos</h4>
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between"><span>AFP {result.afpName}</span><span className="font-mono text-red-700">${fmt(result.afpAmount)}</span></div>
                                            <div className="flex justify-between"><span>Salud</span><span className="font-mono text-red-700">${fmt(result.healthTotal)}</span></div>
                                            <div className="flex justify-between"><span>Seg. Cesantía</span><span className="font-mono text-red-700">${fmt(result.afcWorker)}</span></div>
                                            <div className="flex justify-between"><span>Impuesto Único</span><span className="font-mono text-red-700">${fmt(result.tax)}</span></div>
                                            <div className="flex justify-between bg-red-50 px-2 py-1 rounded font-semibold text-red-800 mt-2">
                                                <span>Total Descuentos</span><span className="font-mono">${fmt(result.totalDiscounts)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 text-xs">
                                    <div className="flex justify-between items-center">
                                        <div className="flex gap-4 text-slate-500">
                                            <span>SIS: ${fmt(result.sis)}</span>
                                            <span>AFC Emp: ${fmt(result.afcEmployer)}</span>
                                            <span>Mutual: ${fmt(result.mutual)}</span>
                                        </div>
                                        <div className="font-semibold text-slate-700">
                                            Costo Empresa: ${fmt(result.employerCost)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 border border-dashed border-slate-200 rounded-lg min-h-[400px] bg-white">
                                <Calculator size={48} className="mb-3 opacity-50" />
                                <p className="text-sm">Complete el formulario y presione "Calcular"</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};
