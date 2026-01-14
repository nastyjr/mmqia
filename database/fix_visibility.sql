-- =====================================================
-- FIX: PERMISOS "VER TODO" (Debug Mode)
-- =====================================================

-- 1. Eliminar política estricta anterior
DROP POLICY IF EXISTS "Users can manage own storage locations" ON storage_locations;

-- 2. Permitir que CUALQUIER usuario vea TODOS los almacenes
-- (Esto arregla si el almacén quedó con un ID de usuario diferente)
CREATE POLICY "Ver Todos los Almacenes" ON storage_locations
    FOR SELECT
    USING (true);

-- 3. Permitir Insertar/Editar solo lo propio 
CREATE POLICY "Editar Mis Almacenes" ON storage_locations
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Notificar recarga
NOTIFY pgrst, 'reload schema';
