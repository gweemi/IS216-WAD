import { watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useOpenJioStore } from '@/stores/openjio'
import { isRemoteLoaded } from '@/stores/userData'
import { recordJioForBadges } from '@/stores/gamification(badges).js'
import { showNewBadges } from '@/components/badges/NewBadgePopup.vue'
import { myRole } from '@/utils/openjio'

export function useJioBadgeSync() {
  const auth = useAuthStore()
  const jios = useOpenJioStore()
  let caughtUp = null
  let lastRoles = new Map()

  watch(
    () => [auth.user?.uid ?? null, jios.all, isRemoteLoaded('gamification')],
    ([uid, all, ready]) => {
      if (!uid) {
        caughtUp = null
        lastRoles = new Map()
        return
      }
      jios.start()
      if (!ready || jios.loading || jios.error) return

      const firstCheck = caughtUp !== uid
      const roles = new Map(all.map((j) => [j.id, myRole(j, uid)]))
      const earned = []
      for (const [id, role] of roles) {
        const movedUpFromQueue = lastRoles.get(id) === 'queued' && role === 'going'
        if (role === 'host' && firstCheck) collect(recordJioForBadges(id, { hosted: true }))
        else if (role === 'going' && (firstCheck || movedUpFromQueue)) collect(recordJioForBadges(id, { hosted: false }))
      }
      caughtUp = uid
      lastRoles = roles
      if (earned.length) showNewBadges(earned)

      function collect(badges) {
        earned.push(...badges)
      }
    },
    { immediate: true },
  )
}
