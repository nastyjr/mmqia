-- =====================================================
-- CHILEAN LOCALIZATION UPDATE (IMPUESTOS)
-- =====================================================

-- 1. Actualizar Tabla Productos (Tax Category)
-- Categorías: AFECTO (19%), EXENTO (0%), ILA_10 (10%), ILA_18 (18%), ILA_31 (31.5%), ILA_40 (40%)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS tax_category VARCHAR(20) DEFAULT 'AFECTO';

-- 2. Actualizar Tabla Ordenes de Compra (Desglose Totales)
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS net_amount DECIMAL(15,2) DEFAULT 0, -- Neto
ADD COLUMN IF NOT EXISTS tax_19_amount DECIMAL(15,2) DEFAULT 0, -- IVA 19%
ADD COLUMN IF NOT EXISTS tax_ila_amount DECIMAL(15,2) DEFAULT 0, -- Impuestos Adicionales
ADD COLUMN IF NOT EXISTS exempt_amount DECIMAL(15,2) DEFAULT 0; -- Monto Exento

-- 3. Actualizar Items de Orden de Compra (Desglose por línea)
ALTER TABLE purchase_order_items 
ADD COLUMN IF NOT EXISTS tax_category VARCHAR(20) DEFAULT 'AFECTO',
ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 19.00,
ADD COLUMN IF NOT EXISTS net_cost DECIMAL(15,2) DEFAULT 0, -- Costo unitario neto
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,2) DEFAULT 0; -- Monto impuesto total de la linea

-- 4. Notificar recarga
NOTIFY pgrst, 'reload schema';
