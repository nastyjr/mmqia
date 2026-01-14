/**
 * ERP AI Assistant Service
 * "Brain" of the operation that understands natural language and controls the ERP.
 */

import { productsService } from './databaseService';
import { getGeminiResponse } from './geminiService';
import { Type } from '@google/genai';
// Import other services as needed: invoicing, inventory, etc.

export interface AIMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    action?: AIAction; // If the message carries an executable action
}

export interface AIAction {
    type: 'NAVIGATE' | 'EXECUTE_FUNCTION' | 'SHOW_DATA';
    payload: any;
    label: string;
}

export interface Intent {
    name: string;
    confidence: number;
    parameters: Record<string, any>;
}

class AIAssistantService {

    /**
     * Process a user message and return a response
     */
    async processMessage(message: string): Promise<AIMessage> {
        const lowerMsg = message.toLowerCase();

        let responseContent = "Lo siento, no entendí eso. ¿Podrías reformularlo?";
        let action: AIAction | undefined;

        if (!import.meta.env.VITE_GEMINI_API_KEY) {
            return this.fallbackRegexConfig(lowerMsg);
        }

        try {
            // Use Gemini to understand intent
            const prompt = `
            You are an ERP AI Assistant. Analyze the user's message and extract the intent and parameters.
            
            Available Actions:
            - NAVIGATE: Go to a specific page (payload: url)
                - /sales: for invoices, sales, ventas
                - /inventory: for stock, products, inventario
                - /banking: for bank, conciliacion, banco
                - /tax-radar: for taxes, sii, impuestos, radar
                - /reports: for reports, informes, kpi
                - /pos: for new invoice, create invoice, crear factura
            - QUERY_DATA: Ask for specific data (sales, stock, overdue)
                - sales_summary: "how much sold today/yesterday/month" (param: period)
                - product_stock: "stock of [product]" (param: product_name)
                - overdue_invoices: "unpaid invoices", "vencidas"
            - EXECUTE: Run specific function
                - RUN_DEPRECIATION: "depreciate assets", "corrección monetaria"
            - CHAT: General conversation or if no other intent matches clearly.

            User Message: "${message}"

            Return JSON with structure:
            {
                "intent": "NAVIGATE" | "QUERY_DATA" | "EXECUTE" | "CHAT",
                "payload": "url or function_name or query_type",
                "parameters": { ... },
                "response_text": "A natural language response in Spanish describing what you are doing"
            }
            `;

            const aiResponse = await getGeminiResponse(prompt, {
                type: Type.OBJECT,
                properties: {
                    intent: { type: Type.STRING },
                    payload: { type: Type.STRING },
                    parameters: { type: Type.OBJECT },
                    response_text: { type: Type.STRING }
                }
            });

            if (!aiResponse) return this.fallbackRegexConfig(lowerMsg);

            responseContent = aiResponse.response_text;

            if (aiResponse.intent === 'NAVIGATE') {
                action = { type: 'NAVIGATE', payload: aiResponse.payload, label: 'Ir Ahora' };
            } else if (aiResponse.intent === 'EXECUTE') {
                action = { type: 'EXECUTE_FUNCTION', payload: aiResponse.payload, label: 'Ejecutar' };
            } else if (aiResponse.intent === 'QUERY_DATA') {
                // Handle data queries
                if (aiResponse.payload === 'sales_summary') {
                    const period = aiResponse.parameters.period || 'today';
                    const sales = await this.getSalesSummary(period);
                    responseContent = `Las ventas de ${period === 'today' ? 'hoy' : period === 'yesterday' ? 'ayer' : 'este mes'} suman $${sales.total.toLocaleString('es-CL')}. (${sales.count} documentos)`;
                } else if (aiResponse.payload === 'product_stock') {
                    const product = aiResponse.parameters.product_name;
                    const stock = await this.getProductStock(product);
                    if (stock !== null) {
                        responseContent = `El stock actual de "${product}" es de ${stock} unidades.`;
                    } else {
                        responseContent = `No pude encontrar un producto llamado "${product}".`;
                    }
                } else if (aiResponse.payload === 'overdue_invoices') {
                    const overdue = await this.getOverdueInvoices();
                    responseContent = `Hay ${overdue.count} facturas vencidas por $${overdue.total.toLocaleString('es-CL')}.`;
                    action = { type: 'NAVIGATE', payload: '/sales?filter=overdue', label: 'Ver Vencidas' };
                }
            }

        } catch (error) {
            console.error("AI Error:", error);
            // Fallback to regex if AI fails
            return this.fallbackRegexConfig(lowerMsg);
        }

        return {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: responseContent,
            timestamp: new Date().toISOString(),
            action
        };
    }


    /**
     * Legacy Regex Logic for Fallback or when no API Key
     */
    private async fallbackRegexConfig(lowerMsg: string): Promise<AIMessage> {
        let responseContent = "Lo siento, no entendí eso. ¿Podrías reformularlo?";
        let action: AIAction | undefined;

        if (lowerMsg.includes('ir a') || lowerMsg.includes('mostrar') || lowerMsg.includes('ver')) {
            if (lowerMsg.includes('facturas') || lowerMsg.includes('ventas')) {
                responseContent = "Navegando al historial de facturas y ventas.";
                action = { type: 'NAVIGATE', payload: '/sales', label: 'Ir a Ventas' };
            } else if (lowerMsg.includes('inventario') || lowerMsg.includes('productos')) {
                responseContent = "Abriendo el inventario.";
                action = { type: 'NAVIGATE', payload: '/inventory', label: 'Ir a Inventario' };
            } else if (lowerMsg.includes('banco') || lowerMsg.includes('conciliacion')) {
                responseContent = "Vamos a la conciliación bancaria.";
                action = { type: 'NAVIGATE', payload: '/banking', label: 'Ir a Banco' };
            }
        }

        else if (lowerMsg.includes('hola')) {
            responseContent = "¡Hola! Soy tu asistente ERP (Modo Básico). Configura la API Key para más inteligencia.";
        }

        return {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: responseContent,
            timestamp: new Date().toISOString(),
            action
        };
    }

    // --- Helper Methods to interface with Data ---

    private async getSalesSummary(period: 'today' | 'yesterday' | 'month'): Promise<{ total: number, count: number }> {
        // Mock implementation - replace with actual DB calls
        const invoices = JSON.parse(localStorage.getItem('invoicing_db') || '[]');
        const now = new Date();

        let filtered = [];

        if (period === 'today') {
            const dateStr = now.toISOString().split('T')[0];
            filtered = invoices.filter((i: any) => i.date.startsWith(dateStr));
        } else if (period === 'yesterday') {
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            const dateStr = yesterday.toISOString().split('T')[0];
            filtered = invoices.filter((i: any) => i.date.startsWith(dateStr));
        } else {
            const monthStr = now.toISOString().substring(0, 7); // YYYY-MM
            filtered = invoices.filter((i: any) => i.date.startsWith(monthStr));
        }

        const total = filtered.reduce((sum: number, i: any) => sum + (parseInt(i.total) || 0), 0);
        return { total, count: filtered.length };
    }

    private async getProductStock(keyword: string): Promise<number | null> {
        const products = await productsService.getAll();
        // Fuzzy search logic could go here
        const product = products.find((p: any) => p.name.toLowerCase().includes(keyword.toLowerCase()));

        if (product) return product.currentStock || 0;
        return null; // Not found
    }

    private async getOverdueInvoices(): Promise<{ total: number, count: number }> {
        const invoices = JSON.parse(localStorage.getItem('invoicing_db') || '[]');
        const now = new Date();

        const overdue = invoices.filter((i: any) => {
            if (i.status === 'PAID') return false;
            // Default due date = date + 30 days if not set
            const issueDate = new Date(i.date);
            const dueDate = i.dueDate ? new Date(i.dueDate) : new Date(issueDate.setDate(issueDate.getDate() + 30));
            return dueDate < now;
        });

        const total = overdue.reduce((sum: number, i: any) => sum + (parseInt(i.total) || 0), 0);
        return { total, count: overdue.length };
    }
}

export const aiAssistant = new AIAssistantService();
