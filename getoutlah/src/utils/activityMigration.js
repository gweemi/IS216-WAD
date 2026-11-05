import { ACTIVITY_SOURCES, canonicalSource, collectionForActivitySource } from './activitySource.js'

const managedSources = new Set([ACTIVITY_SOURCES.PICKS, ACTIVITY_SOURCES.EXTERNAL])

export function classifyLegacyActivity(data, id = '(unknown)') {
  const source = canonicalSource(data.source)
  const collection = collectionForActivitySource(source)
  if (!collection || !managedSources.has(source)) {
    throw new Error(`activities/${id} has unsupported source "${data.source ?? '(missing)'}".`)
  }
  return { source, collection, data: { ...data, source } }
}

export function destinationPathForActivity({ id, collection }, legacyPath) {
  const prefix = `activities/${id}`
  if (!legacyPath.startsWith(prefix)) throw new Error(`Unexpected legacy path ${legacyPath}`)
  return `${collection}/${id}${legacyPath.slice(prefix.length)}`
}
