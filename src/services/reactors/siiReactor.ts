import { eventBus, EVENTS } from '../eventBus';
import { journalEntriesService } from '../databaseService';
import { classifyInvoice, learnClassification } from '../../utils/classificationRules';

// Simplified type for RCV Item
interface DTE {
    folio: number;
    date: string;
    rut: string;
    name: string;
    amount: number;
    type: 'COMPRA' | 'VENTA';
}

export const initSIIReactor = () => {
    // Check on startup
    checkAndProcessRCV();

    // Listen for manual sync request
    eventBus.on('TRIGGER_SII_SYNC', () => {
        console.log('⚡ SII Reactor: Manual trigger received.');
        checkAndProcessRCV();
    });
};

const checkAndProcessRCV = async () => {
    console.log('⚡ SII Reactor: Checking RCV for new documents...');

    // 1. Simulate Fetching from SII (Mock)
    const newDocs: DTE[] = [
        { folio: 1024, date: new Date().toISOString().split('T')[0], rut: '76.123.456-7', name: 'PROVEEDOR TECNOLOGICO SPA', amount: 150000, type: 'COMPRA' },
        { folio: 593, date: new Date().toISOString().split('T')[0], rut: '96.888.111-K', name: 'COMERCIALIZADORA DE INSUMOS LTDA', amount: 45990, type: 'COMPRA' }
    ];

    try {
        const existingEntries = await journalEntriesService.getAll();

        for (const doc of newDocs) {
            // 2. Check if already exists in Accounting
            // Simple check: Look for folio in glosa
            const alreadyProcessed = existingEntries?.some((e: any) => e.glosa.includes(`Fac. ${doc.folio}`));

            if (alreadyProcessed) {
                console.log(`⚡ SII Reactor: DTE Folio ${doc.folio} already processed. Skipping.`);
                continue;
            }

            // 3. Auto-Classification
            const classification = classifyInvoice(doc.name);

            // 4. Decision: Auto-Book if High Confidence
            // Rule: > 80% confidence
            if (classification.confidence > 80) {
                console.log(`⚡ SII Reactor: High confidence match for ${doc.name}. Auto-booking...`, classification);

                const newEntry = {
                    date: doc.date,
                    glosa: `Compra Fac. ${doc.folio} - ${doc.name} [Auto-SII]`,
                    type: 'egreso',
                    total: doc.amount,
                    status: 'posted',
                    lines: [
                        {
                            account_name: classification.accountName,
                            debit: doc.amount,
                            credit: 0
                        },
                        {
                            account_name: 'Banco', // Or 'Proveedores por Pagar'
                            debit: 0,
                            credit: doc.amount
                        }
                    ]
                };

                const created = await journalEntriesService.create(newEntry);
                if (created) {
                    console.log('⚡ SII Reactor: Auto-booked entry:', created.id);
                    // Event could trigger Notification Center
                    eventBus.emit('DTE_AUTO_BOOKED', { folio: doc.folio, supplier: doc.name, entryId: created.id });

                    // Reinforce learning
                    learnClassification(doc.name, classification.accountId, classification.accountName);
                }

            } else {
                console.log(`⚡ SII Reactor: Low confidence for ${doc.name}. Added to 'To Review' queue.`);
                // In a real app, we'd add this to a "Pending Review" table
            }
        }
    } catch (error) {
        console.error('⚡ SII Reactor Error:', error);
    }
};
