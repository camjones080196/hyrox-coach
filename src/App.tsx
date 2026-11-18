import { useEffect, useState } from 'react'
import type { Session as AuthSession } from '@supabase/supabase-js'
import { LocalBackend, SupabaseBackend, supabase } from './data/backend'
import { AthleteContext, applyPlan, getAthletes, getSettings, migrate, rememberAthleteId, savedAthleteId, StoreContext, useStore } from './data/model'
import { Store } from './data/store'
import { SignIn, TeamSetup } from './ui/CloudSetup'
import { ExercisesScreen } from './ui/ExercisesScreen'
import { PlanScreen } from './ui/PlanScreen'
import { defaultAthletes, defaultSettings, PlanForm } from './ui/ProfileForm'
import { ProgressScreen } from './ui/ProgressScreen'
import { SessionScreen } from './ui/SessionScreen'
import { SettingsScreen } from './ui/SettingsScreen'
import { TodayScreen } from './ui/TodayScreen'

type Tab = 'today' | 'plan' | 'progress' | 'exercises' | 'settings'
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: 'Today', icon: '🏠' },
  { id: 'plan', label: 'Plan', icon: '📅' },
  { id: 'progress', label: 'Progress', icon: '📈' },
  { id: 'exercises', label: 'Exercises', icon: '🏋️' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

const WS_KEY = 'hyrox-coach-workspace'

export default function App() {
  const sb = supabase()
  const [auth, setAuth] = useState<AuthSession | null | undefined>(sb ? undefined : null)
  const [workspaceId, setWorkspaceId] = useState<string | null | undefined>(undefined)
  const [store, setStore] = useState<Store | null>(null)

  // Auth state (cloud mode only).
  useEffect(() => {
    if (!sb) return
    sb.auth.getSession().then(({ data }) => setAuth(data.session))
    const { data } = sb.auth.onAuthStateChange((_e, s) => setAuth(s))
    return () => data.subscription.unsubscribe()
  }, [sb])

  // Find the team this user belongs to. Only re-check when the user changes,
  // not on every token refresh, and never treat a failed lookup as "no team"
  // (that used to show the create-team screen and invite duplicates).
  const userId = auth?.user.id
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [lookupTry, setLookupTry] = useState(0)
  useEffect(() => {
    if (!sb || !userId) return
    let cancelled = false
    sb.from('workspace_members').select('workspace_id').eq('user_id', userId).order('joined_at').then(({ data, error }) => {
      if (cancelled) return
      if (error) {
        setLookupError(error.message)
        return
      }
      setLookupError(null)
      const ids = (data ?? []).map((r) => r.workspace_id as string)
      let saved: string | null = null
      try { saved = localStorage.getItem(WS_KEY) } catch { /* ignore */ }
      setWorkspaceId(saved && ids.includes(saved) ? saved : ids[0] ?? null)
    })
    return () => { cancelled = true }
  }, [sb, userId, lookupTry])

  // Start the store once we know where data lives.
  useEffect(() => {
    let s: Store | null = null
    if (!sb) s = new Store(new LocalBackend())
    else if (userId && workspaceId) s = new Store(new SupabaseBackend(sb, workspaceId, userId))
    if (!s) return
    setStore(s)
    s.start()
    return () => s!.stop()
  }, [sb, userId, workspaceId])

  if (sb && auth === undefined) return <Loading />
  if (sb && auth === null) return <SignIn />
  if (sb && auth && lookupError) {
    return (
      <div className="app stack">
        <h1>Can't reach your team</h1>
        <div className="notice">{lookupError}</div>
        <button className="btn primary" onClick={() => { setLookupError(null); setLookupTry((n) => n + 1) }}>Try again</button>
      </div>
    )
  }
  if (sb && auth && workspaceId === undefined) return <Loading />
  if (sb && auth && workspaceId === null) {
    return <TeamSetup auth={auth} onReady={(id) => { try { localStorage.setItem(WS_KEY, id) } catch { /* ignore */ } setWorkspaceId(id) }} />
  }
  if (!store) return <Loading />

  return (
    <StoreContext.Provider value={store}>
      <Main workspaceId={workspaceId ?? undefined} />
    </StoreContext.Provider>
  )
}

function Loading() {
  return <div className="app center muted" style={{ paddingTop: 80 }}>Loading…</div>
}

function Main({ workspaceId }: { workspaceId?: string }) {
  const store = useStore()
  const [tab, setTab] = useState<Tab>('today')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [chosen, setChosen] = useState<string | null>(savedAthleteId())

  useEffect(() => {
    if (store.status === 'ready') migrate(store)
  }, [store, store.status])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab, sessionId])

  if (store.status === 'loading') return <Loading />
  const settings = getSettings(store)
  const athletes = getAthletes(store)

  if (!settings || !athletes.length) {
    return (
      <div className="app stack">
        <h1>Set up the plan</h1>
        <p className="muted">Add who's training and we'll build one shared plan up to race day, with each person's own weights and distances. You can change everything afterwards.</p>
        <PlanForm initialSettings={settings ?? defaultSettings()} initialAthletes={defaultAthletes()} submitLabel="Build our plan" onSubmit={(s, a) => applyPlan(store, s, a, true)} />
      </div>
    )
  }

  const athleteId = athletes.some((a) => a.id === chosen) ? chosen! : athletes[0].id
  const setAthleteId = (id: string) => {
    setChosen(id)
    rememberAthleteId(id)
  }

  const statusClass = store.backend.mode === 'local' ? 'local' : store.status === 'saving' ? 'saving' : store.status === 'error' ? 'error' : ''
  const statusText = store.backend.mode === 'local' ? 'This phone only' : store.status === 'saving' ? 'Saving…' : store.status === 'error' ? `Sync error: ${store.error}` : 'Synced'

  return (
    <AthleteContext.Provider value={{ athleteId, setAthleteId }}>
      <div className="app">
        <div className="topbar">
          <span className={`sync-dot ${statusClass}`} />
          <span className="tiny muted grow">{statusText}</span>
          {athletes.length > 1 && (
            <div className="seg" role="tablist" aria-label="Athlete">
              {athletes.map((a) => (
                <button key={a.id} role="tab" aria-selected={a.id === athleteId} className={a.id === athleteId ? 'on' : ''} onClick={() => setAthleteId(a.id)}>{a.name}</button>
              ))}
            </div>
          )}
        </div>
        {sessionId ? (
          <SessionScreen id={sessionId} onBack={() => setSessionId(null)} />
        ) : tab === 'today' ? (
          <TodayScreen onOpen={setSessionId} />
        ) : tab === 'plan' ? (
          <PlanScreen onOpen={setSessionId} />
        ) : tab === 'progress' ? (
          <ProgressScreen />
        ) : tab === 'exercises' ? (
          <ExercisesScreen />
        ) : (
          <SettingsScreen workspaceId={workspaceId} />
        )}
      </div>
      <nav className="nav">
        <div className="nav-inner">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id && !sessionId ? 'active' : ''} onClick={() => { setTab(t.id); setSessionId(null) }}>
              <span className="ico">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </AthleteContext.Provider>
  )
}
