import { readonly, ref } from 'vue'

// App-shell visibility during the short first-Map introduction. This is not
// persisted; MapView owns lifecycle and Firestore owns completion.
const active = ref(false)

export function useMapIntroState() {
  const setMapIntroActive = (value) => { active.value = Boolean(value) }
  return { mapIntroActive: readonly(active), setMapIntroActive }
}
