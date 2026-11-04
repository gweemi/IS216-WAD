// Superseded by migrate-activities-collections.mjs. The old script changed
// source values in place, which is unsafe once source-owned collections exist.
// It intentionally performs no Firestore work.
throw new Error('This script is retired. Use scripts/migrate-activities-collections.mjs and MIGRATION_RUNBOOK.md.')
