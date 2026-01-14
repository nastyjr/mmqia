import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Mic, Sparkles, ChevronDown, Zap } from 'lucide-react';
import { aiAssistant, AIMessage } from '../services/aiAssistantService';
import { useNavigate } from 'react-router-dom';

// Simple types for props
interface AIAssistantWidgetProps {
    isOpen?: boolean; // Can be controlled externally if needed
}

export const AIAssistantWidget: React.FC<AIAssistantWidgetProps> = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<AIMessage[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: '👋 Hola, soy tu Asistente ERP Inteligente. ¿Qué necesitas saber o hacer hoy?',
            timestamp: new Date().toISOString()
        }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);

    // For auto-scrolling
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Hooks
    // In a real app, you'd use useLocation() to maybe give context to the AI
    // const location = useLocation(); 

    const toggleOpen = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            // Focus input shortly after opening
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: AIMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: input,
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsThinking(true);

        try {
            // Simulate a bit of "thinking" time for realism if response is instantaneous
            await new Promise(resolve => setTimeout(resolve, 600));

            const response = await aiAssistant.processMessage(userMsg.content);
            setMessages(prev => [...prev, response]);

            // If the AI returned an action, we might want to "auto-execute" or show a button
            // For now, let's just handle it in the UI rendering
        } catch (error) {
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: 'Lo siento, tuve un error procesando tu solicitud.',
                timestamp: new Date().toISOString()
            }]);
        } finally {
            setIsThinking(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    // Quick suggestions
    const suggestions = [
        "Ventas de hoy", "Facturas vencidas", "Stock bajo", "Ir a contabilidad"
    ];

    return (
        <>
            {/* Floating Button */}
            {!isOpen && (
                <button
                    onClick={toggleOpen}
                    className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50 flex items-center gap-2 group hover:scale-105"
                >
                    <Sparkles size={24} className="animate-pulse" />
                    <span className="font-semibold max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 whitespace-nowrap">
                        Asistente IA
                    </span>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className={`fixed bottom-6 right-6 w-96 bg-white rounded-2xl shadow-2xl z-50 border border-gray-100 flex flex-col transition-all duration-300 ${isMinimized ? 'h-16' : 'h-[600px]'}`}>

                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-t-2xl flex justify-between items-center text-white cursor-pointer"
                        onClick={() => setIsMinimized(!isMinimized)}
                    >
                        <div className="flex items-center gap-2">
                            <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
                                <Sparkles size={18} />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">ERP Assistant</h3>
                                {!isMinimized && <p className="text-xs text-blue-100 flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> Online</p>}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="hover:bg-white/20 p-1 rounded">
                                <ChevronDown size={18} className={`transition-transform ${isMinimized ? 'rotate-180' : ''}`} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="hover:bg-white/20 p-1 rounded">
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {!isMinimized && (
                        <>
                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                                {messages.map((msg) => (
                                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${msg.role === 'user'
                                                ? 'bg-blue-600 text-white rounded-tr-none'
                                                : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                                            }`}>
                                            <p className="text-sm leading-relaxed">{msg.content}</p>

                                            {/* Action Button if present */}
                                            {msg.action && (
                                                <div className="mt-3 pt-2 border-t border-gray-100/20">
                                                    <button className="text-xs font-bold flex items-center gap-1 bg-black/10 hover:bg-black/20 px-3 py-1.5 rounded-lg w-full justify-center transition-colors">
                                                        <Zap size={12} />
                                                        {msg.action.label}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {isThinking && (
                                    <div className="flex justify-start">
                                        <div className="bg-white border p-3 rounded-2xl rounded-tl-none flex gap-1 items-center">
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></span>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Suggestions (only if empty input) */}
                            {input === '' && messages.length < 4 && (
                                <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar">
                                    {suggestions.map((s, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setInput(s)}
                                            className="whitespace-nowrap text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-full border border-gray-200 transition-colors"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Input Area */}
                            <div className="p-3 bg-white border-t border-gray-100">
                                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-2 border border-gray-200 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Escribe tu consulta..."
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-3 px-2 text-gray-700 placeholder-gray-400"
                                    />
                                    <button
                                        className={`p-2 rounded-lg transition-all ${input.trim() ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-300'}`}
                                        onClick={handleSend}
                                        disabled={!input.trim()}
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                                <div className="text-center mt-1">
                                    <p className="text-[10px] text-gray-400">Powered by Cognitive ERP Model v1.0</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </>
    );
};
