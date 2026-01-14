/**
 * CSV Batch Import Component
 * Allows importing multiple invoices from CSV file
 */

import React, { useState } from 'react';
import { Upload, Download, CheckCircle, XCircle, AlertCircle, FileText } from 'lucide-react';
import { Button } from './Button';
import { csvImporter, ParsedInvoice } from '../utils/csvImporter';
import { classifyInvoice } from '../utils/classificationRules';
import { validateRUT } from '../utils/rutValidation';

interface CSVBatchImportProps {
    onImportComplete: (invoices: ParsedInvoice[]) => void;
    onClose: () => void;
}

export const CSVBatchImport: React.FC<CSVBatchImportProps> = ({ onImportComplete, onClose }) => {
    const [file, setFile] = useState<File | null>(null);
    const [parseResult, setParseResult] = useState<ReturnType<typeof csvImporter.importInvoices> | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [step, setStep] = useState<'upload' | 'preview' | 'complete'>('upload');

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            processFile(selectedFile);
        }
    };

    const processFile = async (file: File) => {
        setIsProcessing(true);
        try {
            const content = await file.text();
            const result = csvImporter.importInvoices(content);

            // Additional validation with RUT
            result.data.forEach((invoice, index) => {
                if (!validateRUT(invoice.supplierRut)) {
                    result.warnings.push({
                        row: index + 2,
                        field: 'rutProveedor',
                        message: 'RUT inválido según módulo 11'
                    });
                }
            });

            setParseResult(result);
            setStep('preview');
        } catch (error) {
            alert('Error al leer el archivo: ' + (error instanceof Error ? error.message : 'Error desconocido'));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmImport = () => {
        if (parseResult && parseResult.data.length > 0) {
            onImportComplete(parseResult.data);
            setStep('complete');
        }
    };

    const downloadTemplate = () => {
        const template = csvImporter.generateTemplate();
        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'plantilla_importacion_facturas.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const formatCLP = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(val);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Upload size={28} />
                        Importación Masiva CSV
                    </h2>
                    <p className="text-blue-100 text-sm mt-1">Importa múltiples facturas desde archivo CSV</p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {step === 'upload' && (
                        <div className="space-y-6">
                            {/* Template Download */}
                            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                                    <div className="flex-1">
                                        <p className="font-bold text-blue-900 mb-2">¿Primera vez?</p>
                                        <p className="text-sm text-blue-800 mb-3">
                                            Descarga la plantilla CSV para ver el formato correcto.
                                        </p>
                                        <Button variant="secondary" onClick={downloadTemplate}>
                                            <Download size={16} className="mr-2" />
                                            Descargar Plantilla
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Upload Area */}
                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:border-blue-500 hover:bg-blue-50 transition-all">
                                <Upload className="mx-auto text-slate-400 mb-4" size={48} />
                                <p className="text-lg font-medium text-slate-700 mb-2">
                                    Arrastra tu archivo CSV aquí
                                </p>
                                <p className="text-sm text-slate-500 mb-4">o haz click para seleccionar</p>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    id="csv-upload"
                                />
                                <label htmlFor="csv-upload">
                                    <Button as="span">
                                        Seleccionar Archivo CSV
                                    </Button>
                                </label>
                            </div>

                            {/* Format Info */}
                            <div className="bg-slate-50 rounded-xl p-4">
                                <h3 className="font-bold text-slate-800 mb-2">Formato Esperado:</h3>
                                <ul className="text-sm text-slate-600 space-y-1">
                                    <li>• <strong>fecha</strong>: DD/MM/YYYY o YYYY-MM-DD</li>
                                    <li>• <strong>tipo</strong>: FACTURA, BOLETA, NC, ND</li>
                                    <li>• <strong>folio</strong>: número entero</li>
                                    <li>• <strong>rutProveedor</strong>: con o sin puntos/guión</li>
                                    <li>• <strong>nombreProveedor</strong>: texto</li>
                                    <li>• <strong>neto, iva, total</strong>: montos (acepta $ y puntos)</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && parseResult && (
                        <div className="space-y-4">
                            {/* Summary */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-center">
                                    <CheckCircle className="mx-auto text-green-600 mb-2" size={32} />
                                    <p className="text-2xl font-bold text-green-700">{parseResult.data.length}</p>
                                    <p className="text-sm text-green-600">Registros Válidos</p>
                                </div>
                                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-center">
                                    <XCircle className="mx-auto text-red-600 mb-2" size={32} />
                                    <p className="text-2xl font-bold text-red-700">{parseResult.errors.length}</p>
                                    <p className="text-sm text-red-600">Errores</p>
                                </div>
                                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 text-center">
                                    <AlertCircle className="mx-auto text-amber-600 mb-2" size={32} />
                                    <p className="text-2xl font-bold text-amber-700">{parseResult.warnings.length}</p>
                                    <p className="text-sm text-amber-600">Advertencias</p>
                                </div>
                            </div>

                            {/* Errors */}
                            {parseResult.errors.length > 0 && (
                                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 max-h-40 overflow-y-auto">
                                    <h3 className="font-bold text-red-800 mb-2">Errores Encontrados:</h3>
                                    <ul className="text-sm text-red-700 space-y-1">
                                        {parseResult.errors.map((err, i) => (
                                            <li key={i}>
                                                Fila {err.row}, campo <strong>{err.field}</strong>: {err.message}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Preview Table */}
                            {parseResult.data.length > 0 && (
                                <div className="border-2 border-slate-200 rounded-xl overflow-hidden">
                                    <div className="bg-slate-50 px-4 py-2 border-b-2 border-slate-200">
                                        <h3 className="font-bold text-slate-800">Preview (primeras 10 filas)</h3>
                                    </div>
                                    <div className="overflow-x-auto max-h-96">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-100 sticky top-0">
                                                <tr>
                                                    <th className="px-3 py-2 text-left">Fecha</th>
                                                    <th className="px-3 py-2 text-left">Tipo</th>
                                                    <th className="px-3 py-2 text-left">Folio</th>
                                                    <th className="px-3 py-2 text-left">Proveedor</th>
                                                    <th className="px-3 py-2 text-right">Neto</th>
                                                    <th className="px-3 py-2 text-right">Total</th>
                                                    <th className="px-3 py-2 text-left">Clasificación</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {parseResult.data.slice(0, 10).map((invoice, i) => {
                                                    const classification = classifyInvoice(invoice.supplierName);
                                                    return (
                                                        <tr key={i} className="hover:bg-slate-50">
                                                            <td className="px-3 py-2">{invoice.date}</td>
                                                            <td className="px-3 py-2">
                                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">
                                                                    {invoice.documentType}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2">{invoice.folio}</td>
                                                            <td className="px-3 py-2 text-xs">{invoice.supplierName}</td>
                                                            <td className="px-3 py-2 text-right font-mono">{formatCLP(invoice.netAmount)}</td>
                                                            <td className="px-3 py-2 text-right font-mono font-bold">{formatCLP(invoice.totalAmount)}</td>
                                                            <td className="px-3 py-2">
                                                                <span className={`text-xs px-2 py-0.5 rounded ${classification.confidence > 80 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                                    {classification.accountName} ({classification.confidence}%)
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'complete' && (
                        <div className="text-center py-12">
                            <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
                            <h3 className="text-2xl font-bold text-slate-800 mb-2">¡Importación Exitosa!</h3>
                            <p className="text-slate-600 mb-4">
                                Se importaron {parseResult?.data.length} facturas correctamente.
                            </p>
                            <p className="text-sm text-slate-500">
                                Los asientos contables se generarán automáticamente con clasificación inteligente.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t-2 border-slate-200 p-4 flex justify-end gap-2">
                    {step === 'upload' && (
                        <Button variant="secondary" onClick={onClose}>
                            Cancelar
                        </Button>
                    )}
                    {step === 'preview' && (
                        <>
                            <Button variant="secondary" onClick={() => { setStep('upload'); setParseResult(null); }}>
                                Volver
                            </Button>
                            <Button
                                onClick={handleConfirmImport}
                                disabled={!parseResult || parseResult.data.length === 0}
                            >
                                Importar {parseResult?.data.length} Facturas
                            </Button>
                        </>
                    )}
                    {step === 'complete' && (
                        <Button onClick={onClose}>
                            Cerrar
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};
