import { test, expect } from '@playwright/test'
import { seedStudent, makeRunId } from './support/emulator.js'
import { logInAs } from './support/app.js'

test('a student sends a friend request that the friend accepts, with notifications on both sides', async ({ page, browser }, testInfo) => {
  test.setTimeout(120_000)
  const runId = makeRunId(testInfo)
  const me = await seedStudent(runId, 'Student')
  const friend = await seedStudent(runId, 'Friend')

  await test.step('find the friend by email and send a request', async () => {
    await logInAs(page, me)
    await page.goto('/friends')
    await page.getByTestId('friend-email').fill(friend.email)
    await page.getByRole('button', { name: 'Send' }).click()
    await expect(page.getByText(`Friend request sent to ${friend.name}!`)).toBeVisible()
  })

  await test.step('the request shows as pending', async () => {
    const pending = page.locator('section', { has: page.getByRole('heading', { name: 'Waiting for a reply' }) })
    await expect(pending).toContainText(friend.name)
    await expect(page.getByTestId('friend-list')).toHaveCount(0)
  })

  const friendContext = await browser.newContext()
  const friendPage = await friendContext.newPage()

  await test.step('the friend sees the request in notifications and accepts it', async () => {
    await logInAs(friendPage, friend)
    await friendPage.goto('/friends')
    await expect(friendPage.getByTestId('incoming-requests')).toContainText(me.name)

    await friendPage.getByTestId('open-notifications').click()
    const request = friendPage.getByTestId('notification-list').locator('li').filter({ hasText: 'sent you a friend request' })
    await expect(request).toContainText(me.name)
    await request.getByRole('button', { name: 'Accept' }).click()
    await expect(request.getByRole('button', { name: 'Accept' })).toHaveCount(0)

    await friendPage.getByTestId('nav-friends').click()
    await expect(friendPage.getByTestId('friend-list')).toContainText(me.name)
  })

  await test.step('the student sees the new friend and an "accepted" notification', async () => {
    await expect(page.getByTestId('friend-list')).toContainText(friend.name)
    await expect(page.getByRole('heading', { name: 'Waiting for a reply' })).toHaveCount(0)

    await page.getByTestId('open-notifications').click()
    const accepted = page.getByTestId('notification-list').locator('li').filter({ hasText: 'accepted your friend request' })
    await expect(accepted).toContainText(friend.name)
  })

  await friendContext.close()
})
