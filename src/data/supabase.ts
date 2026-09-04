/*
 * A minimal Supabase client built on fetch.
 *
 * The official SDK would pull ~40kB for what amounts to four table reads, four
 * upserts and one auth call, on an app whose whole point is to open instantly
 * on a phone with bad gym wifi. PostgREST and GoTrue are plain HTTP, so this
 * talks to them directly.
 *
 * Sign-in is an emailed six-digit code rather than only a magic link. Ritual is
 * installed to a home screen, and on iOS a link tapped in Mail opens Safari, not
 * the installed app — the session would land in Safari's storage and the app
 * itself would still look signed out. A code is typed into whichever copy of the
 * app asked for it, so it works the same everywhere. The link still goes out in
 * the same email and still works, for signing in on a desktop browser.
 */

/*
 * The project this app syncs to, committed rather than injected at build time.
 *
 * Both values ship inside the JS bundle of every build: this is a static site in
 * a public repository, so anyone can read them out of devtools regardless. A
 * repository variable bought no secrecy here, only a manual setup step that had
 * to be repeated for every clone. The anon key is designed for this — access is
 * enforced by row-level security keyed on auth.uid(), not by the key being hard
 * to come by.
 *
 * A build can still point elsewhere via VITE_SUPABASE_URL and
 * VITE_SUPABASE_ANON_KEY, which the deploy workflow passes through when the
 * matching repository variables exist. `||` rather than `??`, because an unset
 * Actions variable arrives as an empty string rather than as undefined.
 */
const DEFAULT_URL = 'https://hhnncqrtrctnlktobzrc.supabase.co'
const DEFAULT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhobm5jcXJ0cmN0bmxrdG9ienJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0OTIxMjIsImV4cCI6MjEwNDA2ODEyMn0.2DfpszPmFGZ00vP5Gbxq7dS_2qsB9G9NdP58hluU8ko'

const URL_BASE = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || DEFAULT_URL
const ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || DEFAULT_ANON_KEY

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
  try {
    if (session) localStorage.setItem(TOKEN_KEY, JSON.stringify(session))
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Cookies-blocked configurations throw here. Sync just won't persist
    // sign-in across reloads; nothing local is at risk.
  }
}

function requireConfig(): { url: string; key: string } {
  if (!URL_BASE || !ANON_KEY) throw new Error('Supabase is not configured for this build')
  return { url: URL_BASE.replace(/\/$/, ''), key: ANON_KEY }
}

/**
 * Sends the sign-in email: a six-digit code and a link, both for the same login.
 * No passwords to manage for a single-user app.
 *
 * `redirect_to` matters. Without it GoTrue falls back to the project's Site URL,
 * which on a fresh Supabase project is http://localhost:3000 — so the link in
 * the email would land on a dead page instead of coming back here. The value has
 * to be on the project's redirect allow list or GoTrue ignores it and falls back
 * anyway.
 */
export async function sendSignInEmail(email: string): Promise<void> {
  const { url, key } = requireConfig()
  const response = await fetch(`${url}/auth/v1/otp`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      create_user: true,
      // Not location.href: a stale fragment or query from the current visit
      // would be carried into the redirect target and fail the allow list.
      redirect_to: `${window.location.origin}${window.location.pathname}`,
    }),
  })
  if (!response.ok) throw new Error(`Could not send the sign-in email (${response.status})`)
}

/**
 * Supabase access tokens are JWTs; `sub` and `email` are ordinary claims in
 * the payload. Decoding them locally avoids a round trip to /auth/v1/user
 * just to learn who the token that GoTrue just issued belongs to.
 */
function decodeAccessToken(token: string): { id: string; email?: string } | null {
  try {
    const payload = token.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const claims = JSON.parse(json) as { sub: string; email?: string }
    return { id: claims.sub, email: claims.email }
  } catch {
    return null
  }
}

type TokenResponse = {
  access_token: string
  refresh_token: string
  expires_in?: number
  user?: { id: string; email?: string }
}

/**
 * Builds and persists a session from whatever GoTrue handed back — a token
 * response body, or the parameters off a redirect fragment. Prefers the user in
 * the response and falls back to the token's own claims, so the id can never end
 * up empty; an empty id silently fails every row-level security check on write.
 */
function adoptSession(body: TokenResponse): AuthSession | null {
  const user = body.user?.id ? body.user : decodeAccessToken(body.access_token)
  if (!user?.id) return null

  const session: AuthSession = {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_at: Date.now() + (body.expires_in ?? 3600) * 1000,
    user,
  }
  storeAuth(session)
  return session
}

/**
 * Exchanges an emailed six-digit code for a session. Unlike the link, this never
 * leaves the app, so the session is stored by whichever copy of Ritual asked for
 * it — the one installed to a home screen included.
 */
export async function verifyOtp(email: string, token: string): Promise<AuthSession> {
  const { url, key } = requireConfig()
  const response = await fetch(`${url}/auth/v1/verify`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'email', email, token: token.trim() }),
  })
  if (!response.ok) throw new Error(`That code didn't work (${response.status})`)

  const session = adoptSession((await response.json()) as TokenResponse)
  if (!session) throw new Error('Signed in, but the response carried no usable session')
  return session
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

  const session = adoptSession({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
  })
  if (!session) return null

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
  return adoptSession((await response.json()) as TokenResponse)
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
