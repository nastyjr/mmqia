import React, { useState, useEffect } from 'react';
import { JournalEntry, JournalLine, Account, TransactionType, INITIAL_COST_CENTERS } from '../types';
import { Plus, Trash2, X, Search, FileText, CheckCircle2, AlertCircle, Building, AlertTriangle, Globe2, Calculator } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { fetchIndicators } from '../utils/currency';

interface AccountingEntryFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (entry: JournalEntry) => Promise<void>;
    accounts: Account[];
    initialData?: JournalEntry;
}



const DOC_TYPES = ['Factura Electrónica', 'Boleta', 'Nota de Crédito', 'Nota de Débito', 'Comprobante Contable'];

// Tipos de Libro Auxiliar
const AUXILIARY_BOOK_TYPES = [
    { code: 'CLIENTE', name: 'Clientes' },
    { code: 'PROVEEDOR', name: 'Proveedores' },
    { code: 'BANCO', name: 'Bancos' },
    { code: 'EMPLEADO', name: 'Empleados' },
    { code: 'SOCIO', name: 'Socios/Accionistas' },
    { code: 'CENTROCOSTO', name: 'Centro de Costo' },
    { code: 'PROYECTO', name: 'Proyecto' },
    { code: 'OTRO', name: 'Otro' }
];

// Fallback data if DB is empty
const MOCK_ENTITIES = [
    { rut: '76.192.345-K', name: 'SODIMAC S.A.' },
    { rut: '96.654.321-5', name: 'COMPAÑIA DE PETROLEOS DE CHILE COPEC S.A.' },
    { rut: '60.803.000-K', name: 'TESORERIA GENERAL DE LA REPUBLICA' },
    { rut: '77.123.456-7', name: 'INVERSIONES LOS ANDES LIMITADA' },
    { rut: '12.345.678-9', name: 'JUAN PEREZ (HONORARIOS)' },
    { rut: '99.555.444-3', name: 'AGUAS ANDINAS S.A.' },
    { rut: '90.111.222-1', name: 'ENEL DISTRIBUCION CHILE S.A.' },
    { rut: '76.000.111-2', name: 'SERVICIOS INFORMATICOS LIMITADA' }
];

// Helper to generate safe IDs in any environment
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

export const AccountingEntryForm: React.FC<AccountingEntryFormProps> = ({
    isOpen,
    onClose,
    onSave,
    accounts,
    initialData
}) => {
    // --- Header State ---
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [voucherType, setVoucherType] = useState<TransactionType>('egreso'); // Comprobante
    const [docNumber, setDocNumber] = useState(''); // Num Doc
    const [gloss, setGloss] = useState(''); // Glosa
    const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]); // Fecha Doc
    const [dueDate, setDueDate] = useState(''); // Fecha Vencimiento

    // Extra fields from screenshot
    const [bookType, setBookType] = useState('(Todos)');
    const [documentType, setDocumentType] = useState('(Todos)');
    const [rut, setRut] = useState('');
    const [name, setName] = useState('');
    const [folio, setFolio] = useState('');

    // Multi-currency State
    const [currency, setCurrency] = useState<'CLP' | 'USD' | 'UF' | 'EUR'>('CLP');
    const [exchangeRate, setExchangeRate] = useState<number>(1);
    const [isLoadingRate, setIsLoadingRate] = useState(false);

    // Fetch exchange rate when currency or date changes
    useEffect(() => {
        if (currency === 'CLP') {
            setExchangeRate(1);
            return;
        }

        const loadRate = async () => {
            setIsLoadingRate(true);
            const indicators = await fetchIndicators();
            const indicator = indicators.find(i => i.code === currency);
            if (indicator) {
                setExchangeRate(indicator.value);
            }
            setIsLoadingRate(false);
        };
        loadRate();
    }, [currency, date]);

    // --- Assistant (Modal) State ---
    const [showEntitySelector, setShowEntitySelector] = useState(false);
    const [entitySearchTerm, setEntitySearchTerm] = useState('');
    const [availableEntities, setAvailableEntities] = useState<{ rut: string, name: string }[]>(MOCK_ENTITIES);

    // --- Auxiliary Book Selector State ---
    const [showAuxiliaryModal, setShowAuxiliaryModal] = useState(false);
    const [auxiliaryLineId, setAuxiliaryLineId] = useState<string | null>(null);
    const [selectedAuxBookType, setSelectedAuxBookType] = useState<string>('');
    const [auxSearchTerm, setAuxSearchTerm] = useState('');

    // --- Grid State ---
    // Initialize lines lazily to avoid issues if generateId fails during initial render
    const [lines, setLines] = useState<JournalLine[]>([]);
    const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // --- Totals Calculation ---
    // --- Totals Calculation ---
    // If currency is not CLP, we sum original amounts for display (validation uses calculated CLP)
    const totalDebit = lines.reduce((sum, line) => sum + (currency === 'CLP' ? (Number(line.debit) || 0) : (Number(line.originalDebit) || Number(line.debit) || 0)), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (currency === 'CLP' ? (Number(line.credit) || 0) : (Number(line.originalCredit) || Number(line.credit) || 0)), 0);
    const balance = totalDebit - totalCredit;
    const isBalanced = Math.abs(balance) < 0.5;

    const createEmptyLine = (): JournalLine => ({
        id: generateId(),
        accountId: '',
        accountName: '',
        debit: 0,
        credit: 0,
        rut: '',
        documentType: '',
        documentNumber: '',
        costCenter: '',
        lineGloss: ''
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setDate(initialData.date);
                setGloss(initialData.glosa);
                setVoucherType(initialData.type);
                setLines(initialData.lines);
                // Map other fields if they existed in JournalEntry, for now defaults
            } else {
                resetForm();
            }
            setFormError(null);
        }
    }, [isOpen, initialData]);

    // Fetch Entities from Supabase when selector opens
    useEffect(() => {
        if (showEntitySelector) {
            const fetchContacts = async () => {
                try {
                    const { data, error } = await supabase
                        .from('contacts')
                        .select('rut, name')
                        .order('name');

                    if (data && data.length > 0) {
                        setAvailableEntities(data);
                    }
                } catch (err) {
                    console.error("Error fetching contacts:", err);
                }
            };
            fetchContacts();
        }
    }, [showEntitySelector]);

    const resetForm = () => {
        const today = new Date().toISOString().split('T')[0];
        setDate(today);
        setDocDate(today);
        setGloss('');
        setDocNumber('');
        setRut('');
        setName('');
        // Initialize with 8 empty lines safely
        setLines(Array(8).fill(null).map(() => createEmptyLine()));
    };

    const updateLine = (id: string, field: keyof JournalLine, value: any) => {
        // Clear error on interaction to allow retry
        if (formError) setFormError(null);

        setLines(prev => prev.map(line => {
            if (line.id === id) {
                // Logic for numeric fields (Debit/Credit)
                if (field === 'debit' || field === 'credit') {
                    // 1. Strict Numeric Validation (Real-time)
                    if (!/^\d*\.?\d*$/.test(value)) {
                        return line; // Ignore invalid character input
                    }

                    const val = Number(value);
                    const updated = { ...line, [field]: val };

                    // Handle Multi-currency
                    // Input is considered "Original Currency"
                    // We calculate CLP debit/credit
                    if (currency !== 'CLP') {
                        if (field === 'debit') {
                            updated.originalDebit = val;
                            updated.originalCredit = 0;
                            updated.debit = Math.round(val * exchangeRate);
                            updated.credit = 0;
                            updated.exchangeRate = exchangeRate;
                            updated.currency = currency;
                        } else {
                            updated.originalCredit = val;
                            updated.originalDebit = 0;
                            updated.credit = Math.round(val * exchangeRate);
                            updated.debit = 0;
                            updated.exchangeRate = exchangeRate;
                            updated.currency = currency;
                        }
                    } else {
                        // Regular CLP logic
                        updated.currency = 'CLP';
                        updated.exchangeRate = 1;
                        if (field === 'debit') {
                            updated.credit = 0;
                            updated.originalDebit = undefined;
                            updated.originalCredit = undefined;
                        } else {
                            updated.debit = 0;
                            updated.originalDebit = undefined;
                            updated.originalCredit = undefined;
                        }
                    }

                    return updated;
                }

                const updated = { ...line, [field]: value };

                // Auto-fill Account Name
                if (field === 'accountId') {
                    const acc = accounts.find(a => a.code === value);
                    if (acc) updated.accountName = acc.name;
                }

                return updated;
            }
            return line;
        }));
    };

    const handleAddLine = () => {
        setLines([...lines, createEmptyLine()]);
        setFormError(null);
    };

    const handleRemoveLine = (id?: string) => {
        const targetId = id || selectedLineId;
        if (targetId) {
            setLines(prev => prev.filter(l => l.id !== targetId));
            if (selectedLineId === targetId) setSelectedLineId(null);
            setFormError(null);
        }
    };

    const handleSubmit = async () => {
        setFormError(null);

        // 1. Check Balance
        if (!isBalanced && Math.abs(balance) > 0.5) {
            setFormError(`Diferencia detectada: $${Math.abs(balance).toLocaleString('es-CL')}. El asiento contable debe cuadrar (Total Debe = Total Haber) antes de guardar.`);
            return;
        }

        // 2. Check content
        const validLines = lines.filter(l => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0));

        if (validLines.length === 0) {
            setFormError("El asiento está vacío. Debe ingresar al menos una cuenta contable con monto mayor a cero.");
            return;
        }

        setIsSaving(true);
        try {
            await onSave({
                id: initialData?.id || generateId(),
                date,
                type: voucherType,
                glosa: gloss,
                total: totalDebit,
                lines: validLines.map(l => ({
                    ...l,
                    debit: Number(l.debit),
                    credit: Number(l.credit)
                })),
                createdAt: new Date().toISOString(),
                status: 'posted'
            });
            onClose();
        } catch (error) {
            console.error(error);
            setFormError("Error interno al guardar. Intente nuevamente.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleEntitySelect = (entity: { rut: string, name: string }) => {
        setRut(entity.rut);
        setName(entity.name);
        setShowEntitySelector(false);
        setEntitySearchTerm('');
    };

    const filteredEntities = availableEntities.filter(e =>
        e.name.toLowerCase().includes(entitySearchTerm.toLowerCase()) ||
        e.rut.includes(entitySearchTerm)
    );

    if (!isOpen) return null;

    // --- Styles ---
    const labelClass = "block text-xs font-medium text-gray-700 mb-1 truncate";
    const inputClass = "w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow font-normal text-gray-900";
    const selectClass = "w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white font-normal text-gray-900";

    return (
        <div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-[1400px] h-[95vh] rounded-lg shadow-2xl flex flex-col overflow-hidden border border-gray-300 relative">

                {/* --- TITLE BAR --- */}
                <div className="bg-white border-b border-gray-200 px-4 py-2 flex justify-between items-center shadow-sm z-10">
                    <div className="flex items-center gap-2">
                        <FileText className="text-blue-600" size={20} />
                        <h1 className="text-blue-600 font-bold text-lg">Agregar Comprobante Contable</h1>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* --- HEADER FORM --- */}
                <div className="p-4 bg-gray-50 border-b border-gray-200 grid grid-cols-12 gap-x-4 gap-y-3">

                    {/* Row 1 */}
                    <div className="col-span-2">
                        <label className={labelClass}>Fecha Comp.:</label>
                        <div className="relative">
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} />
                        </div>
                    </div>
                    <div className="col-span-3">
                        <label className={labelClass}>Comprobante (Tipo):</label>
                        <select value={voucherType} onChange={e => setVoucherType(e.target.value as any)} className={selectClass}>
                            <option value="ingreso">Ingreso</option>
                            <option value="egreso">Egreso</option>
                            <option value="traspaso">Traspaso</option>
                        </select>
                    </div>
                    <div className="col-span-2">
                        <label className={labelClass}>Num. Doc.:</label>
                        <input type="text" value={docNumber} onChange={e => setDocNumber(e.target.value)} className={inputClass} placeholder="Automático" />
                    </div>
                    <div className="col-span-5">
                        <label className={labelClass}>Glosa General:</label>
                        <input type="text" value={gloss} onChange={e => setGloss(e.target.value)} className={inputClass} placeholder="Descripción del movimiento..." />
                    </div>

                    {/* Row 2 */}
                    <div className="col-span-2">
                        <label className={labelClass}>Libros:</label>
                        <select value={bookType} onChange={e => setBookType(e.target.value)} className={selectClass}>
                            <option>(Todos)</option>
                            <option>Contabilidad</option>
                            <option>Tributario</option>
                        </select>
                    </div>
                    <div className="col-span-3">
                        <label className={labelClass}>Documento (Tipo Doc):</label>
                        <select value={documentType} onChange={e => setDocumentType(e.target.value)} className={selectClass}>
                            <option>(Todos)</option>
                            {DOC_TYPES.map(d => <option key={d}>{d}</option>)}
                        </select>
                    </div>
                    <div className="col-span-2">
                        <label className={labelClass}>Números Folio:</label>
                        <input type="text" value={folio} onChange={e => setFolio(e.target.value)} className={inputClass} />
                    </div>
                    <div className="col-span-3">
                        <label className={labelClass}>Fecha Doc.:</label>
                        <input type="date" value={docDate} onChange={e => setDocDate(e.target.value)} className={inputClass} />
                    </div>
                    <div className="col-span-2">
                        <label className={labelClass}>Fecha Vencimiento:</label>
                        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputClass} />
                    </div>

                    {/* Row 3 */}
                    <div className="col-span-2">
                        <label className={labelClass}>Rut Entidad:</label>
                        <div className="flex gap-1">
                            <input type="text" value={rut} onChange={e => setRut(e.target.value)} className={inputClass} placeholder="99.888.777-6" />
                        </div>
                    </div>
                    <div className="col-span-4">
                        <label className={labelClass}>Nombre / Razón Social:</label>
                        <div className="flex gap-1">
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} />
                            <button
                                type="button"
                                onClick={() => setShowEntitySelector(true)}
                                className="bg-blue-600 text-white px-3 rounded text-xs font-bold hover:bg-blue-700 flex items-center gap-1 transition-colors shadow-sm"
                                title="Buscar Entidad (Proveedores/Clientes)"
                            >
                                <Search size={12} /> Asistente
                            </button>
                        </div>
                    </div>
                    <div className="col-span-2">
                        <label className={labelClass}>No Recuperable:</label>
                        <select className={selectClass}><option>-</option></select>
                    </div>
                    <div className="col-span-2">
                        <label className={labelClass}>IVA Activo Fijo:</label>
                        <select className={selectClass}><option>NO</option><option>SI</option></select>
                    </div>
                    <div className="col-span-2">
                        <label className={labelClass}>Otro Impuesto:</label>
                        <select className={selectClass}>
                            <option value="">Seleccione</option>
                            <option value="impuesto_adicional">Impuesto Adicional</option>
                            <option value="impuesto_especifico">Impuesto Específico Combustible</option>
                            <option value="impuesto_licores">Impuesto a Licores (ILA)</option>
                            <option value="impuesto_tabaco">Impuesto al Tabaco</option>
                            <option value="impuesto_verde">Impuesto Verde (CO2)</option>
                            <option value="retencion_honorarios">Retención Honorarios (15.25%)</option>
                        </select>
                    </div>
                </div>

                {/* --- GRID HEADER --- */}
                <div className="bg-gray-200 px-1 py-1 text-xs font-bold text-gray-700 flex justify-between items-center border-b border-gray-300">
                    <span className="ml-2">Detalle de Comprobante Contable</span>
                    <div className="flex gap-1">
                        <button type="button" onClick={handleAddLine} className="p-1 hover:bg-gray-300 rounded" title="Agregar Línea"><Plus size={14} /></button>
                    </div>
                </div>

                {/* --- MAIN GRID --- */}
                <div className="flex-grow overflow-auto bg-white relative">
                    <table className="min-w-full border-collapse">
                        <thead className="bg-gray-100 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-slate-600 w-16">#</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-600">Cuenta</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-600">Glosa</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-600 w-32">Auxiliar</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-600 w-32">Doc</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-600 w-32">Folio</th>
                                <th className="px-4 py-3 text-right font-semibold text-slate-600 w-32">
                                    Debe {currency !== 'CLP' ? `(${currency})` : ''}
                                </th>
                                <th className="px-4 py-3 text-right font-semibold text-slate-600 w-32">
                                    Haber {currency !== 'CLP' ? `(${currency})` : ''}
                                </th>
                                {currency !== 'CLP' && (
                                    <th className="px-4 py-3 text-right font-semibold text-slate-400 w-24 text-xs">
                                        (CLP Est.)
                                    </th>
                                )}
                                <th className="px-4 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {lines.map((line, index) => (
                                <tr key={line.id} className={`border-b border-slate-100 ${selectedLineId === line.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`} onClick={() => setSelectedLineId(line.id)}>
                                    <td className="px-4 py-2 text-xs text-slate-500">{index + 1}</td>

                                    {/* Account Selection */}
                                    <td className="px-4 py-2 relative">
                                        <input
                                            type="text"
                                            className="w-full outline-none text-sm font-medium bg-transparent placeholder-slate-400"
                                            placeholder="Buscar..."
                                            list={`accounts-list`}
                                            value={line.accountId}
                                            onChange={(e) => updateLine(line.id, 'accountId', e.target.value)}
                                        />
                                        <div className="text-[10px] text-slate-500 truncate max-w-[150px]">{line.accountName}</div>
                                    </td>

                                    {/* Glosa */}
                                    <td className="px-4 py-2">
                                        <input
                                            type="text"
                                            className="w-full outline-none text-xs bg-transparent"
                                            value={line.glosa || ''}
                                            onChange={(e) => updateLine(line.id, 'glosa', e.target.value)}
                                        />
                                    </td>

                                    {/* Auxiliar - Click to open selector */}
                                    <td className="px-4 py-2">
                                        <button
                                            type="button"
                                            className="w-full text-left text-xs bg-transparent hover:bg-blue-50 px-1 py-0.5 rounded cursor-pointer transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setAuxiliaryLineId(line.id);
                                                setSelectedAuxBookType('');
                                                setAuxSearchTerm('');
                                                setShowAuxiliaryModal(true);
                                            }}
                                        >
                                            {line.rut ? (
                                                <span className="text-blue-600 font-medium">{line.auxiliaryType ? `[${line.auxiliaryType}] ` : ''}{line.rut}</span>
                                            ) : (
                                                <span className="text-gray-400 italic">Click para seleccionar...</span>
                                            )}
                                        </button>
                                    </td>
                                    {/* Documento */}
                                    <td className="px-4 py-2">
                                        <select
                                            className="w-full outline-none text-xs bg-transparent"
                                            value={line.documentType || ''}
                                            onChange={(e) => updateLine(line.id, 'documentType', e.target.value)}
                                        >
                                            <option value="">-</option>
                                            {DOC_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </td>
                                    {/* Folio */}
                                    <td className="px-4 py-2">
                                        <input
                                            type="text"
                                            className="w-full outline-none text-xs bg-transparent"
                                            placeholder="Número"
                                            value={line.documentNumber || ''}
                                            onChange={(e) => updateLine(line.id, 'documentNumber', e.target.value)}
                                        />
                                    </td>

                                    {/* DEBIT */}
                                    <td className="px-4 py-2">
                                        <input
                                            type="number"
                                            className="w-full outline-none text-sm text-right bg-transparent font-mono"
                                            value={currency === 'CLP' ? (line.debit || '') : (line.originalDebit || '')}
                                            onChange={(e) => updateLine(line.id, 'debit', parseFloat(e.target.value))}
                                            onFocus={(e) => e.target.select()}
                                        />
                                    </td>

                                    {/* CREDIT */}
                                    <td className="px-4 py-2">
                                        <input
                                            type="number"
                                            className="w-full outline-none text-sm text-right bg-transparent font-mono"
                                            value={currency === 'CLP' ? (line.credit || '') : (line.originalCredit || '')}
                                            onChange={(e) => updateLine(line.id, 'credit', parseFloat(e.target.value))}
                                            onFocus={(e) => e.target.select()}
                                        />
                                    </td>

                                    {/* CLP ESTIMATE (Read Only) */}
                                    {currency !== 'CLP' && (
                                        <td className="px-4 py-2 text-right text-xs text-slate-500 font-mono">
                                            {(line.debit || line.credit || 0).toLocaleString()}
                                        </td>
                                    )}

                                    <td className="px-4 py-2 text-center">
                                        <button onClick={(e) => { e.stopPropagation(); handleRemoveLine(line.id); }} className="text-slate-400 hover:text-red-500">
                                            <X size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <datalist id="accounts-list">
                        {accounts.filter(a => a.isImputable).map(a => <option key={a.code} value={a.code}>{a.name}</option>)}
                    </datalist>
                </div>

                {/* --- ERROR BANNER (Visual Alert) --- */}
                {formError && (
                    <div className="bg-red-50 border-t border-red-200 p-3 flex items-center justify-between z-30 animate-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-3">
                            <div className="bg-red-100 p-1.5 rounded-full">
                                <AlertTriangle className="text-red-600 h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-red-800">No se puede guardar el asiento</h4>
                                <p className="text-xs text-red-700">{formError}</p>
                            </div>
                        </div>
                        <button onClick={() => setFormError(null)} className="text-red-500 hover:text-red-800">
                            <X size={18} />
                        </button>
                    </div>
                )}

                {/* --- FOOTER & TOTALS --- */}
                <div className="bg-white border-t border-gray-200 p-3 shadow-lg z-20">
                    <div className="grid grid-cols-12 gap-4 items-center mb-4">
                        <div className="col-span-2">
                            <label className={labelClass}>Asiento Apertura:</label>
                            <select className={selectClass} disabled><option>NO</option></select>
                        </div>
                        <div className="col-span-3">
                            <label className={labelClass}>Norma:</label>
                            <select className={selectClass}><option>TRIBUTARIA / IFRS</option></select>
                        </div>
                        <div className="col-span-2">
                            {/* Spacer */}
                        </div>
                        {/* TOTALS DISPLAY */}
                        <div className="col-span-5 grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Total Debe:</label>
                                <div className="bg-gray-50 border border-gray-300 rounded px-2 py-1.5 text-right font-mono text-sm font-bold text-gray-800">
                                    {totalDebit.toLocaleString('es-CL', { minimumFractionDigits: 0 })}
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Total Haber:</label>
                                <div className="bg-gray-50 border border-gray-300 rounded px-2 py-1.5 text-right font-mono text-sm font-bold text-gray-800">
                                    {totalCredit.toLocaleString('es-CL', { minimumFractionDigits: 0 })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ACTION BUTTONS ROW */}
                    <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleSubmit}
                                className={`px-6 py-2 rounded text-sm font-bold shadow-sm transition-colors flex items-center gap-2 text-white ${formError ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'
                                    }`}
                                disabled={isSaving}
                            >
                                {isSaving ? 'Guardando...' : 'Grabar'}
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm font-bold shadow-sm transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleRemoveLine}
                                disabled={!selectedLineId}
                                className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-4 py-2 rounded text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                            >
                                <Trash2 size={16} /> Eliminar Línea
                            </button>
                            <div className="h-8 w-px bg-gray-300 mx-2"></div>
                            <button type="button" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-bold shadow-sm transition-colors flex items-center gap-2">
                                Generar Apertura
                            </button>
                            <button type="button" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-bold shadow-sm transition-colors flex items-center gap-2">
                                Exportar CSV
                            </button>
                        </div>

                        {/* Status Indicator */}
                        <div className={`px-4 py-2 rounded-lg border flex items-center gap-2 transition-colors duration-300 ${isBalanced ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                            {isBalanced ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                            <div className="flex flex-col text-right">
                                <span className="text-[10px] font-bold uppercase tracking-wider">{isBalanced ? 'Asiento Cuadrado' : 'Diferencia'}</span>
                                <span className="text-sm font-mono font-bold">{Math.abs(balance).toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}</span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button type="button" className="bg-cyan-600 text-white px-4 py-2 rounded text-sm font-bold shadow-sm hover:bg-cyan-700">Archivo ...</button>
                            <button type="button" className="bg-cyan-600 text-white px-4 py-2 rounded text-sm font-bold shadow-sm hover:bg-cyan-700">Importar Csv</button>
                        </div>
                    </div>
                </div>

                {/* --- ASSISTANT MODAL (ENTITY SELECTOR) --- */}
                {showEntitySelector && (
                    <div className="absolute inset-0 z-[120] bg-gray-900/50 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
                        <div className="bg-white rounded-lg shadow-2xl border border-gray-300 w-[500px] flex flex-col max-h-[500px]">
                            <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
                                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                                    <Building size={16} /> Asistente de Entidades
                                </h3>
                                <button type="button" onClick={() => setShowEntitySelector(false)} className="text-gray-400 hover:text-red-500">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-4 border-b border-gray-100">
                                <div className="relative">
                                    {/* Document Number */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1">N° Documento</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Ej: 1234"
                                            value={docNumber}
                                            onChange={(e) => setDocNumber(e.target.value)}
                                        />
                                    </div>

                                    {/* Currency Selector */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
                                            <Globe2 size={12} /> Moneda
                                        </label>
                                        <select
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
                                            value={currency}
                                            onChange={(e) => setCurrency(e.target.value as any)}
                                        >
                                            <option value="CLP">🇨🇱 Peso Chileno (CLP)</option>
                                            <option value="USD">🇺🇸 Dólar (USD)</option>
                                            <option value="UF">🇨🇱 UF</option>
                                            <option value="EUR">🇪🇺 Euro (EUR)</option>
                                        </select>
                                    </div>

                                    {/* Exchange Rate (only if not CLP) */}
                                    {currency !== 'CLP' && (
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 mb-1">Tipo de Cambio</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    className="w-full pl-3 pr-8 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-amber-50"
                                                    value={exchangeRate}
                                                    onChange={(e) => setExchangeRate(Number(e.target.value))}
                                                />
                                                {isLoadingRate && (
                                                    <div className="absolute right-2 top-2">
                                                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="overflow-y-auto flex-grow p-2 space-y-1">
                                {filteredEntities.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 text-sm">No se encontraron entidades</div>
                                ) : (
                                    filteredEntities.map((entity, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => handleEntitySelect(entity)}
                                            className="p-3 hover:bg-blue-50 rounded cursor-pointer border border-transparent hover:border-blue-100 transition-all group"
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-sm text-gray-800 group-hover:text-blue-700">{entity.name}</span>
                                                <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{entity.rut}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs text-center text-gray-500 rounded-b-lg">
                                Seleccione una entidad para autocompletar el formulario
                            </div>
                        </div>
                    </div>
                )}

                {/* --- AUXILIARY BOOK SELECTOR MODAL --- */}
                {showAuxiliaryModal && (
                    <div className="absolute inset-0 z-[130] bg-gray-900/50 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
                        <div className="bg-white rounded-lg shadow-2xl border border-gray-300 w-[600px] flex flex-col max-h-[600px]">
                            <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-lg">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <Building size={16} /> Selector de Libro Auxiliar
                                </h3>
                                <button type="button" onClick={() => setShowAuxiliaryModal(false)} className="text-white/80 hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Step 1: Select Book Type */}
                            {!selectedAuxBookType ? (
                                <div className="p-4">
                                    <p className="text-sm text-gray-600 mb-4">Seleccione el tipo de libro auxiliar:</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {AUXILIARY_BOOK_TYPES.map(book => (
                                            <button
                                                key={book.code}
                                                type="button"
                                                onClick={() => setSelectedAuxBookType(book.code)}
                                                className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-left group"
                                            >
                                                <span className="font-bold text-gray-800 group-hover:text-blue-700">{book.name}</span>
                                                <span className="text-xs text-gray-400 block mt-1">Código: {book.code}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Step 2: Search and Select Entity */}
                                    <div className="p-4 border-b border-gray-100">
                                        <div className="flex items-center gap-2 mb-3">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedAuxBookType('')}
                                                className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                                            >
                                                ← Cambiar tipo
                                            </button>
                                            <span className="text-gray-400">|</span>
                                            <span className="text-sm font-bold text-indigo-700">
                                                {AUXILIARY_BOOK_TYPES.find(b => b.code === selectedAuxBookType)?.name}
                                            </span>
                                        </div>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                            <input
                                                type="text"
                                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                placeholder="Buscar por RUT o nombre..."
                                                value={auxSearchTerm}
                                                onChange={(e) => setAuxSearchTerm(e.target.value)}
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                    <div className="overflow-y-auto flex-grow p-2 space-y-1 max-h-[300px]">
                                        {filteredEntities.filter(e =>
                                            e.name.toLowerCase().includes(auxSearchTerm.toLowerCase()) ||
                                            e.rut.includes(auxSearchTerm)
                                        ).length === 0 ? (
                                            <div className="text-center py-8 text-gray-500 text-sm">No se encontraron entidades</div>
                                        ) : (
                                            filteredEntities.filter(e =>
                                                e.name.toLowerCase().includes(auxSearchTerm.toLowerCase()) ||
                                                e.rut.includes(auxSearchTerm)
                                            ).map((entity, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => {
                                                        if (auxiliaryLineId) {
                                                            updateLine(auxiliaryLineId, 'rut', entity.rut);
                                                            updateLine(auxiliaryLineId, 'auxiliaryType', selectedAuxBookType);
                                                        }
                                                        setShowAuxiliaryModal(false);
                                                        setAuxiliaryLineId(null);
                                                        setSelectedAuxBookType('');
                                                        setAuxSearchTerm('');
                                                    }}
                                                    className="p-3 hover:bg-blue-50 rounded cursor-pointer border border-transparent hover:border-blue-100 transition-all group"
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-bold text-sm text-gray-800 group-hover:text-blue-700">{entity.name}</span>
                                                        <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{entity.rut}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </>
                            )}
                            <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs text-center text-gray-500 rounded-b-lg">
                                {!selectedAuxBookType
                                    ? 'Paso 1: Seleccione el tipo de libro auxiliar'
                                    : 'Paso 2: Seleccione una entidad para asociar a esta línea'
                                }
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
