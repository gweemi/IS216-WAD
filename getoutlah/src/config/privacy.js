// Privacy settings on the Profile page. Saved in users/{uid}.privacy.
//
// The Friends and OPENJIO features read other students' users/{uid} records, so every
// place that shows another student goes through visibleProfile() below, which hides
// whatever that student switched off. (Email is never shown to other students anywhere.)
// Wellbeing scores and reflections are private to the user (users/{uid}/private, see userDataSync.js).
//
// Keep the ids in sync with validPrivacy() in firestore.rules.
export const PRIVACY_OPTIONS = [
  {
    id: 'showPhoto',
    title: 'Show my profile picture',
    on: 'Others see your picture',
    off: 'Others see your initials instead',
    icon: 'ph-user-square',
  },
  {
    id: 'showUniversity',
    title: 'Show my university',
    on: 'Your uni shows on your friend card',
    off: 'Your university is hidden',
    icon: 'ph-graduation-cap',
  },
  {
    id: 'discoverable',
    title: 'Let people find me',
    on: 'People can add you by email or from your uni list',
    off: 'Hidden from search. Only you can send requests',
    icon: 'ph-magnifying-glass',
  },
  {
    id: 'shareActivity',
    title: 'Show friends what I’ve done',
    on: 'You appear in “Friends who have done this”',
    off: 'Your check-ins stay private',
    icon: 'ph-sneaker-move',
  },
]

export const DEFAULT_PRIVACY = {
  showPhoto: true,
  showUniversity: true,
  discoverable: true,
  shareActivity: true,
}

/** The user's settings, with defaults filled in for anything not set yet. */
export const privacyOf = (profile) => ({ ...DEFAULT_PRIVACY, ...profile?.privacy })

/**
 * Another student's profile, with everything they chose to hide removed.
 * Use this whenever showing someone else's users/{uid} data.
 */
export function visibleProfile(profile = {}) {
  const p = privacyOf(profile)
  const { email: _email, preferences: _prefs, saved: _saved, plans: _plans, ...rest } = profile ?? {}
  return {
    ...rest,
    photoURL: p.showPhoto ? (profile?.photoURL ?? null) : null,
    universityName: p.showUniversity ? (profile?.universityName ?? null) : null,
    checkedInActivityIds: p.shareActivity ? (profile?.checkedInActivityIds ?? []) : [],
    discoverable: p.discoverable,
  }
}
