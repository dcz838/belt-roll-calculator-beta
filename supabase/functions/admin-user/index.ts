import { createClient } from 'npm:@supabase/supabase-js@2'

const ALLOWED_ORIGINS = new Set([
  'https://dcz838.github.io',
  'http://localhost:3000',
  'http://localhost:5173',
])

function cors(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : 'https://dcz838.github.io'
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
    'Content-Type': 'application/json',
  }
}

function pickKey(raw: string | undefined, preferred: string[]) {
  try {
    const map = JSON.parse(raw || '{}') as Record<string, unknown>
    for (const name of preferred) {
      const value = map?.[name]
      if (typeof value === 'string' && value.length > 20) return value
    }
    for (const value of Object.values(map || {})) {
      if (typeof value === 'string' && value.length > 20) return value
    }
  } catch {}
  return ''
}

function json(body: unknown, status: number, headers: HeadersInit) {
  return new Response(JSON.stringify(body), { status, headers })
}

Deno.serve(async (req: Request) => {
  const headers = cors(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, headers)

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) return json({ error: 'Authentication required' }, 401, headers)

    const url = Deno.env.get('SUPABASE_URL') || ''
    const publishableKey = pickKey(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS'), ['default', 'publishable', 'public'])
    const secretKey = pickKey(Deno.env.get('SUPABASE_SECRET_KEYS'), ['default', 'secret']) || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    if (!url || !publishableKey) throw new Error('Supabase publishable credentials are unavailable to the Edge Function.')
    if (!secretKey) throw new Error('Supabase secret credentials are unavailable to the Edge Function.')

    // Identity and caller authorization use the caller's JWT + publishable key.
    // Privileged writes use a separate secret-key client only after authorization succeeds.
    const userClient = createClient(url, publishableKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const admin = createClient(url, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: authData, error: authError } = await userClient.auth.getUser(token)
    if (authError || !authData.user) {
      console.error('admin-user auth lookup failed', authError)
      return json({ error: 'Invalid user session', detail: authError?.message || '' }, 401, headers)
    }

    const { data: caller, error: callerError } = await userClient
      .from('profiles')
      .select('id,role,is_active,can_manage_users')
      .eq('id', authData.user.id)
      .single()

    if (callerError) {
      console.error('admin-user caller profile lookup failed', { userId: authData.user.id, callerError })
      return json({ error: 'Unable to verify administrator profile', detail: callerError.message }, 500, headers)
    }
    if (!caller) return json({ error: 'Administrator profile not found' }, 403, headers)
    if (!caller.is_active) return json({ error: 'This account is inactive' }, 403, headers)
    if (caller.role !== 'admin' && !caller.can_manage_users) {
      return json({ error: 'Administrator permission required' }, 403, headers)
    }

    const body = await req.json()
    const action = String(body?.action || '')
    const userId = String(body?.user_id || '')
    if (!userId) return json({ error: 'User ID is required' }, 400, headers)

    if (action === 'reset_password') {
      const password = String(body.password || '')
      if (password.length < 8) return json({ error: 'Password must be at least 8 characters' }, 400, headers)
      const { error: updateError } = await admin.auth.admin.updateUserById(userId, { password })
      if (updateError) throw updateError
      await admin.from('audit_log').insert({ actor_id: authData.user.id, action: 'user_password_reset', entity_type: 'auth_user', entity_id: userId, new_data: { reset: true } })
      return json({ ok: true }, 200, headers)
    }

    if (action === 'set_inventory_password') {
      const pin = String(body.pin || '')
      if (!/^\d{4,}$/.test(pin)) return json({ error: 'Inventory password must contain at least 4 digits' }, 400, headers)
      const { error: pinError } = await admin.rpc('admin_set_inventory_pin', { p_user_id: userId, p_pin: pin })
      if (pinError) throw pinError
      await admin.from('audit_log').insert({ actor_id: authData.user.id, action: 'inventory_password_reset', entity_type: 'profile', entity_id: userId, new_data: { reset: true } })
      return json({ ok: true }, 200, headers)
    }

    if (action === 'update_profile') {
      const allowed = new Set(['display_name','role','is_active','can_add_belt','can_modify_belt','can_delete_belt','can_add_stock','can_use_stock','can_set_balance','can_manage_users','can_backup','can_restore_backup'])
      const patch = Object.fromEntries(Object.entries(body.patch || {}).filter(([key]) => allowed.has(key)))
      const { data: profile, error: updateError } = await admin.from('profiles').update(patch).eq('id', userId).select().single()
      if (updateError) throw updateError
      await admin.from('audit_log').insert({ actor_id: authData.user.id, action: 'user_permissions_update', entity_type: 'profile', entity_id: userId, new_data: patch })
      return json({ ok: true, profile }, 200, headers)
    }

    return json({ error: 'Unsupported action' }, 400, headers)
  } catch (error) {
    console.error('admin-user unhandled error', error)
    return json({ error: error instanceof Error ? error.message : String(error) }, 500, headers)
  }
})
