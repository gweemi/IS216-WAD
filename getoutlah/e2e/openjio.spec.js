import { test, expect } from '@playwright/test'


test.describe('OPENJIO page', () => {
  test('logged-out users are sent to log in first', async ({ page }) => {
    await page.goto('/openjio')
    await expect(page).toHaveURL(/\/login/)
    await expect(page).toHaveURL(/redirect=(%2F|\/)activities(%3F|\?)view(%3D|=)openJio/)
  })
})
