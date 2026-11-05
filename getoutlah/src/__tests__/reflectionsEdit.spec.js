// Editing and deleting a saved reflection (My reflections on the Profile page).
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { reflections, updateReflection, deleteReflection } from '@/stores/reflections.js'

vi.mock('vue-router', () => ({ useRouter: () => ({ push: () => {} }) }))
const { default: ReflectionsCard } = await import('@/components/wellbeing/ReflectionsCard.vue')

const entry = () => ({
  id: 'r1', activityId: 'a1', activityTitle: 'Sunset kayak', category: 'outdoors', energy: 'moderate',
  date: '2026-11-04', mood: 2, note: 'Bit tired',
})

beforeEach(() => {
  reflections.entries.splice(0, reflections.entries.length, entry())
  reflections.pending.splice(0)
})

describe('reflections store', () => {
  it('changes the mood and note of a saved reflection', () => {
    updateReflection('r1', 4, '  Loved it!  ')
    expect(reflections.entries[0]).toMatchObject({ mood: 4, note: 'Loved it!' })
    expect(reflections.entries[0].editedOn).toBeTruthy()
  })

  it('deletes a reflection', () => {
    deleteReflection('r1')
    expect(reflections.entries).toHaveLength(0)
  })
})

describe('My reflections card', () => {
  const mountCard = () => mount(ReflectionsCard, { global: { stubs: { Teleport: true } } })

  it('opens a saved reflection with its mood and note filled in, and saves changes', async () => {
    const w = mountCard()
    await w.find('[data-testid="reflection-row"]').trigger('click')
    expect(w.text()).toContain('Edit reflection')
    expect(w.find('#reflectionNote').element.value).toBe('Bit tired')

    await w.find('#reflectionNote').setValue('Actually great')
    await w.findAll('.mood-btn')[3].trigger('click') // Buzzing
    await w.find('[data-testid="save-edit"]').trigger('click')
    expect(reflections.entries[0]).toMatchObject({ mood: 4, note: 'Actually great' })
  })

  it('asks twice before deleting', async () => {
    const w = mountCard()
    await w.find('[data-testid="reflection-row"]').trigger('click')
    await w.find('[data-testid="delete-reflection"]').trigger('click')
    expect(reflections.entries).toHaveLength(1)
    expect(w.text()).toContain('Tap again to delete')
    await w.find('[data-testid="delete-reflection"]').trigger('click')
    expect(reflections.entries).toHaveLength(0)
  })
})
