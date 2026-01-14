-- =====================================================
-- CONTABILIDAD PRO CHILE - SUPABASE DATABASE SCHEMA
-- =====================================================
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard
-- Project: trrmcqvakkrxjgzahdzb
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. CRM / TERCEROS (Clientes y Proveedores)
-- =====================================================
CREATE TABLE IF NOT EXISTS third_parties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rut VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('CLIENTE', 'PROVEEDOR', 'AMBOS')),
    giro VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    region VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(255),
    payment_terms INTEGER DEFAULT 30,
    credit_limit DECIMAL(15,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_third_parties_user ON third_parties(user_id);
CREATE INDEX idx_third_parties_rut ON third_parties(rut);
CREATE INDEX idx_third_parties_type ON third_parties(type);

-- =====================================================
-- 2. PRODUCTOS / INVENTARIO (UPDATED FOR SAP MM-IM)
-- =====================================================
-- 2.1 ALMACENES / BODEGAS (Storage Locations)
CREATE TABLE IF NOT EXISTS storage_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20), -- e.g., '0001', 'ALM-CENTRAL'
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.2 PRODUCTOS (Material Master)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    sku VARCHAR(50) NOT NULL, -- Material Number
    name VARCHAR(255) NOT NULL, -- Material Description
    description TEXT,
    unit VARCHAR(10) DEFAULT 'UN', -- Base Unit of Measure
    category VARCHAR(100), -- Material Group
    min_stock DECIMAL(15,4) DEFAULT 0, -- Reorder Point
    weighted_average_cost DECIMAL(15,4) DEFAULT 0, -- Moving Average Price
    last_purchase_price DECIMAL(15,4),
    selling_price DECIMAL(15,4) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.3 STOCK POR ALMACÉN (Product Stock per Location)
CREATE TABLE IF NOT EXISTS product_stocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    location_id UUID REFERENCES storage_locations(id) ON DELETE CASCADE,
    quantity DECIMAL(15,4) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, location_id)
);

CREATE INDEX idx_products_user ON products(user_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_product_stocks_prod_loc ON product_stocks(product_id, location_id);

-- =====================================================
-- 3. MOVIMIENTOS DE STOCK
-- =====================================================
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    location_id UUID REFERENCES storage_locations(id), -- Where the movement happens
    transfer_location_id UUID REFERENCES storage_locations(id), -- For 311 transfers
    date DATE NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('COMPRA', 'VENTA', 'DEVOLUCION_COMPRA', 'DEVOLUCION_VENTA', 'AJUSTE_ENTRADA', 'AJUSTE_SALIDA', 'DESPACHO', 'TRASPASO')),
    movement_code VARCHAR(10), -- '101', '201', '311', '601', etc.
    quantity DECIMAL(15,4) NOT NULL,
    unit_cost DECIMAL(15,4) NOT NULL,
    total_value DECIMAL(15,4) NOT NULL,
    document_ref VARCHAR(100),
    stock_after DECIMAL(15,4), -- Stock at that location after movement
    pmp_after DECIMAL(15,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_user ON stock_movements(user_id);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_date ON stock_movements(date);

-- =====================================================
-- 4. FACTURAS / INVOICES
-- =====================================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    folio INTEGER NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('FACTURA', 'FACTURA_EXENTA', 'BOLETA', 'NOTA_CREDITO', 'NOTA_DEBITO', 'GUIA_DESPACHO')),
    date DATE NOT NULL,
    due_date DATE,
    customer_id UUID REFERENCES third_parties(id),
    customer_rut VARCHAR(20),
    customer_name VARCHAR(255),
    customer_address TEXT,
    customer_giro VARCHAR(255),
    subtotal DECIMAL(15,2) DEFAULT 0,
    discount_total DECIMAL(15,2) DEFAULT 0,
    net_total DECIMAL(15,2) DEFAULT 0,
    tax_factor DECIMAL(5,4) DEFAULT 0.19,
    tax_total DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    payment_method VARCHAR(30),
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ISSUED', 'PAID', 'VOID', 'OVERDUE')),
    referenced_invoice_id UUID,
    referenced_folio INTEGER,
    credit_note_reason TEXT,
    issued_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_invoices_user ON invoices(user_id);
CREATE INDEX idx_invoices_folio ON invoices(folio);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_date ON invoices(date);
CREATE INDEX idx_invoices_status ON invoices(status);

-- =====================================================
-- 5. DETALLES DE FACTURA
-- =====================================================
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(255),
    quantity DECIMAL(15,4) NOT NULL,
    price DECIMAL(15,4) NOT NULL,
    discount DECIMAL(5,2) DEFAULT 0,
    total_net DECIMAL(15,4) NOT NULL
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);

-- =====================================================
-- 6. COTIZACIONES / QUOTES
-- =====================================================
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    number VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    valid_until DATE,
    customer_id UUID REFERENCES third_parties(id),
    customer_rut VARCHAR(20),
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_address TEXT,
    subtotal DECIMAL(15,2) DEFAULT 0,
    discount_total DECIMAL(15,2) DEFAULT 0,
    net_total DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'CONVERTED', 'EXPIRED')),
    notes TEXT,
    terms TEXT,
    converted_to_invoice_id UUID,
    converted_to_invoice_folio INTEGER,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quotes_user ON quotes(user_id);
CREATE INDEX idx_quotes_number ON quotes(number);
CREATE INDEX idx_quotes_status ON quotes(status);

-- =====================================================
-- 7. ITEMS DE COTIZACIÓN
-- =====================================================
CREATE TABLE IF NOT EXISTS quote_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(255),
    description TEXT,
    quantity DECIMAL(15,4) NOT NULL,
    unit_price DECIMAL(15,4) NOT NULL,
    discount DECIMAL(5,2) DEFAULT 0,
    total_net DECIMAL(15,4) NOT NULL
);

CREATE INDEX idx_quote_items_quote ON quote_items(quote_id);

-- =====================================================
-- 8. ÓRDENES DE COMPRA
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    number VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    expected_date DATE,
    receipt_date DATE,
    supplier_id UUID REFERENCES third_parties(id),
    supplier_rut VARCHAR(20),
    supplier_name VARCHAR(255),
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING', 'RECEIVED', 'CANCELLED')),
    notes TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_po_user ON purchase_orders(user_id);
CREATE INDEX idx_po_number ON purchase_orders(number);
CREATE INDEX idx_po_status ON purchase_orders(status);

-- =====================================================
-- 9. ITEMS DE ORDEN DE COMPRA
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(255),
    quantity DECIMAL(15,4) NOT NULL,
    unit_cost DECIMAL(15,4) NOT NULL,
    total_cost DECIMAL(15,4) NOT NULL
);

CREATE INDEX idx_po_items_po ON purchase_order_items(purchase_order_id);

-- =====================================================
-- 10. GUÍAS DE DESPACHO
-- =====================================================
CREATE TABLE IF NOT EXISTS dispatch_guides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    number VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    customer_id UUID REFERENCES third_parties(id),
    customer_rut VARCHAR(20),
    customer_name VARCHAR(255),
    destination_address TEXT,
    transport_type VARCHAR(20) CHECK (transport_type IN ('PROPIO', 'TERCERO', 'CLIENTE')),
    driver_name VARCHAR(100),
    vehicle_plate VARCHAR(20),
    subtotal DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'DISPATCHED', 'DELIVERED', 'CANCELLED')),
    observations TEXT,
    related_invoice_id UUID,
    related_invoice_folio INTEGER,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_dg_user ON dispatch_guides(user_id);
CREATE INDEX idx_dg_number ON dispatch_guides(number);
CREATE INDEX idx_dg_status ON dispatch_guides(status);

-- =====================================================
-- 11. ITEMS DE GUÍA DE DESPACHO
-- =====================================================
CREATE TABLE IF NOT EXISTS dispatch_guide_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispatch_guide_id UUID REFERENCES dispatch_guides(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(255),
    quantity DECIMAL(15,4) NOT NULL,
    unit_price DECIMAL(15,4),
    total_net DECIMAL(15,4)
);

CREATE INDEX idx_dg_items_dg ON dispatch_guide_items(dispatch_guide_id);

-- =====================================================
-- 12. LIBRO DE CAJA
-- =====================================================
CREATE TABLE IF NOT EXISTS cash_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('INGRESO', 'EGRESO', 'TRANSFERENCIA')),
    category VARCHAR(50),
    description TEXT,
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(30),
    document_ref VARCHAR(100),
    counterpart VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cash_user ON cash_movements(user_id);
CREATE INDEX idx_cash_date ON cash_movements(date);
CREATE INDEX idx_cash_type ON cash_movements(type);

-- =====================================================
-- 13. LIBRO DE COMPRA/VENTA (IEC)
-- =====================================================
CREATE TABLE IF NOT EXISTS iec_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    document_type VARCHAR(30),
    folio INTEGER,
    customer_rut VARCHAR(20),
    customer_name VARCHAR(255),
    net_amount DECIMAL(15,2) DEFAULT 0,
    exempt_amount DECIMAL(15,2) DEFAULT 0,
    iva_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    period VARCHAR(10),
    source VARCHAR(20),
    linked_invoice_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_iec_sales_user ON iec_sales(user_id);
CREATE INDEX idx_iec_sales_period ON iec_sales(period);

CREATE TABLE IF NOT EXISTS iec_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    document_type VARCHAR(30),
    folio INTEGER,
    supplier_rut VARCHAR(20),
    supplier_name VARCHAR(255),
    net_amount DECIMAL(15,2) DEFAULT 0,
    exempt_amount DECIMAL(15,2) DEFAULT 0,
    iva_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    tax_type VARCHAR(20) DEFAULT 'AFECTA',
    period VARCHAR(10),
    source VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_iec_purchases_user ON iec_purchases(user_id);
CREATE INDEX idx_iec_purchases_period ON iec_purchases(period);

-- =====================================================
-- 14. LOG DE AUDITORÍA
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    username VARCHAR(100),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action VARCHAR(30) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT', 'VOID')),
    module VARCHAR(50),
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    description TEXT,
    before_data JSONB,
    after_data JSONB,
    ip_address VARCHAR(50)
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_module ON audit_log(module);

-- =====================================================
-- 15. USUARIOS DEL SISTEMA (RBAC)
-- =====================================================
CREATE TABLE IF NOT EXISTS system_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'VIEWER' CHECK (role IN ('ADMIN', 'ACCOUNTANT', 'SALESPERSON', 'VIEWER')),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sys_users_auth ON system_users(auth_user_id);
CREATE INDEX idx_sys_users_role ON system_users(role);

-- =====================================================
-- 16. ROW LEVEL SECURITY (RLS)
-- =====================================================
-- Enable RLS on all tables
ALTER TABLE third_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_guide_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE iec_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE iec_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;

-- Create policies for user isolation
CREATE POLICY "Users can only see their own data" ON third_parties FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only see their own data" ON products FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only see their own data" ON stock_movements FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only see their own data" ON invoices FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only see their own data" ON quotes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only see their own data" ON purchase_orders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only see their own data" ON dispatch_guides FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only see their own data" ON cash_movements FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only see their own data" ON iec_sales FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only see their own data" ON iec_purchases FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only see their own data" ON audit_log FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only see their own data" ON system_users FOR ALL USING (auth.uid() = auth_user_id);

-- Invoice items and related tables use parent reference
CREATE POLICY "Users can access related invoice items" ON invoice_items FOR ALL 
USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()));

CREATE POLICY "Users can access related quote items" ON quote_items FOR ALL 
USING (EXISTS (SELECT 1 FROM quotes WHERE quotes.id = quote_items.quote_id AND quotes.user_id = auth.uid()));

CREATE POLICY "Users can access related PO items" ON purchase_order_items FOR ALL 
USING (EXISTS (SELECT 1 FROM purchase_orders WHERE purchase_orders.id = purchase_order_items.purchase_order_id AND purchase_orders.user_id = auth.uid()));

CREATE POLICY "Users can access related DG items" ON dispatch_guide_items FOR ALL 
USING (EXISTS (SELECT 1 FROM dispatch_guides WHERE dispatch_guides.id = dispatch_guide_items.dispatch_guide_id AND dispatch_guides.user_id = auth.uid()));

-- =====================================================
-- DONE! Run this SQL in your Supabase Dashboard
-- SQL Editor: https://supabase.com/dashboard/project/trrmcqvakkrxjgzahdzb/sql
-- =====================================================
