// Storage backends. Everything the app stores is a "doc": a JSON value keyed by
// kind + id. The local backend keeps docs on this device; the Supabase backend
// shares them with everyone in the same team and pushes changes live.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type Kind = 'profile' | 'week' | 'session' | 'log' | 'exercise'

export interface Doc<T = unknown> {
  kind: Kind
  id: string
  data: T
  updatedAt: string
  updatedBy?: string
}

export type Change = { type: 'upsert'; doc: Doc } | { type: 'delete'; kind: Kind; id: string }

export interface Backend {
  readonly mode: 'local' | 'cloud'
  load(): Promise<Doc[]>
  upsert(docs: Doc[]): Promise<void>
  remove(keys: { kind: Kind; id: string }[]): Promise<void>
  subscribe(cb: (c: Change) => void): () => void
}

const keyOf = (kind: Kind, id: string) => `${kind}:${id}`

// ---------------------------------------------------------------- local

export class LocalBackend implements Backend {
  readonly mode = 'local' as const
  private storageKey = 'hyrox-coach-docs-v1'
  private channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('hyrox-coach') : null

  private read(): Record<string, Doc> {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || '{}')
    } catch {
      return {}
    }
  }
  private write(all: Record<string, Doc>) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(all))
    } catch (e) {
      console.error('Could not save locally', e)
    }
  }
  async load() {
    return Object.values(this.read())
  }
  async upsert(docs: Doc[]) {
    const all = this.read()
    for (const d of docs) all[keyOf(d.kind, d.id)] = d
    this.write(all)
    for (const doc of docs) this.channel?.postMessage({ type: 'upsert', doc } satisfies Change)
  }
  async remove(keys: { kind: Kind; id: string }[]) {
    const all = this.read()
    for (const k of keys) delete all[keyOf(k.kind, k.id)]
    this.write(all)
    for (const k of keys) this.channel?.postMessage({ type: 'delete', ...k } satisfies Change)
  }
  subscribe(cb: (c: Change) => void) {
    const h = (e: MessageEvent) => cb(e.data as Change)
    this.channel?.addEventListener('message', h)
    return () => this.channel?.removeEventListener('message', h)
  }
}

// ---------------------------------------------------------------- cloud

interface Row {
  workspace_id: string
  kind: Kind
  id: string
  data: unknown
  updated_at: string
  updated_by: string | null
}

const fromRow = (r: Row): Doc => ({ kind: r.kind, id: r.id, data: r.data, updatedAt: r.updated_at, updatedBy: r.updated_by ?? undefined })

export class SupabaseBackend implements Backend {
  readonly mode = 'cloud' as const
  private sb: SupabaseClient
  private workspaceId: string
  private userId: string
  constructor(sb: SupabaseClient, workspaceId: string, userId: string) {
    this.sb = sb
    this.workspaceId = workspaceId
    this.userId = userId
  }

  async load() {
    const out: Doc[] = []
    // Page through in chunks; a full season plan is a few hundred docs.
    for (let from = 0; ; from += 1000) {
      const { data, error } = await this.sb.from('docs').select('*').eq('workspace_id', this.workspaceId).range(from, from + 999)
      if (error) throw error
      out.push(...(data as Row[]).map(fromRow))
      if (data.length < 1000) break
    }
    return out
  }
  async upsert(docs: Doc[]) {
    for (let i = 0; i < docs.length; i += 500) {
      const rows = docs.slice(i, i + 500).map((d) => ({
        workspace_id: this.workspaceId, kind: d.kind, id: d.id, data: d.data, updated_at: d.updatedAt, updated_by: this.userId,
      }))
      const { error } = await this.sb.from('docs').upsert(rows)
      if (error) throw error
    }
  }
  async remove(keys: { kind: Kind; id: string }[]) {
    const byKind = new Map<Kind, string[]>()
    for (const k of keys) byKind.set(k.kind, [...(byKind.get(k.kind) ?? []), k.id])
    for (const [kind, ids] of byKind) {
      for (let i = 0; i < ids.length; i += 200) {
        const { error } = await this.sb.from('docs').delete().eq('workspace_id', this.workspaceId).eq('kind', kind).in('id', ids.slice(i, i + 200))
        if (error) throw error
      }
    }
  }
  subscribe(cb: (c: Change) => void) {
    const ch = this.sb
      .channel(`docs-${this.workspaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'docs', filter: `workspace_id=eq.${this.workspaceId}` }, (p) => {
        if (p.eventType === 'DELETE') {
          const old = p.old as Partial<Row>
          if (old.kind && old.id) cb({ type: 'delete', kind: old.kind, id: old.id })
        } else {
          cb({ type: 'upsert', doc: fromRow(p.new as Row) })
        }
      })
      .subscribe()
    return () => {
      this.sb.removeChannel(ch)
    }
  }
}

// ---------------------------------------------------------------- config

export interface CloudConfig {
  url: string
  anonKey: string
}

const CONFIG_KEY = 'hyrox-coach-cloud-config'

/** True when sync keys were baked in at build time (can't be turned off in the app). */
export const CLOUD_FROM_ENV = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

export function getCloudConfig(): CloudConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (url && anonKey) return { url, anonKey }
  try {
    const saved = localStorage.getItem(CONFIG_KEY)
    return saved ? (JSON.parse(saved) as CloudConfig) : null
  } catch {
    return null
  }
}

export function saveCloudConfig(c: CloudConfig | null) {
  try {
    if (c) localStorage.setItem(CONFIG_KEY, JSON.stringify(c))
    else localStorage.removeItem(CONFIG_KEY)
  } catch {
    /* ignore */
  }
}

let client: SupabaseClient | null = null
export function supabase(): SupabaseClient | null {
  const cfg = getCloudConfig()
  if (!cfg) return null
  if (!client) client = createClient(cfg.url, cfg.anonKey)
  return client
}
