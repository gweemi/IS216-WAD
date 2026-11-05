// Awards the OPENJIO badges for joins the Join button never sees:
//   - choping a spot and later being moved into the jio when someone leaves (done on the server), and
//   - joining or posting on another device, or before this feature existed.
// Join / post taps award their badge straight away themselves (JioActionButton, CreateJioSheet);
// recordJioForBadges only counts each jio once, so nothing is counted twice.
//
// Called once from App.vue: useJioBadgeSync()
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
  let caughtUp = null // uid we've already checked every jio for
  let lastRoles = new Map() // jio id → my role at the last update

  watch(
    () => [auth.user?.uid ?? null, jios.all, isRemoteLoaded('gamification')],
    ([uid, all, ready]) => {
      if (!uid) {
        caughtUp = null
        lastRoles = new Map()
        return
      }
      jios.start()
      // Wait for the saved badges from Firestore, so we never save over newer data from another device
      if (!ready || jios.loading || jios.error) return

      const firstCheck = caughtUp !== uid
      const roles = new Map(all.map((j) => [j.id, myRole(j, uid)]))
      const earned = []
      let levelUp = null
      for (const [id, role] of roles) {
        // First check after logging in: count every jio I'm in. After that, only someone moved up from the queue
        // (a tap on Join is handled by the button itself, which also shows "You have been jioed").
        const movedUpFromQueue = lastRoles.get(id) === 'queued' && role === 'going'
        if (role === 'host' && firstCheck) collect(recordJioForBadges(id, { hosted: true }))
        else if (role === 'going' && (firstCheck || movedUpFromQueue)) collect(recordJioForBadges(id, { hosted: false }))
      }
      caughtUp = uid
      lastRoles = roles
      if (earned.length) showNewBadges(earned, { levelUp })

      function collect(result) {
        earned.push(...result.badges)
        levelUp = result.levelUp ?? levelUp
      }
    },
    { immediate: true },
  )
}
