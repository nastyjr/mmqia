/**
 * CSV Import Utility
 * Parses and validates CSV files for batch import of invoices
 */

export interface CSVParseResult<T> {
    success: boolean;
    data: T[];
    errors: Array<{
        row: number;
        field: string;
        message: string;
    }>;
    warnings: Array<{
        row: number;
        field: string;
        message: string;
    }>;
}

export interface ImportInvoiceRow {
    fecha: string; // DD/MM/YYYY or YYYY-MM-DD
    tipo: string; // FACTURA, BOLETA, NC, ND
    folio: string;
    rutProveedor: string;
    nombreProveedor: string;
    neto: string | number;
    iva: string | number;
    total: string | number;
    exenta?: string; // SI/NO
    descripcion?: string;
}

export interface ParsedInvoice {
    date: string; // YYYY-MM-DD
    documentType: string;
    folio: number;
    supplierRut: string;
    supplierName: string;
    netAmount: number;
    ivaAmount: number;
    totalAmount: number;
    isExempt: boolean;
    description?: string;
}

class CSVImporter {
    /**
     * Parse CSV string to array of objects
     */
    parseCSV(csvContent: string, delimiter: string = ','): string[][] {
        const lines = csvContent.split('\n').filter(line => line.trim().length > 0);
        return lines.map(line => {
            // Simple CSV parser (doesn't handle quoted fields with commas)
            return line.split(delimiter).map(field => field.trim());
        });
    }

    /**
     * Convert CSV to invoice objects with validation
     */
    importInvoices(csvContent: string): CSVParseResult<ParsedInvoice> {
        const rows = this.parseCSV(csvContent, ',');

        if (rows.length === 0) {
            return {
                success: false,
                data: [],
                errors: [{ row: 0, field: 'file', message: 'Archivo vacío' }],
                warnings: []
            };
        }

        const headers = rows[0].map(h => h.toLowerCase());
        const dataRows = rows.slice(1);

        const parsed: ParsedInvoice[] = [];
        const errors: CSVParseResult<ParsedInvoice>['errors'] = [];
        const warnings: CSVParseResult<ParsedInvoice>['warnings'] = [];

        // Validate headers
        const requiredHeaders = ['fecha', 'tipo', 'folio', 'rutproveedor', 'nombreproveedor', 'neto', 'total'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

        if (missingHeaders.length > 0) {
            errors.push({
                row: 0,
                field: 'headers',
                message: `Faltan columnas: ${missingHeaders.join(', ')}`
            });
            return { success: false, data: [], errors, warnings };
        }

        // Get column indices
        const getColIndex = (name: string) => headers.indexOf(name);

        dataRows.forEach((row, index) => {
            const rowNum = index + 2; // +2 because we skip header and 0-index
            const invoice: Partial<ParsedInvoice> = {};

            try {
                // 1. Date
                const dateStr = row[getColIndex('fecha')];
                invoice.date = this.parseDate(dateStr);
                if (!invoice.date) {
                    errors.push({ row: rowNum, field: 'fecha', message: 'Fecha inválida' });
                }

                // 2. Document Type
                const tipo = row[getColIndex('tipo')]?.toUpperCase();
                if (!['FACTURA', 'BOLETA', 'NC', 'ND', 'NOTA_CREDITO', 'NOTA_DEBITO'].includes(tipo)) {
                    errors.push({ row: rowNum, field: 'tipo', message: 'Tipo inválido' });
                } else {
                    invoice.documentType = tipo;
                }

                // 3. Folio
                const folioStr = row[getColIndex('folio')];
                invoice.folio = parseInt(folioStr);
                if (isNaN(invoice.folio)) {
                    errors.push({ row: rowNum, field: 'folio', message: 'Folio debe ser número' });
                }

                // 4. RUT
                const rut = row[getColIndex('rutproveedor')];
                invoice.supplierRut = rut;
                // Could add RUT validation here
                if (!rut) {
                    errors.push({ row: rowNum, field: 'rutProveedor', message: 'RUT requerido' });
                }

                // 5. Supplier Name
                invoice.supplierName = row[getColIndex('nombreproveedor')] || 'Sin Nombre';

                // 6. Amounts
                const netoStr = row[getColIndex('neto')];
                const totalStr = row[getColIndex('total')];
                const ivaIdx = getColIndex('iva');

                invoice.netAmount = this.parseAmount(netoStr);
                invoice.totalAmount = this.parseAmount(totalStr);

                if (ivaIdx >= 0) {
                    invoice.ivaAmount = this.parseAmount(row[ivaIdx]);
                } else {
                    invoice.ivaAmount = invoice.totalAmount - invoice.netAmount;
                }

                if (isNaN(invoice.netAmount) || isNaN(invoice.totalAmount)) {
                    errors.push({ row: rowNum, field: 'montos', message: 'Montos inválidos' });
                }

                // 7. Exempt
                const exentaIdx = getColIndex('exenta');
                invoice.isExempt = exentaIdx >= 0 && row[exentaIdx]?.toUpperCase() === 'SI';

                // 8. Description (optional)
                const descIdx = getColIndex('descripcion');
                invoice.description = descIdx >= 0 ? row[descIdx] : undefined;

                // If no critical errors for this row, add to parsed
                const rowErrors = errors.filter(e => e.row === rowNum);
                if (rowErrors.length === 0) {
                    parsed.push(invoice as ParsedInvoice);
                } else {
                    warnings.push({ row: rowNum, field: 'general', message: 'Fila omitida por errores' });
                }

            } catch (error) {
                errors.push({
                    row: rowNum,
                    field: 'general',
                    message: error instanceof Error ? error.message : 'Error desconocido'
                });
            }
        });

        return {
            success: errors.length === 0,
            data: parsed,
            errors,
            warnings
        };
    }

    /**
     * Parse date from various formats
     */
    private parseDate(dateStr: string): string | null {
        if (!dateStr) return null;

        // Try DD/MM/YYYY
        const dmyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (dmyMatch) {
            const [, day, month, year] = dmyMatch;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }

        // Try YYYY-MM-DD
        const ymdMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (ymdMatch) {
            const [, year, month, day] = ymdMatch;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }

        return null;
    }

    /**
     * Parse amount string to number
     */
    private parseAmount(amountStr: string | number): number {
        if (typeof amountStr === 'number') return amountStr;

        // Remove currency symbols, dots (thousand separators), and replace comma with dot
        const cleaned = amountStr
            .replace(/[$\s]/g, '')
            .replace(/\./g, '')
            .replace(',', '.');

        return parseFloat(cleaned) || 0;
    }

    /**
     * Generate CSV template
     */
    generateTemplate(): string {
        return `fecha,tipo,folio,rutProveedor,nombreProveedor,neto,iva,total,exenta,descripcion
01/12/2024,FACTURA,12345,12345678-9,Proveedor Ejemplo,10000,1900,11900,NO,Compra de materiales
15/12/2024,BOLETA,678,98765432-1,COPEC,35000,0,35000,SI,Combustible
`;
    }
}

export const csvImporter = new CSVImporter();
