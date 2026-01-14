import React, { useState } from 'react';
import { Database, Upload, CheckCircle, XCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from './Button';
import { migrationService } from '../services/databaseService';

interface MigrationToolProps {
    onClose: () => void;
}

export const MigrationTool: React.FC<MigrationToolProps> = ({ onClose }) => {
    const [status, setStatus] = useState<'IDLE' | 'MIGRATING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [logs, setLogs] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleMigration = async () => {
        setStatus('MIGRATING');
        setLogs([]);
        setError(null);

        try {
            setLogs(prev => [...prev, '🚀 Iniciando migración...']);

            // Call the service we defined earlier
            const results = await migrationService.migrateFromLocalStorage();

            // Format results for display
            Object.entries(results).forEach(([key, msg]) => {
                setLogs(prev => [...prev, msg]);
            });

            setLogs(prev => [...prev, '✨ Migración completada exitosamente']);
            setStatus('SUCCESS');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error desconocido durante la migración');
            setStatus('ERROR');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in duration-200">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-indigo-100 p-3 rounded-full">
                        <Database className="text-indigo-600" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Migración a Base de Datos</h2>
                        <p className="text-slate-500 text-sm">Transferir datos locales a la nube</p>
                    </div>
                </div>

                {status === 'IDLE' && (
                    <div className="space-y-4">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                            <AlertTriangle className="text-amber-600 shrink-0" />
                            <div className="text-sm text-amber-800">
                                <p className="font-bold mb-1">Antes de comenzar:</p>
                                <p>Esta acción tomará todos tus datos guardados en el navegador (Clientes, Productos, Facturas, etc.) y los copiará a la base de datos segura.</p>
                                <p className="mt-2 text-xs opacity-75">No se borrarán tus datos locales todavía. Es una copia segura.</p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                            <Button onClick={handleMigration}>
                                <Upload size={16} className="mr-2" />
                                Iniciar Migración
                            </Button>
                        </div>
                    </div>
                )}

                {status === 'MIGRATING' && (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <p className="font-medium text-slate-700">Migrando datos...</p>
                        <p className="text-slate-500 text-sm mt-2">Por favor no cierres esta ventana</p>
                    </div>
                )}

                {(status === 'SUCCESS' || status === 'ERROR') && (
                    <div className="space-y-4">
                        <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-green-400 h-64 overflow-y-auto">
                            {logs.map((log, i) => (
                                <div key={i} className="mb-1">{log}</div>
                            ))}
                            {error && <div className="text-red-400 font-bold mt-2">❌ {error}</div>}
                        </div>

                        {status === 'SUCCESS' ? (
                            <div className="flex items-center gap-2 text-emerald-600 font-bold justify-center bg-emerald-50 p-3 rounded-lg">
                                <CheckCircle size={20} />
                                ¡Datos migrados correctamente!
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-rose-600 font-bold justify-center bg-rose-50 p-3 rounded-lg">
                                <XCircle size={20} />
                                Hubo errores en la migración
                            </div>
                        )}

                        <div className="flex justify-end mt-4">
                            <Button onClick={onClose}>
                                Cerrar y Continuar <ArrowRight size={16} className="ml-2" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
