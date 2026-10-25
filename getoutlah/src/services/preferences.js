// Saves and checks the answers from the new-user questionnaire.
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import {
  INTERESTS,
  BUDGETS,
  ENERGY_LEVELS,
  GROUP_PREFERENCES,
  MIN_INTERESTS,
  MAX_INTERESTS,
} from '@/config/preferences'

const ids = (list) => list.map((o) => o.id)
const allowedBudgets = BUDGETS.map((b) => b.maxBudget)

/**
 * Returns a list of problems with the answers ([] means they're fine).
 * Used by the form before saving, and mirrored by firestore.rules.
 */
export function validatePreferences(prefs) {
  const problems = []
  const interests = prefs?.interests ?? []

  if (!Array.isArray(interests) || interests.length < MIN_INTERESTS) {
    problems.push('Pick at least one interest.')
  } else if (interests.length > MAX_INTERESTS) {
    problems.push('Too many interests.')
  } else if (!interests.every((i) => ids(INTERESTS).includes(i))) {
    problems.push('Unknown interest.')
  }
  if (!allowedBudgets.includes(prefs?.maxBudget)) problems.push('Pick a budget.')
  if (!ids(ENERGY_LEVELS).includes(prefs?.energyLevel)) problems.push('Pick an energy level.')
  if (!ids(GROUP_PREFERENCES).includes(prefs?.groupPreference)) {
    problems.push('Pick solo, with friends or either.')
  }
  return problems
}

/** Saves the answers to users/{uid}.preferences and updates the app straight away. */
export async function savePreferences(prefs) {
  const problems = validatePreferences(prefs)
  if (problems.length) throw new Error(problems[0])

  const auth = useAuthStore()
  if (!auth.user) throw new Error('Please log in again.')

  const preferences = {
    interests: [...new Set(prefs.interests)], // no duplicates
    maxBudget: prefs.maxBudget,
    energyLevel: prefs.energyLevel,
    groupPreference: prefs.groupPreference,
  }
  await updateDoc(doc(db, 'users', auth.user.uid), {
    preferences,
    preferencesUpdatedAt: serverTimestamp(),
  })
  auth.setProfile({ ...auth.profile, preferences })
  return preferences
}
