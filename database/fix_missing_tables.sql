-- =====================================================
-- FIX: RE-RUNNABLE SCRIPT TO CREATE MISSING TABLES
-- =====================================================

-- 1. Create storage_locations if it doesn't exist
CREATE TABLE IF NOT EXISTS storage_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create product_stocks if it doesn't exist
CREATE TABLE IF NOT EXISTS product_stocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    location_id UUID REFERENCES storage_locations(id) ON DELETE CASCADE,
    quantity DECIMAL(15,4) DEFAULT 0,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_product_location UNIQUE (product_id, location_id)
);

-- 3. Add new columns to stock_movements if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_movements' AND column_name='location_id') THEN
        ALTER TABLE stock_movements ADD COLUMN location_id UUID REFERENCES storage_locations(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_movements' AND column_name='transfer_location_id') THEN
        ALTER TABLE stock_movements ADD COLUMN transfer_location_id UUID REFERENCES storage_locations(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_movements' AND column_name='movement_code') THEN
        ALTER TABLE stock_movements ADD COLUMN movement_code VARCHAR(10);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_movements' AND column_name='batch_number') THEN
        ALTER TABLE stock_movements ADD COLUMN batch_number VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_movements' AND column_name='stock_after') THEN
        ALTER TABLE stock_movements ADD COLUMN stock_after DECIMAL(15,4);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='stock_movements' AND column_name='pmp_after') THEN
        ALTER TABLE stock_movements ADD COLUMN pmp_after DECIMAL(15,2);
    END IF;
END $$;

-- 4. Enable RLS (Security) for new tables
ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_stocks ENABLE ROW LEVEL SECURITY;

-- 5. Drop old policies to avoid duplicates
DROP POLICY IF EXISTS "Users can only see their own data" ON storage_locations;
DROP POLICY IF EXISTS "Users can manage own storage locations" ON storage_locations;
DROP POLICY IF EXISTS "Users can access related product stocks" ON product_stocks;
DROP POLICY IF EXISTS "Users can manage own product stocks" ON product_stocks;

-- 6. Create permissive policies for Storage Locations
CREATE POLICY "Users can manage own storage locations" ON storage_locations
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 7. Create permissive policies for Product Stocks
CREATE POLICY "Users can manage own product stocks" ON product_stocks
    FOR ALL
    USING (EXISTS (SELECT 1 FROM products WHERE products.id = product_stocks.product_id AND products.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM products WHERE products.id = product_stocks.product_id AND products.user_id = auth.uid()));

-- 8. Add update trigger for automatic 'updated_at'
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_product_stocks_modtime ON product_stocks;
CREATE TRIGGER update_product_stocks_modtime
    BEFORE UPDATE ON product_stocks
    FOR EACH ROW
    EXECUTE PROCEDURE update_timestamp();

