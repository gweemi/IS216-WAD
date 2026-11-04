// Canonical origin values for activities. Keep these values in sync with
// firestore.rules and scripts/migrate-activities-collections.mjs.
export const ACTIVITY_SOURCES = Object.freeze({
  PICKS: 'getoutlahPicks',
  EXTERNAL: 'externalListings',
  OPEN_JIO: 'openJio',
})

export const SOURCE_OPTIONS = Object.freeze([
  ACTIVITY_SOURCES.PICKS,
  ACTIVITY_SOURCES.EXTERNAL,
  ACTIVITY_SOURCES.OPEN_JIO,
])

export const SOURCE_LABELS = Object.freeze({
  [ACTIVITY_SOURCES.PICKS]: 'GetOutLah Picks',
  [ACTIVITY_SOURCES.EXTERNAL]: 'External Listings',
  [ACTIVITY_SOURCES.OPEN_JIO]: 'OPENJIO!',
})

// Stored activities live in the collection that matches their canonical source.
// OPENJIO! records are materialised in memory from the separate `openjios`
// collection, so they deliberately have no activity collection here.
export const ACTIVITY_COLLECTIONS = Object.freeze({
  [ACTIVITY_SOURCES.PICKS]: 'getoutlahPicks',
  [ACTIVITY_SOURCES.EXTERNAL]: 'externalListings',
})

// Used only by the one-time migration. New code must write canonical values.
export const LEGACY_SOURCE_MAP = Object.freeze({
  curated: ACTIVITY_SOURCES.PICKS,
  eventbrite: ACTIVITY_SOURCES.EXTERNAL,
  openjio: ACTIVITY_SOURCES.OPEN_JIO,
})

export const canonicalSource = (source) => LEGACY_SOURCE_MAP[source] ?? source
// Kept for migration tooling and legacy-record tests. Collection reads do not
// use this adapter: they reject an inconsistent stored source instead.
export const canonicalActivity = (activity) => ({ ...activity, source: canonicalSource(activity.source) })
export const isActivitySource = (source) => SOURCE_OPTIONS.includes(source)
export const sourceLabel = (source) => SOURCE_LABELS[canonicalSource(source)] ?? 'GetOutLah Picks'

export const collectionForActivitySource = (source) => ACTIVITY_COLLECTIONS[source] ?? null

// A document in a source-owned collection must already carry the matching
// canonical source. Do not silently correct bad data in the browser: it could
// otherwise be displayed under the wrong source and mask a migration mistake.
export function activityFromCollection(activity, source) {
  if (activity.source !== source) {
    throw new Error(`Activity ${activity.id ?? '(unknown)'} in ${collectionForActivitySource(source) ?? 'unknown collection'} has source "${activity.source ?? '(missing)'}"; expected "${source}".`)
  }
  return activity
}
