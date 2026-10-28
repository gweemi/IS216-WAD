import { test, expect } from '@playwright/test'

// The join / chope / leave rules are tested in src/__tests__/openjio.spec.js
// and the card buttons in src/__tests__/JioCard.spec.js.
// Here we check the page is protected: you must be logged in to see it.

test.describe('OPENJIO page', () => {
  test('logged-out users are sent to log in first', async ({ page }) => {
    await page.goto('/openjio')
    await expect(page).toHaveURL(/\/auth/)
    await expect(page).toHaveURL(/redirect=(%2F|\/)openjio/)
  })
})
