# User preferences (from the new-user questionnaire)

After their first log-in, every user answers 3 quick questions at `/onboarding`.
Their answers are saved in Firestore so the recommendation features can use them.
Users can't reach any other page until they've answered.

## Where the answers are

Firestore → `users/{uid}` → `preferences`:

```js
{
  interests: ['outdoors', 'food'], // 1 or more interest ids (see list below)
  maxBudget: 20,                   // most they want to spend per activity, in SGD
                                   // 0 = free only, null = price doesn't matter
  energyLevel: 'high',             // 'low' | 'medium' | 'high'
  groupPreference: 'group',        // 'solo' | 'group' | 'either'
}
```

`users/{uid}.preferencesUpdatedAt` records when they last saved.

## Reading them in a Vue page

The answers are already loaded for you. No Firestore call needed:

```js
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
auth.preferences            // the object above, or null
auth.preferences.interests  // e.g. ['outdoors', 'food']
auth.hasPreferences         // true once they've answered
```

## The options (use the same ids!)

All options live in **`src/config/preferences.js`**. Import them instead of retyping them,
so labels and ids always match:

```js
import { INTERESTS, ENERGY_LEVELS, interestLabel } from '@/config/preferences'
interestLabel('food') // 'Food & cafés'
```

| Interest id | Label |
|---|---|
| `outdoors` | Outdoors & nature |
| `sports` | Sports & fitness |
| `arts` | Arts & culture |
| `food` | Food & cafés |
| `workshops` | Workshops & crafts |
| `events` | Events |
| `games` | Games & chill |
| `wellness` | Wellness |
| `volunteering` | Volunteering |

**For the activities data:** give each activity a `category` that is one of the interest ids
above, an `energyLevel` of `low`/`medium`/`high`, a `groupFriendly` true/false and a `cost`
in SGD. Then matching an activity to a user's answers is a simple comparison.

## How this maps to our recommendation scoring table

| Scoring rule (from the proposal) | Compare |
|---|---|
| Category matches an interest (+3) | `prefs.interests.includes(activity.category)` |
| Energy level matches (+2) | `activity.energyLevel === prefs.energyLevel` |
| Solo/group preference matches (+2) | `prefs.groupPreference === 'either'`, or `'group'` and `activity.groupFriendly`, or `'solo'` and not |
| Filter: over budget | `prefs.maxBudget !== null && activity.cost > prefs.maxBudget` → remove |

## Letting users edit their answers later

Reuse the same form on a profile/settings page:

```vue
<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { savePreferences } from '@/services/preferences'
import PreferencesForm from '@/components/PreferencesForm.vue'

const auth = useAuthStore()
const saving = ref(false)
async function onSave(answers) {
  saving.value = true
  await savePreferences(answers)
  saving.value = false
}
</script>

<template>
  <PreferencesForm :initial="auth.preferences" :saving="saving" submit-label="Save" @submit="onSave" />
</template>
```

## Changing the options

If you add, remove or rename an option in `src/config/preferences.js`, **also update
`validPreferences` in `firestore.rules`** and re-publish the rules in the Firebase console.
Otherwise the database will refuse to save the new option.
`pnpm test:unit` fails if the two files don't match, so you'll know.
