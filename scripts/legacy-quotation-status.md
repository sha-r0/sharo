# One-time migrated quotation status correction

Executed after an explicit dry-run and user authorization for company `agcqb5F8KKZCXjRkotut`: 94 existing Draft quotations changed to Sent. The collection contained 102 records; post-write verification found zero Drafts and confirmed every non-status field was unchanged. The authorized scope was all existing Drafts, including current-numbering records. Future Draft workflow is unchanged.

The current persisted status field is top-level `status` (`Draft`, `Sent`, `Approved`, `Rejected`). The list compatibility mapper displays a missing/empty status as `Draft`. Quotation numbers are read from `quotationNumber`, then legacy `meta.quotationNo`, then document ID. New quotation creation explicitly defaults to `Draft` and is unchanged.

Before execution, inspect the target company's actual `Companies/{companyId}/Quotations/{id}` documents. Confirm which individual documents were migrated using the import history/source records; missing `createdBy` or a Draft status alone is not sufficient evidence. No automatic migration marker has been established in this repository. The target company and migrated document allowlist still need to be supplied and verified.

Capture an immutable manifest containing only those existing migrated Drafts:

```json
{
  "version": 1,
  "projectId": "TARGET_PROJECT_ID",
  "companyId": "TARGET_COMPANY_ID",
  "quotations": [
    {
      "id": "VERIFIED_MIGRATED_DOCUMENT_ID",
      "quotationNumber": "QT-26-0010",
      "expectedStatus": "Draft",
      "createTime": "REPLACE_WITH_FIRESTORE_DOCUMENT_CREATE_TIME_ISO"
    }
  ]
}
```

`createTime` is Firestore document metadata, not the document's `createdAt` field. Use the exact stored `status` as `expectedStatus`; use `null` only if it is absent/null. The file above is a template, not an executable migration manifest.

After inspection and approval to run, preview with:

```sh
node --env-file=.env.local scripts/migrate-legacy-quotation-status.mjs MANIFEST.json --dry-run
```

After reviewing that output, apply the same manifest with `--apply`. The default is dry-run. Every document is rechecked transactionally against its project, company, ID, number, create time and expected status. Only `status: "Sent"` is written; no timestamps, totals, counters or other quotation fields change. Reruns skip records already Sent. Status changes, deleted/recreated documents, and tenant mismatches abort the transaction. Future Drafts are excluded because the manifest is a fixed list, not a status query.
