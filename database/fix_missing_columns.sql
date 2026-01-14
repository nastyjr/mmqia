-- 1. Intentar agregar las columnas si faltan
DO $$
BEGIN
    BEGIN
        ALTER TABLE stock_movements ADD COLUMN location_id UUID REFERENCES storage_locations(id);
    EXCEPTION
        WHEN duplicate_column THEN RAISE NOTICE 'location_id ya existe';
    END;

    BEGIN
        ALTER TABLE stock_movements ADD COLUMN transfer_location_id UUID REFERENCES storage_locations(id);
    EXCEPTION
        WHEN duplicate_column THEN RAISE NOTICE 'transfer_location_id ya existe';
    END;
END $$;

-- 2. Asegurar permisos nuevamente
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "PublicoMovements" ON stock_movements;
CREATE POLICY "PublicoMovements" ON stock_movements FOR ALL USING (true) WITH CHECK (true);

-- 3. FORZAR RECARGA DE CACHÉ (Lo más importante para tu error)
NOTIFY pgrst, 'reload schema';
