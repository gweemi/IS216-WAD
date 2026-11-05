import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { DEFAULT_PRIVACY, PRIVACY_OPTIONS, privacyOf, visibleProfile } from '@/config/privacy'
import { friendsState, resetFriendsState, friendList } from '@/stores/friends'
import { friendsWhoDid } from '@/stores/ports'

const amy = {
  displayName: 'Amy',
  email: 'amy@smu.edu.sg',
  photoURL: 'https://example.com/amy.jpg',
  universityName: 'SMU',
  preferences: { interests: ['arts'] },
  checkedInActivityIds: ['act-1'],
}

describe('visibleProfile', () => {
  it('shows everything by default, but never the email or private lists', () => {
    const v = visibleProfile(amy)
    expect(v).toMatchObject({ displayName: 'Amy', photoURL: amy.photoURL, universityName: 'SMU', discoverable: true })
    expect(v).not.toHaveProperty('email')
    expect(v).not.toHaveProperty('preferences')
  })

  it('hides what the user switched off', () => {
    const off = Object.fromEntries(Object.keys(DEFAULT_PRIVACY).map((k) => [k, false]))
    const v = visibleProfile({ ...amy, privacy: off })
    expect(v).toMatchObject({ photoURL: null, universityName: null, checkedInActivityIds: [], discoverable: false })
  })

  it('fills in defaults for switches not chosen yet', () => {
    expect(privacyOf({ privacy: { showPhoto: false } })).toEqual({ ...DEFAULT_PRIVACY, showPhoto: false })
    expect(privacyOf(null)).toEqual(DEFAULT_PRIVACY)
  })
})

describe('Friends page respects privacy', () => {
  beforeEach(() => {
    resetFriendsState()
    friendsState.uid = 'me'
    friendsState.friendships = [
      { id: 'amy_me', members: ['amy', 'me'], status: 'accepted', requestedBy: 'me', photos: { amy: amy.photoURL } },
    ]
  })

  it('shows a friend’s photo, uni and check-ins when allowed', async () => {
    friendsState.profiles = { amy }
    expect(friendList.value[0]).toMatchObject({ photoURL: amy.photoURL, universityName: 'SMU' })
    expect(await friendsWhoDid('act-1')).toEqual([{ uid: 'amy', name: 'Amy' }])
  })

  it('hides them when the friend switched them off (even the photo saved on the request)', async () => {
    friendsState.profiles = {
      amy: { ...amy, privacy: { showPhoto: false, showUniversity: false, shareActivity: false } },
    }
    expect(friendList.value[0]).toMatchObject({ photoURL: null, universityName: null })
    expect(await friendsWhoDid('act-1')).toEqual([])
  })
})

describe('firestore.rules', () => {
  const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8')
  it('allows every privacy switch', () => {
    const allowed = rules.match(/function validPrivacy[\s\S]*?hasOnly\(\[([^\]]+)\]\)/)[1]
    for (const o of PRIVACY_OPTIONS) expect(allowed).toContain(`'${o.id}'`)
  })
  it('checks profile edits when users update their own profile', () => {
    expect(rules).toContain('&& validProfileEdits(request.resource.data);')
  })
})
