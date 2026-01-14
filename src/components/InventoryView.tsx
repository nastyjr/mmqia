import React, { useState, useEffect } from 'react';
import { useAccounting } from '../context/AccountingContext';
import { productsService, storageLocationsService, productStocksService, stockMovementsService } from '../services/databaseService';
import { Product, StorageLocation, ProductStock, MovementType } from '../types/inventory';
import { GoodsReceipt } from './GoodsReceipt';
import { Package, Truck, BarChart3, ArrowRight, Save, LayoutGrid, ClipboardList, Warehouse, Settings, AlertCircle, RefreshCw, CheckCircle, Search } from 'lucide-react';

/**
 * SAP-LIKE INVENTORY MANAGEMENT SUITE
 * Modules:
 * 1. MM03 - Material Master (Maestro de Productos)
 * 2. MIGO - Goods Movements (Movimientos de Mercancía) - 101, 201, 311
 * 3. MMBE - Stock Overview (Resumen de Stock)
 * 4. GR01 - Goods Receipt (Recepción de Mercadería)
 */

type Module = 'MENU' | 'MM03' | 'MIGO' | 'MMBE' | 'OX09' | 'GR01';

export const InventoryView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [currentModule, setCurrentModule] = useState<Module>('MENU');

    return (
        <div className="animate-in fade-in slide-in-from-right duration-300 min-h-screen bg-slate-50/50 pb-12">
            {/* SAP Header Bar */}
            <div className="bg-slate-800 text-white px-6 py-3 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-4">
                    <button onClick={currentModule === 'MENU' ? onBack : () => setCurrentModule('MENU')} className="hover:bg-slate-700 p-2 rounded-lg transition-colors">
                        {currentModule === 'MENU' ? <ArrowRight className="rotate-180" /> : <LayoutGrid size={20} />}
                    </button>
                    <div>
                        <h1 className="font-bold text-lg tracking-tight">SAP Logistics</h1>
                        <p className="text-xs text-slate-400 font-mono uppercase tracking-widest">
                            {currentModule === 'MENU' ? 'Main Menu' :
                                currentModule === 'MM03' ? 'MM03 - Maestro de Productos' :
                                    currentModule === 'OX09' ? 'OX09 - Gestión Almacenes' :
                                        currentModule === 'GR01' ? 'VL31N - Recepción Mercadería' :
                                            currentModule === 'MIGO' ? 'MIGO - Movimientos de Mercancía' : 'MMBE - Stock Actual'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="bg-slate-700 px-3 py-1 rounded text-xs font-mono text-emerald-400 border border-slate-600">SYS: PROD</span>
                    <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center font-bold text-xs ring-2 ring-slate-500">MQ</div>
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="p-6 max-w-7xl mx-auto">
                {currentModule === 'MENU' && <SAPMenu onSelect={setCurrentModule} />}
                {currentModule === 'OX09' && <LocationsMaster />}
                {currentModule === 'MM03' && <MaterialMaster />}
                {currentModule === 'MIGO' && <GoodsMovements />}
                {currentModule === 'MMBE' && <StockOverview />}
                {currentModule === 'GR01' && <GoodsReceipt />}
            </div>
        </div>
    );
};

// ==========================================
// 1. MENU (SAP FIORI STYLE TILES)
// ==========================================
const SAPMenu: React.FC<{ onSelect: (m: Module) => void }> = ({ onSelect }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in zoom-in-95 duration-300">
        <button onClick={() => onSelect('MM03')} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-blue-300 transition-all text-left group">
            <div className="bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Package size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Maestro de Productos</h3>
            <p className="text-slate-500 mb-3 text-xs">Crear productos y mercaderías.</p>
            <span className="text-[10px] font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">MM03</span>
        </button>

        <button onClick={() => onSelect('GR01')} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-emerald-300 transition-all text-left group ring-2 ring-emerald-100">
            <div className="bg-emerald-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <CheckCircle size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Recepción Mercadería</h3>
            <p className="text-slate-500 mb-3 text-xs">Recibir Órdenes de Compra.</p>
            <span className="text-[10px] font-mono bg-emerald-100 text-emerald-700 px-2 py-1 rounded">VL31N</span>
        </button>

        <button onClick={() => onSelect('OX09')} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-orange-300 transition-all text-left group">
            <div className="bg-orange-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                <Warehouse size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Almacenes</h3>
            <p className="text-slate-500 mb-3 text-xs">Definir bodegas y sucursales.</p>
            <span className="text-[10px] font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">OX09</span>
        </button>

        <button onClick={() => onSelect('MIGO')} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-emerald-300 transition-all text-left group">
            <div className="bg-emerald-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Truck size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Movimientos (MIGO)</h3>
            <p className="text-slate-500 mb-3 text-xs">Entradas, Salidas y Traspasos.</p>
            <span className="text-[10px] font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">MIGO</span>
        </button>

        <button onClick={() => onSelect('MMBE')} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-violet-300 transition-all text-left group">
            <div className="bg-violet-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                <BarChart3 size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Resumen de Stock</h3>
            <p className="text-slate-500 mb-3 text-xs">Ver stock actual por almacén.</p>
            <span className="text-[10px] font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">MMBE</span>
        </button>
    </div>
);

// ==========================================
// 1.1 OX09 - STORAGE LOCATIONS
// ==========================================
const LocationsMaster = () => {
    const [locations, setLocations] = useState<StorageLocation[]>([]);
    const [newLoc, setNewLoc] = useState({ name: '', code: '' });
    const [errorState, setErrorState] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => { load() }, []);

    const load = async () => {
        try {
            setErrorState(null);
            const data = await storageLocationsService.getAll();
            setLocations(data as any);
        } catch (e: any) {
            console.error('Error loading locations:', e);
            // If table doesn't exist (PGRST204 or 404), show Repair Mode
            if (e.message?.includes('found') || e.code === '42P01' || e.message?.includes('schema cache')) {
                setErrorState('SCHEMA_ERROR');
            } else {
                setErrorState(e.message);
            }
        }
    };

    const handleRepair = async () => {
        if (!confirm('Esto intentará crear las tablas automáticamente. ¿Continuar?')) return;
        setLoading(true);
        try {
            await storageLocationsService.initializeInventory();
            alert('Sistema reparado. Recargando...');
            window.location.reload();
        } catch (e: any) {
            alert(`Error al reparar: ${e.message}. Asegúrate de haber corrido el script SQL "master_setup.sql".`);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newLoc.name || !newLoc.code) return alert('Nombre y Código requeridos');
        try {
            await storageLocationsService.create({ ...newLoc, is_active: true });
            setNewLoc({ name: '', code: '' });
            load();
            alert('Almacén creado exitosamente');
        } catch (e: any) {
            console.error(e);
            alert(`Error al crear: ${e.message}`);
        }
    };

    if (errorState === 'SCHEMA_ERROR') {
        const MANUAL_SQL = `
-- COPIA Y PEGA ESTO EN SUPABASE SQL EDITOR --
CREATE TABLE IF NOT EXISTS storage_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS product_stocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id),
    location_id UUID REFERENCES storage_locations(id),
    quantity DECIMAL(15,4) DEFAULT 0,
    user_id UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_stocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Publico" ON storage_locations;
CREATE POLICY "Publico" ON storage_locations FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "PublicoStock" ON product_stocks;
CREATE POLICY "PublicoStock" ON product_stocks FOR ALL USING (true) WITH CHECK (true);
NOTIFY pgrst, 'reload schema';
------------------------------------------------
`;
        return (
            <div className="bg-white rounded-lg shadow-sm border border-red-200 p-8 text-center animate-in fade-in">
                <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                    <AlertCircle size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Base de Datos No Configurada</h2>
                <p className="text-slate-500 mb-6 max-w-lg mx-auto">
                    El sistema intentó repararse automáticamente pero la función de reparación
                    no está instalada en tu base de datos.
                </p>

                <div className="bg-slate-900 text-slate-300 text-left p-4 rounded-lg overflow-x-auto text-xs font-mono mb-6 max-w-2xl mx-auto shadow-inner">
                    <pre>{MANUAL_SQL}</pre>
                </div>

                <div className="flex gap-4 justify-center">
                    <button
                        onClick={() => { navigator.clipboard.writeText(MANUAL_SQL); alert('Código copiado al portapapeles'); }}
                        className="bg-slate-200 text-slate-800 px-6 py-3 rounded-lg font-bold hover:bg-slate-300 transition-colors"
                    >
                        Clipboard: Copiar SQL
                    </button>
                    <button
                        onClick={() => window.open('https://supabase.com/dashboard/project/_/sql', '_blank')}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors"
                    >
                        Abrir Supabase SQL
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-emerald-700 transition-colors"
                    >
                        Ya lo ejecuté (Recargar)
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Warehouse className="text-orange-500" /> Gestión de Almacenes (OX09)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Create Form */}
                <div className="space-y-4 bg-slate-50 p-6 rounded-xl border border-slate-100 h-fit">
                    <h3 className="font-bold text-slate-700">Crear Nuevo Almacén</h3>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Nombre (ej: Bodega Central)</label>
                        <input className="w-full border p-2 rounded text-sm" value={newLoc.name} onChange={e => setNewLoc({ ...newLoc, name: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Código (ej: 0001)</label>
                        <input className="w-full border p-2 rounded text-sm font-mono uppercase" value={newLoc.code} onChange={e => setNewLoc({ ...newLoc, code: e.target.value })} />
                    </div>
                    <button onClick={handleCreate} className="w-full bg-orange-600 text-white font-bold py-2 rounded hover:bg-orange-700">Guardar Almacén</button>
                </div>

                {/* List */}
                <div>
                    <h3 className="font-bold text-slate-700 mb-4">Almacenes Existentes</h3>
                    <div className="space-y-2">
                        {locations.map(l => (
                            <div key={l.id} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                                <span className="font-bold text-slate-700">{l.name}</span>
                                <span className="text-xs font-mono bg-orange-50 text-orange-600 px-2 py-1 rounded border border-orange-100">{l.code}</span>
                            </div>
                        ))}
                        {locations.length === 0 && <p className="text-slate-400 text-sm italic">No hay almacenes registrados.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// 2. MM03 - MATERIAL MASTER
// ==========================================
const MaterialMaster = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Partial<Product> | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => { loadProducts() }, []);

    const loadProducts = async () => {
        const data = await productsService.getAll();
        // Since API returns flat object, map it to our type if needed
        // For now direct assignment usually works due to flexible JS, but let's be safe
        setProducts(data as any);
    };

    const handleSave = async () => {
        if (!selectedProduct?.sku || !selectedProduct?.name) return alert('SKU y Nombre requeridos');
        try {
            // Map to DB Schema (snake_case)
            const payload: any = {
                sku: selectedProduct.sku,
                name: selectedProduct.name,
                description: selectedProduct.description,
                unit: selectedProduct.unit,
                category: selectedProduct.category,
                min_stock: selectedProduct.minStock,
                selling_price: selectedProduct.sellingPrice,
                weighted_average_cost: selectedProduct.weightedAverageCost,
                // Do not send helpers or mismatching keys
            };

            if (selectedProduct.id) {
                await productsService.update(selectedProduct.id, payload);
            } else {
                await productsService.create(payload);
            }
            setSelectedProduct(null);
            loadProducts();
            alert('Material guardado exitosamente');
        } catch (e) {
            console.error(e);
            alert('Error al guardar. Revisa que el SKU sea único.');
        }
    };

    const filtered = products.filter(p => p.sku.toLowerCase().includes(searchTerm.toLowerCase()) || p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
            {/* List */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col">
                <div className="p-4 border-b border-slate-100">
                    <input
                        className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-sm"
                        placeholder="Buscar Producto (SKU / Nombre)..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="overflow-y-auto flex-1">
                    {filtered.map(p => (
                        <div key={p.id} onClick={() => setSelectedProduct(p)} className="p-3 border-b border-slate-50 hover:bg-blue-50 cursor-pointer transition-colors">
                            <div className="flex justify-between">
                                <span className="font-bold text-slate-700 text-sm">{p.name}</span>
                                <span className="text-xs font-mono bg-slate-100 px-1 rounded">{p.sku}</span>
                            </div>
                            <span className="text-xs text-slate-400">{p.category || 'Sin Grupo'}</span>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-slate-100">
                    <button onClick={() => setSelectedProduct({ unit: 'UN' })} className="w-full bg-blue-600 text-white rounded p-2 text-sm font-bold hover:bg-blue-700">Crear Nuevo Producto</button>
                </div>
            </div>

            {/* Form */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 lg:col-span-2 p-6 overflow-y-auto">
                {selectedProduct ? (
                    <div className="animate-in fade-in">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                            <h2 className="text-xl font-bold text-slate-800">{selectedProduct.id ? `Editar Producto ${selectedProduct.sku}` : 'Nuevo Producto'}</h2>
                            <div className="flex gap-2">
                                <button onClick={() => setSelectedProduct(null)} className="px-4 py-2 text-slate-500 text-sm hover:bg-slate-100 rounded">Cancelar</button>
                                <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700 flex items-center gap-2"><Save size={16} /> Guardar</button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Basic Data */}
                            <section>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-l-4 border-blue-500 pl-2">Datos Básicos</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Producto</label>
                                        <input className="w-full border p-2 rounded text-sm" value={selectedProduct.name || ''} onChange={e => setSelectedProduct({ ...selectedProduct, name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">SKU / Código</label>
                                        <input className="w-full border p-2 rounded text-sm font-mono" value={selectedProduct.sku || ''} onChange={e => setSelectedProduct({ ...selectedProduct, sku: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Unidad Base</label>
                                        <select className="w-full border p-2 rounded text-sm" value={selectedProduct.unit || 'UN'} onChange={e => setSelectedProduct({ ...selectedProduct, unit: e.target.value })}>
                                            <option value="UN">UN - Unidad</option>
                                            <option value="KG">KG - Kilogramo</option>
                                            <option value="L">L - Litro</option>
                                            <option value="M">M - Metro</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Grupo Artículos</label>
                                        <select className="w-full border p-2 rounded text-sm" value={selectedProduct.category || ''} onChange={e => setSelectedProduct({ ...selectedProduct, category: e.target.value })}>
                                            <option value="">Seleccionar...</option>
                                            <option value="Materia Prima">Materia Prima (ROH)</option>
                                            <option value="Producto Terminado">Producto Terminado (FERT)</option>
                                            <option value="Mercadería">Mercadería (HAWA)</option>
                                        </select>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-l-4 border-emerald-500 pl-2">Contabilidad y Costos</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Precio Venta (Neto)</label>
                                        <input type="number" className="w-full border p-2 rounded text-sm" value={selectedProduct.sellingPrice || ''} onChange={e => setSelectedProduct({ ...selectedProduct, sellingPrice: Number(e.target.value) })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Stock Mínimo</label>
                                        <input type="number" className="w-full border p-2 rounded text-sm" value={selectedProduct.minStock || ''} onChange={e => setSelectedProduct({ ...selectedProduct, minStock: Number(e.target.value) })} />
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 flex-col gap-4">
                        <Package size={64} className="opacity-20" />
                        <p>Selecciona un producto o crea uno nuevo</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// ==========================================
// 3. MIGO - GOODS MOVEMENTS
// ==========================================
const GoodsMovements = () => {
    const [movementCode, setMovementCode] = useState<'101' | '201' | '311'>('101'); // 101=In, 201=Out, 311=Transfer
    const [products, setProducts] = useState<Product[]>([]);
    const [locations, setLocations] = useState<StorageLocation[]>([]);

    // Form State
    const [selectedProduct, setSelectedProduct] = useState('');
    const [qty, setQty] = useState(0);
    const [cost, setCost] = useState(0); // Only relevant for 101 external
    const [location, setLocation] = useState('');
    const [destLocation, setDestLocation] = useState(''); // Only for 311
    const [docRef, setDocRef] = useState('');

    useEffect(() => {
        const init = async () => {
            const [p, l] = await Promise.all([productsService.getAll(), storageLocationsService.getAll()]);

            // Map DB (snake_case) to Frontend (camelCase)
            const mappedProducts = (p as any[]).map(item => ({
                id: item.id,
                sku: item.sku,
                name: item.name,
                description: item.description,
                unit: item.unit,
                category: item.category,
                minStock: item.min_stock,
                weightedAverageCost: item.weighted_average_cost,
                lastPurchasePrice: item.last_purchase_price,
                sellingPrice: item.selling_price
            }));

            setProducts(mappedProducts as any);
            setLocations(l as any);
            if (l.length > 0) {
                setLocation(l[0].id); // Default to first location
            }
        };
        init();
    }, []);

    const handlePost = async () => {
        if (!selectedProduct || qty <= 0 || !location) return alert('Verifica los datos');

        try {
            // Determine type based on SAP Code
            let type: MovementType = 'COMPRA';
            if (movementCode === '101') type = 'COMPRA';
            if (movementCode === '201') type = 'VENTA'; // Simpification
            if (movementCode === '311') type = 'TRASPASO';

            // Calculate valuation changes
            // 1. Get current stock at loc
            const currentStockInfo = await productStocksService.getStock(selectedProduct, location);
            const currentQty = currentStockInfo?.quantity || 0;

            let newQty = currentQty;
            if (movementCode === '101') newQty += qty;
            if (movementCode === '201') newQty -= qty;
            if (movementCode === '311') newQty -= qty; // Source location decreases

            if (newQty < 0) return alert('Stock insuficiente en almacén origen');

            // 2. Perform Movement Update
            // Record Movement
            await stockMovementsService.create({
                product_id: selectedProduct,
                location_id: location,
                transfer_location_id: movementCode === '311' ? destLocation : undefined,
                date: new Date().toISOString().split('T')[0],
                type,
                movement_code: movementCode,
                quantity: qty,
                unit_cost: cost,
                total_value: qty * cost, // Simplified valuation logic
                document_ref: docRef,
                stock_after: newQty,
                pmp_after: 0 // TODO: Implement real weighted average logic again
            });

            // Update Stock Record Source
            await productStocksService.updateStock(selectedProduct, location, newQty);

            // Handle Transfer Destination
            if (movementCode === '311' && destLocation) {
                const destStockInfo = await productStocksService.getStock(selectedProduct, destLocation);
                const destQty = (destStockInfo?.quantity || 0) + qty;
                await productStocksService.updateStock(selectedProduct, destLocation, destQty);
            }

            alert('Documento de material contabilizado');
            setQty(0);
            setDocRef('');

        } catch (e: any) {
            console.error(e);
            alert('Error al contabilizar: ' + (e.message || 'Error desconocido'));
        }
    };

    return (
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-100 p-4 border-b border-slate-200 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <select
                            className="bg-white border border-slate-300 text-slate-800 font-bold rounded p-2 text-sm"
                            value={movementCode}
                            onChange={e => setMovementCode(e.target.value as any)}
                        >
                            <option value="101">A01 Entrada de Mercancías (101)</option>
                            <option value="101_PO">A01 Entrada por Orden de Compra (101)</option> {/* NEW OPTION */}
                            <option value="201">A07 Salida de Mercancías (201)</option>
                            <option value="311">A08 Traspaso (311)</option>
                        </select>
                        <span className="text-slate-400 text-sm">
                            {movementCode === '101_PO' ? 'R01 Referencia a OC' : 'R10 Otros'}
                        </span>
                    </div>
                    <div className="text-xs font-mono text-slate-500">MIGO Transaction</div>
                </div>

                {/* PO SELECTOR (Only visible if 101_PO is selected) */}
                {movementCode === '101_PO' && (
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex items-center justify-between animate-in fade-in">
                        <div className="flex items-center gap-3 w-full">
                            <Truck className="text-blue-600" size={20} />
                            <div className="w-full">
                                <label className="block text-xs font-bold text-blue-700 mb-1">Seleccionar Orden de Compra Pendiente</label>
                                <select
                                    className="w-full border border-blue-300 rounded p-1.5 text-sm"
                                    onChange={e => {
                                        // TODO: Load PO Items logic here (handled in parent or separate effect)
                                        const poId = e.target.value;
                                        if (poId) {
                                            // Trigger load of PO items (Logic to be added in hook)
                                            alert(`Cargando Orden #${poId}... (Funcionalidad en implementación)`);
                                        }
                                    }}
                                >
                                    <option value="">-- Seleccionar Orden por Recibir --</option>
                                    {/* MOCK DATA FOR NOW - Will replace with real data */}
                                    <option value="oc-1001">OC-1001 - Proveedor ABC (Pendiente)</option>
                                    <option value="oc-1002">OC-1002 - Tech Corp (Parcial)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Header Data */}
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-700 text-sm border-b pb-2">Datos de Cabecera</h3>
                    <div>
                        <label className="text-xs font-bold text-slate-500">Fecha de Documento</label>
                        <input type="date" className="w-full border p-2 rounded text-sm bg-slate-50" defaultValue={new Date().toISOString().split('T')[0]} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500">Nota de Entrega / Referencia</label>
                        <input className="w-full border p-2 rounded text-sm" placeholder="Ej: GD-12345" value={docRef} onChange={e => setDocRef(e.target.value)} />
                    </div>
                </div>

                {/* Item Data */}
                {/* Item Data */}
                <div className="space-y-4">
                    <h3 className="font-bold text-slate-700 text-sm border-b pb-2">Posición 1</h3>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-bold text-slate-500">Ítem / Producto</label>
                            {selectedProduct && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${products.find(p => p.id === selectedProduct)?.category === 'Materia Prima' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    products.find(p => p.id === selectedProduct)?.category === 'Producto Terminado' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                        'bg-blue-50 text-blue-700 border-blue-200'
                                    }`}>
                                    {products.find(p => p.id === selectedProduct)?.category?.toUpperCase() || 'GENERAL'}
                                </span>
                            )}
                        </div>
                        <select
                            className="w-full border p-2 rounded text-sm"
                            value={selectedProduct}
                            onChange={e => {
                                const pid = e.target.value;
                                setSelectedProduct(pid);
                                const p = products.find(prod => prod.id === pid);
                                if (p) {
                                    // Autofill Cost with PMP or Last Price
                                    setCost(p.weightedAverageCost || p.lastPurchasePrice || 0);
                                }
                            }}
                        >
                            <option value="">Seleccionar Ítem...</option>
                            <optgroup label="Materias Primas (ROH)">
                                {products.filter(p => p.category === 'Materia Prima').map(p => (
                                    <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                                ))}
                            </optgroup>
                            <optgroup label="Productos Terminados (FERT)">
                                {products.filter(p => p.category === 'Producto Terminado').map(p => (
                                    <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                                ))}
                            </optgroup>
                            <optgroup label="Mercaderías (HAWA)">
                                {products.filter(p => p.category === 'Mercadería').map(p => (
                                    <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                                ))}
                            </optgroup>
                            <optgroup label="Otros / Sin Categoría">
                                {products.filter(p => !['Materia Prima', 'Producto Terminado', 'Mercadería'].includes(p.category || '')).map(p => (
                                    <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                                ))}
                            </optgroup>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500">Cantidad</label>
                            <input type="number" className="w-full border p-2 rounded text-sm font-bold" value={qty || ''} onChange={e => setQty(Number(e.target.value))} />
                        </div>
                        {movementCode === '101' && (
                            <div>
                                <label className="text-xs font-bold text-slate-500">Costo Unit.</label>
                                <input type="number" className="w-full border p-2 rounded text-sm" value={cost || ''} onChange={e => setCost(Number(e.target.value))} />
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500">Almacén {movementCode === '311' ? 'Origen' : ''}</label>
                        <select className="w-full border p-2 rounded text-sm" value={location} onChange={e => setLocation(e.target.value)}>
                            {locations.map(l => <option key={l.id} value={l.id}>{l.code} - {l.name}</option>)}
                        </select>
                        {locations.length === 0 && <p className="text-xs text-red-500 mt-1">⚠ No hay almacenes creados. Crea uno primero.</p>}
                    </div>

                    {movementCode === '311' && (
                        <div>
                            <label className="text-xs font-bold text-slate-500">Almacén Destino</label>
                            <select className="w-full border p-2 rounded text-sm bg-blue-50/50 border-blue-200" value={destLocation} onChange={e => setDestLocation(e.target.value)}>
                                <option value="">Seleccionar Destino...</option>
                                {locations.filter(l => l.id !== location).map(l => <option key={l.id} value={l.id}>{l.code} - {l.name}</option>)}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-slate-50 p-4 flex justify-end gap-3 border-t border-slate-200">
                <button className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded">Verificar</button>
                <button onClick={handlePost} className="px-6 py-2 bg-slate-800 text-white font-bold text-sm hover:bg-slate-900 rounded shadow-sm">Contabilizar</button>
            </div>
        </div>
    );
};

// ==========================================
// 4. MMBE - STOCK OVERVIEW
// ==========================================
const StockOverview = () => {
    // This needs to fetch the relational data
    // For now we will mock the structure slightly or do a complex fetch.
    // Let's implement a quick fetcher
    const [treeData, setTreeData] = useState<any[]>([]);

    useEffect(() => {
        loadStock();
    }, []);

    const loadStock = async () => {
        // Fetch all products and their stocks
        const prods = await productsService.getAll();
        const locs = await storageLocationsService.getAll();

        // Build Tree: Product -> Location
        const tree: any[] = [];

        for (const p of (prods as any[])) {
            const stocks = await productStocksService.getByProduct(p.id);
            if (stocks && stocks.length > 0) {
                tree.push({
                    ...p,
                    stocks: stocks
                });
            }
        }
        setTreeData(tree);
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-4 border-b bg-slate-50">
                <h2 className="font-bold text-slate-700">Resumen de Stock (Por Material)</h2>
            </div>
            <div className="p-4">
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr className="border-b text-slate-500">
                            <th className="py-2">Producto / Almacén</th>
                            <th className="py-2 text-right">Libre Utilización</th>
                            <th className="py-2 text-right">Valoración</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {treeData.map(node => (
                            <React.Fragment key={node.id}>
                                {/* Product Row */}
                                <tr className="bg-blue-50/30">
                                    <td className="py-2 pl-2 font-bold text-slate-800 flex items-center gap-2">
                                        <Package size={16} className="text-blue-500" /> {node.sku} - {node.name}
                                    </td>
                                    <td className="py-2 text-right font-bold">
                                        {node.stocks.reduce((acc: number, s: any) => acc + s.quantity, 0)} {node.unit}
                                    </td>
                                    <td className="py-2 text-right text-slate-500">-</td>
                                </tr>
                                {/* Location Rows */}
                                {node.stocks.map((s: any) => (
                                    <tr key={s.id}>
                                        <td className="py-1 pl-8 text-slate-500 text-xs flex items-center gap-2">
                                            <Warehouse size={12} /> {s.storage_locations?.code} - {s.storage_locations?.name}
                                        </td>
                                        <td className="py-1 text-right text-xs font-mono text-slate-600">
                                            {s.quantity}
                                        </td>
                                        <td className="py-1 text-right text-xs text-slate-400">
                                            {/* TODO: Multiply by PMP */}
                                        </td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
                {treeData.length === 0 && (
                    <div className="text-center py-10 text-slate-400">
                        <p>No hay stock registrado en ubicaciones.</p>
                        <p className="text-xs">Usa MIGO (101) para dar entrada a mercadería.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
