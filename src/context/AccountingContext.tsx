import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { journalEntriesService, bankTransactionsService, reconciliationMatchesService, JournalEntryDB } from '../services/databaseService';
import { JournalEntry } from '../types';
import { useAuth } from './AuthContext';
import { useCompany } from './CompanyContext';

// LocalStorage keys for offline fallback
const LS_JOURNAL_ENTRIES = 'accounting_journal_entries';
const LS_BANK_TRANSACTIONS = 'accounting_bank_transactions';

interface AccountingContextType {
    journalEntries: JournalEntry[];
    saveEntry: (entry: JournalEntry) => Promise<void>;
    updateEntry: (entry: JournalEntry) => Promise<void>;
    deleteEntry: (id: string) => Promise<void>;
    bankTransactions: any[];
    addBankTransaction: (tx: any) => Promise<void>;
    reconciliationMatches: any[];
    addReconciliationMatch: (match: any) => Promise<void>;
    isOfflineMode: boolean;
}

const AccountingContext = createContext<AccountingContextType | undefined>(undefined);

// Helper to generate IDs
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

export const AccountingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const { getScopedKey, activeCompany } = useCompany();

    const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
    const [bankTransactions, setBankTransactions] = useState<any[]>([]);
    const [reconciliationMatches, setReconciliationMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOfflineMode, setIsOfflineMode] = useState(false);

    // Load from localStorage
    const loadFromLocalStorage = () => {
        try {
            const entriesData = localStorage.getItem(LS_JOURNAL_ENTRIES);
            if (entriesData) {
                const entries = JSON.parse(entriesData);
                setJournalEntries(entries);
            }
            const bankData = localStorage.getItem(LS_BANK_TRANSACTIONS);
            if (bankData) {
                setBankTransactions(JSON.parse(bankData));
            }
        } catch (error) {
            console.warn('Error loading from localStorage:', error);
        }
    };

    // Save to localStorage
    const saveToLocalStorage = (entries: JournalEntry[]) => {
        try {
            localStorage.setItem(LS_JOURNAL_ENTRIES, JSON.stringify(entries));
        } catch (error) {
            console.warn('Error saving to localStorage:', error);
        }
    };

    const fetchEntries = async () => {
        if (!user) {
            // If no user, try to load from localStorage anyway (demo mode)
            loadFromLocalStorage();
            setIsOfflineMode(true);
            return;
        }

        try {
            setLoading(true);

            // 1. Fetch Journal Entries from Supabase
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
                saveToLocalStorage(entries); // Sync to localStorage
                setIsOfflineMode(false);
            }

            // 2. Fetch Bank Transactions
            const bankData = await bankTransactionsService.getAll();
            if (bankData) setBankTransactions(bankData);

            // 3. Fetch Matches
            const matchesData = await reconciliationMatchesService.getAll();
            if (matchesData) setReconciliationMatches(matchesData);
        } catch (error: any) {
            console.warn('Error fetching from Supabase, falling back to localStorage:', error.message);
            loadFromLocalStorage();
            setIsOfflineMode(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEntries();
    }, [user]);

    const saveEntry = async (newEntry: JournalEntry) => {
        // Ensure the entry has an ID
        const entryWithId: JournalEntry = {
            ...newEntry,
            id: newEntry.id || generateId(),
            createdAt: newEntry.createdAt || new Date().toISOString()
        };

        // Always update local state first for responsiveness
        setJournalEntries(prev => {
            const exists = prev.some(e => e.id === entryWithId.id);
            let updated: JournalEntry[];
            if (exists) {
                updated = prev.map(e => e.id === entryWithId.id ? entryWithId : e);
            } else {
                updated = [entryWithId, ...prev];
            }
            saveToLocalStorage(updated);
            return updated;
        });

        // Try to save to Supabase if user is logged in
        if (user && !isOfflineMode) {
            try {
                const entryPayload: JournalEntryDB = {
                    date: entryWithId.date,
                    type: entryWithId.type,
                    glosa: entryWithId.glosa,
                    total: entryWithId.total,
                    lines: entryWithId.lines
                };

                const existsInDB = journalEntries.some(e => e.id === newEntry.id);
                if (existsInDB && newEntry.id) {
                    await journalEntriesService.update(newEntry.id, entryPayload);
                } else {
                    await journalEntriesService.create(entryPayload);
                }
                // Refresh from server to get the DB-generated ID
                await fetchEntries();
            } catch (error: any) {
                console.warn('Error saving to Supabase (saved locally):', error.message);
                setIsOfflineMode(true);
                // Entry is already saved locally, so no need to show error
            }
        }
    };

    const updateEntry = async (entry: JournalEntry) => {
        if (!entry.id) return;

        // Update local state
        setJournalEntries(prev => {
            const updated = prev.map(e => e.id === entry.id ? entry : e);
            saveToLocalStorage(updated);
            return updated;
        });

        // Try Supabase
        if (user && !isOfflineMode) {
            try {
                const entryPayload: JournalEntryDB = {
                    date: entry.date,
                    type: entry.type,
                    glosa: entry.glosa,
                    total: entry.total,
                    lines: entry.lines
                };
                await journalEntriesService.update(entry.id, entryPayload);
            } catch (error: any) {
                console.warn('Error updating in Supabase (updated locally):', error.message);
                setIsOfflineMode(true);
            }
        }
    };

    const deleteEntry = async (id: string) => {
        // Delete from local state
        setJournalEntries(prev => {
            const updated = prev.filter(e => e.id !== id);
            saveToLocalStorage(updated);
            return updated;
        });

        // Try Supabase
        if (user && !isOfflineMode) {
            try {
                await journalEntriesService.delete(id);
            } catch (error: any) {
                console.warn('Error deleting from Supabase (deleted locally):', error.message);
                setIsOfflineMode(true);
            }
        }
    };

    const addBankTransaction = async (tx: any) => {
        setBankTransactions(prev => [...prev, tx]);
        if (user && !isOfflineMode) {
            try {
                await bankTransactionsService.create(tx);
            } catch (error) {
                console.warn('Error saving bank transaction to Supabase');
            }
        }
    };

    const addReconciliationMatch = async (match: any) => {
        setReconciliationMatches(prev => [...prev, match]);
        if (user && !isOfflineMode) {
            try {
                await reconciliationMatchesService.create(match);
            } catch (error) {
                console.warn('Error saving reconciliation match to Supabase');
            }
        }
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
            addReconciliationMatch,
            isOfflineMode
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
