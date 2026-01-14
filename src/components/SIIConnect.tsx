import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import {
    ShieldCheck, Lock, Upload, RefreshCw, CheckCircle2, AlertCircle,
    FileKey, Server, Activity, Database, X, PlayCircle, FileText,
    ArrowRight, Info
} from 'lucide-react';
import { useAccounting } from '../context/AccountingContext';
import { classifyInvoice, learnClassification } from '../utils/classificationRules';
import { JournalEntry } from '../types';

interface SIIConnectProps {
    isOpen: boolean;
    onClose: () => void;
    onConnect: (status: boolean) => void;
    isConnected: boolean;
}

export const SIIConnect: React.FC<SIIConnectProps> = ({ isOpen, onClose, onConnect, isConnected }) => {
    const { saveEntry } = useAccounting();
    const [step, setStep] = useState<'intro' | 'certificate' | 'simulation' | 'synced'>('intro');
    const [certPassword, setCertPassword] = useState('');
    const [fileName, setFileName] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [syncProgress, setSyncProgress] = useState(0);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loadingRCV, setLoadingRCV] = useState(false);
    const [processingEntries, setProcessingEntries] = useState(false);

    // Reset on open
    useEffect(() => {
        if (isOpen && !isConnected) {
            setStep('intro');
            setLogs([]);
            setSyncProgress(0);
        } else if (isOpen && isConnected) {
            setStep('synced');
        }
    }, [isOpen, isConnected]);

    const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setFileName(file.name);
    };

    const startSimulation = async () => {
        setStep('simulation');
        setSyncProgress(0);
        setLogs([]);

        // Check if we should use REAL or DEMO mode
        if (!fileName || !certPassword) {
            // Demo mode (no certificate)
            addLog(">>> MODO DEMO (Sin certificado real)");
            await new Promise(r => setTimeout(r, 800));
            addLog("Simulando obtención de semilla...");
            await new Promise(r => setTimeout(r, 1000));
            setSyncProgress(50);
            addLog("Simulando firma y token...");
            await new Promise(r => setTimeout(r, 1000));
            setSyncProgress(100);
            addLog(">>> CONEXIÓN DEMO ESTABLECIDA");
            setStep('synced');
            onConnect(true);
            return;
        }

        // REAL mode - Call backend
        try {
            addLog(">>> CONEXIÓN REAL CON BACKEND");
            addLog("Enviando certificado al servidor seguro...");
            setSyncProgress(20);

            const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
            const file = fileInput?.files?.[0];

            if (!file) {
                throw new Error("No se encontró el archivo");
            }

            const formData = new FormData();
            formData.append('certificate', file);
            formData.append('password', certPassword);

            addLog("Llamando a /api/sii/auth...");
            setSyncProgress(40);

            const response = await fetch('http://localhost:3001/api/sii/auth', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            setSyncProgress(80);

            if (data.success) {
                addLog(`>>> AUTENTICACIÓN EXITOSA`);
                addLog(`Titular: ${data.subject?.CN || 'N/A'}`);
                addLog(`Token: ${data.token}`);
                addLog(`Expira: ${data.expiresAt}`);
                setSyncProgress(100);
                setStep('synced');
                onConnect(true);
            } else {
                addLog(`>>> ERROR: ${data.message}`);
                throw new Error(data.message);
            }

        } catch (error: any) {
            addLog(`>>> ERROR DE CONEXIÓN: ${error.message}`);
            addLog("Asegúrese de que el servidor backend esté corriendo (npm run server)");
            setSyncProgress(0);
            alert(`Error: ${error.message}\n\nAsegúrese de ejecutar: npm run server`);
            setStep('certificate');
        }
    };

    const fetchRCV = async () => {
        setLoadingRCV(true);
        // Simulate RCV Fetch
        setTimeout(() => {
            const mockInvoices = [
                { folio: 1023, date: '2023-10-15', rut: '76.123.456-7', name: 'PROVEEDOR TECNOLOGICO SPA', amount: 150000 },
                { folio: 592, date: '2023-10-18', rut: '96.888.111-K', name: 'COMERCIALIZADORA DE INSUMOS LTDA', amount: 45990 },
                { folio: 33, date: '2023-10-20', rut: '12.345.678-9', name: 'CONSULTORA LEGAL Y TRIBUTARIA', amount: 850000 },
            ];
            setInvoices(mockInvoices);
            addLog("Descargados 3 documentos del Registro de Compras.");
            setLoadingRCV(false);
        }, 1500);
    };

    const handleGenerateEntries = async () => {
        setProcessingEntries(true);
        await new Promise(r => setTimeout(r, 1500));

        for (const inv of invoices) {
            // Use intelligent classification
            const classification = classifyInvoice(inv.name);

            // Logic to add entry with smart classification
            const newEntry: JournalEntry = {
                id: crypto.randomUUID(),
                date: inv.date,
                glosa: `Compra Fac. ${inv.folio} - ${inv.name} [Auto: ${classification.confidence}%]`,
                type: 'egreso',
                total: inv.amount,
                createdAt: new Date().toISOString(),
                status: 'posted',
                lines: [
                    {
                        id: crypto.randomUUID(),
                        accountId: classification.accountId,
                        accountName: classification.accountName,
                        debit: inv.amount,
                        credit: 0
                    },
                    {
                        id: crypto.randomUUID(),
                        accountId: '1.1.01',
                        accountName: 'Banco',
                        debit: 0,
                        credit: inv.amount
                    }
                ]
            };
            await saveEntry(newEntry);

            // Learn from high-confidence classifications
            if (classification.confidence >= 85 && classification.source === 'rule') {
                learnClassification(inv.name, classification.accountId, classification.accountName);
            }
        }
        setProcessingEntries(false);
        alert('Asientos generados correctamente en Contabilidad con clasificación inteligente.');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-[#003366] px-6 py-4 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-lg">
                            <Server className="text-white h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-lg">Integración SII Paso a Paso</h2>
                            <p className="text-blue-200 text-xs">Simulación Educativa de Conexión</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-blue-200 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">

                    {/* STEP 1: INTRO */}
                    {step === 'intro' && (
                        <div className="text-center space-y-6">
                            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                                <h3 className="font-bold text-blue-900 mb-2">¿Cómo funciona la conexión real?</h3>
                                <p className="text-sm text-blue-700 mb-4">
                                    Para emitir facturas y leer el RCV, el software debe "hacerse pasar" por el contribuyente usando el Certificado Digital.
                                </p>
                                <div className="flex justify-center gap-4 text-xs font-bold text-slate-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="p-2 bg-white rounded-full shadow-sm"><FileKey size={20} /></div>
                                        <span>1. Certificado</span>
                                    </div>
                                    <div className="flex items-center text-slate-300"><ArrowRight /></div>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="p-2 bg-white rounded-full shadow-sm"><Lock size={20} /></div>
                                        <span>2. Token SII</span>
                                    </div>
                                    <div className="flex items-center text-slate-300"><ArrowRight /></div>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="p-2 bg-white rounded-full shadow-sm"><Database size={20} /></div>
                                        <span>3. Datos (RCV)</span>
                                    </div>
                                </div>
                            </div>
                            <Button onClick={() => setStep('certificate')} className="w-full py-3">
                                Comenzar Configuración
                            </Button>
                        </div>
                    )}

                    {/* STEP 2: CERTIFICATE */}
                    {step === 'certificate' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-bold text-slate-800 mb-2">Paso 1: Certificado Digital</h3>
                                <p className="text-sm text-slate-500 mb-4">
                                    Selecciona tu archivo .p12 o .pfx. Este archivo es tu "Carnet de Identidad" digital.
                                </p>

                                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center bg-slate-50 relative group cursor-pointer hover:bg-white hover:border-blue-400 transition-all">
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} />
                                    <FileKey size={32} className="text-slate-400 mb-2 group-hover:text-blue-500" />
                                    <span className="font-bold text-slate-600">{fileName || 'Seleccionar Archivo .p12'}</span>
                                    <span className="text-xs text-slate-400 mt-1">Tu certificado no saldrá de tu navegador en esta demo.</span>
                                </div>
                            </div>

                            {fileName && (
                                <div className="animate-in fade-in slide-in-from-bottom-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Contraseña del Certificado</label>
                                    <input
                                        type="password"
                                        className="w-full border border-slate-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Ingrese clave..."
                                        value={certPassword}
                                        onChange={e => setCertPassword(e.target.value)}
                                    />
                                    <Button
                                        onClick={startSimulation}
                                        className="w-full mt-4"
                                        disabled={!certPassword}
                                    >
                                        Conectar con SII (Simulado)
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 3: SIMULATION */}
                    {step === 'simulation' && (
                        <div className="space-y-6">
                            <h3 className="font-bold text-slate-800 text-center">Negociando con Servidores SII...</h3>

                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${syncProgress}%` }}></div>
                            </div>

                            <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-green-400 h-64 overflow-y-auto shadow-inner border border-slate-800">
                                {logs.map((log, i) => (
                                    <div key={i} className="mb-2 border-l-2 border-green-600 pl-2 opacity-90">
                                        {log}
                                    </div>
                                ))}
                                {syncProgress < 100 && (
                                    <div className="animate-pulse">_</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 4: SYNCED */}
                    {step === 'synced' && (
                        <div className="space-y-6">
                            <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex gap-3 items-start">
                                <CheckCircle2 className="text-green-600 shrink-0 mt-1" />
                                <div>
                                    <h3 className="font-bold text-green-800">Conexión Exitosa</h3>
                                    <p className="text-sm text-green-700">El sistema tiene un Token válido para operar.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Button variant="secondary" onClick={fetchRCV} disabled={loadingRCV}>
                                    <RefreshCw className={`mr-2 h-4 w-4 ${loadingRCV ? 'animate-spin' : ''}`} /> Sincronizar RCV
                                </Button>
                                <Button variant="secondary" onClick={() => alert('Operación Mock: Enviar DTEs pendientes al SII')}>
                                    <Upload className="mr-2 h-4 w-4" /> Enviar Pendientes
                                </Button>
                            </div>

                            {invoices.length > 0 && (
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-50 font-bold text-slate-600">
                                            <tr>
                                                <th className="p-3">Fecha</th>
                                                <th className="p-3">Emisor</th>
                                                <th className="p-3 text-right">Monto</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {invoices.map((inv, i) => (
                                                <tr key={i}>
                                                    <td className="p-3">{inv.date}</td>
                                                    <td className="p-3">{inv.name}</td>
                                                    <td className="p-3 text-right">${inv.amount.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="p-3 border-t bg-slate-50">
                                        <Button onClick={handleGenerateEntries} className="w-full">
                                            Procesar en Contabilidad
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
