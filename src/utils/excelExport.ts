import * as XLSX from 'xlsx';

/**
 * Export data to Excel file with professional formatting
 * @param data - Array of objects to export
 * @param filename - Name of the file (without extension)
 * @param sheetName - Name of the Excel sheet
 */
export const exportToExcel = (data: any[], filename: string, sheetName: string = 'Datos') => {
    if (data.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(data);

    // Auto-size columns based on content
    const colWidths: any[] = [];
    const keys = Object.keys(data[0]);

    keys.forEach((key, idx) => {
        const maxLength = Math.max(
            key.length,
            ...data.map(row => {
                const value = row[key];
                if (value === null || value === undefined) return 0;
                return String(value).length;
            })
        );
        colWidths.push({ wch: Math.min(maxLength + 2, 50) }); // Max 50 chars width
    });

    ws['!cols'] = colWidths;

    // Format header row (bold + background color)
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!ws[cellAddress]) continue;

        ws[cellAddress].s = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "4F46E5" } }, // Indigo background
            alignment: { horizontal: "center", vertical: "center" }
        };
    }

    // Format number/currency columns
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            if (!ws[cellAddress]) continue;

            const cellValue = ws[cellAddress].v;

            // Check if this is a number column (for currency formatting)
            if (typeof cellValue === 'number' && cellValue > 100) {
                ws[cellAddress].z = '#,##0'; // Number format with thousands separator
            }
        }
    }

    // Create workbook and add worksheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Write file
    XLSX.writeFile(wb, `${filename}.xlsx`);
};

/**
 * Export multiple sheets to a single Excel file
 * @param sheets - Array of {data, sheetName}
 * @param filename - Name of the file (without extension)
 */
export const exportMultipleSheets = (
    sheets: Array<{ data: any[]; sheetName: string }>,
    filename: string
) => {
    const wb = XLSX.utils.book_new();

    sheets.forEach(({ data, sheetName }) => {
        if (data.length > 0) {
            const ws = XLSX.utils.json_to_sheet(data);

            // Auto-size columns
            const colWidths: any[] = [];
            const keys = Object.keys(data[0]);

            keys.forEach((key) => {
                const maxLength = Math.max(
                    key.length,
                    ...data.map(row => String(row[key] || '').length)
                );
                colWidths.push({ wch: Math.min(maxLength + 2, 50) });
            });

            ws['!cols'] = colWidths;

            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
    });

    XLSX.writeFile(wb, `${filename}.xlsx`);
};
