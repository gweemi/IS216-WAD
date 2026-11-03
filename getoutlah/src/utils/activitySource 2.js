// Canonical origin values for activities. Keep these values in sync with
// firestore.rules and scripts/migrate-activity-sources.mjs.
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

// Used only by the one-time migration. New code must write canonical values.
export const LEGACY_SOURCE_MAP = Object.freeze({
  curated: ACTIVITY_SOURCES.PICKS,
  eventbrite: ACTIVITY_SOURCES.EXTERNAL,
  openjio: ACTIVITY_SOURCES.OPEN_JIO,
})

export const canonicalSource = (source) => LEGACY_SOURCE_MAP[source] ?? source
// Compatibility adapter for records written before the source rename. This is
// intentionally in-memory only; it never writes back to Firestore.
export const canonicalActivity = (activity) => ({ ...activity, source: canonicalSource(activity.source) })
export const isActivitySource = (source) => SOURCE_OPTIONS.includes(source)
export const sourceLabel = (source) => SOURCE_LABELS[canonicalSource(source)] ?? 'GetOutLah Picks'
