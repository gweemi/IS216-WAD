import { describe, expect, it } from 'vitest'
import { INFORMATION_PAGES, LAST_UPDATED } from '@/config/informationPages'

describe('informational page content', () => {
  it('defines complete content for the four public pages', () => {
    expect(Object.keys(INFORMATION_PAGES)).toEqual(['privacy', 'terms', 'guidelines', 'about'])
    expect(LAST_UPDATED).toBe('2 November 2026')
    for (const page of Object.values(INFORMATION_PAGES)) {
      expect(page.title).toBeTruthy()
      expect(page.intro).toBeTruthy()
      expect(page.sections.length).toBeGreaterThan(0)
    }
  })

  it('keeps the About page feature-led and policies dated', () => {
    expect(INFORMATION_PAGES.about.features).toHaveLength(6)
    expect(INFORMATION_PAGES.privacy.updated).toBe(true)
    expect(INFORMATION_PAGES.terms.updated).toBe(true)
  })

  it('explains that Near me location stays in browser memory', () => {
    expect(INFORMATION_PAGES.privacy.sections.find((section) => section.title.startsWith('5. Location')).paragraphs.join(' '))
      .toContain('Near me and the Map introduction keep your current coordinates only in browser memory')
  })
})
