-- Ensure stock_movements exists
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id),
    location_id UUID REFERENCES storage_locations(id),
    transfer_location_id UUID,
    date DATE DEFAULT CURRENT_DATE,
    type VARCHAR(50), -- COMPRA, VENTA, TRASPASO
    movement_code VARCHAR(20), -- 101, 201, 311
    quantity DECIMAL(15,4),
    unit_cost DECIMAL(15,2) DEFAULT 0,
    total_value DECIMAL(15,2) DEFAULT 0,
    document_ref VARCHAR(100),
    stock_after DECIMAL(15,4),
    pmp_after DECIMAL(15,2),
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure RLS is enabled
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Create Permissive Policy
DROP POLICY IF EXISTS "PublicoMovements" ON stock_movements;
CREATE POLICY "PublicoMovements" ON stock_movements FOR ALL USING (true) WITH CHECK (true);

-- Also ensure unique constraint for upsert on product_stocks
ALTER TABLE product_stocks DROP CONSTRAINT IF EXISTS product_stocks_uniq_loc;
ALTER TABLE product_stocks ADD CONSTRAINT product_stocks_uniq_loc UNIQUE (product_id, location_id);

NOTIFY pgrst, 'reload schema';
