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

export const privacyOf = (profile) => ({ ...DEFAULT_PRIVACY, ...profile?.privacy })

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
