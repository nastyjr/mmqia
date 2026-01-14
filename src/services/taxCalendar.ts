/**
 * Chilean Tax Calendar & Reminder System
 * Manages tax obligations and sends reminders
 */

export interface TaxObligation {
    id: string;
    name: string;
    description: string;
    type: 'monthly' | 'annual' | 'quarterly';
    dueDay: number; // Day of month (for monthly) or specific date
    dueMonth?: number; // For annual/quarterly
    category: 'IVA' | 'RENTA' | 'RETENCIONES' | 'OTROS';
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    url?: string; // Link to SII form
}

export interface TaxReminder {
    obligation: TaxObligation;
    dueDate: string; // YYYY-MM-DD
    daysRemaining: number;
    urgency: 'OVERDUE' | 'URGENT' | 'SOON' | 'UPCOMING';
}

// Chilean Tax Obligations Calendar
const CHILEAN_TAX_OBLIGATIONS: TaxObligation[] = [
    {
        id: 'f29',
        name: 'Formulario 29',
        description: 'Declaración mensual IVA y PPM',
        type: 'monthly',
        dueDay: 12,
        category: 'IVA',
        priority: 'HIGH',
        url: 'https://misiir.sii.cl/'
    },
    {
        id: 'f50',
        name: 'Formulario 50',
        description: 'Certificados de Renta para trabajadores',
        type: 'annual',
        dueDay: 15,
        dueMonth: 3, // Marzo
        category: 'RENTA',
        priority: 'HIGH'
    },
    {
        id: 'renta',
        name: 'Declaración de Renta',
        description: 'Declaración anual Impuesto a la Renta',
        type: 'annual',
        dueDay: 30,
        dueMonth: 4, // Abril
        category: 'RENTA',
        priority: 'HIGH',
        url: 'https://www.sii.cl/servicios_online/1039-declaracion_renta.html'
    },
    {
        id: 'f1887',
        name: 'Formulario 1887',
        description: 'Donaciones (si aplica)',
        type: 'annual',
        dueDay: 30,
        dueMonth: 4,
        category: 'OTROS',
        priority: 'LOW'
    },
    {
        id: 'iet',
        name: 'IET - Impuesto Electrónico',
        description: 'Declaración electrónica mensual',
        type: 'monthly',
        dueDay: 20,
        category: 'RETENCIONES',
        priority: 'MEDIUM'
    },
    {
        id: 'patent',
        name: 'Patente Municipal',
        description: 'Pago anual patente comercial',
        type: 'annual',
        dueDay: 31,
        dueMonth: 1, // Enero
        category: 'OTROS',
        priority: 'MEDIUM'
    }
];

class TaxCalendar {
    /**
     * Get all upcoming tax reminders
     */
    getUpcomingReminders(daysAhead: number = 30): TaxReminder[] {
        const today = new Date();
        const reminders: TaxReminder[] = [];

        CHILEAN_TAX_OBLIGATIONS.forEach(obligation => {
            if (obligation.type === 'monthly') {
                // Check next 2 months
                for (let i = 0; i < 2; i++) {
                    const targetMonth = new Date(today.getFullYear(), today.getMonth() + i, obligation.dueDay);
                    const reminder = this.createReminder(obligation, targetMonth, today);

                    if (reminder && reminder.daysRemaining <= daysAhead) {
                        reminders.push(reminder);
                    }
                }
            } else if (obligation.type === 'annual' && obligation.dueMonth) {
                // Check this year and next
                for (let year of [today.getFullYear(), today.getFullYear() + 1]) {
                    const targetDate = new Date(year, obligation.dueMonth - 1, obligation.dueDay);
                    const reminder = this.createReminder(obligation, targetDate, today);

                    if (reminder && reminder.daysRemaining <= daysAhead && reminder.daysRemaining >= -7) {
                        reminders.push(reminder);
                    }
                }
            }
        });

        return reminders.sort((a, b) => a.daysRemaining - b.daysRemaining);
    }

    /**
     * Create reminder from obligation and date
     */
    private createReminder(obligation: TaxObligation, dueDate: Date, today: Date): TaxReminder | null {
        const dueDateStr = dueDate.toISOString().split('T')[0];
        const diffTime = dueDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let urgency: TaxReminder['urgency'];
        if (daysRemaining < 0) urgency = 'OVERDUE';
        else if (daysRemaining <= 3) urgency = 'URGENT';
        else if (daysRemaining <= 7) urgency = 'SOON';
        else urgency = 'UPCOMING';

        return {
            obligation,
            dueDate: dueDateStr,
            daysRemaining,
            urgency
        };
    }

    /**
     * Get reminders for specific category
     */
    getRemindersByCategory(category: TaxObligation['category']): TaxReminder[] {
        return this.getUpcomingReminders().filter(r => r.obligation.category === category);
    }

    /**
     * Check if should send notification
     */
    shouldNotify(reminder: TaxReminder): boolean {
        // Notify at 7, 3, 1 day before, and on due date
        return [7, 3, 1, 0].includes(reminder.daysRemaining) || reminder.daysRemaining < 0;
    }

    /**
     * Get notification message
     */
    getNotificationMessage(reminder: TaxReminder): string {
        if (reminder.daysRemaining < 0) {
            return `⚠️ VENCIDO: ${reminder.obligation.name} venció hace ${Math.abs(reminder.daysRemaining)} días`;
        } else if (reminder.daysRemaining === 0) {
            return `🔴 HOY: ${reminder.obligation.name} vence hoy - ${reminder.obligation.description}`;
        } else if (reminder.daysRemaining === 1) {
            return `🟠 URGENTE: ${reminder.obligation.name} vence mañana`;
        } else {
            return `🟡 PRÓXIMO: ${reminder.obligation.name} vence en ${reminder.daysRemaining} días`;
        }
    }

    /**
     * Mark obligation as completed for a period
     */
    markAsCompleted(obligationId: string, period: string): void {
        try {
            const completed = this.getCompletedObligations();
            const key = `${obligationId}_${period}`;

            if (!completed.includes(key)) {
                completed.push(key);
                localStorage.setItem('completed_tax_obligations', JSON.stringify(completed));
            }
        } catch (error) {
            console.error('Error marking obligation as completed:', error);
        }
    }

    /**
     * Check if obligation is completed for period
     */
    isCompleted(obligationId: string, period: string): boolean {
        const completed = this.getCompletedObligations();
        return completed.includes(`${obligationId}_${period}`);
    }

    /**
     * Get completed obligations
     */
    private getCompletedObligations(): string[] {
        try {
            const data = localStorage.getItem('completed_tax_obligations');
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    /**
     * Get calendar for specific month
     */
    getMonthCalendar(year: number, month: number): TaxReminder[] {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const reminders: TaxReminder[] = [];

        CHILEAN_TAX_OBLIGATIONS.forEach(obligation => {
            if (obligation.type === 'monthly') {
                const dueDate = new Date(year, month, obligation.dueDay);
                if (dueDate >= firstDay && dueDate <= lastDay) {
                    const reminder = this.createReminder(obligation, dueDate, new Date());
                    if (reminder) reminders.push(reminder);
                }
            } else if (obligation.type === 'annual' && obligation.dueMonth === month + 1) {
                const dueDate = new Date(year, month, obligation.dueDay);
                const reminder = this.createReminder(obligation, dueDate, new Date());
                if (reminder) reminders.push(reminder);
            }
        });

        return reminders.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }
}

export const taxCalendar = new TaxCalendar();
