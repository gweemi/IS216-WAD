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

export const ACTIVITY_COLLECTIONS = Object.freeze({
  [ACTIVITY_SOURCES.PICKS]: 'getoutlahPicks',
  [ACTIVITY_SOURCES.EXTERNAL]: 'externalListings',
})

export const isActivitySource = (source) => SOURCE_OPTIONS.includes(source)
export const sourceLabel = (source) => SOURCE_LABELS[source] ?? 'GetOutLah Picks'

export const collectionForActivitySource = (source) => ACTIVITY_COLLECTIONS[source] ?? null

export function activityFromCollection(activity, source) {
  if (activity.source !== source) {
    throw new Error(`Activity ${activity.id ?? '(unknown)'} in ${collectionForActivitySource(source) ?? 'unknown collection'} has source "${activity.source ?? '(missing)'}"; expected "${source}".`)
  }
  return activity
}
