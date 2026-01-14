import React, { useState, useEffect } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { Invoice, InvoiceDetail, InvoiceStatus, PaymentMethod, DocumentType } from '../types/invoicing';
import { SalesInvoice } from '../types/iec';
import { ThirdParty } from '../types/crm';
import { Product, StockMovement } from '../types/inventory';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { ArrowLeft, Plus, Search, FileText, Printer, Save, ShoppingCart, User, Calendar, Trash, DollarSign } from 'lucide-react';
import { Button } from './Button';
import { JournalEntry } from '../types';
import { invoicesService, thirdPartiesService, productsService, stockMovementsService } from '../services/databaseService';

export const InvoicingView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { addJournalEntry } = useAccounting();

    // Data Stores
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [customers, setCustomers] = useState<ThirdParty[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [movements, setMovements] = useState<StockMovement[]>([]); // To update Kardex

    // View State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Credit Note State
    const [creditNoteModal, setCreditNoteModal] = useState<{ isOpen: boolean; invoice: Invoice | null }>({ isOpen: false, invoice: null });
    const [creditNoteReason, setCreditNoteReason] = useState('');

    // New Invoice Form State
    const [newInvoice, setNewInvoice] = useState<{
        customerId: string;
        date: string;
        dueDate: string;
        items: InvoiceDetail[];
        paymentMethod: PaymentMethod;
        type: DocumentType;
    }>({
        customerId: '',
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        items: [],
        paymentMethod: 'TRANSFER',
        type: 'FACTURA'
    });

    const [selectedProductToAdd, setSelectedProductToAdd] = useState('');
    const [qtyToAdd, setQtyToAdd] = useState(1);

    // Load Data
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [fetchedInvoices, fetchedCustomers, fetchedProducts] = await Promise.all([
                invoicesService.getAll(),
                thirdPartiesService.getAll(),
                productsService.getAll()
            ]);

            setInvoices(fetchedInvoices as Invoice[]);
            setCustomers(fetchedCustomers as ThirdParty[]);
            setProducts(fetchedProducts as Product[]);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    // Computed Totals
    const subtotal = newInvoice.items.reduce((sum, item) => sum + item.totalNet, 0);
    const taxTotal = Math.round(subtotal * 0.19);
    const total = subtotal + taxTotal;

    // Actions
    const handleAddItem = () => {
        if (!selectedProductToAdd) return;
        const product = products.find(p => p.id === selectedProductToAdd);
        if (!product) return;

        const newItem: InvoiceDetail = {
            id: crypto.randomUUID(),
            productId: product.id,
            productName: product.name,
            quantity: qtyToAdd,
            price: product.sellingPrice,
            discount: 0,
            totalNet: Math.round(product.sellingPrice * qtyToAdd)
        };

        setNewInvoice({ ...newInvoice, items: [...newInvoice.items, newItem] });
        setSelectedProductToAdd('');
        setQtyToAdd(1);
    };

    const handleRemoveItem = (id: string) => {
        setNewInvoice({ ...newInvoice, items: newInvoice.items.filter(i => i.id !== id) });
    };

    const handleSaveInvoice = async () => {
        if (!newInvoice.customerId || newInvoice.items.length === 0) {
            alert('Complete cliente y productos');
            return;
        }

        const customer = customers.find(c => c.id === newInvoice.customerId);
        if (!customer) return;

        try {
            // 0. Calculate Folio (Ideally this should be handled by backend/SII, but for now max + 1)
            const invoiceFolio = invoices.length > 0 ? Math.max(...invoices.map(i => i.folio)) + 1 : 1;

            // 1. Prepare Invoice Object for DB (snake_case)
            const invoiceDB: any = {
                id: crypto.randomUUID(),
                folio: invoiceFolio,
                type: newInvoice.type,
                date: newInvoice.date,
                due_date: newInvoice.dueDate,
                customer_id: customer.id,
                customer_rut: customer.rut,
                customer_name: customer.name,
                customer_address: customer.address || '',
                customer_giro: customer.giro || '',
                subtotal: subtotal,
                discount_total: 0,
                net_total: subtotal,
                tax_factor: 0.19,
                tax_total: taxTotal,
                total: total,
                payment_method: newInvoice.paymentMethod,
                status: 'ISSUED',
                issued_by: 'Admin'
            };

            // 2. Prepare Items for DB (snake_case)
            const invoiceItemsDB = newInvoice.items.map(item => ({
                product_id: item.productId,
                product_name: item.productName,
                quantity: item.quantity,
                price: item.price,
                discount: item.discount,
                total_net: item.totalNet
            }));

            // 3. Call Service
            await invoicesService.create(invoiceDB, invoiceItemsDB);

            // Reconstruct frontend object for PDF generation if needed
            const invoiceForPDF: Invoice = {
                id: invoiceDB.id,
                folio: invoiceFolio,
                type: newInvoice.type,
                date: newInvoice.date,
                dueDate: newInvoice.dueDate,
                customerId: customer.id,
                customerRut: customer.rut,
                customerName: customer.name,
                customerAddress: customer.address || '',
                customerGiro: customer.giro || '',
                items: newInvoice.items,
                subtotal,
                discountTotal: 0,
                netTotal: subtotal,
                taxFactor: 0.19,
                taxTotal,
                total,
                paymentMethod: newInvoice.paymentMethod,
                status: 'ISSUED',
                createdAt: new Date().toISOString(),
                issuedBy: 'Admin' // TODO: Get from Auth
            };

            // 4. Update Inventory (Stock & Movements)
            let totalCost = 0;

            for (const item of newInvoice.items) {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    const newStock = product.currentStock - item.quantity;
                    const unitCost = product.weightedAverageCost;
                    const totalLineCost = Math.round(unitCost * item.quantity);
                    totalCost += totalLineCost;

                    // Update Stock in DB
                    await productsService.updateStock(product.id, newStock, product.weightedAverageCost);

                    // Register Movement
                    await stockMovementsService.create({
                        product_id: product.id,
                        date: invoiceDB.date,
                        type: 'VENTA',
                        quantity: item.quantity,
                        unit_cost: unitCost,
                        total_value: totalLineCost,
                        document_ref: `${invoiceDB.type} #${invoiceDB.folio}`,
                        stock_after: newStock,
                        pmp_after: product.weightedAverageCost
                    });
                }
            }

            // 5. Accounting Entries
            // Entry A: Revenue
            const revenueEntry: JournalEntry = {
                id: crypto.randomUUID(),
                date: invoiceDB.date,
                glosa: `Venta ${invoiceDB.type} #${invoiceDB.folio} - ${customer.name}`,
                type: 'ingreso',
                lines: [
                    { id: crypto.randomUUID(), accountId: '1.1.03', accountName: 'Clientes Nacionales', debit: invoiceDB.total, credit: 0, rut: customer.rut },
                    { id: crypto.randomUUID(), accountId: '4.1.01', accountName: 'Ingresos por Ventas', debit: 0, credit: invoiceDB.net_total },
                    { id: crypto.randomUUID(), accountId: '2.1.05', accountName: 'IVA Débito Fiscal', debit: 0, credit: invoiceDB.tax_total }
                ],
                total: invoiceDB.total,
                createdAt: new Date().toISOString(),
                status: 'posted'
            };

            // Entry B: Cost of Sales
            const costEntry: JournalEntry = {
                id: crypto.randomUUID(),
                date: invoiceDB.date,
                glosa: `Costo Venta ${invoiceDB.type} #${invoiceDB.folio}`,
                type: 'traspaso',
                lines: [
                    { id: crypto.randomUUID(), accountId: '5.1.01', accountName: 'Costo de Ventas', debit: totalCost, credit: 0 },
                    { id: crypto.randomUUID(), accountId: '1.1.06', accountName: 'Mercaderías (Existencias)', debit: 0, credit: totalCost }
                ],
                total: totalCost,
                createdAt: new Date().toISOString(),
                status: 'posted'
            };

            await addJournalEntry(revenueEntry);
            await addJournalEntry(costEntry);

            // 4. Reload Data & Close UI return
            await loadData();
            setNewInvoice({ ...newInvoice, items: [], customerId: '' });
            setIsFormOpen(false);

            // 6. Generate PDF
            if (confirm('Factura guardada correctamente. ¿Desea descargar el PDF?')) {
                generateInvoicePDF(invoiceForPDF);
            }

        } catch (error) {
            console.error('Error saving invoice:', error);
            alert('Error al emitir factura: ' + error);
        }
    };

    const formatCLP = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

    // Credit Note Handler
    const handleEmitCreditNote = async () => {
        const originalInvoice = creditNoteModal.invoice;
        if (!originalInvoice || !creditNoteReason) {
            alert('Seleccione una factura y proporcione el motivo');
            return;
        }

        // 1. Create Credit Note
        const creditNoteFolio = invoices.length > 0 ? Math.max(...invoices.map(i => i.folio)) + 1 : 1;

        const creditNote: Invoice = {
            id: crypto.randomUUID(),
            folio: creditNoteFolio,
            type: 'NOTA_CREDITO',
            date: new Date().toISOString().split('T')[0],
            dueDate: new Date().toISOString().split('T')[0],
            customerId: originalInvoice.customerId,
            customerRut: originalInvoice.customerRut,
            customerName: originalInvoice.customerName,
            customerAddress: originalInvoice.customerAddress,
            customerGiro: originalInvoice.customerGiro,
            items: originalInvoice.items.map(item => ({ ...item, id: crypto.randomUUID() })),
            subtotal: originalInvoice.subtotal,
            discountTotal: originalInvoice.discountTotal,
            netTotal: originalInvoice.netTotal,
            taxFactor: originalInvoice.taxFactor,
            taxTotal: originalInvoice.taxTotal,
            total: originalInvoice.total,
            paymentMethod: originalInvoice.paymentMethod,
            status: 'ISSUED',
            createdAt: new Date().toISOString(),
            issuedBy: 'Admin',
            referencedInvoiceId: originalInvoice.id,
            referencedFolio: originalInvoice.folio,
            creditNoteReason
        };

        // 2. Reverse Inventory (Return stock)
        const updatedProducts = [...products];
        const newMovements = [...movements];
        let totalCostReversed = 0;

        originalInvoice.items.forEach(item => {
            const productIndex = updatedProducts.findIndex(p => p.id === item.productId);
            if (productIndex >= 0) {
                const product = updatedProducts[productIndex];
                const newStock = product.currentStock + item.quantity;
                updatedProducts[productIndex] = { ...product, currentStock: newStock };

                const unitCost = product.weightedAverageCost;
                totalCostReversed += Math.round(unitCost * item.quantity);

                newMovements.push({
                    id: crypto.randomUUID(),
                    productId: product.id,
                    date: creditNote.date,
                    type: 'AJUSTE',
                    quantity: item.quantity,
                    unitCost: unitCost,
                    totalValue: Math.round(unitCost * item.quantity),
                    documentRef: `NC #${creditNote.folio} (Ref: Fac #${originalInvoice.folio})`,
                    stockAfter: newStock,
                    pmpAfter: product.weightedAverageCost
                });
            }
        });

        setProducts(updatedProducts);
        setMovements(newMovements);
        localStorage.setItem('inventory_products', JSON.stringify(updatedProducts));
        localStorage.setItem('inventory_movements', JSON.stringify(newMovements));

        // 3. Reverse Accounting Entries
        const reverseRevenueEntry: JournalEntry = {
            id: crypto.randomUUID(),
            date: creditNote.date,
            glosa: `NC #${creditNote.folio} - Anula Fac #${originalInvoice.folio} - ${creditNoteReason}`,
            type: 'egreso',
            lines: [
                { id: crypto.randomUUID(), accountId: '4.1.01', accountName: 'Ingresos por Ventas', debit: creditNote.netTotal, credit: 0 },
                { id: crypto.randomUUID(), accountId: '2.1.05', accountName: 'IVA Débito Fiscal', debit: creditNote.taxTotal, credit: 0 },
                { id: crypto.randomUUID(), accountId: '1.1.03', accountName: 'Clientes Nacionales', debit: 0, credit: creditNote.total }
            ],
            total: creditNote.total,
            createdAt: new Date().toISOString(),
            status: 'posted'
        };

        const reverseCostEntry: JournalEntry = {
            id: crypto.randomUUID(),
            date: creditNote.date,
            glosa: `NC #${creditNote.folio} - Reverso Costo`,
            type: 'traspaso',
            lines: [
                { id: crypto.randomUUID(), accountId: '1.1.06', accountName: 'Mercaderías (Existencias)', debit: totalCostReversed, credit: 0 },
                { id: crypto.randomUUID(), accountId: '5.1.01', accountName: 'Costo de Ventas', debit: 0, credit: totalCostReversed }
            ],
            total: totalCostReversed,
            createdAt: new Date().toISOString(),
            status: 'posted'
        };

        await addJournalEntry(reverseRevenueEntry);
        await addJournalEntry(reverseCostEntry);

        // 4. Register in IEC as negative
        const iecCreditNote: SalesInvoice = {
            id: crypto.randomUUID(),
            date: creditNote.date,
            documentType: 'NOTA_CREDITO',
            folio: creditNote.folio,
            customerRut: creditNote.customerRut,
            customerName: creditNote.customerName,
            netAmount: -creditNote.netTotal,
            exemptAmount: 0,
            ivaAmount: -creditNote.taxTotal,
            totalAmount: -creditNote.total,
            period: creditNote.date.substring(0, 7).replace('-', ''),
            createdAt: new Date().toISOString(),
            source: 'invoicing',
            linkedInvoiceId: creditNote.id
        };
        const existingIecSales = JSON.parse(localStorage.getItem('iec_sales') || '[]');
        localStorage.setItem('iec_sales', JSON.stringify([...existingIecSales, iecCreditNote]));

        // 5. Mark original as VOID and save credit note
        const updatedInvoices = invoices.map(inv =>
            inv.id === originalInvoice.id ? { ...inv, status: 'VOID' as InvoiceStatus } : inv
        );
        setInvoices([...updatedInvoices, creditNote]);

        // 6. Close modal
        setCreditNoteModal({ isOpen: false, invoice: null });
        setCreditNoteReason('');
        alert(`Nota de Crédito #${creditNote.folio} emitida correctamente.`);
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
                            <FileText className="text-purple-600" /> Facturación Electrónica
                        </h1>
                        <p className="text-slate-500 text-sm">Emisión de DTE y Control de Ventas</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {!isFormOpen ? (
                        <Button onClick={() => setIsFormOpen(true)}>
                            <Plus size={16} className="mr-2" /> Nueva Venta
                        </Button>
                    ) : (
                        <Button variant="secondary" onClick={() => setIsFormOpen(false)}>
                            Cancelar
                        </Button>
                    )}
                </div>
            </div>

            {isFormOpen ? (
                // --- NEW INVOICE FORM ---
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 space-y-6">
                        {/* 1. Customer Selection */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                                <User size={18} className="text-purple-500" /> Cliente
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Seleccionar Cliente</label>
                                    <select
                                        className="input-std w-full"
                                        value={newInvoice.customerId}
                                        onChange={e => setNewInvoice({ ...newInvoice, customerId: e.target.value })}
                                    >
                                        <option value="">-- Buscar Cliente CRM --</option>
                                        {customers.filter(c => c.type === 'CLIENTE' || c.type === 'AMBOS').map(c => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.rut})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo Documento</label>
                                    <select
                                        className="input-std w-full"
                                        value={newInvoice.type}
                                        onChange={e => setNewInvoice({ ...newInvoice, type: e.target.value as DocumentType })}
                                    >
                                        <option value="FACTURA">Factura Electrónica</option>
                                        <option value="BOLETA">Boleta Electrónica</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* 2. Items */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                                <ShoppingCart size={18} className="text-purple-500" /> Detalle de Productos
                            </h3>

                            {/* Add Item Bar */}
                            <div className="flex gap-2 items-end mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <div className="flex-grow">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Producto</label>
                                    <select
                                        className="input-std w-full"
                                        value={selectedProductToAdd}
                                        onChange={e => setSelectedProductToAdd(e.target.value)}
                                    >
                                        <option value="">-- Seleccionar Item --</option>
                                        {products.filter(p => p.currentStock > 0).map(p => (
                                            <option key={p.id} value={p.id}>{p.name} (Stock: {p.currentStock}) - {formatCLP(p.sellingPrice)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-24">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cant.</label>
                                    <input
                                        type="number"
                                        className="input-std w-full"
                                        min="1"
                                        value={qtyToAdd}
                                        onChange={e => setQtyToAdd(Number(e.target.value))}
                                    />
                                </div>
                                <Button onClick={handleAddItem} disabled={!selectedProductToAdd}>
                                    <Plus size={16} />
                                </Button>
                            </div>

                            {/* Table */}
                            <table className="w-full text-sm">
                                <thead className="text-xs uppercase text-slate-500 border-b border-slate-100">
                                    <tr>
                                        <th className="text-left py-2">Producto</th>
                                        <th className="text-center py-2">Cant</th>
                                        <th className="text-right py-2">Precio</th>
                                        <th className="text-right py-2">Total</th>
                                        <th className="py-2"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {newInvoice.items.map(item => (
                                        <tr key={item.id}>
                                            <td className="py-3 font-medium text-slate-700">{item.productName}</td>
                                            <td className="text-center py-3">{item.quantity}</td>
                                            <td className="text-right py-3">{formatCLP(item.price)}</td>
                                            <td className="text-right py-3 font-bold">{formatCLP(item.totalNet)}</td>
                                            <td className="text-right py-3">
                                                <button onClick={() => handleRemoveItem(item.id)} className="text-rose-400 hover:text-rose-600">
                                                    <Trash size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {newInvoice.items.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="text-center py-8 text-slate-400 italic">
                                                No hay items agregados
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Sidebar Totals */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg">
                            <h3 className="font-bold text-slate-300 mb-6 flex items-center gap-2">
                                <DollarSign size={18} /> Resumen Venta
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between text-slate-400">
                                    <span>Subtotal Neto</span>
                                    <span>{formatCLP(subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-slate-400">
                                    <span>IVA (19%)</span>
                                    <span>{formatCLP(taxTotal)}</span>
                                </div>
                                <div className="h-px bg-slate-700 my-2"></div>
                                <div className="flex justify-between text-xl font-bold text-white">
                                    <span>Total</span>
                                    <span>{formatCLP(total)}</span>
                                </div>
                            </div>

                            <div className="mt-8 space-y-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Fecha Emisión</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                                        value={newInvoice.date}
                                        onChange={e => setNewInvoice({ ...newInvoice, date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Forma de Pago</label>
                                    <select
                                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                                        value={newInvoice.paymentMethod}
                                        onChange={e => setNewInvoice({ ...newInvoice, paymentMethod: e.target.value as PaymentMethod })}
                                    >
                                        <option value="TRANSFER">Transferencia</option>
                                        <option value="CASH">Efectivo</option>
                                        <option value="CREDIT">Crédito</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                onClick={handleSaveInvoice}
                                disabled={newInvoice.items.length === 0}
                                className="w-full mt-6 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save size={18} /> Emitir Documento
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                // --- INVOICE HISTORY LIST ---
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar folio o cliente..."
                                className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-64 focus:ring-2 focus:ring-purple-500 outline-none"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="text-xs text-slate-500">
                            Mostrando {invoices.length} documentos
                        </div>
                    </div>

                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3">Folio</th>
                                <th className="px-4 py-3">Fecha</th>
                                <th className="px-4 py-3">Cliente</th>
                                <th className="px-4 py-3 text-right">Neto</th>
                                <th className="px-4 py-3 text-right">IVA</th>
                                <th className="px-4 py-3 text-right">Total</th>
                                <th className="px-4 py-3 text-center">Estado</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {invoices.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                                        No se han emitido documentos aún. Click en "Nueva Venta" para comenzar.
                                    </td>
                                </tr>
                            ) : (
                                invoices
                                    .filter(i => i.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || i.folio.toString().includes(searchTerm))
                                    .sort((a, b) => b.folio - a.folio)
                                    .map(invoice => (
                                        <tr key={invoice.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 font-mono font-bold text-slate-700">#{invoice.folio}</td>
                                            <td className="px-4 py-3 text-slate-600">{invoice.date}</td>
                                            <td className="px-4 py-3">
                                                <div className="font-bold text-slate-800">{invoice.customerName}</div>
                                                <div className="text-xs text-slate-500">{invoice.customerRut}</div>
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-600">{formatCLP(invoice.netTotal)}</td>
                                            <td className="px-4 py-3 text-right text-slate-500">{formatCLP(invoice.taxTotal)}</td>
                                            <td className="px-4 py-3 text-right font-bold text-slate-800">{formatCLP(invoice.total)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700">
                                                    {invoice.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => generateInvoicePDF(invoice)}
                                                        className="text-purple-600 hover:text-purple-800 font-medium text-xs flex items-center gap-1"
                                                    >
                                                        <Printer size={14} /> PDF
                                                    </button>
                                                    {invoice.type !== 'NOTA_CREDITO' && invoice.status !== 'VOID' && (
                                                        <button
                                                            onClick={() => setCreditNoteModal({ isOpen: true, invoice })}
                                                            className="text-rose-500 hover:text-rose-700 font-medium text-xs flex items-center gap-1"
                                                        >
                                                            <Trash size={14} /> NC
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Credit Note Modal */}
            {creditNoteModal.isOpen && creditNoteModal.invoice && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <FileText className="text-rose-500" /> Emitir Nota de Crédito
                        </h3>
                        <div className="bg-rose-50 border border-rose-100 rounded-lg p-4 mb-4">
                            <p className="text-sm text-rose-700">
                                Esta acción <strong>anulará</strong> la Factura #{creditNoteModal.invoice.folio} y:
                            </p>
                            <ul className="text-xs text-rose-600 mt-2 list-disc ml-4 space-y-1">
                                <li>Devolverá el stock al inventario</li>
                                <li>Reversará los asientos contables</li>
                                <li>Registrará la NC en el Libro de Ventas</li>
                            </ul>
                        </div>
                        <div className="mb-4">
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Documento a Anular</label>
                            <p className="text-sm font-mono bg-slate-100 p-2 rounded">
                                {creditNoteModal.invoice.type} #{creditNoteModal.invoice.folio} - {creditNoteModal.invoice.customerName}
                            </p>
                            <p className="text-right text-sm font-bold mt-1">{formatCLP(creditNoteModal.invoice.total)}</p>
                        </div>
                        <div className="mb-6">
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Motivo de la Nota de Crédito *</label>
                            <select
                                className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                                value={creditNoteReason}
                                onChange={e => setCreditNoteReason(e.target.value)}
                            >
                                <option value="">-- Seleccione motivo --</option>
                                <option value="Anulación de la operación">Anulación de la operación</option>
                                <option value="Devolución de mercaderías">Devolución de mercaderías</option>
                                <option value="Error en facturación">Error en facturación</option>
                                <option value="Descuento posterior">Descuento posterior</option>
                            </select>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setCreditNoteModal({ isOpen: false, invoice: null })}>
                                Cancelar
                            </Button>
                            <Button onClick={handleEmitCreditNote} className="bg-rose-600 hover:bg-rose-700">
                                Emitir Nota de Crédito
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .input-std {
                    border: 1px solid #e2e8f0;
                    border-radius: 0.5rem;
                    padding: 0.5rem 0.75rem;
                    font-size: 0.875rem;
                    outline: none;
                    transition: all 0.2s;
                }
                .input-std:focus {
                    border-color: #a855f7;
                    box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.1);
                }
            `}</style>
        </div>
    );
};
