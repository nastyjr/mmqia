import React, { useState, useEffect } from 'react';
import { Quote, QuoteItem, QuoteStatus } from '../types/quote';
import { Invoice, InvoiceDetail } from '../types/invoicing';
import { SalesInvoice } from '../types/iec';
import { ThirdParty } from '../types/crm';
import { Product } from '../types/inventory';
import { useAccounting } from '../context/AccountingContext';
import { JournalEntry } from '../types';
import { ArrowLeft, Plus, Search, FileText, Send, CheckCircle, XCircle, Clock, Download, Trash, RefreshCw, Printer } from 'lucide-react';
import { Button } from './Button';
import { exportToExcel } from '../utils/excelExport';
import { quotesService, productsService, thirdPartiesService, invoicesService, iecService } from '../services/databaseService';
import jsPDF from 'jspdf';

interface QuotesViewProps {
    onBack: () => void;
}

export const QuotesView: React.FC<QuotesViewProps> = ({ onBack }) => {
    const { addJournalEntry } = useAccounting();

    // Data
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [customers, setCustomers] = useState<ThirdParty[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

    // UI State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<QuoteStatus | 'ALL'>('ALL');

    // Form State
    const [newQuote, setNewQuote] = useState<Partial<Quote>>({
        date: new Date().toISOString().split('T')[0],
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [],
        status: 'DRAFT',
        terms: 'Válida por 30 días. Precios en pesos chilenos. IVA incluido.',
    });
    const [selectedProduct, setSelectedProduct] = useState('');
    const [qtyToAdd, setQtyToAdd] = useState(1);

    // Load Data
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [fetchedQuotes, fetchedCustomers, fetchedProducts] = await Promise.all([
                quotesService.getAll(),
                thirdPartiesService.getByType('CLIENTE'),
                productsService.getAll()
            ]);

            setQuotes(fetchedQuotes as unknown as Quote[]);
            setCustomers(fetchedCustomers as ThirdParty[]);
            setProducts(fetchedProducts as Product[]);
        } catch (error) {
            console.error('Error loading quotes data:', error);
        }
    };

    // Computed
    const subtotal = (newQuote.items || []).reduce((sum, item) => sum + item.totalNet, 0);
    const taxAmount = Math.round(subtotal * 0.19);
    const total = subtotal + taxAmount;

    // Handlers
    const handleAddItem = () => {
        if (!selectedProduct) return;
        const product = products.find(p => p.id === selectedProduct);
        if (!product) return;

        const item: QuoteItem = {
            id: crypto.randomUUID(),
            productId: product.id,
            productName: product.name,
            quantity: qtyToAdd,
            unitPrice: product.sellingPrice,
            discount: 0,
            totalNet: Math.round(product.sellingPrice * qtyToAdd)
        };

        setNewQuote({ ...newQuote, items: [...(newQuote.items || []), item] });
        setSelectedProduct('');
        setQtyToAdd(1);
    };

    const handleRemoveItem = (id: string) => {
        setNewQuote({ ...newQuote, items: (newQuote.items || []).filter(i => i.id !== id) });
    };

    const handleSaveQuote = async (asDraft: boolean = true) => {
        if (!newQuote.customerId || !newQuote.items?.length) {
            alert('Seleccione cliente y agregue productos');
            return;
        }

        const customer = customers.find(c => c.id === newQuote.customerId);
        if (!customer) return;

        try {
            // 0. Calculate Number
            const nextNum = quotes.length + 1; // Ideally backend
            const quoteNumber = `COT-${String(nextNum).padStart(4, '0')}`;

            // 1. Prepare DB Object (snake_case)
            const quoteDB: any = {
                id: crypto.randomUUID(),
                number: quoteNumber,
                date: newQuote.date,
                valid_until: newQuote.validUntil,
                customer_id: customer.id,
                customer_rut: customer.rut,
                customer_name: customer.name,
                customer_email: customer.email,
                customer_phone: customer.phone,
                customer_address: customer.address,
                subtotal: subtotal,
                discount_total: 0,
                net_total: subtotal,
                tax_amount: taxAmount,
                total: total,
                status: asDraft ? 'DRAFT' : 'SENT',
                notes: newQuote.notes,
                terms: newQuote.terms,
                created_by: 'Admin'
            };

            // 2. Prepare Items
            const itemsDB = newQuote.items!.map(item => ({
                product_id: item.productId,
                product_name: item.productName,
                quantity: item.quantity,
                unit_price: item.unitPrice,
                discount: item.discount,
                total_net: item.totalNet
            }));

            // 3. Call Service
            await quotesService.create(quoteDB, itemsDB);

            // 4. Reload
            await loadData();
            setNewQuote({
                date: new Date().toISOString().split('T')[0],
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                items: [],
                status: 'DRAFT',
                terms: 'Válida por 30 días. Precios en pesos chilenos. IVA incluido.'
            });
            setIsFormOpen(false);
            alert(`Cotización ${quoteNumber} ${asDraft ? 'guardada como borrador' : 'enviada'}`);

        } catch (error) {
            console.error('Error creating quote:', error);
            alert('Error al crear cotización');
        }
    };

    const handleUpdateStatus = async (quote: Quote, newStatus: QuoteStatus) => {
        try {
            await quotesService.updateStatus(quote.id, newStatus);
            await loadData();
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Error al actualizar estado');
        }
    };

    const handleConvertToInvoice = async (quote: Quote) => {
        if (!confirm(`¿Convertir ${quote.number} en Factura?`)) return;

        try {
            // 1. Get next folio from DB
            const nextFolio = await invoicesService.getNextFolio();

            // 2. Create Invoice DB Object
            const invoiceDB: any = {
                folio: nextFolio,
                type: 'FACTURA',
                date: new Date().toISOString().split('T')[0],
                due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                customer_id: quote.customerId,
                customer_rut: quote.customerRut,
                customer_name: quote.customerName,
                customer_address: quote.customerAddress,
                customer_giro: '', // Ideally from customer DB
                subtotal: quote.subtotal,
                discount_total: quote.discountTotal,
                net_total: quote.netTotal,
                tax_factor: 0.19,
                tax_total: quote.taxAmount,
                total: quote.total,
                payment_method: 'TRANSFER',
                status: 'ISSUED',
                referenced_invoice_id: null,
                created_by: 'Admin'
            };

            // 3. Prepare Invoice Items
            const itemsDB = quote.items.map(qi => ({
                product_id: qi.productId,
                product_name: qi.productName,
                quantity: qi.quantity,
                price: qi.unitPrice,
                discount: qi.discount,
                total_net: qi.totalNet
            }));

            // 4. Create Invoice in DB
            const createdInvoice = await invoicesService.create(invoiceDB, itemsDB);

            // 5. Create Accounting Entry
            const revenueEntry: JournalEntry = {
                id: crypto.randomUUID(),
                date: invoiceDB.date,
                glosa: `Venta FAC #${nextFolio} - ${quote.customerName} (desde ${quote.number})`,
                type: 'ingreso',
                lines: [
                    { id: crypto.randomUUID(), accountId: '1.1.03', accountName: 'Clientes Nacionales', debit: invoiceDB.total, credit: 0, rut: quote.customerRut },
                    { id: crypto.randomUUID(), accountId: '4.1.01', accountName: 'Ingresos por Ventas', debit: 0, credit: invoiceDB.net_total },
                    { id: crypto.randomUUID(), accountId: '2.1.05', accountName: 'IVA Débito Fiscal', debit: 0, credit: invoiceDB.tax_total }
                ],
                total: invoiceDB.total,
                createdAt: new Date().toISOString(),
                status: 'posted'
            };
            await addJournalEntry(revenueEntry);

            // 6. Register in IEC
            await iecService.createSale({
                date: invoiceDB.date,
                document_type: 'FACTURA',
                folio: nextFolio,
                customer_rut: quote.customerRut,
                customer_name: quote.customerName,
                net_amount: invoiceDB.net_total,
                exempt_amount: 0,
                iva_amount: invoiceDB.tax_total,
                total_amount: invoiceDB.total,
                period: invoiceDB.date.substring(0, 7).replace('-', ''),
                source: 'quote',
                linked_invoice_id: createdInvoice.id
            });

            // 7. Update Quote Status
            await quotesService.updateStatus(quote.id, 'CONVERTED', {
                converted_to_invoice_id: createdInvoice.id,
                converted_to_invoice_folio: nextFolio
            });

            await loadData();
            alert(`Cotización convertida a Factura #${nextFolio}`);

        } catch (error) {
            console.error('Error converting to invoice:', error);
            alert('Error al convertir en factura');
        }
    };

    const handleGeneratePDF = (quote: Quote) => {
        const doc = new jsPDF();

        // Header
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, 220, 35, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('COTIZACIÓN', 15, 20);

        doc.setFontSize(12);
        doc.text(quote.number, 15, 28);

        // Quote Info Box
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text(`Fecha: ${quote.date}`, 155, 15, { align: 'right' });
        doc.text(`Válida hasta: ${quote.validUntil}`, 155, 22, { align: 'right' });
        doc.text(`Estado: ${quote.status}`, 155, 29, { align: 'right' });

        // Customer Info
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Cliente:', 15, 50);
        doc.setFont('helvetica', 'normal');
        doc.text(quote.customerName, 15, 57);
        doc.text(`RUT: ${quote.customerRut}`, 15, 64);
        if (quote.customerAddress) doc.text(quote.customerAddress, 15, 71);

        // Items Table
        let y = 85;
        doc.setFillColor(241, 245, 249);
        doc.rect(15, y - 5, 180, 10, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Producto', 17, y + 2);
        doc.text('Cant.', 100, y + 2);
        doc.text('Precio', 120, y + 2);
        doc.text('Total', 160, y + 2);

        y += 12;
        doc.setFont('helvetica', 'normal');

        quote.items.forEach(item => {
            doc.text(item.productName.substring(0, 40), 17, y);
            doc.text(item.quantity.toString(), 100, y);
            doc.text(`$${item.unitPrice.toLocaleString()}`, 120, y);
            doc.text(`$${item.totalNet.toLocaleString()}`, 160, y);
            y += 8;
        });

        // Totals
        y += 10;
        doc.setDrawColor(200, 200, 200);
        doc.line(120, y - 5, 195, y - 5);

        doc.text('Subtotal Neto:', 130, y);
        doc.text(`$${quote.netTotal.toLocaleString()}`, 195, y, { align: 'right' });

        doc.text('IVA (19%):', 130, y + 7);
        doc.text(`$${quote.taxAmount.toLocaleString()}`, 195, y + 7, { align: 'right' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('TOTAL:', 130, y + 16);
        doc.text(`$${quote.total.toLocaleString()}`, 195, y + 16, { align: 'right' });

        // Terms
        if (quote.terms) {
            y += 35;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text('Términos y Condiciones:', 15, y);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(quote.terms, 15, y + 6);
        }

        doc.save(`Cotizacion_${quote.number}.pdf`);
    };

    const formatCLP = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

    const getStatusBadge = (status: QuoteStatus) => {
        const styles: Record<QuoteStatus, string> = {
            DRAFT: 'bg-slate-100 text-slate-700',
            SENT: 'bg-blue-100 text-blue-700',
            APPROVED: 'bg-emerald-100 text-emerald-700',
            REJECTED: 'bg-rose-100 text-rose-700',
            CONVERTED: 'bg-purple-100 text-purple-700',
            EXPIRED: 'bg-amber-100 text-amber-700'
        };
        const labels: Record<QuoteStatus, string> = {
            DRAFT: 'Borrador',
            SENT: 'Enviada',
            APPROVED: 'Aprobada',
            REJECTED: 'Rechazada',
            CONVERTED: 'Facturada',
            EXPIRED: 'Vencida'
        };
        return <span className={`px-2 py-1 rounded text-xs font-bold ${styles[status]}`}>{labels[status]}</span>;
    };

    const filteredQuotes = quotes.filter(q => {
        const matchesSearch = q.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            q.customerName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'ALL' || q.status === filterStatus;
        return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Stats
    const stats = {
        pending: quotes.filter(q => q.status === 'SENT' || q.status === 'APPROVED').length,
        converted: quotes.filter(q => q.status === 'CONVERTED').length,
        totalPending: quotes.filter(q => q.status === 'SENT' || q.status === 'APPROVED').reduce((sum, q) => sum + q.total, 0)
    };

    return (
        <div className="animate-in fade-in slide-in-from-right duration-300 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="text-slate-600" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            <FileText className="text-indigo-600" /> Cotizaciones
                        </h1>
                        <p className="text-slate-500 text-sm">Presupuestos y propuestas comerciales</p>
                    </div>
                </div>
                <Button onClick={() => setIsFormOpen(true)}>
                    <Plus size={16} className="mr-2" /> Nueva Cotización
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Clock size={16} className="text-blue-600" />
                        <p className="text-xs font-bold text-blue-700 uppercase">Pendientes</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-700">{stats.pending}</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <CheckCircle size={16} className="text-purple-600" />
                        <p className="text-xs font-bold text-purple-700 uppercase">Facturadas</p>
                    </div>
                    <p className="text-2xl font-bold text-purple-700">{stats.converted}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4">
                    <p className="text-xs font-bold text-emerald-700 uppercase">Total Pendiente</p>
                    <p className="text-2xl font-bold text-emerald-700">{formatCLP(stats.totalPending)}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex-grow relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar por N° o cliente..."
                            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value as QuoteStatus | 'ALL')}
                    >
                        <option value="ALL">Todos los estados</option>
                        <option value="DRAFT">Borradores</option>
                        <option value="SENT">Enviadas</option>
                        <option value="APPROVED">Aprobadas</option>
                        <option value="CONVERTED">Facturadas</option>
                    </select>
                </div>
            </div>

            {/* Quotes Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-xs">
                        <tr>
                            <th className="px-4 py-3">N° Cotización</th>
                            <th className="px-4 py-3">Fecha</th>
                            <th className="px-4 py-3">Cliente</th>
                            <th className="px-4 py-3 text-right">Total</th>
                            <th className="px-4 py-3">Estado</th>
                            <th className="px-4 py-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredQuotes.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                <FileText size={40} className="mx-auto mb-2 opacity-50" />
                                No hay cotizaciones. Haz click en "Nueva Cotización" para crear una.
                            </td></tr>
                        ) : filteredQuotes.map(quote => (
                            <tr key={quote.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-mono font-bold text-indigo-600">{quote.number}</td>
                                <td className="px-4 py-3 text-slate-600">{quote.date}</td>
                                <td className="px-4 py-3">
                                    <div className="font-medium text-slate-700">{quote.customerName}</div>
                                    <div className="text-xs text-slate-400">{quote.customerRut}</div>
                                </td>
                                <td className="px-4 py-3 text-right font-bold">{formatCLP(quote.total)}</td>
                                <td className="px-4 py-3">{getStatusBadge(quote.status)}</td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleGeneratePDF(quote)}
                                            className="text-indigo-600 hover:text-indigo-800 text-xs font-medium flex items-center gap-1"
                                        >
                                            <Printer size={14} /> PDF
                                        </button>
                                        {quote.status === 'DRAFT' && (
                                            <button
                                                onClick={() => handleUpdateStatus(quote, 'SENT')}
                                                className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1"
                                            >
                                                <Send size={14} /> Enviar
                                            </button>
                                        )}
                                        {quote.status === 'SENT' && (
                                            <>
                                                <button
                                                    onClick={() => handleUpdateStatus(quote, 'APPROVED')}
                                                    className="text-emerald-600 hover:text-emerald-800 text-xs font-medium flex items-center gap-1"
                                                >
                                                    <CheckCircle size={14} /> Aprobar
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateStatus(quote, 'REJECTED')}
                                                    className="text-rose-500 hover:text-rose-700 text-xs font-medium flex items-center gap-1"
                                                >
                                                    <XCircle size={14} /> Rechazar
                                                </button>
                                            </>
                                        )}
                                        {quote.status === 'APPROVED' && (
                                            <button
                                                onClick={() => handleConvertToInvoice(quote)}
                                                className="text-purple-600 hover:text-purple-800 text-xs font-medium flex items-center gap-1"
                                            >
                                                <RefreshCw size={14} /> Facturar
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* New Quote Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4 overflow-auto">
                    <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-6 my-8">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <FileText className="text-indigo-600" /> Nueva Cotización
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left Column */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Cliente *</label>
                                    <select
                                        className="w-full border rounded-lg p-2 text-sm"
                                        value={newQuote.customerId || ''}
                                        onChange={e => setNewQuote({ ...newQuote, customerId: e.target.value })}
                                    >
                                        <option value="">-- Seleccionar Cliente --</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.rut})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">Fecha</label>
                                        <input
                                            type="date"
                                            className="w-full border rounded-lg p-2 text-sm"
                                            value={newQuote.date}
                                            onChange={e => setNewQuote({ ...newQuote, date: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">Válida Hasta</label>
                                        <input
                                            type="date"
                                            className="w-full border rounded-lg p-2 text-sm"
                                            value={newQuote.validUntil}
                                            onChange={e => setNewQuote({ ...newQuote, validUntil: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Notas</label>
                                    <textarea
                                        className="w-full border rounded-lg p-2 text-sm"
                                        rows={2}
                                        placeholder="Notas adicionales..."
                                        value={newQuote.notes || ''}
                                        onChange={e => setNewQuote({ ...newQuote, notes: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Términos y Condiciones</label>
                                    <textarea
                                        className="w-full border rounded-lg p-2 text-sm"
                                        rows={2}
                                        value={newQuote.terms || ''}
                                        onChange={e => setNewQuote({ ...newQuote, terms: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Right Column - Items */}
                            <div className="space-y-4">
                                <div className="flex gap-2 items-end">
                                    <div className="flex-grow">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Agregar Producto</label>
                                        <select
                                            className="w-full border rounded-lg p-2 text-sm"
                                            value={selectedProduct}
                                            onChange={e => setSelectedProduct(e.target.value)}
                                        >
                                            <option value="">-- Seleccionar --</option>
                                            {products.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} - {formatCLP(p.sellingPrice)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="w-20">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Cant</label>
                                        <input
                                            type="number"
                                            min="1"
                                            className="w-full border rounded-lg p-2 text-sm"
                                            value={qtyToAdd}
                                            onChange={e => setQtyToAdd(parseInt(e.target.value) || 1)}
                                        />
                                    </div>
                                    <Button onClick={handleAddItem} disabled={!selectedProduct}>
                                        <Plus size={16} />
                                    </Button>
                                </div>

                                {/* Items List */}
                                <div className="border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                                    <table className="w-full text-xs">
                                        <thead className="bg-slate-50 sticky top-0">
                                            <tr>
                                                <th className="px-2 py-2 text-left">Producto</th>
                                                <th className="px-2 py-2 text-center">Cant</th>
                                                <th className="px-2 py-2 text-right">Total</th>
                                                <th className="px-2 py-2"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {(newQuote.items || []).map(item => (
                                                <tr key={item.id}>
                                                    <td className="px-2 py-2">{item.productName}</td>
                                                    <td className="px-2 py-2 text-center">{item.quantity}</td>
                                                    <td className="px-2 py-2 text-right">{formatCLP(item.totalNet)}</td>
                                                    <td className="px-2 py-2">
                                                        <button onClick={() => handleRemoveItem(item.id)} className="text-rose-400 hover:text-rose-600">×</button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(newQuote.items || []).length === 0 && (
                                                <tr><td colSpan={4} className="px-2 py-4 text-center text-slate-400">Sin productos</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Totals */}
                                <div className="bg-indigo-50 rounded-lg p-3 space-y-1 text-sm">
                                    <div className="flex justify-between text-indigo-700">
                                        <span>Subtotal Neto</span>
                                        <span>{formatCLP(subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-indigo-700">
                                        <span>IVA (19%)</span>
                                        <span>{formatCLP(taxAmount)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-lg text-indigo-800 pt-2 border-t border-indigo-200">
                                        <span>Total</span>
                                        <span>{formatCLP(total)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                            <Button variant="secondary" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                            <Button variant="secondary" onClick={() => handleSaveQuote(true)}>
                                Guardar Borrador
                            </Button>
                            <Button onClick={() => handleSaveQuote(false)} disabled={!newQuote.customerId || !(newQuote.items?.length)}>
                                <Send size={16} className="mr-2" /> Crear y Enviar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
