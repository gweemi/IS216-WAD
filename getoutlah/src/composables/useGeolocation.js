import { ref } from 'vue'
// Browser geolocation (needs https or localhost, and the user's permission).
export function useGeolocation() {
  const coords = ref(null), error = ref(null)
  const request = () => new Promise((resolve) => {
    if (!navigator.geolocation) { error.value = 'Location is not supported on this device'; return resolve(null) }
    navigator.geolocation.getCurrentPosition(
      (p) => { coords.value = { lat: p.coords.latitude, lng: p.coords.longitude }; resolve(coords.value) },
      (e) => { error.value = e.message; resolve(null) },
      { enableHighAccuracy: true, timeout: 8000 })
  })
  return { coords, error, request }
}
