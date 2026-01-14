// Supabase Database Verification Script
// Run this to check if tables were created successfully

import { supabase } from './supabaseClient';

export const verifyDatabase = async () => {
    console.log('🔍 Verificando tablas en Supabase...\n');

    const tables = [
        'third_parties',
        'products',
        'stock_movements',
        'invoices',
        'invoice_items',
        'quotes',
        'quote_items',
        'purchase_orders',
        'purchase_order_items',
        'dispatch_guides',
        'dispatch_guide_items',
        'cash_movements',
        'iec_sales',
        'iec_purchases',
        'audit_log',
        'system_users'
    ];

    const results: { table: string; status: string; count: number | string }[] = [];

    for (const table of tables) {
        try {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });

            if (error) {
                results.push({ table, status: '❌ ERROR', count: error.message });
            } else {
                results.push({ table, status: '✅ OK', count: count ?? 0 });
            }
        } catch (e: any) {
            results.push({ table, status: '❌ ERROR', count: e.message });
        }
    }

    console.log('📊 Resultados de Verificación:\n');
    console.table(results);

    const failed = results.filter(r => r.status.includes('ERROR'));
    if (failed.length === 0) {
        console.log('\n✅ ¡Todas las tablas fueron creadas correctamente!');
        return { success: true, results };
    } else {
        console.log(`\n❌ ${failed.length} tablas tienen errores:`);
        failed.forEach(f => console.log(`   - ${f.table}: ${f.count}`));
        return { success: false, results, failed };
    }
};

// Export for browser console usage
if (typeof window !== 'undefined') {
    (window as any).verifyDatabase = verifyDatabase;
}
