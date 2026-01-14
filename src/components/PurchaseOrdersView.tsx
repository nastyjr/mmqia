import React, { useState, useEffect } from 'react';
import { PurchaseOrder, POItem, POStatus } from '../types/purchase-order';
import { ThirdParty } from '../types/crm';
import { Product } from '../types/inventory';
import { useAccounting } from '../context/AccountingContext';
import { ArrowLeft, Plus, Download, Truck, CheckCircle, Save, Trash2, Search, Printer, Edit2, X, MoreHorizontal } from 'lucide-react';
import { Button } from './Button';
import { exportToExcel } from '../utils/excelExport';
import { purchaseOrdersService, thirdPartiesService, productsService, stockMovementsService, iecService, storageLocationsService, productStocksService } from '../services/databaseService';
import { calculateOrderTotals, TaxCategory } from '../utils/taxEngine';

interface PurchaseOrdersViewProps {
    onBack: () => void;
}

export const PurchaseOrdersView: React.FC<PurchaseOrdersViewProps> = ({ onBack }) => {
    const { saveEntry } = useAccounting();

    // Data
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [suppliers, setSuppliers] = useState<ThirdParty[]>([]);
    const [products, setProducts] = useState<Product[]>([]);

    // UI View Mode
    const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
    const [searchTerm, setSearchTerm] = useState('');

    // Form State (Single Page Design)
    const [currentOrder, setCurrentOrder] = useState<Partial<PurchaseOrder>>({
        date: new Date().toISOString().split('T')[0],
        expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [],
        status: 'DRAFT',
        supplierId: ''
    });

    // Load Data
    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const [fetchedOrders, fetchedSuppliers, fetchedProducts] = await Promise.all([
                purchaseOrdersService.getAll(),
                thirdPartiesService.getByType('PROVEEDOR'),
                productsService.getAll()
            ]);

            // Map Orders (including new tax fields)
            const mappedOrders = fetchedOrders.map((o: any) => ({
                ...o,
                supplierId: o.supplier_id,
                supplierRut: o.supplier_rut,
                supplierName: o.supplier_name,
                expectedDate: o.expected_date || o.date,
                subtotal: o.net_amount || o.subtotal, // Fallback for old records
                taxAmount: o.tax_19_amount || o.tax_amount,
                ilaAmount: o.tax_ila_amount || 0,
                exemptAmount: o.exempt_amount || 0,
                createdAt: o.created_at,
                items: (o.purchase_order_items || []).map((i: any) => ({
                    id: i.id,
                    productId: i.product_id,
                    productName: i.product_name,
                    quantity: i.quantity,
                    unitCost: i.net_cost || i.unit_cost,
                    totalCost: i.quantity * (i.net_cost || i.unit_cost),
                    taxCategory: i.tax_category || 'AFECTO'
                }))
            }));

            setOrders(mappedOrders);
            setSuppliers((fetchedSuppliers as any[]).filter(s => s.type === 'PROVEEDOR' || s.type === 'AMBOS'));
            setProducts(fetchedProducts as any);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    // FORM HANDLERS
    const handleAddLine = () => {
        const newItem: POItem = {
            id: crypto.randomUUID(),
            productId: '',
            productName: '',
            quantity: 1,
            unitCost: 0,
            totalCost: 0,
            taxCategory: 'AFECTO'
        };
        setCurrentOrder(prev => ({ ...prev, items: [...(prev.items || []), newItem] }));
    };

    const handleRemoveLine = (id: string) => {
        setCurrentOrder(prev => ({ ...prev, items: prev.items?.filter(i => i.id !== id) }));
    };

    const handleLineChange = (id: string, field: keyof POItem, value: any) => {
        setCurrentOrder(prev => {
            const newItems = prev.items?.map(item => {
                if (item.id !== id) return item;

                const updatedItem = { ...item, [field]: value };

                // If product changed, load defaults
                if (field === 'productId') {
                    const prod = products.find(p => p.id === value);
                    if (prod) {
                        updatedItem.productName = prod.name;
                        updatedItem.unitCost = prod.lastPurchasePrice || 0;
                        updatedItem.taxCategory = (prod as any).tax_category || 'AFECTO'; // Assuming prop exists from DB
                    }
                }

                // Recalculate line total (Net)
                updatedItem.totalCost = Math.round(updatedItem.quantity * updatedItem.unitCost);
                return updatedItem;
            }) || [];

            return { ...prev, items: newItems };
        });
    };

    // Calculate Totals Live
    const totals = calculateOrderTotals((currentOrder.items || []).map(i => ({
        netCost: i.unitCost,
        quantity: i.quantity,
        taxCategory: i.taxCategory
    })));

    const handleSave = async () => {
        if (!currentOrder.supplierId || !currentOrder.items?.length) return alert('Faltan datos obligatorios');

        try {
            const supplier = suppliers.find(s => s.id === currentOrder.supplierId);
            const num = currentOrder.number || `OC-${String(orders.length + 1).padStart(4, '0')}`;

            const orderDB = {
                number: num,
                date: currentOrder.date,
                expected_date: currentOrder.expectedDate,
                supplier_id: supplier?.id,
                supplier_rut: supplier?.rut,
                supplier_name: supplier?.name,

                // New Tax Fields
                net_amount: totals.netTotal,
                tax_19_amount: totals.ivaTotal,
                tax_ila_amount: totals.ilaTotal,
                exempt_amount: totals.exemptTotal,
                total: totals.grandTotal,

                status: 'PENDING',
                created_by: 'Admin'
            };

            const itemsDB = currentOrder.items.map(i => ({
                product_id: i.productId,
                product_name: i.productName,
                quantity: i.quantity,
                net_cost: i.unitCost, // Storing NET cost
                tax_category: i.taxCategory
            }));

            await purchaseOrdersService.create(orderDB, itemsDB);
            await loadData();
            setViewMode('LIST');
            alert('Orden Guardada Exitosamente');
        } catch (e: any) {
            alert('Error al guardar: ' + e.message);
        }
    };

    const formatCLP = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

    // RENDER LIST
    if (viewMode === 'LIST') {
        return (
            <div className="animate-in fade-in space-y-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full"><ArrowLeft /></button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Órdenes de Compra</h1>
                            <p className="text-slate-500 text-sm">Gestión de abastecimiento e impuestos</p>
                        </div>
                    </div>
                    <Button onClick={() => {
                        setCurrentOrder({ date: new Date().toISOString().split('T')[0], items: [], status: 'DRAFT', supplierId: '' });
                        setViewMode('FORM');
                    }} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="mr-2" size={18} /> Nueva Orden
                    </Button>
                </div>

                {/* Data Grid */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b">
                            <tr>
                                <th className="p-4">N° Orden</th>
                                <th className="p-4">Proveedor</th>
                                <th className="p-4">Fecha</th>
                                <th className="p-4 text-right">Neto</th>
                                <th className="p-4 text-right">Impuestos</th>
                                <th className="p-4 text-right">Total</th>
                                <th className="p-4 text-center">Estado</th>
                                <th className="p-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {orders.map(order => (
                                <tr key={order.id} className="hover:bg-slate-50 group transition-colors">
                                    <td className="p-4 font-mono font-bold text-blue-600">{order.number}</td>
                                    <td className="p-4">
                                        <div className="font-bold text-slate-700">{order.supplierName}</div>
                                        <div className="text-xs text-slate-400">{order.supplierRut}</div>
                                    </td>
                                    <td className="p-4 text-slate-600">{order.date}</td>
                                    <td className="p-4 text-right font-mono text-slate-600">{formatCLP(order.subtotal)}</td>
                                    <td className="p-4 text-right font-mono text-xs text-slate-500">
                                        <div>IVA: {formatCLP(order.taxAmount)}</div>
                                        {/* @ts-ignore */}
                                        {(order.ilaAmount > 0) && <div className="text-orange-500">ILA: {formatCLP(order.ilaAmount)}</div>}
                                    </td>
                                    <td className="p-4 text-right font-bold text-slate-800">{formatCLP(order.total)}</td>
                                    <td className="p-4 text-center">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${order.status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-700' :
                                                order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'
                                            }`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button className="text-slate-400 hover:text-blue-600"><Edit2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // RENDER FORM (SINGLE PAGE DESIGN)
    return (
        <div className="animate-in slide-in-from-bottom-4 bg-slate-50 min-h-screen pb-20">
            {/* Toolbar */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => setViewMode('LIST')} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Nueva Orden de Compra</h2>
                        <p className="text-xs text-slate-500">Creación de documento borrador</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setViewMode('LIST')}>Cancelar</Button>
                    <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200">
                        <Save size={18} className="mr-2" />
                        Guardar Orden
                    </Button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-6 space-y-6">
                {/* 1. Header Information */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Encabezado del Documento</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Proveedor *</label>
                            <select
                                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                                value={currentOrder.supplierId}
                                onChange={e => setCurrentOrder({ ...currentOrder, supplierId: e.target.value })}
                            >
                                <option value="">-- Seleccionar Proveedor --</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.rut})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Fecha Emisión</label>
                            <input
                                type="date"
                                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                value={currentOrder.date}
                                onChange={e => setCurrentOrder({ ...currentOrder, date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Fecha Entrega Est.</label>
                            <input
                                type="date"
                                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
                                value={currentOrder.expectedDate}
                                onChange={e => setCurrentOrder({ ...currentOrder, expectedDate: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* 2. Items Grid */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[400px]">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Detalle de Productos</h3>
                        <button onClick={handleAddLine} className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1">
                            <Plus size={14} /> Agregar Línea
                        </button>
                    </div>

                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white text-slate-500 font-bold border-b text-xs uppercase">
                                <tr>
                                    <th className="p-3 w-10">#</th>
                                    <th className="p-3 min-w-[200px]">Producto</th>
                                    <th className="p-3 w-24 text-right">Cantidad</th>
                                    <th className="p-3 w-32 text-right">Costo Neto</th>
                                    <th className="p-3 w-32">Impuesto</th>
                                    <th className="p-3 w-32 text-right">Subtotal</th>
                                    <th className="p-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {currentOrder.items?.map((item, idx) => (
                                    <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="p-3 text-center text-slate-400 text-xs">{idx + 1}</td>
                                        <td className="p-3">
                                            {/* Product Selector */}
                                            {item.productId ? (
                                                <div className="flex items-center justify-between group">
                                                    <span className="font-medium text-slate-700">{item.productName}</span>
                                                    <button onClick={() => handleLineChange(item.id, 'productId', '')} className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-600">Cambiar</button>
                                                </div>
                                            ) : (
                                                <select
                                                    className="w-full border border-blue-200 rounded p-1 text-sm focus:ring-2 focus:ring-blue-500"
                                                    onChange={e => handleLineChange(item.id, 'productId', e.target.value)}
                                                    autoFocus
                                                >
                                                    <option value="">Buscar producto...</option>
                                                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>)}
                                                </select>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            <input
                                                type="number" min="1"
                                                className="w-full text-right border border-slate-200 rounded p-1"
                                                value={item.quantity}
                                                onChange={e => handleLineChange(item.id, 'quantity', Number(e.target.value))}
                                            />
                                        </td>
                                        <td className="p-3">
                                            <input
                                                type="number" min="0"
                                                className="w-full text-right border border-slate-200 rounded p-1"
                                                value={item.unitCost}
                                                onChange={e => handleLineChange(item.id, 'unitCost', Number(e.target.value))}
                                            />
                                        </td>
                                        <td className="p-3">
                                            <select
                                                className="w-full border border-slate-200 rounded p-1 text-xs"
                                                value={item.taxCategory}
                                                onChange={e => handleLineChange(item.id, 'taxCategory', e.target.value)}
                                            >
                                                <option value="AFECTO">19% IVA</option>
                                                <option value="EXENTO">Exento</option>
                                                <option value="ILA_10">ILA 10% (Bebidas)</option>
                                                <option value="ILA_18">ILA 18% (Vinos)</option>
                                                <option value="ILA_31">ILA 31.5% (Licores)</option>
                                            </select>
                                        </td>
                                        <td className="p-3 text-right font-mono text-slate-700">
                                            {formatCLP(item.totalCost)}
                                        </td>
                                        <td className="p-3 text-center">
                                            <button onClick={() => handleRemoveLine(item.id)} className="text-slate-300 hover:text-red-500">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {(!currentOrder.items || currentOrder.items.length === 0) && (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-slate-400 italic bg-slate-50">
                                            No hay productos en la orden. Agrega una línea para comenzar.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer Totals */}
                    <div className="bg-slate-50 border-t border-slate-200 p-6 flex flex-col items-end gap-2">
                        <div className="flex justify-between w-64 text-sm text-slate-600">
                            <span>Subtotal Neto:</span>
                            <span className="font-mono">{formatCLP(totals.netTotal)}</span>
                        </div>
                        {totals.exemptTotal > 0 && (
                            <div className="flex justify-between w-64 text-sm text-slate-500">
                                <span>Monto Exento:</span>
                                <span className="font-mono">{formatCLP(totals.exemptTotal)}</span>
                            </div>
                        )}
                        <div className="flex justify-between w-64 text-sm text-slate-600">
                            <span>IVA (19%):</span>
                            <span className="font-mono">{formatCLP(totals.ivaTotal)}</span>
                        </div>
                        {totals.ilaTotal > 0 && (
                            <div className="flex justify-between w-64 text-sm text-orange-600 font-bold">
                                <span>Imp. Adicional (ILA):</span>
                                <span className="font-mono">{formatCLP(totals.ilaTotal)}</span>
                            </div>
                        )}
                        <div className="flex justify-between w-64 text-xl font-bold text-slate-800 pt-2 border-t border-slate-300 mt-2">
                            <span>Total General:</span>
                            <span>{formatCLP(totals.grandTotal)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
