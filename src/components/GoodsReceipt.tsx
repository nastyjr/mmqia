import React, { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle, ArrowLeft, AlertCircle, X } from 'lucide-react';
import { Button } from './Button';
import { purchaseOrdersService } from '../services/databaseService';
import { PurchaseOrder, POItem } from '../types/purchase-order';

export const GoodsReceipt: React.FC = () => {
    const [viewMode, setViewMode] = useState<'LIST' | 'DETAIL'>('LIST');
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
    const [receivedItems, setReceivedItems] = useState<{ productId: string; receivedQty: number; unitCost: number }[]>([]);
    const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            const allOrders = await purchaseOrdersService.getAll();
            // Map and filter pending orders
            const pendingOrders = allOrders
                .map((o: any) => ({
                    ...o,
                    supplierId: o.supplier_id,
                    supplierRut: o.supplier_rut,
                    supplierName: o.supplier_name,
                    expectedDate: o.expected_date || o.date,
                    subtotal: o.net_amount || o.subtotal,
                    taxAmount: o.tax_19_amount || o.tax_amount,
                    createdAt: o.created_at,
                    items: (o.purchase_order_items || []).map((i: any) => ({
                        id: i.id,
                        productId: i.product_id,
                        productName: i.product_name,
                        quantity: i.quantity,
                        unitCost: i.net_cost || i.unit_cost,
                        totalCost: i.quantity * (i.net_cost || i.unit_cost),
                        taxCategory: i.tax_category || 'AFECTO',
                        receivedQty: 0
                    }))
                }))
                .filter((o: PurchaseOrder) => o.status === 'PENDING' || o.status === 'SENT');

            setOrders(pendingOrders);
        } catch (error) {
            console.error('Error loading orders:', error);
        }
    };

    const handleSelectOrder = (order: PurchaseOrder) => {
        setSelectedOrder(order);
        // Initialize received quantities to ordered quantities
        setReceivedItems(order.items.map(item => ({
            productId: item.productId,
            receivedQty: item.quantity, // Default to full order
            unitCost: item.unitCost
        })));
        setViewMode('DETAIL');
    };

    const handleUpdateReceivedQty = (productId: string, qty: number) => {
        setReceivedItems(prev =>
            prev.map(item =>
                item.productId === productId ? { ...item, receivedQty: qty } : item
            )
        );
    };

    const handleConfirmReceipt = async () => {
        if (!selectedOrder) return;

        try {
            setLoading(true);
            await purchaseOrdersService.receive(selectedOrder.id, receiptDate, receivedItems);
            alert('✅ Recepción confirmada. El stock ha sido actualizado.');
            setViewMode('LIST');
            setSelectedOrder(null);
            await loadOrders();
        } catch (error: any) {
            alert('❌ Error al confirmar recepción: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const formatCLP = (val: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);

    // LIST VIEW
    if (viewMode === 'LIST') {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Truck className="text-emerald-500" /> Recepción de Mercadería (GR01)
                </h2>

                {orders.length === 0 ? (
                    <div className="p-12 text-center bg-slate-50 rounded-lg border border-dashed border-slate-300">
                        <Package size={48} className="mx-auto text-slate-400 mb-4" />
                        <h3 className="text-lg font-medium text-slate-700">No hay Órdenes Pendientes</h3>
                        <p className="text-slate-500 mt-2">Todas las órdenes de compra han sido recepcionadas o están en borrador.</p>
                    </div>
                ) : (
                    <div className="overflow-hidden border border-slate-200 rounded-lg">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-600 font-bold border-b">
                                <tr>
                                    <th className="p-3">N° Orden</th>
                                    <th className="p-3">Proveedor</th>
                                    <th className="p-3">Fecha</th>
                                    <th className="p-3 text-right">Total</th>
                                    <th className="p-3">Estado</th>
                                    <th className="p-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {orders.map(order => (
                                    <tr key={order.id} className="hover:bg-slate-50">
                                        <td className="p-3 font-mono font-bold text-blue-600">{order.number}</td>
                                        <td className="p-3">
                                            <div className="font-bold text-slate-700">{order.supplierName}</div>
                                            <div className="text-xs text-slate-400">{order.supplierRut}</div>
                                        </td>
                                        <td className="p-3 text-slate-600">{order.date}</td>
                                        <td className="p-3 text-right font-mono text-slate-800">{formatCLP(order.total)}</td>
                                        <td className="p-3">
                                            <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-700">
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right">
                                            <Button
                                                variant="secondary"
                                                onClick={() => handleSelectOrder(order)}
                                                className="text-xs"
                                            >
                                                Recepcionar
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    }

    // DETAIL VIEW
    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-emerald-600 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setViewMode('LIST')}
                        className="p-2 bg-emerald-700 hover:bg-emerald-800 rounded-full transition-colors"
                    >
                        <ArrowLeft className="text-white" size={20} />
                    </button>
                    <div>
                        <h2 className="text-white font-bold text-lg">Confirmar Recepción</h2>
                        <p className="text-emerald-100 text-xs">Orden {selectedOrder?.number}</p>
                    </div>
                </div>
                <Button
                    onClick={handleConfirmReceipt}
                    disabled={loading}
                    className="bg-white text-emerald-600 hover:bg-emerald-50"
                >
                    <CheckCircle className="mr-2" size={18} />
                    {loading ? 'Procesando...' : 'Confirmar Recepción'}
                </Button>
            </div>

            <div className="p-6 space-y-6">
                {/* Order Info */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                            <span className="text-slate-500 font-medium">Proveedor:</span>
                            <p className="font-bold text-slate-800">{selectedOrder?.supplierName}</p>
                        </div>
                        <div>
                            <span className="text-slate-500 font-medium">Fecha Orden:</span>
                            <p className="font-bold text-slate-800">{selectedOrder?.date}</p>
                        </div>
                        <div>
                            <label className="block text-slate-500 font-medium mb-1">Fecha Recepción:</label>
                            <input
                                type="date"
                                value={receiptDate}
                                onChange={(e) => setReceiptDate(e.target.value)}
                                className="w-full border border-slate-300 rounded px-2 py-1"
                            />
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100 text-slate-600 font-bold text-xs uppercase">
                            <tr>
                                <th className="p-3 text-left">Producto</th>
                                <th className="p-3 text-right">Cant. Ordenada</th>
                                <th className="p-3 text-right">Cant. Recibida</th>
                                <th className="p-3 text-right">Costo Unitario</th>
                                <th className="p-3 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {selectedOrder?.items.map((item, idx) => {
                                const receivedItem = receivedItems.find(ri => ri.productId === item.productId);
                                const receivedQty = receivedItem?.receivedQty || 0;
                                return (
                                    <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="p-3 font-medium text-slate-700">{item.productName}</td>
                                        <td className="p-3 text-right text-slate-600">{item.quantity}</td>
                                        <td className="p-3 text-right">
                                            <input
                                                type="number"
                                                min="0"
                                                max={item.quantity}
                                                value={receivedQty}
                                                onChange={(e) => handleUpdateReceivedQty(item.productId, Number(e.target.value))}
                                                className="w-20 text-right border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-emerald-500 outline-none"
                                            />
                                        </td>
                                        <td className="p-3 text-right font-mono text-slate-600">{formatCLP(item.unitCost)}</td>
                                        <td className="p-3 text-right font-mono font-bold text-slate-800">
                                            {formatCLP(receivedQty * item.unitCost)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Warning */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                    <AlertCircle className="text-amber-600 shrink-0" size={20} />
                    <div className="text-sm text-amber-800">
                        <p className="font-bold">Importante:</p>
                        <p>Al confirmar la recepción, el stock se actualizará automáticamente en la bodega principal.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
