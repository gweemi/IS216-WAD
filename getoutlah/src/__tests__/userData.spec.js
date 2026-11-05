// Wellbeing and reflections belong to ONE account, and follow it to other devices.
import { describe, it, expect, beforeEach } from 'vitest'
import { wellbeing, saveCheckIn } from '@/stores/wellbeing'
import { reflections, setPromptsOn } from '@/stores/reflections'
import { switchUser, applyRemote, setRemoteWriter } from '@/stores/userData'

const uploads = []

describe('per-account wellbeing and reflections', () => {
  beforeEach(() => {
    localStorage.clear()
    uploads.length = 0
    setRemoteWriter((name, data) => uploads.push({ name, data }))
    switchUser(null)
  })

  it('keeps two accounts on the same browser apart', () => {
    switchUser('amy')
    saveCheckIn([5, 5, 5, 5, 5])
    expect(wellbeing.history).toHaveLength(1)

    switchUser('ben')
    expect(wellbeing.history).toHaveLength(0) // Ben doesn't see Amy's check-in
    saveCheckIn([1, 1, 1, 1, 1])

    switchUser('amy')
    expect(wellbeing.history.map((h) => h.score)).toEqual([100])
    switchUser('ben')
    expect(wellbeing.history.map((h) => h.score)).toEqual([20])
  })

  it('sends each change to be saved to the account (Firestore)', () => {
    switchUser('amy')
    saveCheckIn([3, 3, 3, 3, 3])
    setPromptsOn(false)
    expect(uploads.map((u) => u.name)).toEqual(['wellbeing', 'reflections'])
    expect(uploads[0].data.history[0].score).toBe(60)
  })

  it('shows check-ins made on another device', () => {
    switchUser('amy')
    applyRemote('wellbeing', { history: [{ date: '2026-11-01', score: 72 }] }, 'amy')
    expect(wellbeing.history).toEqual([{ date: '2026-11-01', score: 72 }])
    expect(uploads).toHaveLength(0) // not sent back again
  })

  it('ignores data meant for a different account', () => {
    switchUser('amy')
    applyRemote('wellbeing', { history: [{ date: '2026-11-01', score: 12 }] }, 'ben')
    expect(wellbeing.history).toHaveLength(0)
  })

  it('clears everything on log out', () => {
    switchUser('amy')
    saveCheckIn([4, 4, 4, 4, 4])
    reflections.entries.push({ id: 'r1', activityId: 'a', mood: 3 })
    switchUser(null)
    expect(wellbeing.history).toHaveLength(0)
    expect(reflections.entries).toHaveLength(0)
  })
})

describe('firestore.rules', async () => {
  const { readFileSync } = await import('node:fs')
  const { resolve } = await import('node:path')
  const process = (await import('node:process')).default
  const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8')
  it('only lets the owner read their private data', () => {
    expect(rules).toMatch(/match \/users\/\{uid\}\/private\/\{docId\} \{\s*allow read: if signedIn\(\) && request\.auth\.uid == uid;/)
  })
})
