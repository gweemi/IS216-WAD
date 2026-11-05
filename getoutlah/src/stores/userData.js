import { watch, reactive } from 'vue'

const stores = {}
const remoteLoaded = reactive({})
let uid = null
let remoteWriter = null

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
  } catch {}
}

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

export function registerUserStore(name, state, empty) {
  stores[name] = { state, empty, applying: false, lastJSON: null }
  replace(name, {})
  watch(state, () => onLocalChange(name), { deep: true, flush: 'sync' })
}

export function switchUser(newUid) {
  uid = newUid ?? null
  for (const name of Object.keys(stores)) {
    remoteLoaded[name] = false
    replace(name, uid ? readCache(name, uid) : {})
  }
}

export function applyRemote(name, data, forUid) {
  if (!stores[name] || forUid !== uid) return
  replace(name, data)
  writeCache(name, uid, stores[name].lastJSON)
  remoteLoaded[name] = true
}

export function markRemoteLoaded(name, forUid) {
  if (stores[name] && forUid === uid) remoteLoaded[name] = true
}

export const isRemoteLoaded = (name) => remoteLoaded[name] === true

export function forgetCachedUser(forUid) {
  for (const name of Object.keys(stores)) {
    try {
      localStorage.removeItem(cacheKey(name, forUid))
    } catch {}
  }
}

export const snapshotOf = (name) => (stores[name] ? JSON.parse(JSON.stringify(stores[name].state)) : null)

export const hasData = (name) => {
  const s = stores[name]
  return Boolean(s) && JSON.stringify(s.state) !== JSON.stringify(s.empty())
}

export const userStoreNames = () => Object.keys(stores)
export const currentUid = () => uid
export function setRemoteWriter(fn) {
  remoteWriter = fn
}
