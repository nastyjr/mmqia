-- ============================================
-- SUPABASE SCHEMA FOR MULTI-USER ERP
-- ============================================
-- Execute this SQL in your Supabase SQL Editor
-- Dashboard > SQL Editor > New Query

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. COMPANIES TABLE (Multi-tenant)
-- ============================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  rut TEXT UNIQUE NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their company
CREATE POLICY "Users see own company"
  ON companies FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 2. COMPANY_USERS TABLE (User-Company Relationship)
-- ============================================
CREATE TABLE IF NOT EXISTS company_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'accountant', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

-- Enable RLS
ALTER TABLE company_users ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "Users see own memberships"
  ON company_users FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- 3. CHART OF ACCOUNTS
-- ============================================
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Activo', 'Pasivo', 'Patrimonio', 'Ingresos', 'Costos', 'Gastos')),
  parent_id UUID REFERENCES chart_of_accounts(id),
  is_imputable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, code)
);

-- Enable RLS
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "Company isolation - chart_of_accounts"
  ON chart_of_accounts FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 4. JOURNAL ENTRIES
-- ============================================
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  entry_number SERIAL,
  date DATE NOT NULL,
  gloss TEXT NOT NULL,
  type TEXT,
  total NUMERIC(15,2),
  status TEXT DEFAULT 'posted',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "Company isolation - journal_entries"
  ON journal_entries FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 5. JOURNAL ENTRY LINES
-- ============================================
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID REFERENCES chart_of_accounts(id),
  debit NUMERIC(15,2) DEFAULT 0,
  credit NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;

-- Policy (access through entry)
CREATE POLICY "Company isolation - journal_entry_lines"
  ON journal_entry_lines FOR ALL
  USING (
    entry_id IN (
      SELECT id FROM journal_entries 
      WHERE company_id IN (
        SELECT company_id FROM company_users WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================
-- 6. INVOICES
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  folio TEXT NOT NULL,
  type TEXT NOT NULL,
  date DATE NOT NULL,
  due_date DATE,
  customer_rut TEXT,
  customer_name TEXT NOT NULL,
  customer_address TEXT,
  customer_giro TEXT,
  net_total NUMERIC(15,2),
  tax_total NUMERIC(15,2),
  total NUMERIC(15,2),
  status TEXT DEFAULT 'ISSUED',
  payment_method TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, folio)
);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "Company isolation - invoices"
  ON invoices FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 7. PRODUCTS
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  unit_cost NUMERIC(15,2),
  unit_price NUMERIC(15,2),
  min_stock INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, sku)
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "Company isolation - products"
  ON products FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 8. STORAGE LOCATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS storage_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- Enable RLS
ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "Company isolation - storage_locations"
  ON storage_locations FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 9. PRODUCT STOCKS
-- ============================================
CREATE TABLE IF NOT EXISTS product_stocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  location_id UUID REFERENCES storage_locations(id),
  quantity NUMERIC(15,3) DEFAULT 0,
  weighted_average_cost NUMERIC(15,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, location_id)
);

-- Enable RLS
ALTER TABLE product_stocks ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "Company isolation - product_stocks"
  ON product_stocks FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 10. PURCHASE ORDERS
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  supplier_rut TEXT,
  supplier_name TEXT NOT NULL,
  date DATE NOT NULL,
  expected_date DATE,
  status TEXT DEFAULT 'PENDING',
  subtotal NUMERIC(15,2),
  tax NUMERIC(15,2),
  total NUMERIC(15,2),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, order_number)
);

-- Enable RLS
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "Company isolation - purchase_orders"
  ON purchase_orders FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 11. FIXED ASSETS
-- ============================================
CREATE TABLE IF NOT EXISTS fixed_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  purchase_date DATE NOT NULL,
  purchase_value NUMERIC(15,2) NOT NULL,
  residual_value NUMERIC(15,2) DEFAULT 0,
  useful_life_years INTEGER NOT NULL,
  useful_life_months INTEGER NOT NULL,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SOLD', 'DISPOSED', 'FULLY_DEPRECIATED')),
  asset_account_id UUID REFERENCES chart_of_accounts(id),
  last_depreciation_date DATE,
  accumulated_depreciation NUMERIC(15,2) DEFAULT 0,
  accumulated_cm NUMERIC(15,2) DEFAULT 0,
  current_value NUMERIC(15,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "Company isolation - fixed_assets"
  ON fixed_assets FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 12. FOLIO COUNTERS
-- ============================================
CREATE TABLE IF NOT EXISTS folio_counters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  prefix TEXT NOT NULL,
  current_number INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, document_type)
);

-- Enable RLS
ALTER TABLE folio_counters ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "Company isolation - folio_counters"
  ON folio_counters FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM company_users WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- INDEXES for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_date ON journal_entries(company_id, date);
CREATE INDEX IF NOT EXISTS idx_invoices_company_status ON invoices(company_id, status);
CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_product_stocks_product ON product_stocks(product_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to increment folio atomically
CREATE OR REPLACE FUNCTION increment_folio(
  p_company_id UUID,
  p_document_type TEXT,
  p_prefix TEXT
)
RETURNS TABLE(prefix TEXT, current_number INTEGER) AS $$
DECLARE
  v_current_number INTEGER;
BEGIN
  -- Try to update existing counter
  UPDATE folio_counters
  SET current_number = current_number + 1,
      updated_at = NOW()
  WHERE company_id = p_company_id AND document_type = p_document_type
  RETURNING folio_counters.prefix, folio_counters.current_number
  INTO prefix, current_number;

  -- If no row was updated, insert new counter
  IF NOT FOUND THEN
    INSERT INTO folio_counters (company_id, document_type, prefix, current_number)
    VALUES (p_company_id, p_document_type, p_prefix, 1)
    RETURNING folio_counters.prefix, folio_counters.current_number
    INTO prefix, current_number;
  END IF;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamp on companies
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at 
  BEFORE UPDATE ON companies 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMPLETE!
-- ============================================
-- Your Supabase database is now ready for multi-user ERP!
-- Next steps:
-- 1. Enable Email Auth in Supabase Dashboard > Authentication > Settings
-- 2. Configure email templates (optional)
-- 3. Update your .env file with Supabase credentials
