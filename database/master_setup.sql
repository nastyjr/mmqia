-- =====================================================
-- MASTER SETUP: AUTOREPARACIÓN DESDE EL FRONTEND
-- =====================================================

-- 1. Función Maestra para Inicializar Inventario
-- Esta función crea todas las tablas y permisos necesarios.
-- Al crearla, podremos llamarla desde un botón en la App.

CREATE OR REPLACE FUNCTION setup_inventory_system()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con superpoderes
AS $$
BEGIN
    -- 1. Crear Tabla Almacenes
    CREATE TABLE IF NOT EXISTS storage_locations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20),
        address TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- 2. Crear Tabla Stock
    CREATE TABLE IF NOT EXISTS product_stocks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        location_id UUID REFERENCES storage_locations(id) ON DELETE CASCADE,
        quantity DECIMAL(15,4) DEFAULT 0,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT unique_product_location UNIQUE (product_id, location_id)
    );

    -- 3. Habilitar Seguridad (RLS)
    ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;
    ALTER TABLE product_stocks ENABLE ROW LEVEL SECURITY;

    -- 4. Crear Políticas "Permisivas" (Ver y Editar lo propio + Ver todo)
    -- Borrar antiguas para evitar error
    DROP POLICY IF EXISTS "Ver Todos Almacenes" ON storage_locations;
    DROP POLICY IF EXISTS "Gestionar Mis Almacenes" ON storage_locations;
    
    -- Política 1: Todos pueden VER para que salgan en listas
    CREATE POLICY "Ver Todos Almacenes" ON storage_locations FOR SELECT USING (true);
    
    -- Política 2: Solo el dueño puede EDITAR/BORRAR
    CREATE POLICY "Gestionar Mis Almacenes" ON storage_locations 
        FOR ALL 
        USING (auth.uid() = user_id) 
        WITH CHECK (auth.uid() = user_id);

    -- Políticas de Stock
    DROP POLICY IF EXISTS "Gestionar Stock" ON product_stocks;
    CREATE POLICY "Gestionar Stock" ON product_stocks 
        FOR ALL 
        USING (true) -- Simplificado para evitar bloqueos por ahora
        WITH CHECK (true);

    -- 5. Crear Bodega Central por defecto si no existe
    IF NOT EXISTS (SELECT 1 FROM storage_locations WHERE code = '0001') THEN
        INSERT INTO storage_locations (user_id, name, code, is_active)
        VALUES (auth.uid(), 'Bodega Central', '0001', true);
    END IF;

    -- 6. Recargar Schema
    -- (Nota: un RPC no puede ejecutar NOTIFY a veces, pero lo intentamos)
    -- NOTIFY pgrst, 'reload schema'; -- Comentado para evitar error en funcion

    RETURN jsonb_build_object('status', 'success', 'message', 'Sistema inicializado correctamente');
END;
$$;

-- Permitir que cualquiera autenticado use esta función
GRANT EXECUTE ON FUNCTION setup_inventory_system TO authenticated;

-- Forzar recarga ahora mismo para que la función aparezca
NOTIFY pgrst, 'reload schema';
