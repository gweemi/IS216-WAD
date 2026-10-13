import { test, expect } from '@playwright/test'

// These tests check the log-in screen itself.
// The Google pop-up can't be automated, so signing in is tested by hand.

test.describe('Log in', () => {
  test('logged-out users are sent to the log-in page', async ({ page }) => {
    await page.goto('/home')
    await expect(page).toHaveURL(/\/auth/)
    await expect(page.getByTestId('auth-title')).toHaveText('Welcome')
  })

  test('remembers where to go back to after logging in', async ({ page }) => {
    await page.goto('/home')
    await expect(page).toHaveURL(/redirect=(%2F|\/)home/)
  })

  test('shows the Google sign-in button', async ({ page }) => {
    await page.goto('/auth')
    const button = page.getByTestId('google-signin')
    await expect(button).toBeVisible()
    await expect(button).toHaveText(/Continue with Google/)
    await expect(button).toBeEnabled()
  })

  test('explains that the first log-in creates the account', async ({ page }) => {
    await page.goto('/auth')
    await expect(page.getByText(/first log-in creates your account/)).toBeVisible()
  })

  test('unknown pages go to log in when logged out', async ({ page }) => {
    await page.goto('/some-page-that-does-not-exist')
    await expect(page).toHaveURL(/\/auth/)
  })
})
