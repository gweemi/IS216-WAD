import { nparksActivity, validateTrailDefinitions, VERIFIED_NPARKS_TRAILS } from './nparksTrails.js'

export function planNparksImport(geojson, existing = new Map()) {
  const problems = validateTrailDefinitions(geojson)
  if (problems.length) throw new Error(`NParks import stopped:\n${problems.join('\n')}`)
  return VERIFIED_NPARKS_TRAILS.map((definition) => {
    const imported = nparksActivity(definition)
    const previous = existing.get(definition.id)
    const sourceData = {
      source: imported.source,
      provider: imported.provider,
      contentType: imported.contentType,
      nparks: imported.nparks,
    }
    return {
      id: definition.id,
      merge: Boolean(previous),
      data: previous ? sourceData : imported,
    }
  })
}
