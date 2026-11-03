# OPENJIO!

OPENJIO! lets signed-in users host, edit, join, queue for, leave, cancel, and
manage group activities. It uses the existing Firestore `openjios` collection
directly—there is no Cloud Functions deployment required for the feature.

## Visibility

| Value | Meaning in the app |
| --- | --- |
| `public` | Every signed-in user can discover and join. |
| `friends_only` | Accepted friends of the host can discover and join without an invitation. |
| `invite_only` | Only people selected by the host can discover and join. |
| `friends` | Legacy invitation-only value. Existing records keep this behaviour. |

| Where | What |
|---|---|
| **Activities page** (main list) | Public jios, mixed in with events: `jios.publicUpcoming` |
| **Activities page → OPENJIO! filter** | Choose the **OPENJIO!** Browse activities pill to view discoverable Jios, with All / Public / Friends only / Invite only filters. Link straight to it with `/activities?view=openJio`; **Manage OPENJIOs** opens the dedicated management page. |
| **Friends page** | `<FreeTogetherJios />` lists times you're free with friends, each with an **OpenJio** button. A friend's details also have an OpenJio button per shared time |
| **Activity details** | `<JioActionButton>`: Join / Chope / Leave on a public jio |
| `/activities/openjio` | Dedicated OpenJio management page containing `<OpenJioPanel />`. |

The Activities page applies those visibility filters when it builds the OPENJIO
cards. In this lightweight school-project setup, raw Jio documents are readable
by signed-in users, so visibility is a discovery and interaction rule rather
than a private-data boundary.

## Data shape

Each `openjios/{id}` document stores its event details, host, participant IDs,
waitlist IDs, and (for Invite Only/legacy Jios) invited IDs. The host is the
first participant. The client uses Firestore transactions for Join, Chope,
Leave, and Decline so two users cannot take the same final slot.

```js
{
  title: 'Badminton doubles',
  category: 'sports',          // an interest id from src/config/preferences.js
  description: 'Court booked!',
  location: 'SMU Sports Hall',
  region: 'central',           // 'central' | 'north' | 'north-east' | 'east' | 'west' | 'south'
  lat: null, lng: null,        // for the map (not filled in yet)
  startAt: Timestamp,
  durationMins: 120,
  cost: 5,                     // SGD, 0 = free
  capacity: 6,                 // total spots, including the host
  visibility: 'public',        // 'public' | 'friends_only' | 'invite_only' | 'friends' (legacy)
  invited: ['uid', ...],       // used by invite_only and legacy friends Jios ([] for public/friends_only)
  hostId: 'uid', hostName: 'Li Min',
  participants: ['uid', ...],  // who is going (the host is always first)
  waitlist: ['uid', ...],      // who choped, in order. #1 gets the next free spot
  status: 'open',              // 'open' | 'cancelled'
  createdAt: Timestamp,
}
```

Hosts may edit normal event fields while preserving the host, people already
going, waitlist, status history, and creation time. Capacity cannot be reduced
below the number of people already going.

## Files

| File | What it does |
|---|---|
| `src/utils/openjio.js` | The rules (validate, join, chope, leave, who can see). No Firebase, easy to test |
| `src/services/openjio.js` | Firestore calls. Join/chope/leave run in a transaction so a jio can't be overbooked |
| `src/stores/openjio.js` | Pinia store with the live lists |
| `src/components/openjio/OpenJioPanel.vue` | Dedicated OpenJio management panel: start, invites, my Jios, discoverable Jios, and visibility filters |
| `src/components/openjio/FreeTogetherJios.vue` | "Free with friends" card on the Friends page with OpenJio buttons |
| `src/components/openjio/JioCard.vue` | One jio card |
| `src/components/openjio/JioActionButton.vue` | Join / Chope / Leave / Cancel button that does the work itself. Use it anywhere |
| `src/components/openjio/CreateJioSheet.vue` | "Start a jio" form with the friend picker (accepts `prefill`) |
| `src/components/openjio/StartJioButton.vue` | Drop-in button that opens the form, for other pages |
| `src/views/OpenJioView.vue` | `/activities/openjio` page (wraps the management panel) |
| `firestore.rules` → `openjios` | Database rules for visibility, host edits, and participant/waitlist changes |

## Activities page (Xin Hee): small additions

**1. Public jios in the activities list** (`src/stores/activities.js`). Jios turn into normal
activities with `type: 'openJio'`, so search, filters, the "OpenJio!" filter chip, the map and
check-ins already work with them.

```js
import { useOpenJioStore } from '@/stores/openjio'
import { toActivity } from '@/utils/openjio'

// inside loadActivities():
useOpenJioStore().start()

// replace allActivities:
export const allActivities = computed(() => {
  const jios = useOpenJioStore()
  return [...baseActivities.value, ...jios.publicUpcoming.map((j) => toActivity(j, jios.uid))]
})
```

And in `src/utils/activityStyle.js`, label them:

```js
export const sourceLabel = (source) =>
  source === 'eventbrite' ? 'Eventbrite' : source === 'openJio' ? 'OpenJio!' : 'Curated'
```

**2. Join / Chope on the activity details page** (`ActivityDetailView.vue`):

```vue
<JioActionButton v-if="activity.type === 'openJio'" :jio-id="activity.jioId" />
<!-- import JioActionButton from '@/components/openjio/JioActionButton.vue' -->
```

## Local validation

```sh
npm run test:unit -- --run
npm run build
```

## Rules deployment

The repository rules allow the three current visibility values and limit edits
to hosts or normal spot changes. To make newly created `friends_only` and
`invite_only` records work in the shared Firebase project, deploy the changed
rules once after reviewing them:

```sh
firebase deploy --only firestore:rules
```

Existing public Jios keep working immediately because the app again reads the
original `openjios` collection.

## Friends page (Eugenia)

Already added to `FriendsView.vue`:

- `<FreeTogetherJios />` under "When are you free?": groups shared free times (`commonFreeTimes(friendList)`)
  and each has an **OpenJio** button.
- In a friend's details, each "Free at the same time as you" time has an **OpenJio** button.

Both open the form with the time filled in, set to invite-only, and those friends selected:

```vue
<StartJioButton label="OpenJio" :prefill="prefillFromWindow(window, [friend.uid])" />
```

The invite list uses the Friends feature's accepted friends (`friendList` from `stores/friends`),
so whoever you've added on the Friends page can be invited.

## Other pages

- **Activity details:** `<StartJioButton label="OpenJio this" :prefill="prefillFromActivity(activity)" />`
- **Map (Micah):** once public jios are in `allActivities` (step 1 above), they appear wherever the
  map uses activities. Jios only have `lat`/`lng` once the form can pick a spot on the map.
- **Check-ins and badges (Ashley):** the activity details page already passes `isOpenJio` and
  `hostedByMe`, so "Crew energy" and "Big host energy" count OPENJIOs.
- **Notifications (Eugenia):** a new invite adds the user's uid to `invited`; moving up from the
  queue adds them to `participants`. The notification centre can watch for these.

`prefill` fields (all optional): `title`, `category` (interest id), `location`, `region`, `cost`,
`capacity`, `visibility`, `invited` (uids), `description`, `startAt` (a JS `Date`), `durationMins`.

## Tests

- `npm run test:unit -- --run`: unit tests for OpenJio rules, store behaviour, Jio cards, the create form, and free-time suggestions.
- `npm run test:e2e`: end-to-end OpenJio flow tests (requires log-in).
