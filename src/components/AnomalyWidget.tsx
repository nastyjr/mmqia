import React, { useEffect, useState } from 'react';
import { Anomaly, anomalyDetector } from '../services/anomalyDetector';
import { eventBus, EVENTS } from '../services/eventBus';

export const AnomalyWidget: React.FC = () => {
    const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Initial Load
        loadAnomalies();

        // Subscribe to real-time events
        const handleNewAnomaly = (anomaly: Anomaly) => {
            setAnomalies(prev => [anomaly, ...prev]);
        };

        eventBus.on(EVENTS.ANOMALY_DETECTED, handleNewAnomaly);

        return () => {
            eventBus.off(EVENTS.ANOMALY_DETECTED, handleNewAnomaly);
        };
    }, []);

    const loadAnomalies = async () => {
        // In a real app, we might fetch from DB (Alerts Table).
        // For now, we manually trigger detection to see current state.
        setLoading(true);
        try {
            const detected = await anomalyDetector.detectAnomalies();
            setAnomalies(detected);
        } finally {
            setLoading(false);
        }
    };

    const handleDismiss = (id: string) => {
        setAnomalies(prev => prev.filter(a => a.id !== id));
    };

    if (anomalies.length === 0 && !loading) return null; // Hide if clean

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-xl">⚡</span>
                    Anomalías Detectadas
                </h2>
                <button
                    onClick={loadAnomalies}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                    {loading ? 'Analizando...' : 'Ejecutar Diagnóstico'}
                </button>
            </div>

            <div className="space-y-3">
                {anomalies.map(anomaly => (
                    <div
                        key={anomaly.id}
                        className={`p-4 rounded-lg border-l-4 flex justify-between items-start gap-4 ${anomaly.severity === 'CRITICAL' ? 'bg-red-50 border-red-500' :
                                anomaly.severity === 'HIGH' ? 'bg-orange-50 border-orange-500' :
                                    'bg-yellow-50 border-yellow-400'
                            }`}
                    >
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${anomaly.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                                        anomaly.severity === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                                            'bg-yellow-100 text-yellow-800'
                                    }`}>
                                    {anomaly.severity}
                                </span>
                                <span className="text-sm text-slate-500">
                                    {new Date(anomaly.detectedAt).toLocaleTimeString()}
                                </span>
                            </div>
                            <h3 className="font-semibold text-slate-800 text-sm">{anomaly.description}</h3>
                            <p className="text-xs text-slate-600 mt-1">{anomaly.details}</p>

                            {anomaly.suggestions && (
                                <div className="mt-2 text-xs text-slate-500">
                                    <strong>Sugerencias:</strong>
                                    <ul className="list-disc list-inside mt-0.5 ml-1">
                                        {anomaly.suggestions.slice(0, 2).map((s, i) => (
                                            <li key={i}>{s}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => handleDismiss(anomaly.id)}
                            className="text-slate-400 hover:text-slate-600"
                            title="Descartar"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
