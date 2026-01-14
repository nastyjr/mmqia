-- 1. Borrar tabla antigua con fuerza (CASCADE para borrar dependencias)
DROP TABLE IF EXISTS stock_movements CASCADE;

-- 2. Crear tabla nueva con TODAS las columnas necesarias
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Relaciones
    user_id UUID REFERENCES auth.users(id),
    product_id UUID REFERENCES products(id),
    location_id UUID REFERENCES storage_locations(id), -- Columna crítica 1
    transfer_location_id UUID REFERENCES storage_locations(id), -- Columna crítica 2
    
    -- Datos del movimiento
    date DATE DEFAULT CURRENT_DATE,
    type VARCHAR(50), 
    movement_code VARCHAR(20), -- Columna crítica 3
    document_ref VARCHAR(100),
    
    -- Cantidades y Valores
    quantity DECIMAL(15,4) DEFAULT 0,
    unit_cost DECIMAL(15,2) DEFAULT 0,
    total_value DECIMAL(15,2) DEFAULT 0,
    
    -- Estado posterior
    stock_after DECIMAL(15,4),
    pmp_after DECIMAL(15,2)
);

-- 3. Habilitar seguridad
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- 4. Crear política de acceso para que no te bloquee
CREATE POLICY "Acceso Total Movimientos" ON stock_movements 
FOR ALL USING (true) WITH CHECK (true);

-- 5. Forzar actualización de la caché de Supabase
NOTIFY pgrst, 'reload schema';
