import { useState } from 'react'
import type { Session as AuthSession } from '@supabase/supabase-js'
import { CLOUD_FROM_ENV, getCloudConfig, LocalBackend, saveCloudConfig, supabase } from '../data/backend'

/** Form to paste the Supabase project URL and anon key. */
export function CloudConfigForm() {
  const cfg = getCloudConfig()
  const [url, setUrl] = useState(cfg?.url ?? '')
  const [key, setKey] = useState(cfg?.anonKey ?? '')
  return (
    <form
      className="stack-sm"
      onSubmit={(e) => {
        e.preventDefault()
        saveCloudConfig({ url: url.trim(), anonKey: key.trim() })
        window.location.reload()
      }}
    >
      <label className="field">Supabase project URL<input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://xxxx.supabase.co" /></label>
      <label className="field">Supabase anon (public) key<input value={key} onChange={(e) => setKey(e.target.value)} placeholder="eyJ..." /></label>
      <button className="btn primary" disabled={!url.startsWith('https://') || key.length < 20}>Turn on sync</button>
    </form>
  )
}

export function SignIn() {
  const sb = supabase()!
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const go = async (mode: 'in' | 'up') => {
    setBusy(true)
    setMsg(null)
    const { data, error } =
      mode === 'in'
        ? await sb.auth.signInWithPassword({ email, password })
        : await sb.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + window.location.pathname } })
    setBusy(false)
    if (error) setMsg(error.message)
    else if (mode === 'up' && !data.session) setMsg('Account created. Check your email for a confirmation link, then come back and sign in.')
  }

  return (
    <div className="app stack">
      <h1>Sign in</h1>
      <p className="muted">Sign in so your plan and logs stay in sync between phones.</p>
      <label className="field">Email<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label className="field">Password<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      {msg && <div className="notice">{msg}</div>}
      <button className="btn primary block" disabled={busy || !email || password.length < 6} onClick={() => go('in')}>Sign in</button>
      <button className="btn block" disabled={busy || !email || password.length < 6} onClick={() => go('up')}>Create account</button>
      {!CLOUD_FROM_ENV && <button className="btn ghost small" onClick={() => { saveCloudConfig(null); window.location.reload() }}>Use without sync on this phone</button>}
    </div>
  )
}

export function TeamSetup({ auth, onReady }: { auth: AuthSession; onReady: (workspaceId: string) => void }) {
  const sb = supabase()!
  const [code, setCode] = useState('')
  const [name, setName] = useState('Hyrox Cape Town')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const create = async () => {
    setBusy(true)
    const { data, error } = await sb.rpc('create_workspace', { team_name: name })
    if (error) { setBusy(false); return setMsg(error.message) }
    // Bring across anything already set up on this phone.
    const local = await new LocalBackend().load()
    if (local.length) {
      const rows = local.map((d) => ({ workspace_id: data.id, kind: d.kind, id: d.id, data: d.data, updated_at: d.updatedAt, updated_by: auth.user.id }))
      const { error: e2 } = await sb.from('docs').upsert(rows)
      if (e2) setMsg(`Team created, but copying this phone's plan failed: ${e2.message}`)
    }
    setBusy(false)
    onReady(data.id)
  }

  const join = async () => {
    setBusy(true)
    const { data, error } = await sb.rpc('join_workspace', { code })
    setBusy(false)
    if (error) return setMsg(error.message)
    onReady(data.id)
  }

  return (
    <div className="app stack">
      <h1>Set up your team</h1>
      <p className="muted">One of you creates the team, then shares its code with the other.</p>
      <div className="card stack-sm">
        <h2>Join with a code</h2>
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="6-character code" maxLength={6} />
        <button className="btn primary" disabled={busy || code.length !== 6} onClick={join}>Join team</button>
      </div>
      <div className="card stack-sm">
        <h2>Or create a new team</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn" disabled={busy} onClick={create}>Create team</button>
        <span className="tiny muted">If you already set up a plan on this phone, it's copied into the new team.</span>
      </div>
      {msg && <div className="notice">{msg}</div>}
      <button className="btn ghost small" onClick={() => sb.auth.signOut()}>Sign out ({auth.user.email})</button>
    </div>
  )
}
