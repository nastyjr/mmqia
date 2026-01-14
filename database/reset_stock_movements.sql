-- ALERTA: Esto borrará el historial de movimientos de prueba para solucionar el error de estructura definitivamente.
-- Si tienes datos reales y valiosos, no ejecutes el DROP TABLE.

DROP TABLE IF EXISTS stock_movements CASCADE;

CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id),
    
    -- Producto y Ubicación
    product_id UUID REFERENCES products(id),
    location_id UUID REFERENCES storage_locations(id), -- Columna que faltaba 1
    transfer_location_id UUID REFERENCES storage_locations(id),
    
    -- Detalles del Movimiento
    date DATE DEFAULT CURRENT_DATE,
    type VARCHAR(50), -- COMPRA, VENTA, ETC.
    movement_code VARCHAR(20), -- Columna que faltaba 2 (101, 201...)
    document_ref VARCHAR(100),
    
    -- Valores
    quantity DECIMAL(15,4) DEFAULT 0,
    unit_cost DECIMAL(15,2) DEFAULT 0,
    total_value DECIMAL(15,2) DEFAULT 0,
    
    -- Snapshot (Foto del stock después del movimiento)
    stock_after DECIMAL(15,4),
    pmp_after DECIMAL(15,2)
);

-- Habilitar permisos
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Política de acceso total (para evitar errores de permisos ahora)
CREATE POLICY "Acceso Total Movimientos" ON stock_movements FOR ALL USING (true) WITH CHECK (true);

-- Notificar a Supabase para que actualice su "cerebro" (Caché)
NOTIFY pgrst, 'reload schema';
