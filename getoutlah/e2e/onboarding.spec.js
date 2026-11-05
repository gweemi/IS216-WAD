import { test, expect } from '@playwright/test'


test.describe('Onboarding questionnaire', () => {
  test('logged-out users are sent to log in first', async ({ page }) => {
    await page.goto('/onboarding')
    await expect(page).toHaveURL(/\/auth/)
    await expect(page).toHaveURL(/redirect=(%2F|\/)onboarding/)
  })
})
