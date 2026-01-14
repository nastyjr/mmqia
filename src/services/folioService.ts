// Folio service simplified for localStorage implementation

interface FolioCounter {
    id: string;
    document_type: string; // 'FACTURA', 'COTIZACION', 'ORDEN_COMPRA', 'GUIA_DESPACHO'
    prefix: string; // 'FAC', 'COT', 'OC', 'GD'
    current_number: number;
    updated_at: string;
}

export const folioService = {
    /**
     * Get next folio number and increment counter atomically
     */
    async getNextFolio(documentType: string): Promise<string> {
        // Map document types to prefixes
        const prefixMap: { [key: string]: string } = {
            'FACTURA': 'FAC',
            'BOLETA': 'BOL',
            'NOTA_CREDITO': 'NC',
            'NOTA_DEBITO': 'ND',
            'COTIZACION': 'COT',
            'ORDEN_COMPRA': 'OC',
            'GUIA_DESPACHO': 'GD'
        };

        const prefix = prefixMap[documentType] || 'DOC';

        // Use localStorage for counter management
        const storageKey = `folio_counter_${documentType}`;
        const currentCounterStr = localStorage.getItem(storageKey);
        const currentCounter = currentCounterStr ? parseInt(currentCounterStr) : 0;
        const nextNumber = currentCounter + 1;

        // Atomic increment
        localStorage.setItem(storageKey, nextNumber.toString());

        return `${prefix}-${String(nextNumber).padStart(6, '0')}`;
    },

    /**
     * Initialize counter for a document type
     */
    async initializeCounter(documentType: string, prefix: string, startNumber: number = 1): Promise<void> {
        const storageKey = `folio_counter_${documentType}`;
        localStorage.setItem(storageKey, (startNumber - 1).toString());
    },

    /**
     * Get current folio number without incrementing
     */
    async getCurrentFolio(documentType: string): Promise<string | null> {
        const prefixMap: { [key: string]: string } = {
            'FACTURA': 'FAC',
            'BOLETA': 'BOL',
            'NOTA_CREDITO': 'NC',
            'NOTA_DEBITO': 'ND',
            'COTIZACION': 'COT',
            'ORDEN_COMPRA': 'OC',
            'GUIA_DESPACHO': 'GD'
        };

        const prefix = prefixMap[documentType] || 'DOC';
        const storageKey = `folio_counter_${documentType}`;
        const currentCounterStr = localStorage.getItem(storageKey);

        if (!currentCounterStr) return null;

        const currentNumber = parseInt(currentCounterStr);
        return `${prefix}-${String(currentNumber).padStart(6, '0')}`;
    }
};
