# OPENJIO! (group activities anyone can start)

Page: `/openjio`. Logged-in users can start a jio, join one, chope (queue for) a full one, and leave.
The list updates live, so spot counts change on everyone's screen as people join and leave.

## Where the data is

Firestore → `openjios/{jioId}`:

```js
{
  title: 'Badminton doubles',
  category: 'sports',          // an interest id from src/config/preferences.js
  description: 'Court booked!',
  location: 'SMU Sports Hall',
  region: 'central',           // 'central' | 'north' | 'north-east' | 'east' | 'west'
  lat: null, lng: null,        // for the map (not filled in yet)
  startAt: Timestamp,
  durationMins: 120,
  cost: 5,                     // SGD, 0 = free
  capacity: 6,                 // total spots, including the host
  visibility: 'public',        // 'public' | 'friends'
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
| `src/stores/openjio.js` | Pinia store with the live list |
| `src/views/OpenJioView.vue` | The page |
| `src/components/openjio/JioCard.vue` | One jio card with the right button |
| `src/components/openjio/CreateJioSheet.vue` | "Start a jio" form |
| `firestore.rules` → `openjios` | Database rules: you can only add or remove yourself |

## Using OPENJIOs on your page

```js
import { useOpenJioStore } from '@/stores/openjio'
import { toActivity } from '@/utils/openjio'

const jios = useOpenJioStore()
jios.start()      // safe to call more than once
jios.upcoming     // jios this user can see that haven't ended
jios.mine         // jios they host, joined or choped
toActivity(jio, uid) // same shape as src/data/sampleActivities.js (isOpenJio: true)
```

- **Map (Micah):** use `jios.upcoming` for OpenJio markers. Once the map can pick a spot, save `lat`/`lng` on the jio.
- **Check-ins and badges (Ashley):** pass `toActivity(jio, uid)` to `checkInToActivity()`, so the
  "Crew energy" and "Big host energy" badges count OPENJIOs.

## Needs from teammates

- **Friends (Eugenia):** "Friends only" jios use `users/{uid}.friendIds` (a list of uids).
  Until that exists, friends-only jios are only visible to the host and people already in them.
- **Notifications (Eugenia):** when someone moves up from the queue, the `participants` list changes.
  The notification centre can watch for that.

## Known limits

- Friends-only jios are hidden in the app, but the database rules still let any signed-in user read
  them. Fine for now; tighten once friend lists are stored.

## Tests

- `pnpm test:unit`: `src/__tests__/openjio.spec.js` (rules) and `src/__tests__/JioCard.spec.js` (buttons).
- `pnpm test:e2e`: `e2e/openjio.spec.js` (page needs log-in).

After changing `firestore.rules`, re-publish it in the Firebase console (Firestore → Rules).
