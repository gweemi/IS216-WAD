import { test, expect } from '@playwright/test'
import { seedStudent, seedJio, makeFriends, makeRunId } from './support/emulator.js'
import { logInAs, openJioTab } from './support/app.js'

test('a host cancels their OPENJIO and their friend can no longer join it', async ({ page, browser }, testInfo) => {
  test.setTimeout(120_000)
  const runId = makeRunId(testInfo)
  const host = await seedStudent(runId, 'Host')
  const friend = await seedStudent(runId, 'Friend')
  await makeFriends(host, friend)
  const jio = await seedJio(host, { id: `e2e-cancel-${runId}`, title: `Picnic ${runId}`.slice(0, 40) })

  const friendContext = await browser.newContext()
  const friendPage = await friendContext.newPage()

  await test.step('the friend can see the jio and has a Join button', async () => {
    await logInAs(friendPage, friend)
    await friendPage.goto(`/activities/${jio.activityId}`)
    await expect(friendPage.getByRole('heading', { name: jio.title })).toBeVisible()
    await expect(friendPage.getByTestId('jio-action')).toHaveText(/Join/)
  })

  await test.step('the host cancels the jio', async () => {
    await logInAs(page, host)
    await page.goto('/activities')
    await openJioTab(page)
    const hostCard = page.getByTestId('jio-card').filter({ hasText: jio.title })
    await expect(hostCard).toContainText("You're hosting")
    await hostCard.getByTestId('jio-details-link').click()

    page.once('dialog', (dialog) => {
      expect(dialog.message()).toBe('Cancel this jio for everyone?')
      dialog.accept()
    })
    await page.getByTestId('jio-action').filter({ hasText: 'Cancel jio' }).click()
    await expect(page.getByText('Activity not found')).toBeVisible()
  })

  await test.step("the jio disappears from the host's list", async () => {
    await openJioTab(page)
    await expect(page.getByTestId('start-jio-card')).toBeVisible()
    await expect(page.getByTestId('jio-card').filter({ hasText: jio.title })).toHaveCount(0)
  })

  await test.step('the friend can no longer join', async () => {
    await expect(friendPage.getByTestId('jio-action')).toHaveCount(0)
    await expect(friendPage.getByText('Activity not found')).toBeVisible()

    await openJioTab(friendPage)
    await expect(friendPage.getByTestId('jio-card').filter({ hasText: jio.title })).toHaveCount(0)
  })

  await friendContext.close()
})
