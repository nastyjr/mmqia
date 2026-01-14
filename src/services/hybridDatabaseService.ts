/**
 * Hybrid Database Service Adapter
 * Works with both localStorage (offline) and Supabase (multi-user)
 */

import { supabase, getCurrentCompanyId } from '../lib/supabase';
import { Product } from '../types/inventory';

interface JournalEntry {
    id?: string;
    date: string;
    gloss: string;
    type?: string;
    total?: number;
    lines?: any[];
    createdAt?: string;
}

// Detect if we're in Supabase mode or localStorage mode
const isSupabaseMode = !!supabase;

/**
 * Products Service - Hybrid implementation
 */
export const productsService = {
    async getAll(): Promise<Product[]> {
        if (isSupabaseMode && supabase) {
            // Supabase mode
            const companyId = await getCurrentCompanyId();
            if (!companyId) return [];

            const { data, error } = await supabase
                .from('products')
                .select(`
          *,
          product_stocks (
            quantity,
            weighted_average_cost,
            location:storage_locations(name)
          )
        `)
                .eq('company_id', companyId);

            if (error) {
                console.error('Supabase error:', error);
                return [];
            }

            // Transform data to match existing Product interface
            return (data || []).map((product: any) => ({
                ...product,
                currentStock: product.product_stocks?.reduce((sum: number, stock: any) => sum + (stock.quantity || 0), 0) || 0,
                weightedAverageCost: product.product_stocks?.[0]?.weighted_average_cost || product.unit_cost,
            }));
        } else {
            // localStorage mode (fallback)
            const data = localStorage.getItem('inventory_products');
            return data ? JSON.parse(data) : [];
        }
    },

    async create(product: Partial<Product>): Promise<Product> {
        if (isSupabaseMode && supabase) {
            const companyId = await getCurrentCompanyId();
            if (!companyId) throw new Error('No company found');

            const { data, error } = await supabase
                .from('products')
                .insert({
                    ...product,
                    company_id: companyId,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } else {
            // localStorage mode
            const products = await this.getAll();
            const newProduct = {
                ...product,
                id: crypto.randomUUID(),
                created_at: new Date().toISOString(),
            } as Product;

            products.push(newProduct);
            localStorage.setItem('inventory_products', JSON.stringify(products));
            return newProduct;
        }
    },

    async update(id: string, updates: Partial<Product>): Promise<Product> {
        if (isSupabaseMode && supabase) {
            const { data, error } = await supabase
                .from('products')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } else {
            // localStorage mode
            const products = await this.getAll();
            const index = products.findIndex(p => p.id === id);

            if (index === -1) throw new Error('Product not found');

            products[index] = { ...products[index], ...updates };
            localStorage.setItem('inventory_products', JSON.stringify(products));
            return products[index];
        }
    },

    async delete(id: string): Promise<void> {
        if (isSupabaseMode && supabase) {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } else {
            // localStorage mode
            const products = await this.getAll();
            const filtered = products.filter(p => p.id !== id);
            localStorage.setItem('inventory_products', JSON.stringify(filtered));
        }
    }
};

/**
 * Journal Entries Service - Hybrid implementation
 */
export const journalEntriesService = {
    async getAll(): Promise<JournalEntry[]> {
        if (isSupabaseMode && supabase) {
            const companyId = await getCurrentCompanyId();
            if (!companyId) return [];

            const { data, error } = await supabase
                .from('journal_entries')
                .select(`
          *,
          lines:journal_entry_lines (
            *,
            account:chart_of_accounts (code, name)
          )
        `)
                .eq('company_id', companyId)
                .order('date', { ascending: false });

            if (error) {
                console.error('Supabase error:', error);
                return [];
            }

            return data || [];
        } else {
            // localStorage mode
            const data = localStorage.getItem('accounting_journal');
            return data ? JSON.parse(data) : [];
        }
    },

    async create(entry: Partial<JournalEntry>): Promise<JournalEntry> {
        if (isSupabaseMode && supabase) {
            const companyId = await getCurrentCompanyId();
            if (!companyId) throw new Error('No company found');

            // Get user
            const { data: { user } } = await supabase.auth.getUser();

            // Create entry
            const { data: entryData, error: entryError } = await supabase
                .from('journal_entries')
                .insert({
                    company_id: companyId,
                    date: entry.date,
                    gloss: entry.gloss,
                    type: entry.type,
                    total: entry.total,
                    created_by: user?.id,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (entryError) throw entryError;

            // Create entry lines
            if (entry.lines && entry.lines.length > 0) {
                const { error: linesError } = await supabase
                    .from('journal_entry_lines')
                    .insert(
                        entry.lines.map(line => ({
                            entry_id: entryData.id,
                            account_id: line.accountId,
                            debit: line.debit,
                            credit: line.credit
                        }))
                    );

                if (linesError) throw linesError;
            }

            return entryData;
        } else {
            // localStorage mode
            const entries = await this.getAll();
            const newEntry = {
                ...entry,
                id: crypto.randomUUID(),
                createdAt: new Date().toISOString(),
            } as JournalEntry;

            entries.push(newEntry);
            localStorage.setItem('accounting_journal', JSON.stringify(entries));
            return newEntry;
        }
    }
};

/**
 * Invoices Service - Hybrid implementation
 */
export const invoicesService = {
    async getAll() {
        if (isSupabaseMode && supabase) {
            const companyId = await getCurrentCompanyId();
            if (!companyId) return [];

            const { data, error } = await supabase
                .from('invoices')
                .select('*')
                .eq('company_id', companyId)
                .order('date', { ascending: false });

            if (error) {
                console.error('Supabase error:', error);
                return [];
            }

            return data || [];
        } else {
            // localStorage mode
            const data = localStorage.getItem('invoicing_db');
            return data ? JSON.parse(data) : [];
        }
    },

    async create(invoice: any) {
        if (isSupabaseMode && supabase) {
            const companyId = await getCurrentCompanyId();
            if (!companyId) throw new Error('No company found');

            const { data: { user } } = await supabase.auth.getUser();

            const { data, error } = await supabase
                .from('invoices')
                .insert({
                    ...invoice,
                    company_id: companyId,
                    created_by: user?.id,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } else {
            // localStorage mode
            const invoices = await this.getAll();
            const newInvoice = {
                ...invoice,
                id: crypto.randomUUID(),
                createdAt: new Date().toISOString(),
            };

            invoices.push(newInvoice);
            localStorage.setItem('invoicing_db', JSON.stringify(invoices));
            return newInvoice;
        }
    }
};

/**
 * Export helper to check which mode we're in
 */
export const databaseMode = isSupabaseMode ? 'supabase' : 'localStorage';

export const isDatabaseOnline = async (): Promise<boolean> => {
    if (!isSupabaseMode || !supabase) return false;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        return !!user;
    } catch {
        return false;
    }
};
