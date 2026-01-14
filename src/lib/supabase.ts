import { createClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase credentials not found. Using localStorage fallback mode.')
    console.warn('To enable multi-user mode, create a Supabase project and add credentials to .env')
}

export const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: localStorage,
        },
        realtime: {
            params: {
                eventsPerSecond: 2,
            },
        },
    })
    : null

// Helper to get current user's company ID
export async function getCurrentCompanyId(): Promise<string | null> {
    if (!supabase) return null

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single()

    return data?.company_id || null
}

// Helper to check if user has permission
export async function hasPermission(permission: 'read' | 'write' | 'admin'): Promise<boolean> {
    if (!supabase) return true // In offline mode, assume full permissions

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data } = await supabase
        .from('company_users')
        .select('role')
        .eq('user_id', user.id)
        .single()

    if (!data) return false

    const rolePermissions: Record<string, string[]> = {
        'admin': ['read', 'write', 'admin'],
        'accountant': ['read', 'write'],
        'viewer': ['read']
    }

    return rolePermissions[data.role]?.includes(permission) || false
}
