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

The Activities page applies those visibility filters when it builds the OPENJIO
cards. In this lightweight school-project setup, raw Jio documents are readable
by signed-in users, so visibility is a discovery and interaction rule rather
than a private-data boundary.

## Data shape

Each `openjios/{id}` document stores its event details, host, participant IDs,
waitlist IDs, and (for Invite Only/legacy Jios) invited IDs. The host is the
first participant. The client uses Firestore transactions for Join, Chope,
Leave, and Decline so two users cannot take the same final slot.

Hosts may edit normal event fields while preserving the host, people already
going, waitlist, status history, and creation time. Capacity cannot be reduced
below the number of people already going.

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
