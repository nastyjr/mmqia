import React, { useState, useRef } from 'react';
import { Download, Upload, Database, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { downloadBackup, restoreBackup, BackupData, getBackupInfo } from '../utils/backupRestore';
import { Button } from './Button';

export const BackupRestoreModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
}> = ({ isOpen, onClose }) => {
    const [isRestoring, setIsRestoring] = useState(false);
    const [restoreStatus, setRestoreStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleDownloadBackup = () => {
        try {
            downloadBackup();
            alert('✅ Backup descargado exitosamente');
        } catch (error) {
            alert('❌ Error al crear backup');
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsRestoring(true);
        setRestoreStatus('idle');
        setErrorMessage('');

        try {
            await restoreBackup(file);
            setRestoreStatus('success');
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error) {
            setRestoreStatus('error');
            setErrorMessage(error instanceof Error ? error.message : 'Error desconocido');
            setIsRestoring(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-xl">
                            <Database className="text-blue-600" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Backup & Restore</h2>
                            <p className="text-sm text-slate-500">Gestión completa de datos</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X className="text-slate-600" />
                    </button>
                </div>

                {/* Download Backup Section */}
                <div className="mb-6 p-6 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
                    <div className="flex items-start gap-4">
                        <Download className="text-emerald-600 flex-shrink-0 mt-1" size={20} />
                        <div className="flex-grow">
                            <h3 className="font-bold text-emerald-900 mb-2">Descargar Backup Completo</h3>
                            <p className="text-sm text-emerald-800 mb-4">
                                Exporta todos tus datos: asientos contables, inventario, CRM, presupuestos, cierres de período y más en un archivo JSON.
                            </p>
                            <Button onClick={handleDownloadBackup}>
                                <Download size={16} className="mr-2" />
                                Descargar Backup Ahora
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Restore Backup Section */}
                <div className="p-6 bg-amber-50 border-2 border-amber-200 rounded-xl">
                    <div className="flex items-start gap-4">
                        <Upload className="text-amber-600 flex-shrink-0 mt-1" size={20} />
                        <div className="flex-grow">
                            <h3 className="font-bold text-amber-900 mb-2">Restaurar desde Backup</h3>
                            <p className="text-sm text-amber-800 mb-4">
                                ⚠️ <strong>Advertencia:</strong> Esto reemplazará TODOS los datos actuales con los del archivo backup. La acción no se puede deshacer.
                            </p>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                onChange={handleFileSelect}
                                className="hidden"
                            />

                            <Button
                                variant="secondary"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isRestoring}
                            >
                                <Upload size={16} className="mr-2" />
                                {isRestoring ? 'Restaurando...' : 'Seleccionar Archivo Backup'}
                            </Button>

                            {restoreStatus === 'success' && (
                                <div className="mt-4 p-3 bg-emerald-100 border border-emerald-300 rounded-lg flex items-center gap-2 text-emerald-800">
                                    <CheckCircle2 size={16} />
                                    <span className="text-sm font-medium">✅ Backup restaurado. Recargando página...</span>
                                </div>
                            )}

                            {restoreStatus === 'error' && (
                                <div className="mt-4 p-3 bg-rose-100 border border-rose-300 rounded-lg flex items-start gap-2 text-rose-800">
                                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-medium">❌ Error al restaurar backup</p>
                                        <p className="mt-1">{errorMessage}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Info Alert */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex gap-3">
                        <AlertCircle className="text-blue-600 flex-shrink-0" size={16} />
                        <div className="text-xs text-blue-900">
                            <p className="font-bold mb-1">💡 Recomendaciones:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Descarga backups regularmente (diario, semanal, mensual)</li>
                                <li>Guarda los archivos en un lugar seguro (nube, disco externo)</li>
                                <li>Verifica que el backup se descargó correctamente antes de hacer cambios importantes</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
