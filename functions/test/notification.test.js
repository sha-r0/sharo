"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { renderTemplate } = require("../src/notification/NotificationTemplates");
const { assignedIds, eventId, tokenEntries } = require("../src/notification/NotificationHelpers");
const NotificationDispatcher = require("../src/notification/NotificationDispatcher");
const NotificationDelivery = require("../src/notification/NotificationDelivery");

test("templates render real event values", () => {
  const result = renderTemplate("expense.submitted", { employeeName: "Asha", amount: 1250 });
  assert.equal(result.title, "Expense submitted");
  assert.match(result.body, /Asha/);
  assert.match(result.body, /1,250/);
});

test("event IDs are deterministic and event-specific", () => {
  assert.equal(eventId(["c1", "Expenses", "e1", "submitted"]), eventId(["c1", "Expenses", "e1", "submitted"]));
  assert.notEqual(eventId(["c1", "Expenses", "e1", "submitted"]), eventId(["c1", "Expenses", "e1", "approved"]));
});

test("employee assignments support legacy and current IDs", () => {
  assert.deepEqual([...assignedIds({ employees: [{ firestoreId: "doc1", employeeId: "EMP-1" }, "doc2"] })].sort(), ["EMP-1", "doc1", "doc2"]);
});

test("multiple token shapes are deduplicated", () => {
  const entries = tokenEntries({ fcmToken: "one", fcmTokens: ["one", "two"], deviceTokens: { phone: { token: "three" } } });
  assert.deepEqual(entries.map((item) => item.token).sort(), ["one", "three", "two"]);
});

test("expense create dispatches exactly one manager event", async () => {
  const calls = [];
  const dispatcher = new NotificationDispatcher({ emit: async (input) => { calls.push(input); return input; } });
  await dispatcher.dispatch({ companyId: "c1", collectionName: "Expenses", documentId: "e1", before: null, after: { status: "pending", employeeName: "Asha", employeeId: "EMP-1" } });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].type, "expense.submitted");
  assert.deepEqual(calls[0].receiverRoles, ["manager", "admin", "owner"]);
});

test("approval transition targets the employee and ignores unrelated edits", async () => {
  const calls = [];
  const dispatcher = new NotificationDispatcher({ emit: async (input) => { calls.push(input); return input; } });
  await dispatcher.dispatch({ companyId: "c1", collectionName: "Expenses", documentId: "e1", before: { status: "pending" }, after: { status: "approved", employeeId: "EMP-1" } });
  await dispatcher.dispatch({ companyId: "c1", collectionName: "Expenses", documentId: "e1", before: { status: "approved", amount: 1 }, after: { status: "approved", amount: 2, employeeId: "EMP-1" } });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].type, "expense.approved");
  assert.deepEqual(calls[0].receiverIds, ["EMP-1"]);
});

test("project assignment diff notifies only newly assigned IDs", async () => {
  const calls = [];
  const dispatcher = new NotificationDispatcher({ emit: async (input) => { calls.push(input); return input; } });
  await dispatcher.dispatch({ companyId: "c1", collectionName: "Projectmanagement", documentId: "p1", before: { employees: [{ employeeId: "E1" }] }, after: { projectName: "Tower", employees: [{ employeeId: "E1" }, { employeeId: "E2" }] } });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].type, "project.assigned");
  assert.deepEqual(calls[0].receiverIds, ["E2"]);
});

test("FCM delivery continues after a bad token and removes only invalid tokens", async () => {
  const removed = []; let marked; let logged;
  const repository = {
    claimDelivery: async () => true,
    resolveRecipients: async () => [{ id: "u1" }],
    initializeUserStates: async () => 1,
    tokensFor: () => [{ token: "good", user: {} }, { token: "bad", user: {} }],
    removeInvalidTokens: async (items) => removed.push(...items),
    markDelivery: async (_company, _id, result) => { marked = result; },
  };
  const messaging = { sendEachForMulticast: async () => ({ successCount: 1, failureCount: 1, responses: [
    { success: true }, { success: false, error: { code: "messaging/registration-token-not-registered", message: "gone" } },
  ] }) };
  const delivery = new NotificationDelivery(messaging, repository, { write: async (_company, _id, result) => { logged = result; } });
  const result = await delivery.deliver("c1", "n1", { title: "Test", message: "Body", type: "test", module: "company", priority: "high" });
  assert.equal(result.successCount, 1);
  assert.equal(result.failureCount, 1);
  assert.equal(removed.length, 1);
  assert.equal(marked.invalidTokenCount, 1);
  assert.equal(logged.stateCount, 1);
});
