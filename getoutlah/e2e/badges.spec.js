import { test, expect } from '@playwright/test'
import { seedJourney, makeRunId, SMU_SCIS_1, CAMPUS_ACTIVITY } from './support/emulator.js'
import { logInAs, openJioTab } from './support/app.js'

test.use({ geolocation: SMU_SCIS_1, permissions: ['geolocation'] })

const badgeTile = (page, name) => page.getByTestId('badge-grid').getByTestId('badge-tile').filter({ hasText: name })

async function expectLocked(page, name, progress) {
  const tile = badgeTile(page, name)
  await expect(tile).toHaveAttribute('data-earned', 'false')
  await expect(tile).toContainText('LOCKED')
  if (progress) await expect(tile).toContainText(progress)
}

async function expectUnlocked(page, name) {
  const tile = badgeTile(page, name)
  await expect(tile).toHaveAttribute('data-earned', 'true', { timeout: 10_000 })
  await expect(tile).not.toContainText('LOCKED')
}

async function openBadges(page) {
  await expect(page.getByTestId('new-badge-popup')).toBeHidden({ timeout: 5_000 })
  await page.getByTestId('nav-badges').click()
  await expect(page.getByTestId('badge-grid')).toBeVisible()
}

test('badges stay locked until their requirements are met, then unlock', async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  const runId = makeRunId(testInfo)
  const { me, friendJio } = await seedJourney(runId)

  await test.step('log in and dismiss the location prompt', async () => {
    await logInAs(page, me)
    const locationDialog = page.getByRole('dialog', { name: /near you/i })
    await locationDialog.getByRole('button', { name: 'Enable Location' }).click()
    await expect(locationDialog).toBeHidden()
    await page.getByRole('button', { name: 'Close badge selection' }).click({ timeout: 5_000 }).catch(() => {})
  })

  await test.step('a new student has every badge locked', async () => {
    await openBadges(page)
    await expect(page.getByTestId('earned-count')).toHaveText(/^0 of \d+ earned$/)
    await expect(page.getByTestId('badge-grid').locator('[data-testid="badge-tile"][data-earned="true"]')).toHaveCount(0)
    await expectLocked(page, 'First one out', '0/1')
    await expectLocked(page, 'Crew energy', '0/1')
    await expectLocked(page, 'Trailblazer', '0/3')
  })

  await test.step('checking in to an activity unlocks "First one out"', async () => {
    await page.getByTestId('nav-map').click()
    await page.locator(`.leaflet-marker-icon[title="${CAMPUS_ACTIVITY.title}"]`).click()
    await page.getByTestId('selected-map-activity').getByRole('button', { name: 'View Activity' }).click()
    await expect(page.getByRole('heading', { name: CAMPUS_ACTIVITY.title })).toBeVisible()
    await page.getByTestId('check-in').click()
    await expect(page.getByTestId('success-popup')).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('success-popup-close').click()

    await openBadges(page)
    await expectUnlocked(page, 'First one out')
    await expect(page.getByTestId('earned-count')).toHaveText(/^1 of \d+ earned$/)
  })

  await test.step('badges whose requirements are only partly met stay locked', async () => {
    await expectLocked(page, 'Trailblazer', '1/3')
    await expectLocked(page, 'Crew energy', '0/1')
  })

  await test.step('joining a friend’s OPENJIO unlocks "Crew energy"', async () => {
    await openJioTab(page)
    await page.getByTestId('jio-card').filter({ hasText: friendJio.title }).getByTestId('jio-details-link').click()
    await expect(page.getByRole('heading', { name: friendJio.title })).toBeVisible()
    await page.getByTestId('jio-action').click()
    await expect(page.getByTestId('success-popup')).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('success-popup-close').click()
    await expect(page.getByTestId('jio-action')).toHaveText(/Leave/)

    await openBadges(page)
    await expectUnlocked(page, 'Crew energy')
    await expect(page.getByTestId('earned-count')).toHaveText(/^2 of \d+ earned$/)
  })

  await test.step('unlocked badges persist after a reload', async () => {
    await page.reload()
    await expectUnlocked(page, 'First one out')
    await expectUnlocked(page, 'Crew energy')
    await expectLocked(page, 'Big host energy', '0/1')
  })
})
