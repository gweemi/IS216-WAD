import { test, expect } from '@playwright/test'
import { seedStudent, seedJio, makeFriends, makeRunId } from './support/emulator.js'
import { logInAs, openJioTab, clickJioAction } from './support/app.js'

test('when someone leaves a full OPENJIO, the first friend who choped gets the spot', async ({ page, browser }, testInfo) => {
  test.setTimeout(150_000)
  const runId = makeRunId(testInfo)
  const host = await seedStudent(runId, 'Host')
  const participant = await seedStudent(runId, 'Participant')
  const firstFriend = await seedStudent(runId, 'First')
  const secondFriend = await seedStudent(runId, 'Second')
  for (const student of [participant, firstFriend, secondFriend]) await makeFriends(host, student)
  const jio = await seedJio(host, {
    id: `e2e-chope-${runId}`,
    title: `Badminton ${runId}`.slice(0, 40),
    visibility: 'friends_only',
    capacity: 2,
    participants: [host.uid, participant.uid],
  })

  const firstContext = await browser.newContext()
  const secondContext = await browser.newContext()
  const firstPage = await firstContext.newPage()
  const secondPage = await secondContext.newPage()
  const cardOn = (p) => p.getByTestId('jio-card').filter({ hasText: jio.title })

  async function chope(friendPage, friend) {
    await logInAs(friendPage, friend)
    await friendPage.goto(`/activities/${jio.activityId}`)
    await expect(friendPage.getByRole('heading', { name: jio.title })).toBeVisible()
    await expect(friendPage.getByTestId('jio-action')).toHaveText(/Chope a spot/)
    await clickJioAction(friendPage, 'Chope a spot', /Leave queue/)
  }

  await test.step('the jio is full, and two friends chope a spot in order', async () => {
    await chope(firstPage, firstFriend)
    await chope(secondPage, secondFriend)
  })

  await test.step('the friends are first and second in line', async () => {
    await openJioTab(firstPage)
    await expect(cardOn(firstPage).getByTestId('queue-position')).toContainText('#1 in line')
    await expect(cardOn(firstPage)).toContainText('2/2 going')

    await openJioTab(secondPage)
    await expect(cardOn(secondPage).getByTestId('queue-position')).toContainText('#2 in line')
  })

  await test.step('a participant leaves the jio', async () => {
    await logInAs(page, participant)
    await page.goto(`/activities/${jio.activityId}`)
    await expect(page.getByTestId('jio-action')).toHaveText(/^Leave$/)
    page.on('dialog', (dialog) => {
      expect(dialog.message()).toBe('Leave this jio?')
      dialog.accept()
    })
    await clickJioAction(page, /^Leave$/, /Chope a spot/)
  })

  await test.step('the first friend in line is moved into the jio', async () => {
    await expect(cardOn(firstPage)).toContainText("You're going")
    await expect(cardOn(firstPage).getByTestId('queue-position')).toHaveCount(0)
    await expect(cardOn(firstPage)).toContainText('2/2 going')
  })

  await test.step('the second friend is now first in line', async () => {
    await expect(cardOn(secondPage).getByTestId('queue-position')).toContainText('#1 in line')
    await expect(cardOn(secondPage)).not.toContainText("You're going")
  })

  await firstContext.close()
  await secondContext.close()
})
