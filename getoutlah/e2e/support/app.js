import { expect } from '@playwright/test'

export async function logInAs(page, student) {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  const popupPromise = page.waitForEvent('popup')
  await page.getByTestId('google-signin').click()
  const popup = await popupPromise
  await popup.waitForLoadState('networkidle')
  await popup.locator('.mdc-list-item', { hasText: student.email }).click()
  await expect(page).toHaveURL(/\/map/, { timeout: 15_000 })
}

export async function openJioTab(page) {
  await page.getByTestId('nav-activities').click()
  await page.getByTestId('source-openJio').click()
}

export async function clickJioAction(page, from, to) {
  const button = page.getByTestId('jio-action')
  await expect(async () => {
    const current = button.filter({ hasText: from })
    if (await current.count()) await current.click({ timeout: 2_000 })
    await expect(button).toHaveText(to, { timeout: 4_000 })
  }).toPass({ timeout: 20_000 })
}
