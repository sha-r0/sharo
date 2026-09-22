import test from "node:test";
import assert from "node:assert/strict";
import { overrideFor, validateOverrideFields } from "../src/lib/esi-pf/overrides.js";

test("override validation accepts only unresolved statutory fields and preserves prior values", () => {
  const fields = validateOverrideFields("pf", { epsMember: false, ncpDays: 30 }, { epfWages: null }, {});
  assert.deepEqual(fields, { epsMember: false, ncpDays: 30 });
  assert.deepEqual(overrideFor({ statutoryOverrides: { approved: true, fields: { pf: fields } } }, "pf"), fields);
});

test("override validation rejects frozen fields and invalid regulatory values", () => {
  assert.throws(() => validateOverrideFields("pf", { epfWages: 12000 }, { epfWages: 10000 }), /FROZEN_FIELD/);
  assert.throws(() => validateOverrideFields("esi", { zeroContributionReason: 99 }, {}), /INVALID_OVERRIDE_VALUE/);
});
