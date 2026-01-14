import React, { useEffect, useState } from 'react';
import { eventBus, EVENTS } from '../services/eventBus';
import { AppView } from '../types';

interface Notification {
    id: string;
    message: string;
    timestamp: Date;
    type: 'info' | 'success' | 'warning';
    action?: () => void;
}

export const NotificationCenter: React.FC<{ onNavigate: (view: AppView) => void }> = ({ onNavigate }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const addNotification = (msg: string, type: 'info' | 'success' | 'warning' = 'info', action?: () => void) => {
            setNotifications(prev => [{
                id: crypto.randomUUID(),
                message: msg,
                timestamp: new Date(),
                type,
                action
            }, ...prev].slice(0, 50));
            setUnreadCount(c => c + 1);
        };

        // Subscriptions
        const handleBankTx = (tx: any) => addNotification(`Nueva transacción bancaria: ${tx.description}`, 'info', () => onNavigate(AppView.BANK_RECONCILIATION));
        const handleReconciliation = (match: any) => addNotification(`Conciliación automática exitosa ($${match.amount})`, 'success', () => onNavigate(AppView.BANK_RECONCILIATION));
        const handleAnomaly = (a: any) => addNotification(`Anomalía detectada: ${a.description}`, 'warning', () => onNavigate(AppView.DASHBOARD));
        const handleStock = (mov: any) => addNotification(`Movimiento de stock registrado: ${mov.type}`, 'info', () => onNavigate(AppView.INVENTORY));
        const handleLowStock = (alert: any) => addNotification(`ALERTA STOCK: ${alert.productName} (${alert.quantity} un.)`, 'warning', () => onNavigate(AppView.INVENTORY));

        eventBus.on(EVENTS.BANK_TX_CREATED, handleBankTx);
        eventBus.on(EVENTS.RECONCILIATION_COMPLETED, handleReconciliation);
        eventBus.on(EVENTS.ANOMALY_DETECTED, handleAnomaly);
        eventBus.on(EVENTS.STOCK_MOVED, handleStock);
        eventBus.on(EVENTS.LOW_STOCK_DETECTED, handleLowStock);

        return () => {
            eventBus.off(EVENTS.BANK_TX_CREATED, handleBankTx);
            eventBus.off(EVENTS.RECONCILIATION_COMPLETED, handleReconciliation);
            eventBus.off(EVENTS.ANOMALY_DETECTED, handleAnomaly);
            eventBus.off(EVENTS.STOCK_MOVED, handleStock);
            eventBus.off(EVENTS.LOW_STOCK_DETECTED, handleLowStock);
        };
    }, [onNavigate]);

    const toggle = () => {
        setIsOpen(!isOpen);
        if (!isOpen) setUnreadCount(0);
    };

    const handleItemClick = (n: Notification) => {
        if (n.action) {
            n.action();
            setIsOpen(false);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={toggle}
                className="p-2 text-slate-500 hover:text-slate-800 relative transition-colors"
                title="Notificaciones"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden">
                    <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-700 text-sm">Notificaciones del Sistema</h3>
                        <button onClick={() => setNotifications([])} className="text-xs text-slate-400 hover:text-slate-600">
                            Limpiar
                        </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">
                                Sin notificaciones
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {notifications.map(n => (
                                    <div
                                        key={n.id}
                                        onClick={() => handleItemClick(n)}
                                        className={`p-3 hover:bg-slate-50 transition-colors cursor-pointer ${n.action ? 'active:bg-slate-100' : ''}`}
                                    >
                                        <p className={`text-sm ${n.type === 'warning' ? 'text-orange-700 font-medium' :
                                            n.type === 'success' ? 'text-green-700' :
                                                'text-slate-700'
                                            }`}>
                                            {n.message}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {n.timestamp.toLocaleTimeString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
