import { describe, it, expect, beforeEach } from 'vitest'
import { pairId, otherMember, overlaps, upcomingWindows, timeAgo, initials } from '@/utils/friends'
import {
  friendsState, resetFriendsState, friendList, incomingRequests, outgoingRequests, unreadCount, relationshipWith,
} from '@/stores/friends'
import { friendsWhoDid } from '@/stores/ports'

const H = 3600000
const NOW = new Date('2026-11-02T10:00:00').getTime()

describe('friends helpers', () => {
  it('gives the same pair id whoever sends the request', () => {
    expect(pairId('bob', 'amy')).toBe('amy_bob')
    expect(pairId('amy', 'bob')).toBe('amy_bob')
    expect(otherMember({ members: ['amy', 'bob'] }, 'amy')).toBe('bob')
  })

  it('finds times when both people are free', () => {
    const mine = [{ start: NOW + 2 * H, end: NOW + 6 * H }]
    const theirs = [{ start: NOW + 4 * H, end: NOW + 8 * H }, { start: NOW + 10 * H, end: NOW + 12 * H }]
    expect(overlaps(mine, theirs, { now: NOW })).toEqual([{ start: NOW + 4 * H, end: NOW + 6 * H }])
  })

  it('ignores overlaps shorter than an hour and windows in the past', () => {
    const mine = [{ start: NOW + H, end: NOW + 2 * H }, { start: NOW - 5 * H, end: NOW - H }]
    const theirs = [{ start: NOW + 1.5 * H, end: NOW + 3 * H }, { start: NOW - 4 * H, end: NOW - 2 * H }]
    expect(overlaps(mine, theirs, { now: NOW })).toEqual([])
    expect(upcomingWindows(mine, NOW)).toHaveLength(1)
  })

  it('formats small things', () => {
    expect(timeAgo(NOW - 30 * 1000, NOW)).toBe('just now')
    expect(timeAgo(NOW - 3 * H, NOW)).toBe('3h ago')
    expect(initials('Timothy Lim Dao De')).toBe('TL')
    expect(initials('')).toBe('?')
  })
})

describe('friends store', () => {
  beforeEach(() => {
    resetFriendsState()
    friendsState.uid = 'me'
    friendsState.friendships = [
      { id: 'amy_me', members: ['amy', 'me'], requestedBy: 'amy', status: 'accepted', names: { amy: 'Amy' } },
      { id: 'bob_me', members: ['bob', 'me'], requestedBy: 'bob', status: 'pending', names: { bob: 'Bob' } },
      { id: 'cat_me', members: ['cat', 'me'], requestedBy: 'me', status: 'pending', names: { cat: 'Cat' } },
    ]
    friendsState.profiles = { amy: { displayName: 'Amy Tan', checkedInActivityIds: ['s2'] } }
    friendsState.notifications = [{ id: 'n1', read: false }, { id: 'n2', read: true }]
  })

  it('splits friends, incoming and outgoing requests', () => {
    expect(friendList.value.map((f) => f.name)).toEqual(['Amy Tan'])
    expect(incomingRequests.value.map((f) => f.uid)).toEqual(['bob'])
    expect(outgoingRequests.value.map((f) => f.uid)).toEqual(['cat'])
    expect(unreadCount.value).toBe(1)
  })

  it('knows the relationship with each person', () => {
    expect(relationshipWith('amy')).toBe('friends')
    expect(relationshipWith('bob')).toBe('received')
    expect(relationshipWith('cat')).toBe('sent')
    expect(relationshipWith('dan')).toBe('none')
  })

  it('lists friends who checked in to an activity', async () => {
    expect(await friendsWhoDid('s2')).toEqual([{ uid: 'amy', name: 'Amy Tan' }])
    expect(await friendsWhoDid('s3')).toEqual([])
  })
})
