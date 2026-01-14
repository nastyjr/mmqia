import { eventBus, EVENTS } from '../eventBus';
import { anomalyDetector } from '../anomalyDetector';

export const initAnomalyReactor = () => {
    eventBus.on(EVENTS.JOURNAL_ENTRY_CREATED, async (entry: any) => {
        console.log('⚡ Reactor: New Journal Entry detected. Checking for anomalies...', entry.id);

        try {
            const anomalies = await anomalyDetector.detectAnomalies();

            if (anomalies.length > 0) {
                console.warn(`⚡ Reactor: ${anomalies.length} Anomalies detected!`);
                anomalies.forEach(a => {
                    if (a.entityId === entry.id || a.severity === 'CRITICAL') {
                        console.warn(`🚨 ANOMALY ALERT: ${a.description} (${a.severity})`);
                        // Emit event for UI Widget
                        eventBus.emit(EVENTS.ANOMALY_DETECTED, a);
                    }
                });
            }
        } catch (error) {
            console.error('⚡ Reactor Error (Anomaly):', error);
        }
    });
};
