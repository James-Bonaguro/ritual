/*
 * A minimal Supabase client built on fetch.
 *
 * The official SDK would pull ~40kB for what amounts to four table reads, four
 * upserts and one auth call, on an app whose whole point is to open instantly
 * on a phone with bad gym wifi. PostgREST and GoTrue are plain HTTP, so this
 * talks to them directly.
 *
 * None of this runs unless both env vars are set at build time. Without them
 * `isConfigured()` is false and the app is purely local.
 */

const URL_BASE = import.meta.env.VITE_SUPABASE_URL as string | undefined
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

const TOKEN_KEY = 'ritual.auth'

export type AuthSession = {
  access_token: string
  refresh_token: string
  expires_at: number
  user: { id: string; email?: string }
}

export function isConfigured(): boolean {
  return Boolean(URL_BASE && ANON_KEY)
}

export function loadAuth(): AuthSession | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    return raw ? (JSON.parse(raw) as AuthSession) : null
  } catch {
    return null
  }
}

export function storeAuth(session: AuthSession | null) {
  if (session) localStorage.setItem(TOKEN_KEY, JSON.stringify(session))
  else localStorage.removeItem(TOKEN_KEY)
}

function requireConfig(): { url: string; key: string } {
  if (!URL_BASE || !ANON_KEY) throw new Error('Supabase is not configured for this build')
  return { url: URL_BASE.replace(/\/$/, ''), key: ANON_KEY }
}

/** Sends a magic link. No passwords to manage for a single-user app. */
export async function sendMagicLink(email: string): Promise<void> {
  const { url, key } = requireConfig()
  const response = await fetch(`${url}/auth/v1/otp`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, create_user: true }),
  })
  if (!response.ok) throw new Error(`Could not send sign-in link (${response.status})`)
}

/**
 * GoTrue returns the session in the URL fragment after a magic-link click.
 * The fragment is stripped immediately so the token doesn't sit in history.
 */
export function consumeAuthRedirect(): AuthSession | null {
  if (!window.location.hash.includes('access_token')) return null

  const params = new URLSearchParams(window.location.hash.slice(1))
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  const expiresIn = Number(params.get('expires_in') ?? '3600')
  if (!accessToken || !refreshToken) return null

  const session: AuthSession = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: Date.now() + expiresIn * 1000,
    user: { id: '', email: undefined },
  }
  storeAuth(session)
  history.replaceState(null, '', window.location.pathname + window.location.search)
  return session
}

async function refresh(session: AuthSession): Promise<AuthSession | null> {
  const { url, key } = requireConfig()
  const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  })
  if (!response.ok) {
    storeAuth(null)
    return null
  }
  const body = (await response.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
    user: { id: string; email?: string }
  }
  const next: AuthSession = {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_at: Date.now() + body.expires_in * 1000,
    user: body.user,
  }
  storeAuth(next)
  return next
}

/** Returns a valid session, refreshing it if it is close to expiry. */
export async function currentAuth(): Promise<AuthSession | null> {
  const session = loadAuth()
  if (!session) return null
  // 60s of slack so a request can't expire in flight.
  if (session.expires_at - Date.now() > 60_000) return session
  return refresh(session)
}

export async function signOut(): Promise<void> {
  storeAuth(null)
}

/** Authenticated PostgREST request. Returns parsed JSON, or null for 204s. */
export async function rest<T>(
  path: string,
  init: RequestInit & { prefer?: string } = {},
): Promise<T | null> {
  const { url, key } = requireConfig()
  const session = await currentAuth()
  if (!session) throw new Error('Not signed in')

  const headers: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
    ...(init.prefer ? { Prefer: init.prefer } : {}),
    ...((init.headers as Record<string, string>) ?? {}),
  }

  const response = await fetch(`${url}/rest/v1/${path}`, { ...init, headers })
  if (!response.ok) {
    throw new Error(`Supabase request failed: ${response.status} ${await response.text()}`)
  }
  if (response.status === 204) return null
  const text = await response.text()
  return text ? (JSON.parse(text) as T) : null
}
