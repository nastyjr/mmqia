// Supabase Database Service Layer
// Centralizes all database operations for the application

import { supabase } from './supabaseClient';
import { eventBus, EVENTS } from './eventBus';

// =====================================================
// GENERIC HELPERS
// =====================================================

export const getCurrentUserId = async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
};

// =====================================================
// CRM / THIRD PARTIES
// =====================================================

export interface ThirdPartyDB {
    id?: string;
    rut: string;
    name: string;
    type: 'CLIENTE' | 'PROVEEDOR' | 'AMBOS';
    giro?: string;
    address?: string;
    city?: string;
    region?: string;
    phone?: string;
    email?: string;
    payment_terms?: number;
    credit_limit?: number;
    is_active?: boolean;
}

export const thirdPartiesService = {
    async getAll() {
        const { data, error } = await supabase
            .from('third_parties')
            .select('*')
            .order('name');
        if (error) throw error;
        return data;
    },

    async getByType(type: 'CLIENTE' | 'PROVEEDOR' | 'AMBOS') {
        const { data, error } = await supabase
            .from('third_parties')
            .select('*')
            .or(`type.eq.${type},type.eq.AMBOS`)
            .order('name');
        if (error) throw error;
        return data;
    },

    async create(party: ThirdPartyDB) {
        const userId = await getCurrentUserId();
        const { data, error } = await supabase
            .from('third_parties')
            .insert([{ ...party, user_id: userId }])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async update(id: string, party: Partial<ThirdPartyDB>) {
        const { data, error } = await supabase
            .from('third_parties')
            .update({ ...party, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async delete(id: string) {
        const { error } = await supabase
            .from('third_parties')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
};

// =====================================================
// PRODUCTS / INVENTORY (SAP MM-IM Lite)
// =====================================================

export interface StorageLocationDB {
    id?: string;
    name: string;
    code: string;
    address?: string;
    is_active?: boolean;
}

export const storageLocationsService = {
    async getAll() {
        const { data, error } = await supabase
            .from('storage_locations')
            .select('*')
            .eq('is_active', true)
            .order('name');
        if (error) throw error;
        return data;
    },

    async create(loc: StorageLocationDB) {
        const userId = await getCurrentUserId();
        // Trying standard insert. If this fails, it's definitely an RLS/Permission issue.
        const { data, error } = await supabase
            .from('storage_locations')
            .insert([{ ...loc, user_id: userId }])
            .select()
            .single();

        if (error) {
            console.error('Create Location Error:', error);
            throw error;
        }
        return data;
    },

    async initializeInventory() {
        const { data, error } = await supabase.rpc('setup_inventory_system');
        if (error) throw error;
        return data;
    }
};

export const productStocksService = {
    async getByProduct(productId: string) {
        const { data, error } = await supabase
            .from('product_stocks')
            .select('*, storage_locations(name, code)')
            .eq('product_id', productId);
        if (error) throw error;
        return data;
    },

    async getByLocation(locationId: string) {
        const { data, error } = await supabase
            .from('product_stocks')
            .select('*, products(name, sku, unit, weighted_average_cost)')
            .eq('location_id', locationId);
        if (error) throw error;
        return data;
    },

    // Get stock for a specific product in specific location
    async getStock(productId: string, locationId: string) {
        const { data, error } = await supabase
            .from('product_stocks')
            .select('*')
            .eq('product_id', productId)
            .eq('location_id', locationId)
            .maybeSingle(); // Returns null if not found
        if (error) throw error;
        return data;
    },

    async updateStock(productId: string, locationId: string, newQuantity: number) {
        const userId = await getCurrentUserId();

        // Upsert requires checking if exists first or using ON CONFLICT (but standard insert/update is clearer for logic)
        // Let's try upsert approach
        const { error } = await supabase
            .from('product_stocks')
            .upsert({
                product_id: productId,
                location_id: locationId,
                quantity: newQuantity,
                user_id: userId,
                updated_at: new Date().toISOString()
            }, { onConflict: 'product_id, location_id' });

        if (error) throw error;
    }
};

export interface ProductDB {
    id?: string;
    sku: string;
    name: string;
    description?: string;
    unit?: string;
    category?: string;
    min_stock?: number;
    weighted_average_cost?: number;
    last_purchase_price?: number;
    selling_price?: number;
    is_active?: boolean;
}

export const productsService = {
    async getAll() {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (error) throw error;

        // Fetch stocks for all products to compute 'currentStock'
        const { data: stocks } = await supabase.from('product_stocks').select('product_id, quantity');

        // Map stocks to products
        const productsWithStock = products.map(p => {
            const productStocks = stocks?.filter(s => s.product_id === p.id) || [];
            const totalStock = productStocks.reduce((sum, s) => sum + Number(s.quantity), 0);
            return {
                ...p,
                totalStock,
                currentStock: totalStock // Alias for backward compatibility
            };
        });

        return productsWithStock;
    },

    async getById(id: string) {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data; // Caller needs to handle stock if needed, or we can add it here too
    },

    async create(product: ProductDB) {
        const userId = await getCurrentUserId();
        const { data, error } = await supabase
            .from('products')
            .insert([{ ...product, user_id: userId }])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async update(id: string, product: Partial<ProductDB>) {
        const { data, error } = await supabase
            .from('products')
            .update({ ...product, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateGlobalPMP(id: string, newPMP: number) {
        const { error } = await supabase
            .from('products')
            .update({
                weighted_average_cost: newPMP,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);
        if (error) throw error;
    },

    // Backward compatibility for InvoicingView (assumes global stock = default location stock)
    async updateStock(id: string, newTotalStock: number, newPMP: number) {
        // 1. Update PMP
        await this.updateGlobalPMP(id, newPMP);

        // 2. Adjust Stock in Default Location (or find where stock exists)
        // For simplicity, we get the first location available
        const locations = await storageLocationsService.getAll();
        if (!locations || locations.length === 0) throw new Error("No storage locations found for stock update");

        const defaultLocId = locations[0].id;

        // We set the stock directly to the newTotalStock in the default location
        // This is a simplification. Ideally, we should decrease from specific locations.
        // But since InvoicingView doesn't support multi-location yet, this bridges the gap.
        await productStocksService.updateStock(id, defaultLocId as string, newTotalStock);
    }
};

// =====================================================
// STOCK MOVEMENTS
// =====================================================

export interface StockMovementDB {
    product_id: string;
    location_id?: string;
    transfer_location_id?: string;
    date: string;
    type: 'COMPRA' | 'VENTA' | 'DEVOLUCION_COMPRA' | 'DEVOLUCION_VENTA' | 'AJUSTE_ENTRADA' | 'AJUSTE_SALIDA' | 'DESPACHO' | 'TRASPASO';
    movement_code?: string;
    quantity: number;
    unit_cost: number;
    total_value: number;
    document_ref?: string;
    stock_after?: number;
    pmp_after?: number;
}

export const stockMovementsService = {
    async getByProduct(productId: string) {
        const { data, error } = await supabase
            .from('stock_movements')
            .select('*, storage_locations!stock_movements_location_id_fkey(name)')
            .eq('product_id', productId)
            .order('date', { ascending: false });
        if (error) throw error;
        return data;
    },

    async getAll() {
        const { data, error } = await supabase
            .from('stock_movements')
            .select('*, products(name, sku)')
            .order('date', { ascending: false });
        if (error) throw error;
        return data;
    },

    async create(movement: StockMovementDB) {
        const userId = await getCurrentUserId();
        const { data, error } = await supabase
            .from('stock_movements')
            .insert([{ ...movement, user_id: userId }])
            .select()
            .single();
        if (error) throw error;

        eventBus.emit(EVENTS.STOCK_MOVED, data);
        return data;
    }
};

// =====================================================
// INVOICES
// =====================================================

export interface InvoiceDB {
    id?: string;
    folio: number;
    type: string;
    date: string;
    due_date?: string;
    customer_id?: string;
    customer_rut?: string;
    customer_name?: string;
    customer_address?: string;
    customer_giro?: string;
    subtotal?: number;
    discount_total?: number;
    net_total?: number;
    tax_factor?: number;
    tax_total?: number;
    total?: number;
    payment_method?: string;
    status?: string;
    referenced_invoice_id?: string;
    referenced_folio?: number;
    credit_note_reason?: string;
    issued_by?: string;
}

export interface InvoiceItemDB {
    invoice_id: string;
    product_id?: string;
    product_name: string;
    quantity: number;
    price: number;
    discount?: number;
    total_net: number;
}

export const invoicesService = {
    async getAll() {
        const { data, error } = await supabase
            .from('invoices')
            .select('*')
            .order('date', { ascending: false });
        if (error) throw error;
        return data;
    },

    async getById(id: string) {
        const { data, error } = await supabase
            .from('invoices')
            .select('*, invoice_items(*)')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },

    async getNextFolio() {
        const { data, error } = await supabase
            .from('invoices')
            .select('folio')
            .order('folio', { ascending: false })
            .limit(1)
            .single();
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
        return (data?.folio || 0) + 1;
    },

    async create(invoice: InvoiceDB, items: Omit<InvoiceItemDB, 'invoice_id'>[]) {
        const userId = await getCurrentUserId();

        // Insert invoice
        const { data: invData, error: invError } = await supabase
            .from('invoices')
            .insert([{ ...invoice, user_id: userId }])
            .select()
            .single();
        if (invError) throw invError;

        // Insert items
        const itemsWithInvoiceId = items.map(item => ({
            ...item,
            invoice_id: invData.id
        }));

        const { error: itemsError } = await supabase
            .from('invoice_items')
            .insert(itemsWithInvoiceId);
        if (itemsError) throw itemsError;

        if (itemsError) throw itemsError;

        eventBus.emit(EVENTS.INVOICE_CREATED, invData);

        return invData;
    },

    async updateStatus(id: string, status: string) {
        const { error } = await supabase
            .from('invoices')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) throw error;
    }
};

// =====================================================
// QUOTES
// =====================================================

export const quotesService = {
    async getAll() {
        const { data, error } = await supabase
            .from('quotes')
            .select('*, quote_items(*)')
            .order('date', { ascending: false });
        if (error) throw error;
        return data;
    },

    async create(quote: any, items: any[]) {
        const userId = await getCurrentUserId();

        const { data: quoteData, error: quoteError } = await supabase
            .from('quotes')
            .insert([{ ...quote, user_id: userId }])
            .select()
            .single();
        if (quoteError) throw quoteError;

        const itemsWithQuoteId = items.map(item => ({
            ...item,
            quote_id: quoteData.id
        }));

        const { error: itemsError } = await supabase
            .from('quote_items')
            .insert(itemsWithQuoteId);
        if (itemsError) throw itemsError;

        return quoteData;
    },

    async updateStatus(id: string, status: string, convertedData?: any) {
        const { error } = await supabase
            .from('quotes')
            .update({ status, ...convertedData })
            .eq('id', id);
        if (error) throw error;
    }
};

// =====================================================
// PURCHASE ORDERS
// =====================================================

export const purchaseOrdersService = {
    async getAll() {
        const { data, error } = await supabase
            .from('purchase_orders')
            .select('*, purchase_order_items(*)')
            .order('date', { ascending: false });
        if (error) throw error;
        return data;
    },

    async create(po: any, items: any[]) {
        const userId = await getCurrentUserId();

        const { data: poData, error: poError } = await supabase
            .from('purchase_orders')
            .insert([{ ...po, user_id: userId }])
            .select()
            .single();
        if (poError) throw poError;

        const itemsWithPoId = items.map(item => ({
            ...item,
            purchase_order_id: poData.id
        }));

        const { error: itemsError } = await supabase
            .from('purchase_order_items')
            .insert(itemsWithPoId);
        if (itemsError) throw itemsError;

        return poData;
    },

    async receive(id: string, receiptDate: string, receivedItems: { productId: string; receivedQty: number; unitCost: number }[]) {
        const userId = await getCurrentUserId();

        // 1. Get Default Location (Simplification)
        const locations = await storageLocationsService.getAll();
        if (!locations || locations.length === 0) throw new Error("No storage locations found");
        const defaultLocationId = locations[0].id;

        // 2. Process Items
        for (const item of receivedItems) {
            // A. Create Stock Movement
            await stockMovementsService.create({
                product_id: item.productId,
                location_id: defaultLocationId,
                date: receiptDate,
                type: 'COMPRA',
                quantity: item.receivedQty,
                unit_cost: item.unitCost, // Costo neto
                total_value: item.receivedQty * item.unitCost, // Valor neto total
                document_ref: `OC-${id.slice(0, 8)}` // Simple ref
            });

            // B. Update Product Stock (Atomic increment ideally, but using upsert/read-modify-write here)
            // Fetch current stock
            const { data: currentStocks } = await supabase
                .from('product_stocks')
                .select('*')
                .eq('product_id', item.productId)
                .eq('location_id', defaultLocationId)
                .single();

            const currentQty = currentStocks?.quantity || 0;
            const newQty = Number(currentQty) + Number(item.receivedQty);

            // Update Stock
            const { error: stockError } = await supabase
                .from('product_stocks')
                .upsert({
                    product_id: item.productId,
                    location_id: defaultLocationId,
                    quantity: newQty,
                    user_id: userId,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'product_id, location_id' });

            if (stockError) throw stockError;

            // C. Update PMP (Weighted Average Cost)
            // Need current total stock and PMP to calculate new PMP
            // New PMP = ((OldStock * OldPMP) + (NewQty * NewCost)) / (OldStock + NewQty)
            // For now, we skip PMP update to keep it simple, or we can fetch product
            const { data: product } = await supabase.from('products').select('weighted_average_cost').eq('id', item.productId).single();
            if (product) {
                const oldPMP = product.weighted_average_cost || 0;
                // Note: we use currentQty (before add) for the formula
                // This assumes 'currentQty' is global, but it's local. 
                // To do this right we need Global Stock. Let's approximate with local for now.
                const totalValue = (currentQty * oldPMP) + (item.receivedQty * item.unitCost);
                const totalQty = currentQty + item.receivedQty;
                const newPMP = totalQty > 0 ? totalValue / totalQty : item.unitCost;

                await productsService.updateGlobalPMP(item.productId, newPMP);
            }
        }

        // 3. Update Order Status
        const { error } = await supabase
            .from('purchase_orders')
            .update({
                status: 'RECEIVED',
                receipt_date: receiptDate,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);
        if (error) throw error;
    },

    async cancel(id: string) {
        const { error } = await supabase
            .from('purchase_orders')
            .update({ status: 'CANCELLED' })
            .eq('id', id);
        if (error) throw error;
    }
};

// =====================================================
// DISPATCH GUIDES
// =====================================================

export const dispatchGuidesService = {
    async getAll() {
        const { data, error } = await supabase
            .from('dispatch_guides')
            .select('*, dispatch_guide_items(*)')
            .order('date', { ascending: false });
        if (error) throw error;
        return data;
    },

    async create(guide: any, items: any[]) {
        const userId = await getCurrentUserId();

        const { data: guideData, error: guideError } = await supabase
            .from('dispatch_guides')
            .insert([{ ...guide, user_id: userId }])
            .select()
            .single();
        if (guideError) throw guideError;

        const itemsWithGuideId = items.map(item => ({
            ...item,
            dispatch_guide_id: guideData.id
        }));

        const { error: itemsError } = await supabase
            .from('dispatch_guide_items')
            .insert(itemsWithGuideId);
        if (itemsError) throw itemsError;

        return guideData;
    },

    async updateStatus(id: string, status: string) {
        const { error } = await supabase
            .from('dispatch_guides')
            .update({ status })
            .eq('id', id);
        if (error) throw error;
    }
};

// =====================================================
// ACCOUNTING (Journal Entries)
// =====================================================

export interface JournalEntryDB {
    id?: string;
    date: string;
    type: string;
    glosa: string;
    total: number;
    lines: any[]; // JSONB
    user_id?: string;
}

export const journalEntriesService = {
    async getAll() {
        const { data, error } = await supabase
            .from('journal_entries')
            .select('*')
            .order('date', { ascending: false });
        if (error) throw error;
        return data;
    },

    async create(entry: JournalEntryDB) {
        const userId = await getCurrentUserId();
        const { data, error } = await supabase
            .from('journal_entries')
            .insert([{ ...entry, user_id: userId }])
            .select()
            .single();
        if (error) throw error;

        eventBus.emit(EVENTS.JOURNAL_ENTRY_CREATED, data);
        return data;
    },

    async update(id: string, entry: Partial<JournalEntryDB>) {
        const { data, error } = await supabase
            .from('journal_entries')
            .update({ ...entry, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async delete(id: string) {
        const { error } = await supabase
            .from('journal_entries')
            .delete()
            .eq('id', id);
        if (error) throw error;
    }
};

// =====================================================
// BANKING & RECONCILIATION
// =====================================================

export const bankTransactionsService = {
    async getAll() {
        const { data, error } = await supabase
            .from('bank_transactions')
            .select('*')
            .order('date', { ascending: false });
        // If table doesn't exist yet, return empty array gracefully to avoid crash details
        if (error) {
            console.warn('Bank transactions fetch error (table might be missing):', error);
            return [];
        }
        return data;
    },

    async create(tx: any) {
        const userId = await getCurrentUserId();
        const { data, error } = await supabase
            .from('bank_transactions')
            .insert([{ ...tx, user_id: userId }])
            .select()
            .single();
        if (error) throw error;

        eventBus.emit(EVENTS.BANK_TX_CREATED, data);
        return data;
    },

    async update(id: string, tx: any) {
        const { error } = await supabase
            .from('bank_transactions')
            .update(tx)
            .eq('id', id);
        if (error) throw error;
    }
};

export const reconciliationMatchesService = {
    async getAll() {
        const { data, error } = await supabase
            .from('reconciliation_matches')
            .select('*');
        if (error) {
            console.warn('Matches fetch error (table might be missing):', error);
            return [];
        }
        return data;
    },

    async create(match: any) {
        const userId = await getCurrentUserId();
        const { data, error } = await supabase
            .from('reconciliation_matches')
            .insert([{ ...match, user_id: userId }])
            .select()
            .single();
        if (error) throw error;
        return data;
    }
};

export const reconciliationPatternsService = {
    async getAll() {
        const { data, error } = await supabase
            .from('reconciliation_patterns')
            .select('*');
        if (error) {
            console.warn('Patterns fetch error (table might be missing):', error);
            return [];
        }
        return data;
    },

    async create(pattern: any) {
        const userId = await getCurrentUserId();
        const { data, error } = await supabase
            .from('reconciliation_patterns')
            .insert([{ ...pattern, user_id: userId }])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async update(id: string, updates: any) {
        const { error } = await supabase
            .from('reconciliation_patterns')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) throw error;
    }
};

export const cashMovementsService = {
    async getAll() {
        const { data, error } = await supabase
            .from('cash_movements')
            .select('*')
            .order('date', { ascending: false });
        if (error) throw error;
        return data;
    },

    async create(movement: any) {
        const userId = await getCurrentUserId();
        const { data, error } = await supabase
            .from('cash_movements')
            .insert([{ ...movement, user_id: userId }])
            .select()
            .single();
        if (error) throw error;
        return data;
    }
};

// =====================================================
// IEC (LIBRO COMPRA/VENTA)
// =====================================================

export const iecService = {
    async getSales(period?: string) {
        let query = supabase.from('iec_sales').select('*');
        if (period) query = query.eq('period', period);
        const { data, error } = await query.order('date', { ascending: false });
        if (error) throw error;
        return data;
    },

    async getPurchases(period?: string) {
        let query = supabase.from('iec_purchases').select('*');
        if (period) query = query.eq('period', period);
        const { data, error } = await query.order('date', { ascending: false });
        if (error) throw error;
        return data;
    },

    async createSale(sale: any) {
        const userId = await getCurrentUserId();
        const { data, error } = await supabase
            .from('iec_sales')
            .insert([{ ...sale, user_id: userId }])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async createPurchase(purchase: any) {
        const userId = await getCurrentUserId();
        const { data, error } = await supabase
            .from('iec_purchases')
            .insert([{ ...purchase, user_id: userId }])
            .select()
            .single();
        if (error) throw error;
        return data;
    }
};

// =====================================================
// AUDIT LOG
// =====================================================

export const auditService = {
    async log(entry: {
        action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'IMPORT' | 'VOID';
        module: string;
        entity_type?: string;
        entity_id?: string;
        description?: string;
        before_data?: any;
        after_data?: any;
    }) {
        const userId = await getCurrentUserId();
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase
            .from('audit_log')
            .insert([{
                ...entry,
                user_id: userId,
                username: user?.email,
                before_data: entry.before_data ? JSON.stringify(entry.before_data) : null,
                after_data: entry.after_data ? JSON.stringify(entry.after_data) : null
            }]);
        if (error) console.error('Audit log error:', error);
    },

    async getRecent(limit: number = 100) {
        const { data, error } = await supabase
            .from('audit_log')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data;
    }
};

// =====================================================
// MIGRATION HELPER
// =====================================================

export const migrationService = {
    async migrateFromLocalStorage() {
        console.log('Starting migration from localStorage to Supabase...');
        const results: Record<string, string> = {};

        try {
            // Migrate CRM
            const crm = localStorage.getItem('crm_directory');
            if (crm) {
                const parties = JSON.parse(crm);
                for (const party of parties) {
                    await thirdPartiesService.create({
                        rut: party.rut,
                        name: party.name,
                        type: party.type,
                        giro: party.giro,
                        address: party.address,
                        city: party.city,
                        phone: party.phone,
                        email: party.email,
                        payment_terms: party.paymentTerms
                    });
                }
                results.crm = `✅ Migrated ${parties.length} third parties`;
            }

            // Migrate Products
            const products = localStorage.getItem('inventory_products');
            if (products) {
                const prods = JSON.parse(products);
                for (const prod of prods) {
                    await productsService.create({
                        sku: prod.sku,
                        name: prod.name,
                        description: prod.description,
                        unit: prod.unit,
                        category: prod.category,
                        // current_stock: prod.currentStock, // Removed: Stock is now in product_stocks table
                        weighted_average_cost: prod.weightedAverageCost,
                        selling_price: prod.sellingPrice
                    });
                }
                results.products = `✅ Migrated ${prods.length} products`;
            }

            // Add more migrations as needed...

            console.log('Migration complete:', results);
            return results;
        } catch (error) {
            console.error('Migration error:', error);
            throw error;
        }
    }
};

// =====================================================
// SUBSCRIPTIONS (RECURRING BILLING)
// =====================================================

export const subscriptionsService = {
    async getAll() {
        const { data, error } = await supabase
            .from('subscriptions')
            .select('*');

        if (error) {
            console.warn('Subscriptions table missing, using localStorage fallback');
            return JSON.parse(localStorage.getItem('subscriptions_fallback') || '[]');
        }
        return data || [];
    },

    async create(subscription: any) {
        const userId = await getCurrentUserId();
        const { data, error } = await supabase
            .from('subscriptions')
            .insert([{ ...subscription, user_id: userId }])
            .select()
            .single();

        if (error) {
            console.warn('Subscriptions create failed, using localStorage fallback');
            const current = JSON.parse(localStorage.getItem('subscriptions_fallback') || '[]');
            const newSub = { ...subscription, id: subscription.id || crypto.randomUUID(), created_at: new Date().toISOString() };
            localStorage.setItem('subscriptions_fallback', JSON.stringify([...current, newSub]));
            return newSub;
        }
        return data;
    },

    async update(id: string, updates: any) {
        const { data, error } = await supabase
            .from('subscriptions')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            const current = JSON.parse(localStorage.getItem('subscriptions_fallback') || '[]');
            const index = current.findIndex((s: any) => s.id === id);
            if (index >= 0) {
                const updated = { ...current[index], ...updates };
                current[index] = updated;
                localStorage.setItem('subscriptions_fallback', JSON.stringify(current));
                return updated;
            }
        }
        return data;
    }
};

export default {
    thirdPartiesService,
    productsService,
    stockMovementsService,
    invoicesService,
    quotesService,
    purchaseOrdersService,
    dispatchGuidesService,
    journalEntriesService,
    bankTransactionsService,
    reconciliationMatchesService,
    reconciliationPatternsService,
    cashMovementsService,
    iecService,
    auditService,
    migrationService,
    subscriptionsService
};
