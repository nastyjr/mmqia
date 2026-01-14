-- =====================================================
-- DIAGNÓSTICO Y REPARACIÓN FINAL
-- =====================================================

-- 1. Forzar recarga de esquema (Ejecutar esto primero)
NOTIFY pgrst, 'reload schema';

-- 2. Verificar si la tabla existe insertando un dato de prueba
-- Si esto falla, es que la tabla NO se creó correctamente antes.
INSERT INTO storage_locations (user_id, name, code, is_active)
SELECT id, 'Bodega Prueba SQL', 'TEST', true 
FROM auth.users 
LIMIT 1;

-- 3. Confirmar que se guardó
SELECT * FROM storage_locations;
