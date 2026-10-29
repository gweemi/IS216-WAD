# OPENJIO! (group activities anyone can start)

Logged-in users can start a jio, join one, chope (queue for) a full one, and leave.
Everything updates live, so spot counts change on everyone's screen as people join and leave.

## Where jios show up

| Where | What |
|---|---|
| **Activities page** (main list) | Public jios, mixed in with events: `jios.publicUpcoming` |
| **Activities page → OpenJio! view** | `<OpenJioPanel />`: Start a jio, **Invites for you**, **My jios** |
| **Activity details** | `<JioActionButton>`: Join / Chope / Leave on a public jio |
| `/openjio` | The same panel as its own page (handy for testing) |

- **Public:** anyone can see and join. Listed in Activities.
- **Friends only:** the host ticks which friends to invite. Only they see it (under "Invites for you") and only they can join.

## Where the data is

Firestore → `openjios/{jioId}`:

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
  visibility: 'public',        // 'public' | 'friends'
  invited: ['uid', ...],       // friends-only: who the host invited ([] for public)
  hostId: 'uid', hostName: 'Li Min',
  participants: ['uid', ...],  // who is going (the host is always first)
  waitlist: ['uid', ...],      // who choped, in order. #1 gets the next free spot
  status: 'open',              // 'open' | 'cancelled'
  createdAt: Timestamp,
}
```

## Files

| File | What it does |
|---|---|
| `src/utils/openjio.js` | The rules (validate, join, chope, leave, who can see). No Firebase, easy to test |
| `src/services/openjio.js` | Firestore calls. Join/chope/leave run in a transaction so a jio can't be overbooked |
| `src/stores/openjio.js` | Pinia store with the live lists |
| `src/components/openjio/OpenJioPanel.vue` | The OpenJio! view: start, invites, my jios |
| `src/components/openjio/JioCard.vue` | One jio card |
| `src/components/openjio/JioActionButton.vue` | Join / Chope / Leave / Cancel button that does the work itself. Use it anywhere |
| `src/components/openjio/CreateJioSheet.vue` | "Start a jio" form with the friend picker (accepts `prefill`) |
| `src/components/openjio/StartJioButton.vue` | Drop-in button that opens the form, for other pages |
| `src/views/OpenJioView.vue` | `/openjio` page (just wraps the panel) |
| `firestore.rules` → `openjios` | Database rules: you can only add or remove yourself; friends-only needs an invite |

## Activities page (Xin Hee): small additions

**1. Public jios in the activities list** (`src/stores/activities.js`). Jios turn into normal
activities with `type: 'openjio'`, so search, filters, the "OpenJio!" filter chip, the map and
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
  source === 'eventbrite' ? 'Eventbrite' : source === 'openjio' ? 'OpenJio!' : 'Curated'
```

**2. Join / Chope on the activity details page** (`ActivityDetailView.vue`):

```vue
<JioActionButton v-if="activity.type === 'openjio'" :jio-id="activity.jioId" />
<!-- import JioActionButton from '@/components/openjio/JioActionButton.vue' -->
```

**3. A toggle between "All" and "OpenJio!"** (`ActivitiesView.vue`):

```vue
<script setup>
import OpenJioPanel from '@/components/openjio/OpenJioPanel.vue'
const view = ref('all') // 'all' | 'openjio'
</script>

<template>
  <div class="btn-group mb-3">
    <button class="btn" :class="view === 'all' ? 'btn-dark' : 'btn-outline-dark'" @click="view = 'all'">All</button>
    <button class="btn" :class="view === 'openjio' ? 'btn-dark' : 'btn-outline-dark'" @click="view = 'openjio'">OpenJio!</button>
  </div>

  <OpenJioPanel v-if="view === 'openjio'" />
  <div v-else><!-- the existing search, filters and list --></div>
</template>
```

**4. Optional: "OpenJio this" on an activity's details:**

```vue
<StartJioButton label="OpenJio this" :prefill="prefillFromActivity(activity)" />
```

## Friends page (Eugenia)

From a free time slot, open the form with the time filled in and the free friends ticked:

```vue
<StartJioButton
  label="OpenJio at this time"
  :prefill="{ startAt: slotStart, durationMins: 180, visibility: 'friends', invited: freeFriendIds }"
/>
```

The invite list reads friends from `users/{uid}.friendIds` (a list of uids).
If the friends feature stores them differently, change `loadFriends()` in `CreateJioSheet.vue`
and `friendIds` in `stores/openjio.js`.

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

## Known limits

- Friends-only jios are hidden in the app, but the database rules still let any signed-in user
  read them. Joining one without an invite is blocked by the rules.

## Tests

- `pnpm test:unit`: `openjio.spec.js` (rules, and that `firestore.rules` allows the same categories
  and regions), `openjioStore.spec.js` (which list a jio goes in),
  `JioCard.spec.js` (buttons), `CreateJioSheet.spec.js` (form and friend picker).
- `pnpm test:e2e`: `e2e/openjio.spec.js` (page needs log-in).

After changing `firestore.rules`, re-publish it in the Firebase console (Firestore → Rules).
