import { useEffect, useState } from 'react'
import { CLOUD_FROM_ENV, saveCloudConfig, supabase } from '../data/backend'
import { applyPlan, getAthletes, getSettings, useStore } from '../data/model'
import { CloudConfigForm } from './CloudSetup'
import { PlanForm } from './ProfileForm'

export function SettingsScreen({ workspaceId }: { workspaceId?: string }) {
  const store = useStore()
  const settings = getSettings(store)!
  const athletes = getAthletes(store)
  const [saved, setSaved] = useState(false)

  return (
    <div className="stack">
      <h1>Settings</h1>
      <div className="card stack">
        <PlanForm
          key={athletes.map((a) => a.id).join()}
          initialSettings={settings}
          initialAthletes={athletes}
          submitLabel="Save settings"
          allowKeepPlan
          onSubmit={async (p, a, regen) => {
            await applyPlan(store, p, a, regen)
            setSaved(true)
            setTimeout(() => setSaved(false), 2500)
          }}
        />
        {saved && <div className="notice">Saved.</div>}
      </div>

      <div className="card stack-sm">
        <h2>Sync</h2>
        {store.backend.mode === 'local' ? (
          <>
            <p className="small muted">Right now everything is saved on this phone only. To share the plan with another phone, connect a free Supabase project (see the README).</p>
            <CloudConfigForm />
          </>
        ) : (
          <TeamInfo workspaceId={workspaceId!} />
        )}
      </div>

      <div className="card stack-sm">
        <h2>Safety</h2>
        <p className="small muted">This plan is a starting point, not medical advice. Check it with a physio or doctor, especially anything involving jumping, deep knee bends or heavy spinal loading, and stop any exercise that causes pain, numbness or unusual symptoms.</p>
      </div>
    </div>
  )
}

function TeamInfo({ workspaceId }: { workspaceId: string }) {
  const sb = supabase()!
  const [team, setTeam] = useState<{ name: string; join_code: string } | null>(null)
  const [members, setMembers] = useState<string[]>([])
  const [me, setMe] = useState('')
  useEffect(() => {
    sb.from('workspaces').select('name, join_code').eq('id', workspaceId).single().then(({ data }) => setTeam(data))
    sb.from('workspace_members').select('email').eq('workspace_id', workspaceId).then(({ data }) => setMembers((data ?? []).map((m) => m.email ?? 'member')))
    sb.auth.getUser().then(({ data }) => setMe(data.user?.email ?? ''))
  }, [sb, workspaceId])
  return (
    <>
      <p className="small">Synced with team <b>{team?.name}</b>.</p>
      <p className="small">Join code: <b style={{ fontSize: '1.2rem', letterSpacing: 2 }}>{team?.join_code}</b></p>
      <p className="small muted">Members: {members.join(', ')}</p>
      <div className="row-wrap">
        <button className="btn small" onClick={() => sb.auth.signOut()}>Sign out {me}</button>
        {!CLOUD_FROM_ENV && <button className="btn small ghost" onClick={() => { if (window.confirm('Stop syncing on this phone? Your team data stays in the cloud.')) { sb.auth.signOut(); saveCloudConfig(null); window.location.reload() } }}>Turn off sync</button>}
      </div>
    </>
  )
}
