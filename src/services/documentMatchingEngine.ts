/**
 * Intelligent Document Matching Engine
 * Auto-matches: Purchase Orders ↔ Goods Receipts ↔ Invoices
 * Detects discrepancies and generates alerts
 */

export interface DocumentMatch {
    id: string;
    type: '2-way' | '3-way';
    purchaseOrderId?: string;
    goodsReceiptId?: string;
    invoiceId?: string;
    matchScore: number; // 0-100
    status: 'PERFECT' | 'PARTIAL' | 'DISCREPANCY' | 'NO_MATCH';
    discrepancies: Discrepancy[];
    matchedAt: string;
    matchedBy: 'SYSTEM' | string;
}

export interface Discrepancy {
    type: 'QUANTITY' | 'PRICE' | 'TOTAL' | 'DATE' | 'SUPPLIER' | 'PRODUCT';
    field: string;
    expected: any;
    actual: any;
    difference: number | string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
}

export interface MatchingSuggestion {
    documentId: string;
    documentType: 'PO' | 'GR' | 'INVOICE';
    candidateId: string;
    candidateType: 'PO' | 'GR' | 'INVOICE';
    score: number;
    reasons: string[];
}

class DocumentMatchingEngine {
    private readonly MATCH_THRESHOLD = 70; // Minimum score for auto-match
    private readonly STORAGE_KEY = 'document_matches';

    /**
     * Main matching function - finds matches for a document
     */
    async findMatches(documentId: string, documentType: 'PO' | 'GR' | 'INVOICE'): Promise<MatchingSuggestion[]> {
        const suggestions: MatchingSuggestion[] = [];

        if (documentType === 'PO') {
            // Match PO with GR and Invoices
            const grMatches = await this.matchPOtoGR(documentId);
            const invMatches = await this.matchPOtoInvoice(documentId);
            suggestions.push(...grMatches, ...invMatches);
        } else if (documentType === 'GR') {
            // Match GR with PO and Invoices
            const poMatches = await this.matchGRtoPO(documentId);
            const invMatches = await this.matchGRtoInvoice(documentId);
            suggestions.push(...poMatches, ...invMatches);
        } else if (documentType === 'INVOICE') {
            // Match Invoice with PO and GR
            const poMatches = await this.matchInvoiceToPO(documentId);
            const grMatches = await this.matchInvoiceToGR(documentId);
            suggestions.push(...poMatches, ...grMatches);
        }

        return suggestions.sort((a, b) => b.score - a.score);
    }

    /**
     * Perform 3-way matching: PO → GR → Invoice
     */
    async perform3WayMatch(poId: string, grId: string, invoiceId: string): Promise<DocumentMatch> {
        const po = await this.getPurchaseOrder(poId);
        const gr = await this.getGoodsReceipt(grId);
        const invoice = await this.getInvoice(invoiceId);

        if (!po || !gr || !invoice) {
            throw new Error('One or more documents not found');
        }

        const discrepancies: Discrepancy[] = [];
        let totalScore = 100;

        // 1. Supplier match
        if (po.supplierRut !== invoice.supplierRut) {
            discrepancies.push({
                type: 'SUPPLIER',
                field: 'supplierRut',
                expected: po.supplierRut,
                actual: invoice.supplierRut,
                difference: 'Mismatch',
                severity: 'CRITICAL',
                description: 'Proveedor no coincide entre OC y Factura'
            });
            totalScore -= 30;
        }

        // 2. Check each line item
        po.items.forEach((poItem: any, index: number) => {
            const grItem = gr.items.find((i: any) => i.productId === poItem.productId);
            const invItem = invoice.items?.find((i: any) => i.productId === poItem.productId);

            // Quantity discrepancy
            if (grItem && grItem.quantityReceived < poItem.quantity) {
                discrepancies.push({
                    type: 'QUANTITY',
                    field: `items[${index}].quantity`,
                    expected: poItem.quantity,
                    actual: grItem.quantityReceived,
                    difference: poItem.quantity - grItem.quantityReceived,
                    severity: 'MEDIUM',
                    description: `${poItem.productName}: Recibido ${grItem.quantityReceived} de ${poItem.quantity} ordenados`
                });
                totalScore -= 10;
            }

            // Price discrepancy
            if (invItem && Math.abs(invItem.price - poItem.unitCost) > poItem.unitCost * 0.05) {
                const priceDiff = ((invItem.price - poItem.unitCost) / poItem.unitCost) * 100;
                discrepancies.push({
                    type: 'PRICE',
                    field: `items[${index}].price`,
                    expected: poItem.unitCost,
                    actual: invItem.price,
                    difference: priceDiff,
                    severity: Math.abs(priceDiff) > 10 ? 'HIGH' : 'MEDIUM',
                    description: `${poItem.productName}: Precio difiere ${priceDiff.toFixed(1)}% del esperado`
                });
                totalScore -= 15;
            }
        });

        // 3. Total amount discrepancy
        const totalDiff = Math.abs(invoice.total - po.total);
        if (totalDiff > po.total * 0.02) { // More than 2% difference
            discrepancies.push({
                type: 'TOTAL',
                field: 'total',
                expected: po.total,
                actual: invoice.total,
                difference: totalDiff,
                severity: totalDiff > po.total * 0.1 ? 'CRITICAL' : 'HIGH',
                description: `Total difiere en $${totalDiff.toLocaleString('es-CL')}`
            });
            totalScore -= 20;
        }

        // 4. Date validation (invoice should be after GR)
        if (new Date(invoice.date) < new Date(gr.receivedDate)) {
            discrepancies.push({
                type: 'DATE',
                field: 'date',
                expected: `>= ${gr.receivedDate}`,
                actual: invoice.date,
                difference: 'Date mismatch',
                severity: 'LOW',
                description: 'Factura fechada antes de la recepción'
            });
            totalScore -= 5;
        }

        // Determine status
        let status: DocumentMatch['status'];
        if (totalScore >= 95) status = 'PERFECT';
        else if (totalScore >= 70) status = 'PARTIAL';
        else if (discrepancies.length > 0) status = 'DISCREPANCY';
        else status = 'NO_MATCH';

        const match: DocumentMatch = {
            id: crypto.randomUUID(),
            type: '3-way',
            purchaseOrderId: poId,
            goodsReceiptId: grId,
            invoiceId: invoiceId,
            matchScore: Math.max(0, totalScore),
            status,
            discrepancies,
            matchedAt: new Date().toISOString(),
            matchedBy: 'SYSTEM'
        };

        // Save match
        this.saveMatch(match);

        return match;
    }

    /**
     * Match Purchase Order to Goods Receipt
     */
    private async matchPOtoGR(poId: string): Promise<MatchingSuggestion[]> {
        const po = await this.getPurchaseOrder(poId);
        if (!po) return [];

        const allGRs = await this.getAllGoodsReceipts();
        const suggestions: MatchingSuggestion[] = [];

        allGRs.forEach(gr => {
            let score = 0;
            const reasons: string[] = [];

            // Supplier match (40 points)
            if (po.supplierRut === gr.supplierRut) {
                score += 40;
                reasons.push('Mismo proveedor');
            }

            // PO number match (30 points)
            if (gr.purchaseOrderId === poId) {
                score += 30;
                reasons.push('GR ya referencia esta OC');
            }

            // Date proximity (15 points)
            const daysDiff = Math.abs(
                (new Date(gr.receivedDate).getTime() - new Date(po.date).getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysDiff <= 30) {
                score += 15 - (daysDiff / 2);
                reasons.push(`Recepción ${daysDiff.toFixed(0)} días después de OC`);
            }

            // Items match (15 points)
            const matchingItems = po.items.filter((poItem: any) =>
                gr.items.some((grItem: any) => grItem.productId === poItem.productId)
            ).length;
            const itemMatchRatio = matchingItems / po.items.length;
            score += itemMatchRatio * 15;
            if (matchingItems > 0) {
                reasons.push(`${matchingItems}/${po.items.length} productos coinciden`);
            }

            if (score >= 30) {
                suggestions.push({
                    documentId: poId,
                    documentType: 'PO',
                    candidateId: gr.id,
                    candidateType: 'GR',
                    score: Math.round(score),
                    reasons
                });
            }
        });

        return suggestions;
    }

    /**
     * Match Purchase Order to Invoice
     */
    private async matchPOtoInvoice(poId: string): Promise<MatchingSuggestion[]> {
        const po = await this.getPurchaseOrder(poId);
        if (!po) return [];

        const allInvoices = await this.getAllInvoices();
        const suggestions: MatchingSuggestion[] = [];

        allInvoices.forEach(invoice => {
            let score = 0;
            const reasons: string[] = [];

            // Supplier match (50 points)
            if (po.supplierRut === invoice.supplierRut || po.supplierRut === invoice.customerRut) {
                score += 50;
                reasons.push('Mismo proveedor');
            }

            // Total amount match (30 points)
            const amountDiff = Math.abs(invoice.total - po.total);
            const amountDiffPercent = (amountDiff / po.total) * 100;
            if (amountDiffPercent <= 5) {
                score += 30 - (amountDiffPercent * 2);
                reasons.push(`Total similar (diff: ${amountDiffPercent.toFixed(1)}%)`);
            }

            // Date proximity (20 points)
            const daysDiff = Math.abs(
                (new Date(invoice.date).getTime() - new Date(po.date).getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysDiff <= 60) {
                score += 20 - (daysDiff / 3);
                reasons.push(`Factura ${daysDiff.toFixed(0)} días después de OC`);
            }

            if (score >= 30) {
                suggestions.push({
                    documentId: poId,
                    documentType: 'PO',
                    candidateId: invoice.id,
                    candidateType: 'INVOICE',
                    score: Math.round(score),
                    reasons
                });
            }
        });

        return suggestions;
    }

    /**
     * Match Goods Receipt to Purchase Order
     */
    private async matchGRtoPO(grId: string): Promise<MatchingSuggestion[]> {
        const gr = await this.getGoodsReceipt(grId);
        if (!gr || gr.purchaseOrderId) return []; // Already matched

        const allPOs = await this.getAllPurchaseOrders();
        const suggestions: MatchingSuggestion[] = [];

        allPOs.forEach(po => {
            let score = 0;
            const reasons: string[] = [];

            // Supplier match (40 points)
            if (po.supplierRut === gr.supplierRut) {
                score += 40;
                reasons.push('Mismo proveedor');
            }

            // Items match (40 points)
            const matchingItems = gr.items.filter((grItem: any) =>
                po.items.some((poItem: any) => poItem.productId === grItem.productId)
            ).length;
            const itemMatchRatio = matchingItems / gr.items.length;
            score += itemMatchRatio * 40;
            if (matchingItems > 0) {
                reasons.push(`${matchingItems}/${gr.items.length} productos coinciden`);
            }

            // Date check (20 points)
            if (new Date(gr.receivedDate) >= new Date(po.date)) {
                score += 20;
                reasons.push('Fecha coherente (GR después de OC)');
            }

            if (score >= 40) {
                suggestions.push({
                    documentId: grId,
                    documentType: 'GR',
                    candidateId: po.id,
                    candidateType: 'PO',
                    score: Math.round(score),
                    reasons
                });
            }
        });

        return suggestions;
    }

    /**
     * Match Goods Receipt to Invoice
     */
    private async matchGRtoInvoice(grId: string): Promise<MatchingSuggestion[]> {
        const gr = await this.getGoodsReceipt(grId);
        if (!gr) return [];

        const allInvoices = await this.getAllInvoices();
        const suggestions: MatchingSuggestion[] = [];

        allInvoices.forEach(invoice => {
            let score = 0;
            const reasons: string[] = [];

            // Supplier match (50 points)
            if (gr.supplierRut === (invoice.supplierRut || invoice.customerRut)) {
                score += 50;
                reasons.push('Mismo proveedor');
            }

            // Date check (25 points)
            const daysDiff = (new Date(invoice.date).getTime() - new Date(gr.receivedDate).getTime()) / (1000 * 60 * 60 * 24);
            if (daysDiff >= 0 && daysDiff <= 30) {
                score += 25 - daysDiff;
                reasons.push(`Factura ${daysDiff.toFixed(0)} días después de recepción`);
            }

            // Items match if available (25 points)
            if (invoice.items && invoice.items.length > 0) {
                const matchingItems = gr.items.filter((grItem: any) =>
                    invoice.items.some((invItem: any) => invItem.productId === grItem.productId)
                ).length;
                const itemMatchRatio = matchingItems / gr.items.length;
                score += itemMatchRatio * 25;
                if (matchingItems > 0) {
                    reasons.push(`${matchingItems} productos coinciden`);
                }
            }

            if (score >= 40) {
                suggestions.push({
                    documentId: grId,
                    documentType: 'GR',
                    candidateId: invoice.id,
                    candidateType: 'INVOICE',
                    score: Math.round(score),
                    reasons
                });
            }
        });

        return suggestions;
    }

    /**
     * Match Invoice to Purchase Order
     */
    private async matchInvoiceToPO(invoiceId: string): Promise<MatchingSuggestion[]> {
        return this.matchPOtoInvoice(invoiceId).then(suggestions =>
            suggestions.map(s => ({
                ...s,
                documentId: invoiceId,
                documentType: 'INVOICE' as const,
                candidateType: 'PO' as const
            }))
        );
    }

    /**
     * Match Invoice to Goods Receipt
     */
    private async matchInvoiceToGR(invoiceId: string): Promise<MatchingSuggestion[]> {
        return this.matchGRtoInvoice(invoiceId).then(suggestions =>
            suggestions.map(s => ({
                ...s,
                documentId: invoiceId,
                documentType: 'INVOICE' as const,
                candidateType: 'GR' as const
            }))
        );
    }

    /**
     * Auto-match documents above threshold
     */
    async autoMatch(documentId: string, documentType: 'PO' | 'GR' | 'INVOICE'): Promise<DocumentMatch[]> {
        const suggestions = await this.findMatches(documentId, documentType);
        const matches: DocumentMatch[] = [];

        for (const suggestion of suggestions) {
            if (suggestion.score >= this.MATCH_THRESHOLD) {
                // Auto-create match
                const match: DocumentMatch = {
                    id: crypto.randomUUID(),
                    type: '2-way',
                    ...(documentType === 'PO' ? { purchaseOrderId: documentId } : {}),
                    ...(documentType === 'GR' ? { goodsReceiptId: documentId } : {}),
                    ...(documentType === 'INVOICE' ? { invoiceId: documentId } : {}),
                    ...(suggestion.candidateType === 'PO' ? { purchaseOrderId: suggestion.candidateId } : {}),
                    ...(suggestion.candidateType === 'GR' ? { goodsReceiptId: suggestion.candidateId } : {}),
                    ...(suggestion.candidateType === 'INVOICE' ? { invoiceId: suggestion.candidateId } : {}),
                    matchScore: suggestion.score,
                    status: suggestion.score >= 95 ? 'PERFECT' : 'PARTIAL',
                    discrepancies: [],
                    matchedAt: new Date().toISOString(),
                    matchedBy: 'SYSTEM'
                };

                this.saveMatch(match);
                matches.push(match);
            }
        }

        return matches;
    }

    /**
     * Helper: Get purchase order
     */
    private async getPurchaseOrder(id: string): Promise<any> {
        return (await this.getAllPurchaseOrders()).find(o => o.id === id);
    }

    /**
     * Helper: Get goods receipt (Stock Movement of type COMPRA)
     */
    private async getGoodsReceipt(id: string): Promise<any> {
        return (await this.getAllGoodsReceipts()).find(r => r.id === id);
    }

    /**
     * Helper: Get invoice
     */
    private async getInvoice(id: string): Promise<any> {
        return (await this.getAllInvoices()).find(i => i.id === id);
    }

    /**
     * Helper: Get all purchase orders
     */
    private async getAllPurchaseOrders(): Promise<any[]> {
        const { purchaseOrdersService } = await import('./databaseService');
        return await purchaseOrdersService.getAll() || [];
    }

    /**
     * Helper: Get all goods receipts (Simulated via Stock Movements)
     */
    private async getAllGoodsReceipts(): Promise<any[]> {
        const { stockMovementsService } = await import('./databaseService');
        const movements = await stockMovementsService.getAll();
        // Map movements to "Goods Receipt" like structure if needed, or filter by COMPRA
        return movements?.filter(m => m.type === 'COMPRA').map(m => ({
            id: m.id,
            purchaseOrderId: m.document_ref?.replace('OC-', ''), // heuristic
            receivedDate: m.date,
            supplierRut: 'UNKNOWN', // Stock movement doesn't track supplier directly usually
            items: [{
                productId: m.product_id,
                quantityReceived: m.quantity,
                unitCost: m.unit_cost
            }]
        })) || [];
    }

    /**
     * Helper: Get all invoices
     */
    private async getAllInvoices(): Promise<any[]> {
        const { invoicesService } = await import('./databaseService');
        return await invoicesService.getAll() || [];
    }

    /**
     * Save match
     */
    private saveMatch(match: DocumentMatch): void {
        const matches = this.getAllMatches();
        matches.push(match);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(matches));
    }

    /**
     * Get all matches
     */
    getAllMatches(): DocumentMatch[] {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
        } catch {
            return [];
        }
    }

    /**
     * Get matches for a document
     */
    getMatchesForDocument(documentId: string): DocumentMatch[] {
        return this.getAllMatches().filter(
            m => m.purchaseOrderId === documentId ||
                m.goodsReceiptId === documentId ||
                m.invoiceId === documentId
        );
    }
}

export const documentMatchingEngine = new DocumentMatchingEngine();
