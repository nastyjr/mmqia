import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice } from '../types/invoicing';

export const generateInvoicePDF = (invoice: Invoice) => {
    const doc = new jsPDF();

    // --- 1. RECUADRO ROJO (RUT, Documento, Folio) ---
    // Standard: 4x2 cm approx in top right
    doc.setDrawColor(204, 0, 0); // SII Red
    doc.setLineWidth(1);
    doc.rect(130, 10, 70, 25);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(204, 0, 0);
    doc.setFontSize(14);

    doc.text(`R.U.T.: 76.123.456-7`, 165, 18, { align: 'center' });
    doc.text(`${invoice.type} ELECTRONICA`, 165, 26, { align: 'center' }); // FACTURA / BOLETA
    doc.text(`Nº ${invoice.folio}`, 165, 33, { align: 'center' });

    doc.setFontSize(9);
    doc.setTextColor(204, 0, 0);
    doc.text('S.I.I. - SANTIAGO CENTRO', 165, 42, { align: 'center' });

    // --- 2. EMISOR INFO (Top Left) ---
    // Logo placeholder
    doc.setFillColor(240, 240, 240);
    doc.rect(10, 10, 30, 30, 'F');
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('LOGO', 25, 27, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('EMPRESA DE EJEMPLO SPA', 45, 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('GIRO: DESARROLLO DE SOFTWARE Y TECNOLOGÍA', 45, 22);
    doc.text('CASA MATRIZ: AV. PROVIDENCIA 1234, OF 601', 45, 27);
    doc.text('COMUNA: PROVIDENCIA - SANTIAGO', 45, 32);
    doc.text('EMAIL: CONTACTO@EMPRESA.CL', 45, 37);

    // --- 3. RECEPTOR INFO (Box) ---
    doc.setDrawColor(0);
    doc.setLineWidth(0.1);
    doc.rect(10, 50, 190, 25); // Main box

    const startY = 56;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('SEÑOR(ES):', 14, startY);
    doc.text('R.U.T.:', 14, startY + 6);
    doc.text('GIRO:', 14, startY + 12);

    doc.text('DIRECCIÓN:', 110, startY);
    doc.text('COMUNA:', 110, startY + 6);
    doc.text('CONTACTO:', 110, startY + 12);

    doc.setFont('helvetica', 'normal');
    doc.text(invoice.customerName.toUpperCase(), 40, startY);
    doc.text(invoice.customerRut, 40, startY + 6);
    doc.text((invoice.customerGiro || 'SIN GIRO').toUpperCase(), 40, startY + 12);

    doc.text((invoice.customerAddress || 'SIN DIRECCIÓN').toUpperCase(), 135, startY);
    doc.text('SANTIAGO', 135, startY + 6);
    doc.text('CONTACTO@CLIENTE.CL', 135, startY + 12);

    // Fecha y Vencimiento
    doc.rect(10, 78, 190, 10); // Date Box

    doc.setFont('helvetica', 'bold');
    doc.text('FECHA EMISIÓN', 30, 83, { align: 'center' });
    doc.text('FECHA VENCTO.', 95, 83, { align: 'center' });
    doc.text('FORMA DE PAGO', 160, 83, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.text(invoice.date, 30, 87, { align: 'center' });
    doc.text(invoice.dueDate, 95, 87, { align: 'center' });
    doc.text(invoice.paymentMethod === 'TRANSFER' ? 'Transferencia' : 'Contado/Efectivo', 160, 87, { align: 'center' });

    // --- 4. DETALLE (Table) ---
    const tableBody = invoice.items.map(item => [
        item.productName,
        item.quantity,
        new Intl.NumberFormat('es-CL').format(item.price), // Unit Price (Neto)
        item.discount > 0 ? `${item.discount}%` : '0%',
        new Intl.NumberFormat('es-CL').format(item.totalNet) // Total Neto
    ]);

    // @ts-ignore
    autoTable(doc, {
        startY: 95,
        head: [['DESCRIPCIÓN', 'CANTIDAD', 'PRECIO UNIT.', '% DESC.', 'VALOR (NETO)']],
        body: tableBody,
        theme: 'plain',
        styles: {
            fontSize: 9,
            cellPadding: 2,
            lineColor: [0, 0, 0],
            lineWidth: 0.1
        },
        headStyles: {
            fillColor: [240, 240, 240],
            textColor: [0, 0, 0],
            fontStyle: 'bold',
            halign: 'center',
            lineWidth: 0.1,
            lineColor: [0, 0, 0]
        },
        columnStyles: {
            0: { cellWidth: 90 },
            1: { halign: 'center' },
            2: { halign: 'right' },
            3: { halign: 'center' },
            4: { halign: 'right' }
        }
    });

    // --- 5. TOTALES (Bottom Right) ---
    // @ts-ignore
    let finalY = doc.lastAutoTable.finalY + 5;

    // Draw Totals Box
    doc.setDrawColor(0);
    doc.rect(130, finalY, 70, 30);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');

    // Neto
    doc.text('MONTO NETO', 132, finalY + 6);
    doc.text(`$ ${new Intl.NumberFormat('es-CL').format(invoice.netTotal)}`, 198, finalY + 6, { align: 'right' });

    // IVA
    doc.text('I.V.A. (19%)', 132, finalY + 14);
    doc.text(`$ ${new Intl.NumberFormat('es-CL').format(invoice.taxTotal)}`, 198, finalY + 14, { align: 'right' });

    // Total
    doc.setFillColor(230, 230, 230);
    doc.rect(130, finalY + 20, 70, 10, 'F'); // Gray background for total
    doc.setFontSize(11);
    doc.text('TOTAL', 132, finalY + 27);
    doc.text(`$ ${new Intl.NumberFormat('es-CL').format(invoice.total)}`, 198, finalY + 27, { align: 'right' });


    // --- 6. TIMBRE ELECTRÓNICO (PDF417 Placeholder) ---
    const timbreY = finalY;
    doc.setDrawColor(0);
    doc.rect(10, timbreY, 80, 35); // Box for timbre

    // Simulated PDF417 Pattern
    doc.setFillColor(0, 0, 0);
    for (let i = 0; i < 20; i++) {
        doc.rect(20, timbreY + 5 + (i * 1), 60, 0.5, 'F');
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Timbre Electrónico SII', 50, timbreY + 30, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('Res. 99 de 2014 - Verifique documento: www.sii.cl', 50, timbreY + 34, { align: 'center' });


    // Save
    doc.save(`DTE_${invoice.folio}.pdf`);
};
