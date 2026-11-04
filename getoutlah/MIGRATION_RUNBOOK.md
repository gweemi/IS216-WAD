# Activity collection cutover runbook

This runbook moves legacy `activities/{id}` documents into source-owned
`getoutlahPicks/{id}` and `externalListings/{id}` documents. It is an
operator procedure, not an application startup task. Do not run it against a
shared Firebase project without a scheduled maintenance window and approval.

## Scope and invariants

- Preserve IDs and all document fields, except `curated` becomes
  `getoutlahPicks` and `eventbrite` becomes `externalListings`.
- Keep `needsReview` unchanged.
- Copy all discovered descendant subcollections.
- Do not delete, mutate, or read from the legacy collection after final
  cutover. Deletion of legacy data is a separate approved operation.
- OPENJIO, users, reports, config, notifications, saves, plans, check-ins,
  reflections, and badges are not migrated. They reference stable activity IDs
  and continue working once the new frontend is live.

## User impact during maintenance

- Pause admin Pick create/edit/delete, organiser changes, starter seeding,
  manual Eventbrite sync, and the scheduled Eventbrite GitHub Action.
- Signed-in users may still change profile-only data such as preferences,
  privacy, and friendship settings.
- Saved IDs and plan IDs can safely remain stored, but users should not save,
  plan, or check in to an activity during the window: an old cached browser
  could show legacy data while the new frontend is being released.
- At final rule cutover, cached old clients lose legacy reads. They must reload
  to receive the new bundle. The new Activity page displays a refresh message
  for Firestore permission failures where it can detect them.

## Preconditions

1. Build and test the exact commit to be deployed.
2. Confirm the GitHub Action is disabled or otherwise prevented from running.
3. Announce the maintenance window and pause activity-related admin actions.
4. Obtain a service-account JSON key outside the repository. Never commit it.
5. Create a secure operator-only directory for the backup and manifest.

All commands below run from `getoutlah/`. Replace `/secure/backups` with an
access-controlled location. Commands are intentionally shown for operator
review; do not run them until approved.

```sh
export ACTIVITY_MIGRATION_KEY="$(cat /secure/key.json)"
export FIREBASE_SERVICE_ACCOUNT="$ACTIVITY_MIGRATION_KEY"
node scripts/migrate-activities-collections.mjs --production --project getoutlah-4d959 --database '(default)' --preflight
node scripts/migrate-activities-collections.mjs --production --project getoutlah-4d959 --database '(default)' --backup /secure/backups/activities-before.json
node scripts/migrate-activities-collections.mjs --production --project getoutlah-4d959 --database '(default)' --validate
```

Review the preflight and validation reports. They must have no unknown source,
destination conflict, or subcollection traversal error. Verify the backup
checksum printed by the script and test restoring it into a non-production
Firestore project before continuing.

The production migration accepts only the exact project/database pair above.
It rejects a missing or different argument, and also rejects a service-account
`project_id` that does not match the requested project before any Firestore
operation. Emulator commands remain credential-free and must not include
`--production`.

## Rules and deployment order

1. Generate and deploy **transitional** rules: retain legacy signed-in reads,
   deny legacy `activities` creates, updates, and deletes, and add the two new
   collection matches. This blocks stale cached admin writes while allowing
   active readers to finish. `prepare-transition-rules.mjs` derives this file
   from the reviewed final rules so it cannot drift.
2. Run the approved copy and verification commands:

```sh
node scripts/migrate-activities-collections.mjs --production --project getoutlah-4d959 --database '(default)' --apply --confirm-apply --manifest /secure/backups/activities-manifest.json
node scripts/migrate-activities-collections.mjs --production --project getoutlah-4d959 --database '(default)' --verify
```

3. Deploy the built frontend and the updated Eventbrite workflow/script. The
   new frontend reads only `getoutlahPicks` and `externalListings`.
4. Publish the **final** `firestore.rules` in this repository. It denies all
   reads and writes to legacy `activities` and allows only the two new
   collections:

```sh
npx firebase-tools@15.34.2 deploy --only firestore:rules \
  --config firebase.json \
  --project getoutlah-4d959
```
5. Run the smoke tests below before re-enabling writes or the Eventbrite job.

Generate both temporary deployment files outside the repository. The generated
config contains only a `firestore.rules` entry, and neither output may already
exist. Review the generated rules and config before deployment:

```sh
node scripts/prepare-transition-rules.mjs \
  --rules /secure/cutover/firestore.rules.transition \
  --config /secure/cutover/firebase.transition.json
sed -n '1,220p' /secure/cutover/firestore.rules.transition
cat /secure/cutover/firebase.transition.json
```

After review and separate approval, deploy only Firestore rules using that
temporary config. `--only firestore:rules` and `--config` prevent Firebase
Hosting, Storage, and the repository's ordinary `firebase.json` from being
included in this operation:

```sh
npx firebase-tools@15.34.2 deploy --only firestore:rules \
  --config /secure/cutover/firebase.transition.json \
  --project getoutlah-4d959
```

Deploy final rules from the repository only after the new frontend is live.
Hosting deploys remain a separate, approved release action.

## Local emulator rehearsal

No service account is needed for the local rehearsal. It starts only the local
Firestore Emulator with the synthetic `getoutlah-migration-emulator` project,
seeds representative legacy/canonical records and nested subcollections, then
tests backup, validation, copy, retry, restore, reconciliation, and both rule
states:

```sh
pnpm test:emulator
```

The command never contacts Firebase production services. It is not a substitute
for confirming production IAM, hosting cache behaviour, GitHub secrets, or live
data shape during the approved cutover.

## Smoke tests

- Sign in and load Picks and External Listings source tabs.
- Verify search, filters, recommendations, map markers, detail pages, images,
  booking links, and repeat-date grouping.
- Verify saved items, plans, check-ins, profile lists, invitations, badges,
  reflections, OPENJIO, reports, and admin reports.
- As an admin, create/edit/delete a Pick.
- Run Eventbrite sync in dry-run/non-production first; then confirm one live
  manual sync only after approval. Confirm existing Eventbrite fields refresh
  while admin-owned fields and `needsReview` remain intact.

Only then resume activity writes and re-enable the scheduled Eventbrite job.

## Rollback

### Before writes resume

No reconciliation is needed. The original `activities` documents are intact.
Pause new writes, re-deploy the previous frontend and previous Firestore rules,
then verify legacy reads work before ending maintenance.

### After writes resume

Do not simply copy all new documents back: that would resurrect deletions.
Pause writes and Eventbrite sync, then reconcile current new-collection state
against the immutable pre-cutover backup:

```sh
node scripts/migrate-activities-collections.mjs --production --project getoutlah-4d959 --database '(default)' --reconcile-to-legacy /secure/backups/activities-before.json --confirm-reconcile
```

The command creates/updates current documents in legacy and deletes only
baseline legacy documents that no longer exist in the new collections. It also
reconciles discovered descendant paths. Verify the resulting legacy collection,
then deploy the previous frontend/rules. Keep all backups and new collections;
do not delete either during rollback.

## Legacy deletion

Legacy `activities` deletion is intentionally excluded. It requires separate
approval, a new backup, and a documented retention period after successful
production cutover.

## Restore command

`--restore` is for a deliberate recovery operation, not ordinary cutover or
rollback. It restores documents from a checksum-verified backup but does not
delete documents absent from that backup. It needs its own confirmation:

```sh
node scripts/migrate-activities-collections.mjs --production --project getoutlah-4d959 --database '(default)' --restore /secure/backups/activities-before.json --confirm-restore
```
