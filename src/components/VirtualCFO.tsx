import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, Sparkles, ChevronDown, RefreshCw } from 'lucide-react';
import { useAccounting } from '../context/AccountingContext';
import { useAuth } from '../context/AuthContext';
import { forecastingService } from '../services/forecastingService';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
    isTyping?: boolean;
}

export const VirtualCFO: React.FC = () => {
    const { user } = useAuth();
    const { journalEntries } = useAccounting();
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            text: `¡Hola ${user?.name || 'Socio'}! Soy tu CFO Virtual. Pregúntame sobre tus ventas, gastos o impuestos.`,
            sender: 'bot',
            timestamp: new Date()
        }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const calculateMetrics = () => {
        const now = new Date();
        const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
        const lastMonthDate = new Date();
        lastMonthDate.setMonth(now.getMonth() - 1);
        const lastMonth = lastMonthDate.toISOString().slice(0, 7);

        // Filter helpers
        const getSum = (type: 'ingreso' | 'egreso', period?: string) =>
            journalEntries
                .filter(e => e.type === type && (!period || e.date.startsWith(period)))
                .reduce((acc, e) => acc + e.total, 0);

        return {
            salesThisMonth: getSum('ingreso', currentMonth),
            expenseThisMonth: getSum('egreso', currentMonth),
            salesLastMonth: getSum('ingreso', lastMonth),
            totalSales: getSum('ingreso'),
            countInvoices: journalEntries.filter(e => e.type === 'egreso' && e.glosa.includes('Fac.')).length
        };
    };

    const processQuery = async (query: string) => {
        setIsTyping(true);
        const lowerQ = query.toLowerCase();
        const metrics = calculateMetrics();
        let response = '';

        // Simulate thinking time
        await new Promise(r => setTimeout(r, 1000));

        // Simple Heuristic "Brain"
        if (lowerQ.includes('venta') || lowerQ.includes('vendi') || lowerQ.includes('ingreso')) {
            response = `Este mes llevas ventas por $${metrics.salesThisMonth.toLocaleString()}. El mes pasado vendiste $${metrics.salesLastMonth.toLocaleString()}. ${metrics.salesThisMonth > metrics.salesLastMonth ? '¡Vamos subiendo! 🚀' : 'Estamos un poco bajo el mes anterior.'}`;
        }
        else if (lowerQ.includes('gasto') || lowerQ.includes('compra') || lowerQ.includes('egreso')) {
            response = `Tus gastos registrados este mes suman $${metrics.expenseThisMonth.toLocaleString()}. Tienes ${metrics.countInvoices} facturas de compra procesadas.`;
        }
        else if (lowerQ.includes('iva') || lowerQ.includes('impuesto')) {
            const ivaDebito = Math.round(metrics.salesThisMonth * 0.19 / 1.19);
            const ivaCredito = Math.round(metrics.expenseThisMonth * 0.19 / 1.19); // Approx
            const aPagar = Math.max(0, ivaDebito - ivaCredito);
            response = `Estimación rápida de IVA (F29):\n(+) Débito: $${ivaDebito.toLocaleString()}\n(-) Crédito: $${ivaCredito.toLocaleString()}\n(=) A Pagar: $${aPagar.toLocaleString()}`;
        }
        else if (lowerQ.includes('margen') || lowerQ.includes('ganancia') || lowerQ.includes('rentabilidad')) {
            const margin = metrics.salesThisMonth - metrics.expenseThisMonth;
            response = `Tu margen operacional este mes es de $${margin.toLocaleString()}. ${(margin > 0) ? '¡Estás en verde!' : 'Cuidado, gastos superan ingresos.'}`;
        }
        else if (lowerQ.includes('proyeccion') || lowerQ.includes('prediccion') || lowerQ.includes('futuro') || lowerQ.includes('proximo mes')) {
            response = "Analizando tendencias históricas... 🔮";
            // Artificial sequence for effect
            setMessages(prev => [...prev, { id: crypto.randomUUID(), text: response, sender: 'bot', timestamp: new Date() }]);
            await new Promise(r => setTimeout(r, 1500));

            const prediction = await forecastingService.predictNextMonth();
            response = `📊 PROYECCIÓN (Mes Siguiente):\n\nBase: Regresión Lineal\n\n• Ventas Esperadas: $${prediction.nextMonthSales.toLocaleString()} (${prediction.trend === 'UP' ? 'Tendencia al Alza 📈' : 'Tendencia a la Baja 📉'})\n• Gastos Esperados: $${prediction.nextMonthExpenses.toLocaleString()}\n\nConfianza del modelo: ${(prediction.confidence * 100).toFixed(0)}%`;
        }
        else if (lowerQ === 'setup subscription') {
            // Debug / Seed
            const { subscriptionsService } = await import('../services/databaseService');
            await subscriptionsService.create({
                id: crypto.randomUUID(),
                customerId: 'DEMO-CLIENT-123',
                customerName: 'Cliente Demo Recurrente',
                items: [{ id: '1', productId: 'p1', productName: 'Servicio Mensual Base', quantity: 1, price: 50000, discount: 0, totalNet: 50000 }],
                cycle: 'MONTHLY',
                nextBillingDate: new Date().toISOString().split('T')[0], // Today
                isActive: true,
                autoIssue: true,
                createdAt: new Date().toISOString()
            });
            response = "✅ Suscripción Demo creada para HOY. Reinicia la app o espera al ciclo del reactor para ver la factura generada.";
        }
        else if (lowerQ.includes('hola') || lowerQ.includes('saludo')) {
            response = "¡Hola! Soy tu CFO Virtual con IA Predictiva. Pregúntame '¿Cuánto venderé el próximo mes?' o sobre tus finanzas actuales.";
        }
        else {
            response = "Aún estoy aprendiendo. Por ahora puedo responderte sobre: Ventas, Gastos, Margen, IVA y Proyecciones Futuras.";
        }

        const botMsg: Message = {
            id: crypto.randomUUID(),
            text: response,
            sender: 'bot',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, botMsg]);
        setIsTyping(false);
    };

    const handleSend = () => {
        if (!input.trim()) return;

        const userMsg: Message = {
            id: crypto.randomUUID(),
            text: input,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        processQuery(input);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSend();
    };

    return (
        <>
            {/* Floating Action Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 h-14 w-14 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full shadow-lg flex items-center justify-center hover:shadow-xl hover:scale-110 transition-all z-50 group"
                >
                    <Bot className="text-white h-7 w-7 group-hover:rotate-12 transition-transform" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                    </span>
                </button>
            )}

            {/* Chat Interface */}
            <div className={`fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-300 z-50 ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-10 pointer-events-none'}`}>

                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 shrink-0 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">CFO Virtual AI</h3>
                            <p className="text-[10px] text-indigo-100 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span> En línea
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded transition-colors">
                        <ChevronDown size={20} />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-grow p-4 overflow-y-auto space-y-4 bg-slate-50">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div
                                className={`max-w-[80%] p-3 rounded-2xl text-sm whitespace-pre-wrap shadow-sm ${msg.sender === 'user'
                                    ? 'bg-blue-600 text-white rounded-br-none'
                                    : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'
                                    }`}
                            >
                                {msg.text}
                                <div className={`text-[10px] mt-1 text-right ${msg.sender === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-white p-3 rounded-2xl rounded-bl-none border border-slate-100 shadow-sm flex gap-1">
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-3 bg-white border-t border-slate-100 shrink-0">
                    <div className="flex items-center gap-2 bg-slate-100 rounded-full px-4 py-2 border border-slate-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Pregunta algo (ej: 'cuanto vendi?')"
                            className="flex-grow bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim()}
                            className="text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                    <div className="text-[10px] text-center text-slate-400 mt-2">
                        IA en Entrenamiento Beta v1.0
                    </div>
                </div>
            </div>
        </>
    );
};
