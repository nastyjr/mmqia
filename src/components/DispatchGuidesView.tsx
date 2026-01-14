import React, { useState, useEffect } from 'react';
import { DispatchGuide, DispatchGuideItem, DispatchGuideStatus } from '../types/dispatch-guide';
import { ThirdParty } from '../types/crm';
import { Product, StockMovement } from '../types/inventory';
import { ArrowLeft, Plus, Search, Truck, Package, CheckCircle, Clock, XCircle, Download, Printer, MapPin } from 'lucide-react';
import { Button } from './Button';
import { exportToExcel } from '../utils/excelExport';
import jsPDF from 'jspdf';

interface DispatchGuidesViewProps {
    onBack: () => void;
}

export const DispatchGuidesView: React.FC<DispatchGuidesViewProps> = ({ onBack }) => {
    // Data
    const [guides, setGuides] = useState<DispatchGuide[]>([]);
    const [customers, setCustomers] = useState<ThirdParty[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

    // UI State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<DispatchGuideStatus | 'ALL'>('ALL');

    // Form State
    const [newGuide, setNewGuide] = useState<Partial<DispatchGuide>>({
        date: new Date().toISOString().split('T')[0],
        items: [],
        status: 'DRAFT',
        transportType: 'PROPIO'
    });
    const [selectedProduct, setSelectedProduct] = useState('');
    const [qtyToAdd, setQtyToAdd] = useState(1);

    // Load Data
    useEffect(() => {
        const savedGuides = localStorage.getItem('dispatch_guides');
        if (savedGuides) setGuides(JSON.parse(savedGuides));

        const savedCustomers = localStorage.getItem('crm_directory');
        if (savedCustomers) setCustomers(JSON.parse(savedCustomers).filter((c: ThirdParty) => c.type === 'CLIENTE' || c.type === 'AMBOS'));

        const savedProducts = localStorage.getItem('inventory_products');
        if (savedProducts) setProducts(JSON.parse(savedProducts));
    }, []);

    // Save Guides
    useEffect(() => {
        localStorage.setItem('dispatch_guides', JSON.stringify(guides));
    }, [guides]);

    // Computed
    const subtotal = (newGuide.items || []).reduce((sum, item) => sum + item.totalNet, 0);

    // Handlers
    const handleAddItem = () => {
        if (!selectedProduct) return;
        const product = products.find(p => p.id === selectedProduct);
        if (!product) return;

        // Check stock
        if (product.currentStock < qtyToAdd) {
            alert(`Stock insuficiente. Disponible: ${product.currentStock}`);
            return;
        }

        const item: DispatchGuideItem = {
            id: crypto.randomUUID(),
            productId: product.id,
            productName: product.name,
            quantity: qtyToAdd,
            unitPrice: product.sellingPrice,
            totalNet: Math.round(product.sellingPrice * qtyToAdd)
        };

        setNewGuide({ ...newGuide, items: [...(newGuide.items || []), item] });
        setSelectedProduct('');
        setQtyToAdd(1);
    };

    const handleRemoveItem = (id: string) => {
        setNewGuide({ ...newGuide, items: (newGuide.items || []).filter(i => i.id !== id) });
    };

    const handleSaveGuide = () => {
        if (!newGuide.customerId || !newGuide.items?.length) {
            alert('Seleccione cliente y agregue productos');
            return;
        }

        const customer = customers.find(c => c.id === newGuide.customerId);
        if (!customer) return;

        const guideNumber = `GD-${String(guides.length + 1).padStart(4, '0')}`;

        const guide: DispatchGuide = {
            id: crypto.randomUUID(),
            number: guideNumber,
            date: newGuide.date!,
            customerId: customer.id,
            customerRut: customer.rut,
            customerName: customer.name,
            destinationAddress: newGuide.destinationAddress || customer.address || '',
            transportType: newGuide.transportType!,
            driverName: newGuide.driverName,
            vehiclePlate: newGuide.vehiclePlate,
            items: newGuide.items!,
            subtotal,
            status: 'DISPATCHED',
            observations: newGuide.observations,
            createdAt: new Date().toISOString(),
            createdBy: 'Admin'
        };

        // Update inventory (reduce stock)
        const updatedProducts = [...products];
        const movements: StockMovement[] = JSON.parse(localStorage.getItem('inventory_movements') || '[]');

        guide.items.forEach(item => {
            const productIndex = updatedProducts.findIndex(p => p.id === item.productId);
            if (productIndex >= 0) {
                const product = updatedProducts[productIndex];
                const newStock = product.currentStock - item.quantity;

                updatedProducts[productIndex] = {
                    ...product,
                    currentStock: newStock
                };

                movements.push({
                    id: crypto.randomUUID(),
                    productId: product.id,
                    date: guide.date,
                    type: 'DESPACHO',
                    quantity: -item.quantity,
                    unitCost: product.weightedAverageCost,
                    totalValue: item.quantity * product.weightedAverageCost,
                    documentRef: guideNumber,
                    stockAfter: newStock,
                    pmpAfter: product.weightedAverageCost
                });
            }
        });

        setProducts(updatedProducts);
        localStorage.setItem('inventory_products', JSON.stringify(updatedProducts));
        localStorage.setItem('inventory_movements', JSON.stringify(movements));

        setGuides([...guides, guide]);
        setNewGuide({
            date: new Date().toISOString().split('T')[0],
            items: [],
            status: 'DRAFT',
            transportType: 'PROPIO'
        });
        setIsFormOpen(false);
        alert(`Guía de Despacho ${guideNumber} creada. Stock actualizado.`);
    };

    const handleUpdateStatus = (guide: DispatchGuide, newStatus: DispatchGuideStatus) => {
        const updatedGuides = guides.map(g =>
            g.id === guide.id ? { ...g, status: newStatus } : g
        );
        setGuides(updatedGuides);
    };

    const handleGeneratePDF = (guide: DispatchGuide) => {
        const doc = new jsPDF();

        // Header
        doc.setFillColor(16, 185, 129);
        doc.rect(0, 0, 220, 35, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('GUÍA DE DESPACHO', 15, 18);

        doc.setFontSize(14);
        doc.text(guide.number, 15, 28);

        doc.setFontSize(10);
        doc.text(`Fecha: ${guide.date}`, 160, 15, { align: 'right' });
        doc.text(`Estado: ${guide.status}`, 160, 23, { align: 'right' });

        // Customer Info
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Destinatario:', 15, 50);
        doc.setFont('helvetica', 'normal');
        doc.text(guide.customerName, 15, 57);
        doc.text(`RUT: ${guide.customerRut}`, 15, 64);
        doc.text(`Dirección: ${guide.destinationAddress}`, 15, 71);

        // Transport Info
        doc.setFont('helvetica', 'bold');
        doc.text('Transporte:', 120, 50);
        doc.setFont('helvetica', 'normal');
        doc.text(`Tipo: ${guide.transportType}`, 120, 57);
        if (guide.driverName) doc.text(`Chofer: ${guide.driverName}`, 120, 64);
        if (guide.vehiclePlate) doc.text(`Patente: ${guide.vehiclePlate}`, 120, 71);

        // Items Table
        let y = 85;
        doc.setFillColor(241, 245, 249);
        doc.rect(15, y - 5, 180, 10, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Producto', 17, y + 2);
        doc.text('Cantidad', 130, y + 2);

        y += 12;
        doc.setFont('helvetica', 'normal');

        guide.items.forEach(item => {
            doc.text(item.productName.substring(0, 50), 17, y);
            doc.text(item.quantity.toString(), 130, y);
            y += 8;
        });

        // Observations
        if (guide.observations) {
            y += 10;
            doc.setFont('helvetica', 'bold');
            doc.text('Observaciones:', 15, y);
            doc.setFont('helvetica', 'normal');
            doc.text(guide.observations, 15, y + 7);
        }

        // Signature lines
        y += 30;
        doc.setDrawColor(100, 100, 100);
        doc.line(20, y, 80, y);
        doc.line(120, y, 180, y);
        doc.setFontSize(8);
        doc.text('Despachador', 50, y + 5, { align: 'center' });
        doc.text('Recepción Conforme', 150, y + 5, { align: 'center' });

        doc.save(`GuiaDespacho_${guide.number}.pdf`);
    };

    const formatCLP = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

    const getStatusBadge = (status: DispatchGuideStatus) => {
        const styles: Record<DispatchGuideStatus, string> = {
            DRAFT: 'bg-slate-100 text-slate-700',
            DISPATCHED: 'bg-blue-100 text-blue-700',
            DELIVERED: 'bg-emerald-100 text-emerald-700',
            CANCELLED: 'bg-rose-100 text-rose-700'
        };
        const labels: Record<DispatchGuideStatus, string> = {
            DRAFT: 'Borrador',
            DISPATCHED: 'Despachado',
            DELIVERED: 'Entregado',
            CANCELLED: 'Anulada'
        };
        return <span className={`px-2 py-1 rounded text-xs font-bold ${styles[status]}`}>{labels[status]}</span>;
    };

    const filteredGuides = guides.filter(g => {
        const matchesSearch = g.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.customerName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'ALL' || g.status === filterStatus;
        return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Stats
    const stats = {
        dispatched: guides.filter(g => g.status === 'DISPATCHED').length,
        delivered: guides.filter(g => g.status === 'DELIVERED').length,
        total: guides.length
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
                            <Truck className="text-emerald-600" /> Guías de Despacho
                        </h1>
                        <p className="text-slate-500 text-sm">Documentos de traslado de mercadería</p>
                    </div>
                </div>
                <Button onClick={() => setIsFormOpen(true)}>
                    <Plus size={16} className="mr-2" /> Nueva Guía
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Clock size={16} className="text-blue-600" />
                        <p className="text-xs font-bold text-blue-700 uppercase">En Tránsito</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-700">{stats.dispatched}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <CheckCircle size={16} className="text-emerald-600" />
                        <p className="text-xs font-bold text-emerald-700 uppercase">Entregadas</p>
                    </div>
                    <p className="text-2xl font-bold text-emerald-700">{stats.delivered}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-bold text-slate-700 uppercase">Total Guías</p>
                    <p className="text-2xl font-bold text-slate-700">{stats.total}</p>
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
                        onChange={e => setFilterStatus(e.target.value as DispatchGuideStatus | 'ALL')}
                    >
                        <option value="ALL">Todos los estados</option>
                        <option value="DISPATCHED">Despachados</option>
                        <option value="DELIVERED">Entregados</option>
                        <option value="CANCELLED">Anuladas</option>
                    </select>
                </div>
            </div>

            {/* Guides Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-xs">
                        <tr>
                            <th className="px-4 py-3">N° Guía</th>
                            <th className="px-4 py-3">Fecha</th>
                            <th className="px-4 py-3">Destinatario</th>
                            <th className="px-4 py-3">Items</th>
                            <th className="px-4 py-3">Estado</th>
                            <th className="px-4 py-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredGuides.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                <Package size={40} className="mx-auto mb-2 opacity-50" />
                                No hay guías de despacho. Haz click en "Nueva Guía" para crear una.
                            </td></tr>
                        ) : filteredGuides.map(guide => (
                            <tr key={guide.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-mono font-bold text-emerald-600">{guide.number}</td>
                                <td className="px-4 py-3 text-slate-600">{guide.date}</td>
                                <td className="px-4 py-3">
                                    <div className="font-medium text-slate-700">{guide.customerName}</div>
                                    <div className="text-xs text-slate-400 flex items-center gap-1">
                                        <MapPin size={10} /> {guide.destinationAddress?.substring(0, 30)}...
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-center">{guide.items.length}</td>
                                <td className="px-4 py-3">{getStatusBadge(guide.status)}</td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleGeneratePDF(guide)}
                                            className="text-emerald-600 hover:text-emerald-800 text-xs font-medium flex items-center gap-1"
                                        >
                                            <Printer size={14} /> PDF
                                        </button>
                                        {guide.status === 'DISPATCHED' && (
                                            <button
                                                onClick={() => handleUpdateStatus(guide, 'DELIVERED')}
                                                className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1"
                                            >
                                                <CheckCircle size={14} /> Entregado
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* New Guide Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm p-4 overflow-auto">
                    <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-6 my-8">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <Truck className="text-emerald-600" /> Nueva Guía de Despacho
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left Column */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Cliente / Destinatario *</label>
                                    <select
                                        className="w-full border rounded-lg p-2 text-sm"
                                        value={newGuide.customerId || ''}
                                        onChange={e => {
                                            const customer = customers.find(c => c.id === e.target.value);
                                            setNewGuide({
                                                ...newGuide,
                                                customerId: e.target.value,
                                                destinationAddress: customer?.address || ''
                                            });
                                        }}
                                    >
                                        <option value="">-- Seleccionar --</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.rut})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Dirección de Despacho</label>
                                    <input
                                        type="text"
                                        className="w-full border rounded-lg p-2 text-sm"
                                        value={newGuide.destinationAddress || ''}
                                        onChange={e => setNewGuide({ ...newGuide, destinationAddress: e.target.value })}
                                        placeholder="Dirección de entrega..."
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">Fecha</label>
                                        <input
                                            type="date"
                                            className="w-full border rounded-lg p-2 text-sm"
                                            value={newGuide.date}
                                            onChange={e => setNewGuide({ ...newGuide, date: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">Transporte</label>
                                        <select
                                            className="w-full border rounded-lg p-2 text-sm"
                                            value={newGuide.transportType}
                                            onChange={e => setNewGuide({ ...newGuide, transportType: e.target.value as any })}
                                        >
                                            <option value="PROPIO">Propio</option>
                                            <option value="TERCERO">Tercero</option>
                                            <option value="CLIENTE">Retiro Cliente</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">Chofer</label>
                                        <input
                                            type="text"
                                            className="w-full border rounded-lg p-2 text-sm"
                                            value={newGuide.driverName || ''}
                                            onChange={e => setNewGuide({ ...newGuide, driverName: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">Patente</label>
                                        <input
                                            type="text"
                                            className="w-full border rounded-lg p-2 text-sm"
                                            value={newGuide.vehiclePlate || ''}
                                            onChange={e => setNewGuide({ ...newGuide, vehiclePlate: e.target.value.toUpperCase() })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Observaciones</label>
                                    <textarea
                                        className="w-full border rounded-lg p-2 text-sm"
                                        rows={2}
                                        value={newGuide.observations || ''}
                                        onChange={e => setNewGuide({ ...newGuide, observations: e.target.value })}
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
                                            {products.filter(p => p.currentStock > 0).map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} (Stock: {p.currentStock})
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
                                <div className="border rounded-lg overflow-hidden max-h-52 overflow-y-auto">
                                    <table className="w-full text-xs">
                                        <thead className="bg-slate-50 sticky top-0">
                                            <tr>
                                                <th className="px-2 py-2 text-left">Producto</th>
                                                <th className="px-2 py-2 text-center">Cantidad</th>
                                                <th className="px-2 py-2"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {(newGuide.items || []).map(item => (
                                                <tr key={item.id}>
                                                    <td className="px-2 py-2">{item.productName}</td>
                                                    <td className="px-2 py-2 text-center">{item.quantity}</td>
                                                    <td className="px-2 py-2">
                                                        <button onClick={() => handleRemoveItem(item.id)} className="text-rose-400 hover:text-rose-600">×</button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(newGuide.items || []).length === 0 && (
                                                <tr><td colSpan={3} className="px-2 py-4 text-center text-slate-400">Sin productos</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Info Note */}
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                                    <strong>⚠️ Importante:</strong> Al crear la Guía de Despacho, el stock se descontará automáticamente del inventario.
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                            <Button variant="secondary" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSaveGuide} disabled={!newGuide.customerId || !(newGuide.items?.length)}>
                                <Truck size={16} className="mr-2" /> Crear y Despachar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
