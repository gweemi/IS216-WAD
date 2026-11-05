import { readonly, ref } from 'vue'

const active = ref(false)

export function useMapIntroState() {
  const setMapIntroActive = (value) => { active.value = Boolean(value) }
  return { mapIntroActive: readonly(active), setMapIntroActive }
}
