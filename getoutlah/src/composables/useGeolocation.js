import { ref } from 'vue'
export function useGeolocation() {
  const coords = ref(null), error = ref(null), loading = ref(false)
  const request = () => new Promise((resolve) => {
    error.value = null
    if (!navigator.geolocation) { error.value = 'Location is not supported on this device'; return resolve(null) }
    loading.value = true
    navigator.geolocation.getCurrentPosition(
      (p) => {
        coords.value = { lat: p.coords.latitude, lng: p.coords.longitude }
        loading.value = false
        resolve(coords.value)
      },
      (e) => {
        const messages = {
          1: 'Location permission was not granted. Enable it in your browser settings to use Near me.',
          2: 'Your location is unavailable right now. Please try again.',
          3: 'Finding your location took too long. Please try again.',
        }
        error.value = messages[e.code] ?? e.message ?? 'Could not get your location. Please try again.'
        loading.value = false
        resolve(null)
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 })
  })
  const clear = () => { coords.value = null; error.value = null }
  return { coords, error, loading, request, clear }
}
