// =============================================================
// Private, per-account data: wellbeing check-ins and reflections / activity moods.
//
// Before: each store saved to ONE browser key, so two accounts on the same browser
// shared it, and another device never saw it.
// Now:
//   - each account gets its own browser copy (key ends with the user's uid), and
//   - src/services/userDataSync.js saves it to Firestore users/{uid}/private/{name},
//     which only that user can read, so it shows up on all their devices.
//
// This file has no Firebase imports, so the stores and their tests stay simple.
// =============================================================
import { watch } from 'vue'

const stores = {} // name → { state, empty, applying, lastJSON }
let uid = null
let remoteWriter = null // (name, data) => void, set by userDataSync.js

const cacheKey = (name, u) => `gol-${name}-v3:${u}`

function readCache(name, u) {
  try {
    const raw = localStorage.getItem(cacheKey(name, u))
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeCache(name, u, json) {
  try {
    localStorage.setItem(cacheKey(name, u), json)
  } catch {
    /* storage may be blocked */
  }
}

/** Swap a store's contents without treating it as a change the user made. */
function replace(name, data) {
  const s = stores[name]
  const fresh = { ...s.empty(), ...data }
  s.applying = true
  for (const key of Object.keys(s.state)) if (!(key in fresh)) delete s.state[key]
  Object.assign(s.state, JSON.parse(JSON.stringify(fresh)))
  s.applying = false
  s.lastJSON = JSON.stringify(s.state)
}

function onLocalChange(name) {
  const s = stores[name]
  if (s.applying || !uid) return
  const json = JSON.stringify(s.state)
  if (json === s.lastJSON) return
  s.lastJSON = json
  writeCache(name, uid, json)
  remoteWriter?.(name, JSON.parse(json))
}

/**
 * Called once by each store, e.g. registerUserStore('wellbeing', wellbeing, () => ({ history: [] })).
 * Changes are saved straight away ('sync'), so a change can never be saved under the wrong account.
 */
export function registerUserStore(name, state, empty) {
  stores[name] = { state, empty, applying: false, lastJSON: null }
  replace(name, {})
  watch(state, () => onLocalChange(name), { deep: true, flush: 'sync' })
}

/** The logged-in account changed (or logged out: null). Shows that account's own data. */
export function switchUser(newUid) {
  uid = newUid ?? null
  for (const name of Object.keys(stores)) replace(name, uid ? readCache(name, uid) : {})
}

/** Newer data arrived from Firestore (e.g. saved on another device). */
export function applyRemote(name, data, forUid) {
  if (!stores[name] || forUid !== uid) return
  replace(name, data)
  writeCache(name, uid, stores[name].lastJSON)
}

/** What this store holds right now (plain object), e.g. to upload it. */
export const snapshotOf = (name) => (stores[name] ? JSON.parse(JSON.stringify(stores[name].state)) : null)

/** Does this store hold anything worth saving? */
export const hasData = (name) => {
  const s = stores[name]
  return Boolean(s) && JSON.stringify(s.state) !== JSON.stringify(s.empty())
}

export const userStoreNames = () => Object.keys(stores)
export const currentUid = () => uid
export function setRemoteWriter(fn) {
  remoteWriter = fn
}
