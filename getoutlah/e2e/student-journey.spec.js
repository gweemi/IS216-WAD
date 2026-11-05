import { test, expect } from '@playwright/test'
import { seedJourney, SMU_SCIS_1, CAMPUS_ACTIVITY } from './support/emulator.js'

test.use({ geolocation: SMU_SCIS_1, permissions: ['geolocation'] })

test('a student checks in, hosts and joins OPENJIOs, redeems a voucher and logs out', async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  const runId = `${testInfo.project.name}-${testInfo.repeatEachIndex}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  const { me, friend, friendJio } = await seedJourney(runId)
  const myJioTitle = `Lake walk ${runId}`.slice(0, 40)

  await test.step('log in with Google', async () => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    const popupPromise = page.waitForEvent('popup')
    await page.getByTestId('google-signin').click()
    const popup = await popupPromise
    await popup.waitForLoadState('networkidle')
    await popup.getByText(me.email).click()
    await expect(page).toHaveURL(/\/map/, { timeout: 15_000 })
  })

  await test.step('share location from SMU SCIS 1 on the map', async () => {
    const locationDialog = page.getByRole('dialog', { name: /near you/i })
    await locationDialog.getByRole('button', { name: 'Enable Location' }).click()
    await expect(locationDialog).toBeHidden()

    const badgeSheet = page.getByRole('button', { name: 'Close badge selection' })
    await badgeSheet.click({ timeout: 5_000 }).catch(() => {})
  })

  await test.step('check in to an activity from the map', async () => {
    await page.locator(`.leaflet-marker-icon[title="${CAMPUS_ACTIVITY.title}"]`).click()
    const card = page.getByTestId('selected-map-activity')
    await expect(card).toContainText(CAMPUS_ACTIVITY.title)
    await card.getByRole('button', { name: 'View Activity' }).click()

    await expect(page.getByRole('heading', { name: CAMPUS_ACTIVITY.title })).toBeVisible()
    await page.getByTestId('check-in').click()
    await expect(page.getByTestId('success-popup')).toContainText('You have successfully checked in!', { timeout: 10_000 })
    await page.getByTestId('success-popup-close').click()
    await expect(page.getByTestId('check-in')).toContainText('Checked in')
  })

  await test.step('go to OPENJIO', async () => {
    await page.getByTestId('nav-activities').click()
    await page.getByTestId('source-openJio').click()
    await expect(page.getByTestId('start-jio-card')).toBeVisible()
  })

  await test.step('host a new OPENJIO', async () => {
    await page.getByTestId('start-jio-card').click()
    const form = page.getByTestId('create-jio-form')
    await form.getByTestId('jio-title').fill(myJioTitle)
    await form.getByTestId('jio-category').selectOption('outdoors')
    await form.getByTestId('jio-location').fill('Jurong Lake Gardens')
    await form.getByTestId('jio-lat').fill('1.3404')
    await form.getByTestId('jio-lng').fill('103.7258')
    await form.getByTestId('jio-region').selectOption('west')
    await form.getByTestId('create-jio-submit').click()
    await page.getByTestId('jio-confirm-submit').click()

    const myJio = page.getByTestId('jio-card').filter({ hasText: myJioTitle })
    await expect(myJio).toBeVisible({ timeout: 10_000 })
    await expect(myJio).toContainText("You're hosting")
  })

  await test.step(`join ${friend.name}'s OPENJIO`, async () => {
    const friendsJio = page.getByTestId('jio-card').filter({ hasText: friendJio.title })
    await expect(friendsJio).toContainText(`Hosted by ${friend.name}`)
    await friendsJio.getByTestId('jio-details-link').click()

    await expect(page.getByRole('heading', { name: friendJio.title })).toBeVisible()
    await page.getByTestId('jio-action').click()
    await expect(page.getByTestId('success-popup')).toContainText('You have been jioed!', { timeout: 10_000 })
    await page.getByTestId('success-popup-close').click()
    await expect(page.getByTestId('jio-action')).toHaveText(/Leave/)
  })

  await test.step('redeem a voucher', async () => {
    await page.getByTestId('nav-badges').click()
    await page.getByTestId('redeem-voucher').click()
    const voucher = page.locator('article.voucher').filter({ hasText: '$5 Café Voucher' })
    await voucher.getByRole('button', { name: 'Redeem' }).click()
    await page.getByRole('dialog', { name: 'Redeem voucher' }).getByRole('button', { name: 'Yes, redeem' }).click()

    const redeemed = page.getByRole('dialog', { name: 'Voucher redeemed' })
    await expect(redeemed).toContainText('Enjoy your $5 Café Voucher!')
    await redeemed.getByRole('button', { name: 'Done' }).click()
    await expect(page.getByTestId('my-vouchers')).toContainText('$5 Café Voucher')
  })

  await test.step('log out', async () => {
    await page.getByTestId('nav-profile').click()
    await page.getByTestId('logout').click()
    await page.getByTestId('logout-confirm').click()
    await expect(page).toHaveURL(/\/login/)

    await page.goto('/map')
    await expect(page).toHaveURL(/\/login\?redirect=/)
  })
})
