import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { journalEntriesService, bankTransactionsService, reconciliationMatchesService, JournalEntryDB } from '../services/databaseService';
import { JournalEntry } from '../types';
import { useAuth } from './AuthContext';
import { useCompany } from './CompanyContext';

interface AccountingContextType {
    journalEntries: JournalEntry[];
    saveEntry: (entry: JournalEntry) => Promise<void>;
    updateEntry: (entry: JournalEntry) => Promise<void>;
    deleteEntry: (id: string) => Promise<void>;
    bankTransactions: any[];
    addBankTransaction: (tx: any) => Promise<void>;
    reconciliationMatches: any[];
    addReconciliationMatch: (match: any) => Promise<void>;
}

const AccountingContext = createContext<AccountingContextType | undefined>(undefined);

export const AccountingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    // We defer state initialization until we have the company context ready
    // Actually, since we wrap AccountingProvider inside CompanyProvider, useCompany will work.
    const { getScopedKey, activeCompany } = useCompany();

    // We need to use state that updates when activeCompany changes.
    // However, since we reload on company switch, we can just initialize once using the scoper.

    const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
    const [bankTransactions, setBankTransactions] = useState<any[]>([]);
    const [reconciliationMatches, setReconciliationMatches] = useState<any[]>([]);

    const [loading, setLoading] = useState(false);

    // Persistence - No longer using localStorage
    // Data is fetched from DB on mount/user change

    const fetchEntries = async () => {
        if (!user) return;
        try {
            setLoading(true);

            // 1. Fetch Journal Entries
            const entriesData = await journalEntriesService.getAll();
            if (entriesData) {
                const entries: JournalEntry[] = entriesData.map((d: any) => {
                    const sanitizedLines = (d.lines || []).map((line: any) => ({
                        ...line,
                        debit: Number(line.debit) || 0,
                        credit: Number(line.credit) || 0
                    }));

                    const calculatedTotal = sanitizedLines.reduce((sum: number, line: any) =>
                        sum + (line.debit || 0), 0);

                    return {
                        id: d.id,
                        date: d.date,
                        type: d.type,
                        glosa: d.glosa,
                        total: calculatedTotal > 0 ? calculatedTotal : (Number(d.total) || 0),
                        createdAt: d.created_at,
                        lines: sanitizedLines
                    };
                });
                setJournalEntries(entries);
            }

            // 2. Fetch Bank Transactions
            const bankData = await bankTransactionsService.getAll();
            if (bankData) setBankTransactions(bankData);

            // 3. Fetch Matches
            const matchesData = await reconciliationMatchesService.getAll();
            if (matchesData) setReconciliationMatches(matchesData);
        } catch (error: any) {
            console.error('Error fetching entries:', error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchEntries();
        } else {
            setJournalEntries([]);
        }
    }, [user]);

    const saveEntry = async (newEntry: JournalEntry) => {
        if (!user) return;
        try {
            const entryPayload: JournalEntryDB = {
                date: newEntry.date,
                type: newEntry.type,
                glosa: newEntry.glosa,
                total: newEntry.total,
                lines: newEntry.lines
            };

            if (newEntry.id && journalEntries.some(e => e.id === newEntry.id)) {
                await journalEntriesService.update(newEntry.id, entryPayload);
            } else {
                await journalEntriesService.create(entryPayload);
            }

            await fetchEntries();
        } catch (error: any) {
            alert('Error guardando el asiento: ' + error.message);
            throw error;
        }
    };

    // Placeholder for updateEntry - to be implemented
    const updateEntry = async (entry: JournalEntry) => {
        console.warn('updateEntry not yet implemented', entry);
        // Implementation will go here, similar to saveEntry but always updating
        // For now, just re-fetch to reflect any changes if saveEntry was called
        await fetchEntries();
    };

    // Placeholder for deleteEntry - to be implemented
    const deleteEntry = async (id: string) => {
        console.warn('deleteEntry not yet implemented', id);
        // Implementation will go here
        // For now, just re-fetch
        await fetchEntries();
    };

    const addBankTransaction = async (tx: any) => {
        await bankTransactionsService.create(tx);
        await fetchEntries(); // Refresh state
    };

    const addReconciliationMatch = async (match: any) => {
        await reconciliationMatchesService.create(match);
        await fetchEntries();
    };

    return (
        <AccountingContext.Provider value={{
            journalEntries,
            saveEntry,
            updateEntry,
            deleteEntry,
            bankTransactions,
            addBankTransaction,
            reconciliationMatches,
            addReconciliationMatch
        }}>
            {children}
        </AccountingContext.Provider>
    );
};

export const useAccounting = () => {
    const context = useContext(AccountingContext);
    if (context === undefined) {
        throw new Error('useAccounting must be used within an AccountingProvider');
    }
    return context;
};
