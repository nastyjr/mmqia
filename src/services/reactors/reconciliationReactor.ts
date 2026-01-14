import { eventBus, EVENTS } from '../eventBus';
import { reconciliationEngine } from '../reconciliationEngine';
import { journalEntriesService, reconciliationMatchesService, reconciliationPatternsService } from '../databaseService';

export const initReconciliationReactor = () => {
    eventBus.on(EVENTS.BANK_TX_CREATED, async (tx: any) => {
        console.log('⚡ Reactor: New Bank Transaction detected. Running auto-reconciliation...', tx.id);

        try {
            // 1. Fetch potential matches (Unreconciled entries)
            // Optimization: In a real app, use a smarter query.
            const entriesData = await journalEntriesService.getAll();
            if (!entriesData) return;

            // Map to AccountingEntry format
            const entries = entriesData.map((d: any) => ({
                id: d.id,
                date: d.date,
                glosa: d.glosa,
                total: Number(d.total),
                lines: (d.lines || []).map((l: any) => ({
                    accountName: l.accountName,
                    debit: Number(l.debit),
                    credit: Number(l.credit)
                }))
            }));

            // 2. Find matches
            const matches = await reconciliationEngine.findMatches({
                id: tx.id,
                date: tx.date,
                description: tx.description,
                amount: tx.amount
            }, entries);

            // 3. Auto-reconcile if HIGH confidence
            const bestMatch = matches[0];
            if (bestMatch && bestMatch.confidence === 'HIGH') {
                console.log('⚡ Reactor: High confidence match found!', bestMatch);

                // Double check if already reconciled? (Database constraint usually handles this)
                const saved = await reconciliationMatchesService.create({
                    bank_transaction_id: tx.id,
                    journal_entry_id: bestMatch.entryId,
                    confidence: 'HIGH',
                    match_date: new Date().toISOString(),
                    auto_generated: true
                });

                if (saved) {
                    // 4. Learn
                    const matchedEntry = entries.find(e => e.id === bestMatch.entryId);
                    if (matchedEntry) {
                        await reconciliationEngine.learnMatch({
                            id: tx.id,
                            date: tx.date,
                            description: tx.description,
                            amount: tx.amount
                        }, matchedEntry);
                        console.log('⚡ Reactor: Match confirmed and pattern learned.');

                        // Emit event for Notification Center
                        eventBus.emit(EVENTS.RECONCILIATION_COMPLETED, {
                            bankTxId: tx.id,
                            entryId: bestMatch.entryId,
                            confidence: bestMatch.confidence,
                            amount: tx.amount
                        });
                    }
                }
            } else {
                console.log('⚡ Reactor: No high confidence match found. Checking for learned patterns (Self-Healing)...');

                // 3b. Self-Healing: Check for learned patterns
                const pattern = await reconciliationEngine.findMatchingPattern(tx.description);
                if (pattern) {
                    console.log('⚡ Reactor: Pattern found! Auto-creating Journal Entry...', pattern);

                    // Find the structure of the last entry that matched this pattern
                    // We look for an entry with the same glosa as the pattern's entryGlosa
                    const templateEntry = entries.find(e => e.glosa === pattern.entryGlosa);

                    if (templateEntry) {
                        // Cloning the structure (Account distribution)
                        const newEntry = {
                            id: crypto.randomUUID(),
                            date: tx.date,
                            glosa: pattern.entryGlosa, // Keep the standardized glosa
                            type: tx.amount < 0 ? 'egreso' : 'ingreso',
                            total: Math.abs(tx.amount),
                            status: 'posted', // Auto-posted
                            lines: templateEntry.lines.map((l: any) => ({
                                id: crypto.randomUUID(),
                                accountId: '?', // Ideally we would have accountId, but lines here are mapped. 
                                // wait, entriesData has the real structure. 'entries' is mapped for engine. 
                                // We need to fetch the real template from DB or map correctly. 
                                // Simulating structure clone from mapped entry for now, assuming 1-1 mapping
                                accountName: l.accountName,
                                debit: l.debit > 0 ? Math.abs(tx.amount) : 0, // Simplifying: assumes 1 line + bank
                                credit: l.credit > 0 ? Math.abs(tx.amount) : 0
                            })),
                            created_at: new Date().toISOString()
                        };

                        // Fix: The mapped entry in 'entries' is simplified. We need to construct a valid JournalEntry for creation.
                        // Strategy: We will create a simple 2-line entry. 
                        // Line 1: The expense/income account (from template)
                        // Line 2: Bank (1.1.01)
                        // We need to infer the expense account name from the template.

                        const nonBankLine = templateEntry.lines.find((l: any) => !l.accountName.toLowerCase().includes('banco'));
                        const expenseAccountName = nonBankLine ? nonBankLine.accountName : 'Gastos Generales';

                        const realNewEntry: any = {
                            date: tx.date,
                            glosa: pattern.entryGlosa,
                            type: tx.amount < 0 ? 'egreso' : 'ingreso',
                            total: Math.abs(tx.amount),
                            status: 'posted',
                            lines: [
                                {
                                    account_name: expenseAccountName, // We rely on name if ID not available
                                    debit: tx.amount < 0 ? Math.abs(tx.amount) : 0,
                                    credit: tx.amount > 0 ? Math.abs(tx.amount) : 0
                                },
                                {
                                    account_name: 'Banco', // 1.1.01
                                    debit: tx.amount > 0 ? Math.abs(tx.amount) : 0,
                                    credit: tx.amount < 0 ? Math.abs(tx.amount) : 0
                                }
                            ]
                        };

                        const created = await journalEntriesService.create(realNewEntry);
                        console.log('⚡ Reactor: Auto-created entry:', created);

                        // NOW force reconciliation
                        await reconciliationMatchesService.create({
                            bank_transaction_id: tx.id,
                            journal_entry_id: created.id,
                            confidence: 'HIGH',
                            match_date: new Date().toISOString(),
                            auto_generated: true
                        });

                        eventBus.emit(EVENTS.RECONCILIATION_COMPLETED, {
                            bankTxId: tx.id,
                            entryId: created.id,
                            confidence: 'HIGH',
                            amount: tx.amount
                        });

                    } else {
                        console.log('⚡ Reactor: Pattern found but no template entry in history.');
                    }
                }
            }

        } catch (error) {
            console.error('⚡ Reactor Error (Reconciliation):', error);
        }
    });
};
