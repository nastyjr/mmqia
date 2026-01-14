/**
 * Email Webhook Service
 * Generates mailto: links and webhook payloads for email automation
 */

export interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    body: string;
    variables: string[]; // e.g., ['customerName', 'amount', 'dueDate']
}

export interface EmailWebhook {
    to: string;
    subject: string;
    body: string;
    priority: 'LOW' | 'NORMAL' | 'HIGH';
    scheduledFor?: string; // ISO timestamp
    template?: string;
    data?: Record<string, any>;
}

class EmailWebhookService {
    private readonly TEMPLATES_KEY = 'email_templates';
    private readonly QUEUE_KEY = 'email_queue';

    /**
     * Initialize default templates
     */
    initializeDefaultTemplates(): void {
        const existing = this.getTemplates();
        if (existing.length > 0) return;

        const templates: EmailTemplate[] = [
            {
                id: 'payment_reminder',
                name: 'Recordatorio de Pago',
                subject: 'Recordatorio: Factura {{invoiceNumber}} vence {{daysUntilDue}}',
                body: `Estimado/a {{customerName}},

Le recordamos que la factura {{invoiceNumber}} por un monto de {{amount}} tiene fecha de vencimiento el {{dueDate}}.

{{#if daysOverdue}}
Esta factura está vencida hace {{daysOverdue}} días.
{{else}}
Quedan {{daysUntilDue}} días para el vencimiento.
{{/if}}

Por favor, proceda con el pago a la brevedad.

Saludos cordiales,
{{companyName}}`,
                variables: ['customerName', 'invoiceNumber', 'amount', 'dueDate', 'daysUntilDue', 'daysOverdue', 'companyName']
            },
            {
                id: 'po_confirmation',
                name: 'Confirmación Orden de Compra',
                subject: 'Orden de Compra {{orderNumber}} - {{companyName}}',
                body: `Estimado proveedor {{supplierName}},

Adjunto enviamos la Orden de Compra {{orderNumber}} con fecha {{orderDate}}.

Detalle:
{{items}}

Total: {{total}}

Fecha esperada de entrega: {{expectedDate}}

Favor confirmar recepción.

Saludos,
{{companyName}}`,
                variables: ['supplierName', 'orderNumber', 'orderDate', 'items', 'total', 'expectedDate', 'companyName']
            },
            {
                id: 'executive_report',
                name: 'Reporte Ejecutivo',
                subject: 'Reporte Ejecutivo - {{period}}',
                body: `Estimado/a,

Adjunto el reporte ejecutivo del período {{period}}.

Resumen:
- Ingresos: {{revenue}}
- Gastos: {{expenses}}
- Utilidad Neta: {{netProfit}}
- Margen: {{profitMargin}}%

Estado: {{status}}

El reporte completo está disponible en el sistema.

Saludos,
Sistema ERP`,
                variables: ['period', 'revenue', 'expenses', 'netProfit', 'profitMargin', 'status']
            },
            {
                id: 'anomaly_alert',
                name: 'Alerta de Anomalía',
                subject: '⚠️ Alerta: {{anomalyType}}',
                body: `Se ha detectado una anomalía en el sistema:

Tipo: {{anomalyType}}
Severidad: {{severity}}
Descripción: {{description}}

Detalles:
{{details}}

Recomendaciones:
{{suggestions}}

Por favor, revise a la brevedad.

Sistema ERP Automático`,
                variables: ['anomalyType', 'severity', 'description', 'details', 'suggestions']
            }
        ];

        localStorage.setItem(this.TEMPLATES_KEY, JSON.stringify(templates));
    }

    /**
     * Get all templates
     */
    getTemplates(): EmailTemplate[] {
        try {
            const data = localStorage.getItem(this.TEMPLATES_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    /**
     * Render template with data
     */
    renderTemplate(templateId: string, data: Record<string, any>): { subject: string; body: string } {
        const templates = this.getTemplates();
        const template = templates.find(t => t.id === templateId);

        if (!template) {
            throw new Error(`Template ${templateId} not found`);
        }

        let subject = template.subject;
        let body = template.body;

        // Simple variable replacement
        Object.entries(data).forEach(([key, value]) => {
            const placeholder = `{{${key}}}`;
            subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
            body = body.replace(new RegExp(placeholder, 'g'), String(value));
        });

        // Handle conditionals (basic {{#if}} support)
        body = this.processConditionals(body, data);

        return { subject, body };
    }

    /**
     * Process simple conditionals
     */
    private processConditionals(text: string, data: Record<string, any>): string {
        const ifRegex = /{{#if (\w+)}}([\s\S]*?){{else}}([\s\S]*?){{\/if}}/g;

        return text.replace(ifRegex, (match, variable, trueBranch, falseBranch) => {
            return data[variable] ? trueBranch : falseBranch;
        });
    }

    /**
     * Generate mailto: link
     */
    generateMailtoLink(webhook: EmailWebhook): string {
        const subject = encodeURIComponent(webhook.subject);
        const body = encodeURIComponent(webhook.body);

        return `mailto:${webhook.to}?subject=${subject}&body=${body}`;
    }

    /**
     * Open email client
     */
    openEmailClient(webhook: EmailWebhook): void {
        const mailtoLink = this.generateMailtoLink(webhook);
        window.open(mailtoLink);
    }

    /**
     * Queue email for later
     */
    queueEmail(webhook: EmailWebhook): void {
        const queue = this.getEmailQueue();
        queue.push({
            ...webhook,
            id: crypto.randomUUID(),
            queuedAt: new Date().toISOString(),
            status: 'QUEUED'
        });

        localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
    }

    /**
     * Get email queue
     */
    getEmailQueue(): any[] {
        try {
            const data = localStorage.getItem(this.QUEUE_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    /**
     * Send payment reminder
     */
    sendPaymentReminder(invoice: any): void {
        const daysOverdue = this.calculateDaysOverdue(invoice.dueDate);
        const daysUntilDue = -daysOverdue;

        const { subject, body } = this.renderTemplate('payment_reminder', {
            customerName: invoice.customerName,
            invoiceNumber: invoice.folio,
            amount: `$${invoice.total.toLocaleString('es-CL')}`,
            dueDate: invoice.dueDate,
            daysUntilDue: daysUntilDue > 0 ? `${daysUntilDue} días` : '',
            daysOverdue: daysOverdue > 0 ? daysOverdue : '',
            companyName: 'Mi Empresa'
        });

        const webhook: EmailWebhook = {
            to: invoice.customerEmail || 'cliente@example.com',
            subject,
            body,
            priority: daysOverdue > 0 ? 'HIGH' : 'NORMAL'
        };

        this.openEmailClient(webhook);
    }

    /**
     * Send purchase order confirmation
     */
    sendPOConfirmation(order: any): void {
        const itemsList = order.items
            .map((item: any) => `- ${item.productName}: ${item.quantity} x $${item.unitCost.toLocaleString('es-CL')}`)
            .join('\n');

        const { subject, body } = this.renderTemplate('po_confirmation', {
            supplierName: order.supplierName,
            orderNumber: order.orderNumber,
            orderDate: order.date,
            items: itemsList,
            total: `$${order.total.toLocaleString('es-CL')}`,
            expectedDate: order.expectedDate,
            companyName: 'Mi Empresa'
        });

        const webhook: EmailWebhook = {
            to: order.supplierEmail || 'proveedor@example.com',
            subject,
            body,
            priority: 'NORMAL'
        };

        this.openEmailClient(webhook);
    }

    /**
     * Send anomaly alert
     */
    sendAnomalyAlert(anomaly: any, recipients: string[]): void {
        const { subject, body } = this.renderTemplate('anomaly_alert', {
            anomalyType: anomaly.type,
            severity: anomaly.severity,
            description: anomaly.description,
            details: anomaly.details,
            suggestions: anomaly.suggestions?.join('\n- ') || 'Ninguna'
        });

        recipients.forEach(recipient => {
            const webhook: EmailWebhook = {
                to: recipient,
                subject,
                body,
                priority: anomaly.severity === 'CRITICAL' ? 'HIGH' : 'NORMAL'
            };

            this.queueEmail(webhook);
        });
    }

    /**
     * Calculate days overdue
     */
    private calculateDaysOverdue(dueDate: string): number {
        const due = new Date(dueDate);
        const today = new Date();
        const diff = today.getTime() - due.getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    /**
     * Process queued emails
     */
    processQueue(): number {
        const queue = this.getEmailQueue();
        const pending = queue.filter((email: any) => email.status === 'QUEUED');

        let processed = 0;
        pending.forEach((email: any) => {
            // In a real system, this would send via API
            // For now, we just mark as sent
            email.status = 'SENT';
            email.sentAt = new Date().toISOString();
            processed++;
        });

        localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
        return processed;
    }
}

export const emailWebhookService = new EmailWebhookService();

// Initialize templates
emailWebhookService.initializeDefaultTemplates();
