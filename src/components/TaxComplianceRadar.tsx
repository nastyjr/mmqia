import React, { useState, useEffect } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { ArrowLeft, ShieldCheck, AlertTriangle, XCircle, CheckCircle, Search, RefreshCw, FileText } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export const TaxComplianceRadar: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { journalEntries } = useAccounting();
    const [loading, setLoading] = useState(false);
    const [complianceScore, setComplianceScore] = useState(0);
    const [risks, setRisks] = useState<any[]>([]);

    // Simulated RCV Data (In a real app, this would come from the SII API)
    const [siiDocuments, setSiiDocuments] = useState<any[]>([]);

    const runAnalysis = async () => {
        setLoading(true);
        // Simulate catching data from SII
        // We create some mock SII invoices that might be missing in our Journal
        const mockSII = [
            { folio: 101, rut: '76.111.111-1', amount: 500000, date: '2025-05-10', type: 'F. Electrónica' },
            { folio: 102, rut: '81.222.222-2', amount: 120000, date: '2025-05-12', type: 'F. Electrónica' },
            { folio: 103, rut: '90.333.333-3', amount: 850000, date: '2025-05-15', type: 'F. Exenta' }, // Maybe missing
            { folio: 999, rut: '66.666.666-6', amount: 2000000, date: '2025-05-20', type: 'F. Electrónica' } // High amount, potential risk
        ];

        await new Promise(r => setTimeout(r, 1500)); // Fake network delay

        const identifiedRisks: any[] = [];
        let score = 100;

        // CHECK 1: Documents in SII but missing in Accounting
        mockSII.forEach(doc => {
            // Fuzzy match: check if any journal entry has the folio in glosa and same amount
            const match = journalEntries.find(e =>
                (e.glosa.includes(doc.folio.toString()) || e.total === doc.amount)
                && e.date.includes(doc.date.substring(0, 7))
            );

            if (!match) {
                identifiedRisks.push({
                    id: crypto.randomUUID(),
                    severity: 'high',
                    type: 'Documento Pendiente',
                    desc: `Factura Folio ${doc.folio} de ${doc.rut} por $${doc.amount.toLocaleString()} aparece en SII pero no está en su contabilidad.`,
                    action: 'Contabilizar'
                });
                score -= 15;
            }
        });

        // CHECK 2: F29 Discrepancy (Simulated)
        const journalTaxDebit = journalEntries
            .filter(e => e.type === 'ingreso' && e.date.includes('2025-05'))
            .reduce((acc, e) => acc + (Math.round(e.total * 0.19 / 1.19)), 0);

        const siiTaxDebit = 1500000; // Simulated accumulation in SII

        if (Math.abs(journalTaxDebit - siiTaxDebit) > 5000) {
            identifiedRisks.push({
                id: crypto.randomUUID(),
                severity: 'medium',
                type: 'Descuadre IVA Débito',
                desc: `Su contabilidad registra IVA Débito por $${journalTaxDebit.toLocaleString()}, pero SII tiene recibido $${siiTaxDebit.toLocaleString()}. Diferencia: $${(journalTaxDebit - siiTaxDebit).toLocaleString()}`,
                action: 'Revisar Ventas'
            });
            score -= 10;
        }

        // CHECK 3: Suspicious Expenses (No XML)
        const suspiciousEntries = journalEntries.filter(e => e.type === 'egreso' && e.total > 1000000 && !e.glosa.toLowerCase().includes('factura'));
        suspiciousEntries.forEach(entry => {
            identifiedRisks.push({
                id: crypto.randomUUID(),
                severity: 'low',
                type: 'Gasto Sin Respaldo Claro',
                desc: `El asiento de $${entry.total.toLocaleString()} "${entry.glosa}" es alto y no menciona factura. Podría ser rechazado como gasto.`,
                action: 'Auditar'
            });
            score -= 5;
        });

        setSiiDocuments(mockSII);
        setRisks(identifiedRisks);
        setComplianceScore(Math.max(0, score));
        setLoading(false);
    };

    // Auto-run on mount
    useEffect(() => {
        runAnalysis();
    }, []);

    const data = [
        { name: 'Cumplimiento', value: complianceScore },
        { name: 'Riesgo', value: 100 - complianceScore },
    ];

    const COLORS = ['#10b981', '#f43f5e'];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <ShieldCheck className="text-blue-600" /> Radar Tributario
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-bold uppercase">Beta</span>
                        </h1>
                        <p className="text-slate-500 text-sm">Auditoría automática de consistencia (SII vs Contabilidad)</p>
                    </div>
                </div>

                <button
                    onClick={runAnalysis}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors"
                >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Recalcular Riesgo
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Score Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-yellow-400 to-green-500"></div>
                    <h3 className="text-lg font-bold text-slate-700 mb-4">Nivel de Salud Tributaria</h3>

                    <div className="w-48 h-48 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                    startAngle={180}
                                    endAngle={0}
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
                            <span className={`text-4xl font-black ${complianceScore > 80 ? 'text-emerald-600' : 'text-amber-500'}`}>{complianceScore}%</span>
                            <span className="text-xs text-slate-400 font-medium uppercase">Score</span>
                        </div>
                    </div>

                    <div className="mt-4 text-center">
                        {complianceScore >= 90 && <p className="text-emerald-600 font-medium">✨ Situación Excelente</p>}
                        {complianceScore >= 70 && complianceScore < 90 && <p className="text-amber-500 font-medium">⚠️ Requiere Atención</p>}
                        {complianceScore < 70 && <p className="text-rose-600 font-medium">🚨 Riesgo de Multa Alto</p>}
                    </div>
                </div>

                {/* Risks List */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                        <AlertTriangle className="text-amber-500" /> Hallazgos ({risks.length})
                    </h3>

                    {loading ? (
                        <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl animate-pulse">
                            Escaneando Registros del SII...
                        </div>
                    ) : risks.length === 0 ? (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-8 text-center">
                            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                            <h3 className="font-bold text-emerald-800">¡Todo en Orden!</h3>
                            <p className="text-emerald-600 text-sm">No se encontraron inconsistencias entre el SII y tu contabilidad.</p>
                        </div>
                    ) : (
                        risks.map(risk => (
                            <div key={risk.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex gap-4 items-start group">
                                <div className={`p-3 rounded-lg flex-shrink-0 ${risk.severity === 'high' ? 'bg-rose-100 text-rose-600' :
                                        risk.severity === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                                    }`}>
                                    {risk.severity === 'high' ? <XCircle size={24} /> : <Search size={24} />}
                                </div>
                                <div className="flex-grow">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-slate-800">{risk.type}</h4>
                                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${risk.severity === 'high' ? 'bg-rose-100 text-rose-700' :
                                                risk.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                                            }`}>{risk.severity} Priority</span>
                                    </div>
                                    <p className="text-sm text-slate-600 mt-1 mb-3">{risk.desc}</p>
                                    <button className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
                                        {risk.action} <ArrowLeft size={10} className="rotate-180" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
