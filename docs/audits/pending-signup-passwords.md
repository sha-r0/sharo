# Pending-signup password audit

Read-only scan of the configured Firestore project's entire `PendingRegistrations` collection on 2026-09-30. Only credential-field presence and document paths were reported; no credential values were printed or saved in this report.

- Documents scanned: 2
- Documents with `admin.password`: 2
- Documents with `admin.passwordHash`: 0

Affected paths:

- `PendingRegistrations/SHARO_b5f7ef8d6d45428b86de83e7cf76106f`
- `PendingRegistrations/SHARO_ecc7b42cd882424b8bd9dca78879926d`

No live records were modified. These legacy plaintext credentials remain a risk until migration or record removal. The local fix hashes new passwords with salted scrypt, upgrades legacy records on resume/completion with a write precondition, and imports the hash into the newly reserved Firebase Auth user at completion. Nothing has been deployed. Migrating live records before deploying compatible code would break the currently deployed plaintext-dependent flow.

Company and owner documents use explicit field lists and do not receive password or hash fields. Resume responses similarly allowlist safe fields.

## Authorized migration follow-up

The user subsequently authorized migrating only the two paths above without deployment. A dry run found both records still pending with plaintext fields and verified the canonical salted scrypt conversion without writes.

Both records were then updated in one atomic Firestore batch, guarded by their snapshot update times. Only `admin.passwordHash` and deletion of `admin.password` were written. Post-write checks verified the password against each canonical hash and deep-compared every non-password field with its pre-migration value.

- Records migrated: 2
- Idempotency apply rerun: 0 writes; both records already canonical
- Final full-collection read-only audit: 2 records, 0 plaintext fields, 2 hash fields
- No company, user, rule, or deployment changes

Commands:

```sh
node --env-file=.env.local scripts/migrate-audited-pending-passwords.mjs --dry-run
node --env-file=.env.local scripts/migrate-audited-pending-passwords.mjs --apply
node --env-file=.env.local scripts/audit-pending-passwords.mjs
```

The earlier plaintext findings describe the pre-migration state. Compatibility of deployed application code was not changed or verified by this data-only migration.
