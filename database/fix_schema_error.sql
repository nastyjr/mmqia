-- =====================================================
-- FIX: FORCE SCHEMA RELOAD AND INSERT DEFAULT DATA
-- =====================================================

-- 1. Reload PostgREST Schema Cache (Crucial for "schema cache" errors)
NOTIFY pgrst, 'reload schema';

-- 2. Ensure Tables Exist
CREATE TABLE IF NOT EXISTS storage_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_stocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    location_id UUID REFERENCES storage_locations(id) ON DELETE CASCADE,
    quantity DECIMAL(15,4) DEFAULT 0,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_product_location UNIQUE (product_id, location_id)
);

-- 3. Explicitly Grant Permissions (Just in case defaults are weird)
GRANT ALL ON storage_locations TO postgres, anon, authenticated, service_role;
GRANT ALL ON product_stocks TO postgres, anon, authenticated, service_role;

-- 4. Enable Security (RLS)
ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_stocks ENABLE ROW LEVEL SECURITY;

-- 5. Create Permissive Policies (Fixes "Error al crear")
DROP POLICY IF EXISTS "Users can manage own storage locations" ON storage_locations;
CREATE POLICY "Users can manage own storage locations" ON storage_locations
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own product stocks" ON product_stocks;
CREATE POLICY "Users can manage own product stocks" ON product_stocks
    FOR ALL USING (EXISTS (SELECT 1 FROM products WHERE products.id = product_stocks.product_id AND products.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM products WHERE products.id = product_stocks.product_id AND products.user_id = auth.uid()));

-- 6. EMERGENCY: Insert "Bodega Central" manually for the current user
-- NOTE: We use a trick to get the first user ID if auth.uid() is not available in SQL Editor context
DO $$
DECLARE
    first_user_id UUID;
BEGIN
    SELECT id INTO first_user_id FROM auth.users LIMIT 1;
    
    IF first_user_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM storage_locations WHERE name = 'Bodega Central') THEN
            INSERT INTO storage_locations (user_id, name, code, is_active)
            VALUES (first_user_id, 'Bodega Central', '0001', true);
        END IF;
    END IF;
END $$;
