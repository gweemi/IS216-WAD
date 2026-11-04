// NParks hiking-route lines from data.gov.sg. The environment override is useful
// for local fixtures; production defaults to the vetted Central Nature Reserve set.
import { NPARKS_DATASET_ID } from '@/utils/nparksTrails'
let cache = null
export async function getTrails() {
  const id = import.meta.env.VITE_NPARKS_DATASET_ID || NPARKS_DATASET_ID
  if (cache) return cache
  const key = import.meta.env.VITE_DATAGOVSG_API_KEY
  const res = await fetch(`https://api-open.data.gov.sg/v1/public/api/datasets/${id}/poll-download`, key ? { headers: { 'x-api-key': key } } : undefined)
  if (!res.ok) throw new Error(`NParks dataset unavailable (${res.status})`)
  const url = (await res.json())?.data?.url
  if (!url) throw new Error('NParks download url missing')
  cache = await (await fetch(url)).json()
  return cache
}
