import { test, expect } from '@playwright/test'

// The questionnaire itself is tested in src/__tests__/PreferencesForm.spec.js.
// Here we check the page is protected: you must be logged in to see it.

test.describe('Onboarding questionnaire', () => {
  test('logged-out users are sent to log in first', async ({ page }) => {
    await page.goto('/onboarding')
    await expect(page).toHaveURL(/\/auth/)
    await expect(page).toHaveURL(/redirect=(%2F|\/)onboarding/)
  })
})
