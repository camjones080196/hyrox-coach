import { useSyncExternalStore } from 'react'
import type { Backend, Change, Doc, Kind } from './backend'

// In-memory cache of all docs with optimistic writes. The UI reads from here;
// writes go to the cache first (instant) and then to the backend. Changes made
// on the other phone arrive through the backend subscription.

const key = (kind: Kind, id: string) => `${kind}:${id}`

export type SyncStatus = 'loading' | 'ready' | 'saving' | 'error'

export class Store {
  private docs = new Map<string, Doc>()
  private listeners = new Set<() => void>()
  private version = 0
  private pending = 0
  status: SyncStatus = 'loading'
  error: string | null = null
  private unsubscribe: (() => void) | null = null

  readonly backend: Backend
  constructor(backend: Backend) {
    this.backend = backend
  }

  async start() {
    this.unsubscribe = this.backend.subscribe((c) => this.apply(c))
    try {
      const docs = await this.backend.load()
      for (const d of docs) this.docs.set(key(d.kind, d.id), d)
      this.status = 'ready'
    } catch (e) {
      this.fail(e)
    }
    this.emit()
  }

  stop() {
    this.unsubscribe?.()
  }

  private apply(c: Change) {
    if (c.type === 'delete') {
      this.docs.delete(key(c.kind, c.id))
    } else {
      const existing = this.docs.get(key(c.doc.kind, c.doc.id))
      if (existing && existing.updatedAt > c.doc.updatedAt) return
      this.docs.set(key(c.doc.kind, c.doc.id), c.doc)
    }
    this.emit()
  }

  private fail(e: unknown) {
    this.status = 'error'
    this.error = e instanceof Error ? e.message : String(e)
    console.error(e)
  }

  private emit() {
    this.version++
    for (const l of this.listeners) l()
  }

  subscribe = (l: () => void) => {
    this.listeners.add(l)
    return () => this.listeners.delete(l)
  }
  getVersion = () => this.version

  get<T>(kind: Kind, id: string): T | undefined {
    return this.docs.get(key(kind, id))?.data as T | undefined
  }

  all<T>(kind: Kind): T[] {
    const out: T[] = []
    for (const d of this.docs.values()) if (d.kind === kind) out.push(d.data as T)
    return out
  }

  private async write(task: () => Promise<void>) {
    this.pending++
    this.status = 'saving'
    this.emit()
    try {
      await task()
      this.pending--
      if (this.pending === 0) this.status = 'ready'
      this.error = null
    } catch (e) {
      this.pending--
      this.fail(e)
    }
    this.emit()
  }

  put<T>(kind: Kind, id: string, data: T) {
    return this.putMany([{ kind, id, data }])
  }

  putMany(items: { kind: Kind; id: string; data: unknown }[]) {
    const now = new Date().toISOString()
    const docs: Doc[] = items.map((i) => ({ ...i, updatedAt: now }))
    for (const d of docs) this.docs.set(key(d.kind, d.id), d)
    this.emit()
    return this.write(() => this.backend.upsert(docs))
  }

  removeMany(keys: { kind: Kind; id: string }[]) {
    if (!keys.length) return Promise.resolve()
    for (const k of keys) this.docs.delete(key(k.kind, k.id))
    this.emit()
    return this.write(() => this.backend.remove(keys))
  }
}

/** Re-render when anything in the store changes. */
export function useStoreVersion(store: Store) {
  return useSyncExternalStore(store.subscribe, store.getVersion)
}
