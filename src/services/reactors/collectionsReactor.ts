import { eventBus, EVENTS } from '../eventBus';
import { invoicesService } from '../databaseService';
import { Invoice } from '../../types/invoicing';

export const initCollectionsReactor = () => {
    // Check daily (simulated on init)
    checkOverdueInvoices();

    eventBus.on('TRIGGER_COLLECTIONS_RUN', () => {
        console.log('⚡ Collections Reactor: Manual run triggered.');
        checkOverdueInvoices();
    });
};

const checkOverdueInvoices = async () => {
    console.log('⚡ Collections Reactor: Checking for overdue invoices...');

    try {
        const invoices = (await invoicesService.getAll()) as unknown as Invoice[];
        if (!invoices) return;

        const today = new Date().toISOString().split('T')[0];

        for (const inv of invoices) {
            // Check only ISSUED invoices (not Paid, Draft, Void)
            if (inv.status !== 'ISSUED') continue;

            if (inv.dueDate < today) {
                // It's overdue!
                console.log(`⚡ Collections Reactor: Invoice #${inv.folio} is overdue (Due: ${inv.dueDate}).`);

                // Simulate Email Sending
                await sendDunningEmail(inv);
            }
        }
    } catch (error) {
        console.error('⚡ Collections Reactor Error:', error);
    }
};

const sendDunningEmail = async (invoice: Invoice) => {
    // In a real app, this would call an Email Service (SendGrid, AWS SES)
    // Here we simulate the delay and log

    // Check if we already sent an email "today" to avoid spamming (Mock check)
    // We would check an 'audit_log' or 'invoice_activities' table.

    console.log(`📧 SENDING EMAIL to ${invoice.customerName} for Invoice #${invoice.folio}...`);
    await new Promise(r => setTimeout(r, 500)); // Sim delay
    console.log(`✅ Email sent to ${invoice.customerName}.`);

    // Emit event
    eventBus.emit('COLLECTION_NOTICE_SENT', {
        invoiceId: invoice.id,
        folio: invoice.folio,
        customer: invoice.customerName,
        amount: invoice.total
    });
};
