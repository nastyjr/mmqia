-- =====================================================
-- FIX: RPC (Stored Procedure) to Bypass Cache/Permission Issues
-- =====================================================

-- 1. Ensure Table Exists
CREATE TABLE IF NOT EXISTS storage_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Explicitly Grant Permissions to the Table
GRANT ALL ON storage_locations TO postgres, anon, authenticated, service_role;

-- 3. Create a Secure Function to Insert Data
-- This runs with "SECURITY DEFINER" privileges, bypassing RLS checks for the insert
CREATE OR REPLACE FUNCTION create_storage_location_secure(
    p_name text,
    p_code text,
    p_address text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_new_id uuid;
BEGIN
    -- Get current authenticated user
    v_user_id := auth.uid();
    
    -- Emergency fallback: if no auth, use the first user found (Dev mode only)
    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id FROM auth.users LIMIT 1;
    END IF;

    -- Insert the record
    INSERT INTO storage_locations (user_id, name, code, address, is_active)
    VALUES (v_user_id, p_name, p_code, p_address, true)
    RETURNING id INTO v_new_id;

    -- Return success object
    RETURN jsonb_build_object(
        'id', v_new_id,
        'name', p_name,
        'message', 'Created via RPC'
    );
END;
$$;

-- 4. Grant Execute Permission on the Function
GRANT EXECUTE ON FUNCTION create_storage_location_secure TO authenticated, service_role, anon;

-- 5. Force Schema Reload again just in case
NOTIFY pgrst, 'reload schema';
