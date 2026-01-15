import React, { createContext, useContext, useEffect, useState } from 'react';
import { JournalEntry } from '../types';
import { useAuth } from './AuthContext';
import { useCompany } from './CompanyContext';

// LocalStorage keys
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
    // Default to true - only use Supabase if explicitly successful
    const [isOfflineMode, setIsOfflineMode] = useState(true);

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

    // Simple Supabase check - try to import dynamically to avoid fetch errors
    const trySupabaseFetch = async () => {
        try {
            // Dynamic import to handle cases where Supabase is not configured
            const { journalEntriesService } = await import('../services/databaseService');
            const data = await journalEntriesService.getAll();
            return data;
        } catch (error) {
            console.warn('Supabase fetch failed:', error);
            return null;
        }
    };

    const fetchEntries = async () => {
        // Always load from localStorage first
        loadFromLocalStorage();

        if (!user) {
            setIsOfflineMode(true);
            return;
        }

        try {
            setLoading(true);
            const entriesData = await trySupabaseFetch();

            if (entriesData && entriesData.length > 0) {
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
                saveToLocalStorage(entries);
                setIsOfflineMode(false); // Only set to online if fetch succeeded
            }
        } catch (error: any) {
            console.warn('Error fetching from Supabase, using localStorage:', error.message);
            // Keep isOfflineMode as true (default)
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

        // Always save to local state and localStorage first (offline-first)
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

        // Try Supabase in background only if not in offline mode
        if (!isOfflineMode && user) {
            try {
                const { journalEntriesService } = await import('../services/databaseService');
                const entryPayload = {
                    date: entryWithId.date,
                    type: entryWithId.type,
                    glosa: entryWithId.glosa,
                    total: entryWithId.total,
                    lines: entryWithId.lines
                };

                // Check if it's an update or create
                if (newEntry.id && journalEntries.some(e => e.id === newEntry.id)) {
                    await journalEntriesService.update(newEntry.id, entryPayload);
                } else {
                    await journalEntriesService.create(entryPayload);
                }
            } catch (error: any) {
                console.warn('Supabase save failed (saved locally):', error.message);
                setIsOfflineMode(true);
            }
        }

        // No error thrown - entry is saved locally regardless
    };

    const updateEntry = async (entry: JournalEntry) => {
        if (!entry.id) return;

        setJournalEntries(prev => {
            const updated = prev.map(e => e.id === entry.id ? entry : e);
            saveToLocalStorage(updated);
            return updated;
        });

        if (!isOfflineMode && user) {
            try {
                const { journalEntriesService } = await import('../services/databaseService');
                await journalEntriesService.update(entry.id, {
                    date: entry.date,
                    type: entry.type,
                    glosa: entry.glosa,
                    total: entry.total,
                    lines: entry.lines
                });
            } catch (error: any) {
                console.warn('Supabase update failed (updated locally):', error.message);
                setIsOfflineMode(true);
            }
        }
    };

    const deleteEntry = async (id: string) => {
        setJournalEntries(prev => {
            const updated = prev.filter(e => e.id !== id);
            saveToLocalStorage(updated);
            return updated;
        });

        if (!isOfflineMode && user) {
            try {
                const { journalEntriesService } = await import('../services/databaseService');
                await journalEntriesService.delete(id);
            } catch (error: any) {
                console.warn('Supabase delete failed (deleted locally):', error.message);
                setIsOfflineMode(true);
            }
        }
    };

    const addBankTransaction = async (tx: any) => {
        setBankTransactions(prev => [...prev, tx]);
        // Background Supabase sync not critical for bank transactions
    };

    const addReconciliationMatch = async (match: any) => {
        setReconciliationMatches(prev => [...prev, match]);
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
