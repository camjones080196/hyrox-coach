import { useEffect, useState } from 'react'
import type { Session as AuthSession } from '@supabase/supabase-js'
import { LocalBackend, SupabaseBackend, supabase } from './data/backend'
import { applyProfile, getProfile, StoreContext, useStore } from './data/model'
import { Store } from './data/store'
import { SignIn, TeamSetup } from './ui/CloudSetup'
import { ExercisesScreen } from './ui/ExercisesScreen'
import { PlanScreen } from './ui/PlanScreen'
import { defaultProfile, ProfileForm } from './ui/ProfileForm'
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

  // Find the team this user belongs to.
  useEffect(() => {
    if (!sb || !auth) return
    sb.from('workspace_members').select('workspace_id').eq('user_id', auth.user.id).order('joined_at').then(({ data }) => {
      const ids = (data ?? []).map((r) => r.workspace_id as string)
      let saved: string | null = null
      try { saved = localStorage.getItem(WS_KEY) } catch { /* ignore */ }
      setWorkspaceId(saved && ids.includes(saved) ? saved : ids[0] ?? null)
    })
  }, [sb, auth])

  // Start the store once we know where data lives.
  useEffect(() => {
    let s: Store | null = null
    if (!sb) s = new Store(new LocalBackend())
    else if (auth && workspaceId) s = new Store(new SupabaseBackend(sb, workspaceId, auth.user.id))
    if (!s) return
    setStore(s)
    s.start()
    return () => s!.stop()
  }, [sb, auth, workspaceId])

  if (sb && auth === undefined) return <Loading />
  if (sb && auth === null) return <SignIn />
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

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab, sessionId])

  if (store.status === 'loading') return <Loading />
  const profile = getProfile(store)

  if (!profile) {
    return (
      <div className="app stack">
        <h1>Set up the plan</h1>
        <p className="muted">Tell us about the athlete and we'll build a starter plan up to race day. You can change everything afterwards.</p>
        <ProfileForm initial={defaultProfile()} submitLabel="Build my plan" onSubmit={(p) => applyProfile(store, p, true)} />
      </div>
    )
  }

  const statusClass = store.backend.mode === 'local' ? 'local' : store.status === 'saving' ? 'saving' : store.status === 'error' ? 'error' : ''
  const statusText = store.backend.mode === 'local' ? 'This phone only' : store.status === 'saving' ? 'Saving…' : store.status === 'error' ? `Sync error: ${store.error}` : 'Synced'

  return (
    <>
      <div className="app">
        <div className="topbar tiny muted">
          <span className={`sync-dot ${statusClass}`} />
          <span>{statusText}</span>
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
    </>
  )
}
