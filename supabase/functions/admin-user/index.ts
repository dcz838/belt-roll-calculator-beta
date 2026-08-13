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

Deno.serve(async (req: Request) => {
  const headers = cors(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers })

    const url = Deno.env.get('SUPABASE_URL')!
    const secretMap = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}')
    const secretKey = secretMap.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!secretKey) throw new Error('Supabase secret key is unavailable to the Edge Function.')

    const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: authData, error: authError } = await admin.auth.getUser(token)
    if (authError || !authData.user) return new Response(JSON.stringify({ error: 'Invalid user session' }), { status: 401, headers })

    const { data: caller, error: callerError } = await admin.from('profiles')
      .select('id,role,is_active,can_manage_users')
      .eq('id', authData.user.id).single()
    if (callerError || !caller?.is_active || (caller.role !== 'admin' && !caller.can_manage_users)) {
      return new Response(JSON.stringify({ error: 'Administrator permission required' }), { status: 403, headers })
    }

    const body = await req.json()
    if (body?.action !== 'reset_password') return new Response(JSON.stringify({ error: 'Unsupported action' }), { status: 400, headers })
    const userId = String(body.user_id || '')
    const password = String(body.password || '')
    if (!userId) return new Response(JSON.stringify({ error: 'User ID is required' }), { status: 400, headers })
    if (password.length < 8) return new Response(JSON.stringify({ error: 'Password must be at least 8 characters' }), { status: 400, headers })

    const { error: updateError } = await admin.auth.admin.updateUserById(userId, { password })
    if (updateError) throw updateError

    await admin.from('audit_log').insert({
      actor_id: authData.user.id,
      action: 'user_password_reset',
      entity_type: 'auth_user',
      entity_id: userId,
      new_data: { reset: true },
    })

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 500, headers })
  }
})
