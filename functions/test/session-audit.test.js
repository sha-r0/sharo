"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

test("session audit uses the authenticated server route instead of client Firestore writes", () => {
  const context = fs.readFileSync(path.join(__dirname, "../../src/app/(auth)/context/AuthContext.jsx"), "utf8");
  const route = fs.readFileSync(path.join(__dirname, "../../src/app/api/rbac/session/audit/route.js"), "utf8");
  assert.match(context, /fetch\("\/api\/rbac\/session\/audit"/);
  assert.doesNotMatch(context, /collection\(db, "Companies", identity\.companyId, "ActivityLogs"\)/);
  assert.match(route, /adminAuth\.verifyIdToken/);
  assert.match(route, /where\("ownerUid", "==", token\.uid\)/);
  assert.match(route, /collection\("ActivityLogs"\)/);
});
