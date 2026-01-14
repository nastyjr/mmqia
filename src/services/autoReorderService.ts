/**
 * Automatic Inventory Reorder System
 * Creates purchase orders automatically when stock is low
 */

import { Product } from '../types/inventory';

export interface ReorderRule {
    productId: string;
    reorderPoint: number; // Stock level that triggers reorder
    reorderQuantity: number; // How much to order
    preferredSupplierId: string;
    autoApprove: boolean; // Auto-approve if under threshold
    autoApproveThreshold?: number; // Max value for auto-approval
}

export interface AutoReorderResult {
    productId: string;
    productName: string;
    currentStock: number;
    reorderPoint: number;
    orderedQuantity: number;
    supplierId: string;
    estimatedCost: number;
    purchaseOrderId?: string;
    status: 'CREATED' | 'PENDING_APPROVAL' | 'FAILED';
    reason?: string;
}

class AutoReorderService {
    private readonly STORAGE_KEY = 'auto_reorder_rules';
    private readonly HISTORY_KEY = 'auto_reorder_history';

    /**
     * Set reorder rule for a product
     */
    setReorderRule(rule: ReorderRule): void {
        const rules = this.getReorderRules();
        const existingIndex = rules.findIndex(r => r.productId === rule.productId);

        if (existingIndex >= 0) {
            rules[existingIndex] = rule;
        } else {
            rules.push(rule);
        }

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(rules));
    }

    /**
     * Get all reorder rules
     */
    getReorderRules(): ReorderRule[] {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    /**
     * Check inventory and create orders if needed
     */
    async checkAndReorder(): Promise<AutoReorderResult[]> {
        const products = JSON.parse(localStorage.getItem('inventory_products') || '[]');
        const rules = this.getReorderRules();
        const results: AutoReorderResult[] = [];

        for (const product of products) {
            const rule = rules.find(r => r.productId === product.id);
            if (!rule) continue;

            const currentStock = product.currentStock || 0;

            // Check if reorder needed
            if (currentStock <= rule.reorderPoint) {
                // Check if there's already a pending order
                if (this.hasPendingOrder(product.id)) {
                    results.push({
                        productId: product.id,
                        productName: product.name,
                        currentStock,
                        reorderPoint: rule.reorderPoint,
                        orderedQuantity: 0,
                        supplierId: rule.preferredSupplierId,
                        estimatedCost: 0,
                        status: 'FAILED',
                        reason: 'Ya existe una orden pendiente'
                    });
                    continue;
                }

                // Calculate EOQ or use rule quantity
                const orderQty = rule.reorderQuantity || this.calculateEOQ(product);
                const estimatedCost = orderQty * (product.weightedAverageCost || product.unitCost || 0);

                // Check if auto-approve
                const shouldAutoApprove = rule.autoApprove &&
                    (!rule.autoApproveThreshold || estimatedCost <= rule.autoApproveThreshold);

                // Create purchase order
                try {
                    const purchaseOrderId = await this.createPurchaseOrder({
                        productId: product.id,
                        productName: product.name,
                        quantity: orderQty,
                        supplierId: rule.preferredSupplierId,
                        estimatedCost,
                        autoApproved: shouldAutoApprove
                    });

                    results.push({
                        productId: product.id,
                        productName: product.name,
                        currentStock,
                        reorderPoint: rule.reorderPoint,
                        orderedQuantity: orderQty,
                        supplierId: rule.preferredSupplierId,
                        estimatedCost,
                        purchaseOrderId,
                        status: shouldAutoApprove ? 'CREATED' : 'PENDING_APPROVAL'
                    });

                    // Save to history
                    this.saveToHistory({
                        ...results[results.length - 1],
                        timestamp: new Date().toISOString()
                    });

                } catch (error) {
                    results.push({
                        productId: product.id,
                        productName: product.name,
                        currentStock,
                        reorderPoint: rule.reorderPoint,
                        orderedQuantity: orderQty,
                        supplierId: rule.preferredSupplierId,
                        estimatedCost,
                        status: 'FAILED',
                        reason: error instanceof Error ? error.message : 'Error desconocido'
                    });
                }
            }
        }

        return results;
    }

    /**
     * Calculate Economic Order Quantity (simplified)
     */
    private calculateEOQ(product: Product): number {
        // Simplified: Order enough for 30 days based on recent sales
        // In real world: EOQ = sqrt((2 * D * S) / H)
        // D = demand, S = order cost, H = holding cost

        // For now, use a simple multiplier of safety stock
        const safetyStock = product.minStock || 10;
        return safetyStock * 2; // Order 2x safety stock
    }

    /**
     * Check if product has pending order
     */
    private hasPendingOrder(productId: string): boolean {
        const orders = JSON.parse(localStorage.getItem('purchase_orders_db') || '[]');
        return orders.some((order: any) =>
            order.items?.some((item: any) => item.productId === productId) &&
            (order.status === 'PENDING' || order.status === 'APPROVED')
        );
    }

    /**
     * Create purchase order
     */
    private async createPurchaseOrder(params: {
        productId: string;
        productName: string;
        quantity: number;
        supplierId: string;
        estimatedCost: number;
        autoApproved: boolean;
    }): Promise<string> {
        const suppliers = JSON.parse(localStorage.getItem('suppliers_db') || '[]');
        const supplier = suppliers.find((s: any) => s.id === params.supplierId);

        if (!supplier) {
            throw new Error('Proveedor no encontrado');
        }

        const orders = JSON.parse(localStorage.getItem('purchase_orders_db') || '[]');

        const newOrder = {
            id: crypto.randomUUID(),
            orderNumber: `OC-AUTO-${Date.now()}`,
            supplierId: params.supplierId,
            supplierName: supplier.name,
            supplierRut: supplier.rut,
            date: new Date().toISOString().split('T')[0],
            expectedDate: this.calculateExpectedDate(),
            status: params.autoApproved ? 'APPROVED' : 'PENDING',
            items: [{
                id: crypto.randomUUID(),
                productId: params.productId,
                productName: params.productName,
                quantity: params.quantity,
                unitCost: params.estimatedCost / params.quantity,
                totalCost: params.estimatedCost
            }],
            subtotal: params.estimatedCost,
            tax: params.estimatedCost * 0.19,
            total: params.estimatedCost * 1.19,
            notes: `Orden creada automáticamente por sistema de reorden`,
            autoGenerated: true,
            autoApproved: params.autoApproved,
            createdAt: new Date().toISOString()
        };

        orders.push(newOrder);
        localStorage.setItem('purchase_orders_db', JSON.stringify(orders));

        return newOrder.id;
    }

    /**
     * Calculate expected delivery date (7 days from now)
     */
    private calculateExpectedDate(): string {
        const date = new Date();
        date.setDate(date.getDate() + 7);
        return date.toISOString().split('T')[0];
    }

    /**
     * Save to history
     */
    private saveToHistory(result: any): void {
        try {
            const history = JSON.parse(localStorage.getItem(this.HISTORY_KEY) || '[]');
            history.push(result);

            // Keep last 100 records
            const trimmed = history.slice(-100);
            localStorage.setItem(this.HISTORY_KEY, JSON.stringify(trimmed));
        } catch (error) {
            console.error('Error saving reorder history:', error);
        }
    }

    /**
     * Get reorder history
     */
    getHistory(): any[] {
        try {
            return JSON.parse(localStorage.getItem(this.HISTORY_KEY) || '[]');
        } catch {
            return [];
        }
    }

    /**
     * Calculate suggested reorder settings based on product history
     */
    suggestReorderSettings(productId: string): Partial<ReorderRule> {
        // Analyze sales history to suggest optimal reorder point and quantity
        const salesHistory = this.getProductSalesHistory(productId);

        if (salesHistory.length < 5) {
            return {
                reorderPoint: 10,
                reorderQuantity: 20
            };
        }

        const avgDailySales = salesHistory.reduce((sum, s) => sum + s.quantity, 0) / salesHistory.length;
        const leadTimeDays = 7; // Assumed
        const safetyFactor = 1.5; // 50% buffer

        const reorderPoint = Math.ceil(avgDailySales * leadTimeDays * safetyFactor);
        const reorderQuantity = Math.ceil(avgDailySales * 30); // 30 days worth

        return {
            reorderPoint,
            reorderQuantity
        };
    }

    /**
     * Get product sales history (placeholder)
     */
    private getProductSalesHistory(productId: string): Array<{ date: string; quantity: number }> {
        // Would query from stock_movements or invoices
        return [];
    }
}

export const autoReorderService = new AutoReorderService();
