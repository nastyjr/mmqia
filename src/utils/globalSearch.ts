/**
 * Global Search Utility
 * Fuzzy search across all entities in the ERP
 */

export interface SearchResult {
    id: string;
    type: 'invoice' | 'customer' | 'product' | 'entry' | 'purchase_order' | 'quote' | 'asset';
    title: string;
    subtitle?: string;
    metadata?: string;
    score: number;
    icon?: string;
}

class GlobalSearch {
    /**
     * Levenshtein distance for fuzzy matching
     */
    private levenshtein(a: string, b: string): number {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        const matrix: number[][] = [];

        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }

    /**
     * Calculate similarity score (0-100)
     */
    private getSimilarity(query: string, text: string): number {
        const normalizedQuery = query.toLowerCase();
        const normalizedText = text.toLowerCase();

        // Exact match
        if (normalizedText === normalizedQuery) return 100;

        // Starts with
        if (normalizedText.startsWith(normalizedQuery)) return 90;

        // Contains
        if (normalizedText.includes(normalizedQuery)) return 70;

        // Fuzzy match
        const distance = this.levenshtein(normalizedQuery, normalizedText);
        const maxLen = Math.max(normalizedQuery.length, normalizedText.length);
        const similarity = (maxLen - distance) / maxLen;

        return Math.round(similarity * 50); // Max 50 points for fuzzy
    }

    /**
     * Search across all entities
     */
    search(query: string): SearchResult[] {
        if (!query || query.trim().length < 2) return [];

        const results: SearchResult[] = [];
        const trimmedQuery = query.trim();

        // 1. Search Invoices
        const invoices = JSON.parse(localStorage.getItem('invoicing_db') || '[]');
        invoices.forEach((inv: any) => {
            const titleScore = this.getSimilarity(trimmedQuery, `${inv.folio}`);
            const nameScore = this.getSimilarity(trimmedQuery, inv.customerName || '');
            const rutScore = this.getSimilarity(trimmedQuery, inv.customerRut || '');

            const maxScore = Math.max(titleScore, nameScore, rutScore);

            if (maxScore > 30) {
                results.push({
                    id: inv.id,
                    type: 'invoice',
                    title: `Factura #${inv.folio}`,
                    subtitle: inv.customerName,
                    metadata: `${new Date(inv.date).toLocaleDateString('es-CL')} - $${inv.total.toLocaleString('es-CL')}`,
                    score: maxScore,
                    icon: '📄'
                });
            }
        });

        // 2. Search Products
        const products = JSON.parse(localStorage.getItem('inventory_products') || '[]');
        products.forEach((prod: any) => {
            const nameScore = this.getSimilarity(trimmedQuery, prod.name || '');
            const skuScore = this.getSimilarity(trimmedQuery, prod.sku || '');

            const maxScore = Math.max(nameScore, skuScore);

            if (maxScore > 30) {
                results.push({
                    id: prod.id,
                    type: 'product',
                    title: prod.name,
                    subtitle: `SKU: ${prod.sku}`,
                    metadata: `Stock: ${prod.currentStock || 0}`,
                    score: maxScore,
                    icon: '📦'
                });
            }
        });

        // 3. Search Journal Entries
        const entries = JSON.parse(localStorage.getItem('accounting_journal') || '[]');
        entries.forEach((entry: any) => {
            const glosaScore = this.getSimilarity(trimmedQuery, entry.glosa || '');
            const idScore = this.getSimilarity(trimmedQuery, entry.id.substring(0, 8));

            const maxScore = Math.max(glosaScore, idScore);

            if (maxScore > 30) {
                results.push({
                    id: entry.id,
                    type: 'entry',
                    title: entry.glosa,
                    subtitle: `Asiento Contable`,
                    metadata: `${entry.date} - $${entry.total?.toLocaleString('es-CL')}`,
                    score: maxScore,
                    icon: '📝'
                });
            }
        });

        // 4. Search Purchase Orders
        const orders = JSON.parse(localStorage.getItem('purchase_orders_db') || '[]');
        orders.forEach((order: any) => {
            const numberScore = this.getSimilarity(trimmedQuery, order.orderNumber || '');
            const supplierScore = this.getSimilarity(trimmedQuery, order.supplierName || '');

            const maxScore = Math.max(numberScore, supplierScore);

            if (maxScore > 30) {
                results.push({
                    id: order.id,
                    type: 'purchase_order',
                    title: `OC ${order.orderNumber}`,
                    subtitle: order.supplierName,
                    metadata: `${order.status} - $${order.total?.toLocaleString('es-CL')}`,
                    score: maxScore,
                    icon: '🛒'
                });
            }
        });

        // 5. Search Fixed Assets
        const assets = JSON.parse(localStorage.getItem('fixed_assets_db') || '[]');
        assets.forEach((asset: any) => {
            const nameScore = this.getSimilarity(trimmedQuery, asset.name || '');

            if (nameScore > 30) {
                results.push({
                    id: asset.id,
                    type: 'asset',
                    title: asset.name,
                    subtitle: 'Activo Fijo',
                    metadata: `Valor: $${asset.currentValue?.toLocaleString('es-CL')}`,
                    score: nameScore,
                    icon: '🏢'
                });
            }
        });

        // Sort by score descending
        return results.sort((a, b) => b.score - a.score).slice(0, 20); // Top 20 results
    }

    /**
     * Get recent searches from localStorage
     */
    getRecentSearches(): string[] {
        try {
            const recent = localStorage.getItem('recent_searches');
            return recent ? JSON.parse(recent) : [];
        } catch {
            return [];
        }
    }

    /**
     * Save search to recent
     */
    saveRecentSearch(query: string): void {
        try {
            const recent = this.getRecentSearches();
            const filtered = recent.filter(q => q !== query);
            filtered.unshift(query);

            // Keep last 10
            const updated = filtered.slice(0, 10);
            localStorage.setItem('recent_searches', JSON.stringify(updated));
        } catch (error) {
            console.error('Error saving recent search:', error);
        }
    }
}

export const globalSearch = new GlobalSearch();
