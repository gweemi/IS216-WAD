import { test, expect } from '@playwright/test'
import { seedStudent, seedPick, makeRunId } from './support/emulator.js'
import { logInAs } from './support/app.js'

test('a category filter shows only matching activities, and removing it brings them all back', async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  const runId = makeRunId(testInfo)
  const me = await seedStudent(runId, 'Student')
  const food = await seedPick({ id: `e2e-food-${runId}`, title: `Hawker trail ${runId}`, category: 'food', area: 'Woodlands' })
  const sports = await seedPick({ id: `e2e-sports-${runId}`, title: `Futsal night ${runId}`, category: 'sports', area: 'Punggol', lat: 1.4043, lng: 103.9022 })
  const arts = await seedPick({ id: `e2e-arts-${runId}`, title: `Gallery hop ${runId}`, category: 'arts', area: 'Tuas', lat: 1.32, lng: 103.65 })
  const seeded = [food, sports, arts]

  const cards = page.locator('.act-card')
  const cardTitled = (activity) => cards.filter({ hasText: activity.title })

  await test.step('search shows all seeded activities', async () => {
    await logInAs(page, me)
    await page.goto('/activities')
    await page.getByLabel('Search activities').fill(runId)
    await expect(cards).toHaveCount(seeded.length)
    for (const activity of seeded) await expect(cardTitled(activity)).toBeVisible()
  })

  await test.step('filter by Food & cafés', async () => {
    await page.getByRole('button', { name: 'Filters' }).click()
    await page.locator('.fs-chip', { hasText: 'Food & cafés' }).click()
    await page.getByRole('button', { name: /^Show \d+ activities$/ }).click()
    await expect(page.getByRole('dialog', { name: 'Filters' })).toBeHidden()

    await expect(page.getByTestId('active-filters')).toContainText('Food & cafés')
    await expect(cards).toHaveCount(1)
    await expect(cardTitled(food)).toBeVisible()
    await expect(cardTitled(sports)).toHaveCount(0)
    await expect(cardTitled(arts)).toHaveCount(0)
  })

  await test.step('remove the filter and everything comes back', async () => {
    await page.getByRole('button', { name: 'Remove filter: Food & cafés' }).click()
    await expect(page.getByTestId('active-filters')).toHaveCount(0)
    await expect(cards).toHaveCount(seeded.length)
    for (const activity of seeded) await expect(cardTitled(activity)).toBeVisible()
  })
})
