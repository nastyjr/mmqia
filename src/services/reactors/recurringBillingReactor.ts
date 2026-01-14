import { eventBus, EVENTS } from '../eventBus';
import { subscriptionsService, invoicesService } from '../databaseService';
import { Subscription, Invoice } from '../../types/invoicing';

export const initRecurringBillingReactor = () => {
    // Check on initialization and then every hour (or we could just rely on init if it's a client-side app that reloads often)
    checkAndProcessSubscriptions();

    // Listen for manual trigger if we add a "Run Billing" button
    eventBus.on('TRIGGER_RECURRING_BILLING', () => {
        checkAndProcessSubscriptions();
    });
};

const checkAndProcessSubscriptions = async () => {
    try {
        const subscriptions = (await subscriptionsService.getAll()) as Subscription[];
        if (!subscriptions || subscriptions.length === 0) return;

        const today = new Date().toISOString().split('T')[0];

        for (const sub of subscriptions) {
            if (!sub.isActive) continue;
            if (sub.nextBillingDate > today) continue;

            // --- IT'S BILLING TIME ---
            console.log(`[RecurringBilling] HORA_DE_FACTURAR: ${sub.customerName}`);

            // 1. Generate Invoice Data
            const nextFolio = await invoicesService.getNextFolio();

            // Calculate totals
            const subtotal = sub.items.reduce((acc, item) => acc + item.totalNet, 0);
            const taxTotal = Math.round(subtotal * 0.19);
            const total = subtotal + taxTotal;

            const newInvoice: any = {
                id: crypto.randomUUID(),
                folio: nextFolio,
                type: 'FACTURA', // Defaulting to Factura
                date: today,
                due_date: today, // Immediate due for now
                customer_id: sub.customerId,
                customer_rut: 'N/A', // Should fetch from customer but relying on snapshot or fetch
                customer_name: sub.customerName,
                subtotal: subtotal,
                discount_total: 0,
                net_total: subtotal,
                tax_total: taxTotal,
                total: total,
                payment_method: 'TRANSFER',
                status: sub.autoIssue ? 'ISSUED' : 'DRAFT',
                issued_by: 'RecurringBillingReactor'
            };

            // 2. Create Invoice
            // We need to map items to snake_case for DB service
            const dbItems = sub.items.map(item => ({
                product_id: item.productId,
                product_name: item.productName,
                quantity: item.quantity,
                price: item.price,
                discount: item.discount,
                total_net: item.totalNet
            }));

            await invoicesService.create(newInvoice, dbItems);

            // 3. Update Subscription (Next Billing Date)
            const nextDate = calculateNextDate(sub.nextBillingDate, sub.cycle);
            await subscriptionsService.update(sub.id, {
                nextBillingDate: nextDate,
                lastBillingDate: today
            });

            // 4. Emit Event
            eventBus.emit('RECURRING_INVOICE_GENERATED', {
                subscriptionId: sub.id,
                invoiceId: newInvoice.id,
                customer: sub.customerName
            });
        }

    } catch (error) {
        console.error('[RecurringBilling] Error processing subscriptions:', error);
    }
};

const calculateNextDate = (currentDateStr: string, cycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY'): string => {
    const date = new Date(currentDateStr);
    if (cycle === 'MONTHLY') date.setMonth(date.getMonth() + 1);
    if (cycle === 'QUARTERLY') date.setMonth(date.getMonth() + 3);
    if (cycle === 'YEARLY') date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split('T')[0];
};
