-- FIX: Enable RLS and Add Explicit Policies for New Inventory Tables

-- 1. Storage Locations
ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;

-- Remove old policies to avoid conflicts
DROP POLICY IF EXISTS "Users can only see their own data" ON storage_locations;
DROP POLICY IF EXISTS "Users can manage own storage locations" ON storage_locations;

-- Create comprehensive policy
CREATE POLICY "Users can manage own storage locations" ON storage_locations
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 2. Product Stocks
ALTER TABLE product_stocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access related product stocks" ON product_stocks;
DROP POLICY IF EXISTS "Users can manage own product stocks" ON product_stocks;

-- Create comprehensive policy (Link verification via products table)
CREATE POLICY "Users can manage own product stocks" ON product_stocks
    FOR ALL
    USING (EXISTS (SELECT 1 FROM products WHERE products.id = product_stocks.product_id AND products.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM products WHERE products.id = product_stocks.product_id AND products.user_id = auth.uid()));
