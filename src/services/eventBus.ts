type EventHandler = (payload: any) => void | Promise<void>;

class EventBus {
    private listeners: { [event: string]: EventHandler[] } = {};

    on(event: string, handler: EventHandler) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(handler);
    }

    off(event: string, handler: EventHandler) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(h => h !== handler);
    }

    emit(event: string, payload: any) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(handler => {
            try {
                handler(payload);
            } catch (error) {
                console.error(`Error in event handler for ${event}:`, error);
            }
        });
    }
}

export const eventBus = new EventBus();

// Known Events
export const EVENTS = {
    BANK_TX_CREATED: 'BANK_TX_CREATED',
    JOURNAL_ENTRY_CREATED: 'JOURNAL_ENTRY_CREATED',
    STOCK_MOVED: 'STOCK_MOVED',
    INVOICE_CREATED: 'INVOICE_CREATED',
    ANOMALY_DETECTED: 'ANOMALY_DETECTED',
    RECONCILIATION_COMPLETED: 'RECONCILIATION_COMPLETED',
    LOW_STOCK_DETECTED: 'LOW_STOCK_DETECTED'
};
