# Profile page

`src/views/ProfileView.vue` ("Your corner") brings together most of the app.

| On the profile | Where it comes from | Filled in by |
| --- | --- | --- |
| Name, picture, university | `users/{uid}.displayName`, `.photoURL`, `.universityName` | Edit profile sheet |
| Completed (number + list) | `game.completed` in `stores/gamification(badges).js` | "Check in" on an activity |
| Friends (number) | `users/{uid}.friendIds` (a list of uids) | **Friends page: please save friends here** |
| Badges (number), Lv + pts | `badgeList()`, `levelInfo()` in gamification | Badges page |
| Saved | `users/{uid}.saved` | "Save" on an activity |
| My plans | OPENJIOs you host, go to or queue for | The OPENJIO page |
| My vibe (preferences) | `users/{uid}.preferences` | Onboarding questionnaire, **Edit** on the profile |
| Privacy | `users/{uid}.privacy`, applied by `visibleProfile()` | Privacy card |
| My wellbeing | `stores/wellbeing.js` (WHO-5) | The check-in sheet |
| Study-break mode | `game.studyBreak` (pauses the streak) | Switch on the profile (same one as the Badges page) |
| My reflections (mood + private note) | `stores/reflections.js` | "How was it?" prompt after a check-in |
| Admin button | `users/{uid}.role == 'admin'` | Set by hand in the Firebase console |

## Editing preferences
The **My vibe** card shows the onboarding answers. **Edit** opens the same questionnaire
(`PreferencesForm`) with the current answers filled in. Saving uses `savePreferences()`,
which updates the auth store straight away, so the Activities page recommendations change at once.

## Privacy: important for the Friends and OPENJIO pages
Students choose in Profile → Privacy whether others can see their photo and university, whether
they can be found by email or in the "From your uni" list,
and whether they appear in "Friends who have done this". Saved in `users/{uid}.privacy`.

- **Whenever you show another student's `users/{uid}` data, pass it through
  `visibleProfile()` from `src/config/privacy.js`.** It removes whatever they switched off,
  and always removes their email, preferences, saved activities and plans.
- Already wired in: `stores/friends.js` (friend list, requests, check-ins),
  `services/friends.js` (find by email, uni suggestions, the photo copied into requests) and
  `getProfiles()` in `services/openjio.js`.
- This is enforced by the app, not the database: Friends needs to read other students' records,
  so the rules still let signed-in users read `users/{uid}`. Fine for this project; a real launch
  would move the public parts into a separate collection.
- Wellbeing scores, moods and reflections are saved in `users/{uid}/private/...`, which only the owner can read (see `src/services/userDataSync.js`).

## Points for the wellbeing check-in
Finishing a WHO-5 check-in gives **+20 points**, once every 14 days, whatever the score.
The points count towards the weekly cap of 300 and the level on the Badges page.
Mood ratings and reflections give no points.

## Profile pictures
This doesn't use Firebase Storage, because Storage needs the paid plan. The picture is cropped to a
256×256 JPEG in the browser and saved as text (a data URL) in `photoURL` (about 15–40 KB).

## Firestore rules
`firestore.rules` checks profile edits: name 1–40 characters, picture under 300 KB,
and only the five known privacy switches (true/false).
**Publish the rules in the Firebase console** after merging.
