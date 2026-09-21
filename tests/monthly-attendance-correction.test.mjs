import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import * as dateHelpers from '../src/app/(dashboard)/manager/Workforce/services/attendanceDateTime.js';
const require = createRequire(import.meta.url);
const functionsRequire = createRequire(new URL('../functions/package.json', import.meta.url));
const { Timestamp } = functionsRequire('firebase-admin/firestore');
const { createWorkforceFunctions } = functionsRequire('./src/workforce/WorkforceFunctions');
const { transform, loadBindings } = require('next/dist/build/swc');
await loadBindings();
const root = new URL('../src/app/(dashboard)/manager/Workforce/attendance/', import.meta.url);
async function compile(file) {
  const filename = new URL(file, root).pathname;
  return (await transform(fs.readFileSync(filename, 'utf8'), { filename, jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } }, module: { type: 'commonjs' } })).code;
}
function evaluate(code, mocks) {
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((id) => mocks[id] || require(id), module, module.exports);
  return module.exports;
}
const helpers = evaluate(await compile('services/monthlyCorrection.js'), { '../../services/attendanceDateTime': dateHelpers });
const serviceCode = await compile('services/AttendanceService.js');
const company = 'Companies/tenant-a', employee = `${company}/Usermanagement/employee-a`;
const date = '2026-09-18', attendanceId = `employee-a_${date}`;
const canonical = `${company}/Attendance/${attendanceId}`, mirror = `${employee}/Attendance/${date}`;
const stamp = (time) => Timestamp.fromDate(new Date(`${date}T${time}:00+05:30`));
function harness({ permitted = true, failCommit = false, missingMirror = false } = {}) {
  const original = { employeeFirestoreId: 'employee-a', dateKey: date, checkIn: stamp('09:55'), checkOut: stamp('18:20'), status: 'late', approvalStatus: 'approved', reviewStatus: 'Approved', gpsValid: false, remarks: 'Keep me', hardwareVerified: true, checkInSource: 'hardware', checkOutSource: 'app', shiftPolicy: { id: 'shift' }, photoUrl: 'evidence', workedMinutes: 480, totalHours: 8 };
  const records = new Map([[company, { ownerUid: 'owner' }], [employee, { employeeId: '001', personalInfo: { fullName: 'Alex' } }], [canonical, original], [`${company}/ShiftPolicies/shift`, { active: true, timing: { startTime: '09:00', endTime: '18:00' } }]]);
  if (!missingMirror) records.set(mirror, { ...original, mirrorOnly: 'retain' });
  const ref = (path) => ({ path, id: path.split('/').at(-1), collection: (name) => ref(`${path}/${name}`), doc: (id = 'audit') => ref(`${path}/${id}`), get: async () => snap(path), where: (field, op, value) => ({ path, filters: [{ field, value }] }) });
  const snap = (path) => ({ id: path.split('/').at(-1), ref: ref(path), exists: records.has(path), data: () => records.get(path) });
  const commits = [], calls = [], queries = [];
  const db = { collection: ref, runTransaction: async (fn) => {
    const writes = [];
    const result = await fn({ get: async (r) => { assert.equal(writes.length, 0); return r.filters || r.path.endsWith('/ShiftPolicies') ? { docs: [...records.keys()].filter((key) => key.startsWith(`${r.path}/`) && key.split('/').length === r.path.split('/').length + 1 && (r.filters || []).every(({ field, value }) => records.get(key)[field] === value)).map(snap) } : snap(r.path); }, set: (r, data, options) => writes.push({ path: r.path, data, merge: options?.merge }) });
    if (failCommit) throw new Error('commit failed');
    for (const write of writes) records.set(write.path, write.merge ? { ...records.get(write.path), ...write.data } : write.data);
    commits.push(writes); return result;
  } };
  const callable = createWorkforceFunctions(db).correctAttendance;
  const service = evaluate(serviceCode, {
    'firebase/firestore': {
      collection: (_, ...parts) => parts.join('/'), where: (field, op, value) => ({ field, op, value }), query: (path, ...filters) => ({ path, filters }),
      getDocs: async (q) => { queries.push(q); return { docs: [...records.keys()].filter((key) => key.startsWith(`${q.path}/`) && key.split('/').length === q.path.split('/').length + 1 && q.filters.every(({ field, value }) => records.get(key)[field] === value)).map(snap) }; },
    },
    'firebase/functions': { httpsCallable: (_, name) => async (data) => { calls.push({ name, data }); return { data: await callable.run({ auth: { uid: permitted ? 'owner' : 'unauthorized', token: { companyId: 'tenant-a' } }, data }) }; } },
    '@/lib/firebase': { db: {}, functions: {} }, '../../services/attendanceDateTime': dateHelpers, './monthlyCorrection': helpers,
  }).default;
  const load = () => service.getEmployeeMonthlyAttendance({ companyId: 'tenant-a', employeeId: 'employee-a', month: '2026-09' });
  const save = (rows) => service.saveMonthlyAttendanceBatch({ companyId: 'tenant-a', employeeFirestoreId: 'employee-a', month: '2026-09', rows });
  return { original, records, commits, calls, queries, service, load, save, invoke: (data) => callable.run({ auth: { uid: permitted ? "owner" : "unauthorized", token: { companyId: "tenant-a" } }, data }) };
}
function edit(row, field, value) { return { ...row, [field]: value, _dirty: { ...row._dirty, [field]: true } }; }

test('loads canonical 09:55–18:20 without a month field, edits checkout, saves and reloads both copies', async () => {
  const h = harness();
  const rows = await h.load(), row = rows.find((row) => row.date === date);
  assert.equal(row.checkIn, '09:55'); assert.equal(row.checkOut, '18:20'); assert.equal(row.status, 'late');
  assert.equal(row.approvalStatus, 'approved'); assert.equal(row.reviewStatus, 'Approved'); assert.equal(row.gpsValid, false); assert.equal(row.remarks, 'Keep me');
  assert.equal(row.id, attendanceId); assert.equal(rows.length, 30);
  assert.equal(rows[0].exists, false); assert.equal(rows[0].status, ''); assert.equal(rows[0].checkIn, '');
  assert.ok(h.queries.every((q) => q.path === `${company}/Attendance` && !q.filters.some((f) => f.field === 'month')));
  const result = await h.save([edit(row, 'checkOut', '18:45')]);
  assert.deepEqual(result.saved, [attendanceId]); assert.deepEqual(result.errors, {});
  assert.deepEqual(h.calls[0], { name: 'correctAttendance', data: { attendanceId, employeeFirestoreId: 'employee-a', workDate: date, changes: { checkOut: '2026-09-18T13:15:00.000Z' } } });
  const updated = (await h.load()).find((row) => row.date === date);
  assert.equal(updated.checkOut, '18:45'); assert.equal(updated.checkIn, '09:55'); assert.equal(updated.remarks, 'Keep me');
  for (const key of ['checkIn', 'status', 'approvalStatus', 'reviewStatus', 'gpsValid', 'photoUrl', 'checkInSource', 'checkOutSource', 'shiftPolicy']) assert.deepEqual(h.records.get(canonical)[key], h.original[key]);
  assert.deepEqual(h.records.get(mirror).checkOut, h.records.get(canonical).checkOut);
  assert.equal(h.records.get(mirror).mirrorOnly, 'retain');
  assert.equal([...h.records.keys()].filter((key) => key.includes('/Attendance/')).length, 2);
  assert.equal(h.commits.length, 1);
});

test('no-op save makes no calls and rejects mismatched employee selections', async () => {
  const h = harness(); const rows = await h.load();
  assert.deepEqual(await h.save(rows), { saved: [], errors: {} }); assert.equal(h.calls.length, 0);
  const row = rows.find((r) => r.exists);
  await assert.rejects(h.save([edit({ ...row, employeeFirestoreId: 'other' }, 'remarks', 'x')]), /selection changed/);
  assert.equal(h.calls.length, 0);
});

test('remarks-only correction preserves policy-calculated hours and rebuilds a missing mirror', async () => {
  const h = harness({ missingMirror: true }); const row = (await h.load()).find((r) => r.exists);
  await h.save([edit(row, 'remarks', 'Changed reason')]);
  assert.equal(h.records.get(canonical).totalHours, 8);
  assert.equal(h.records.get(canonical).workedMinutes, 480);
  assert.deepEqual(h.records.get(mirror), { ...h.records.get(canonical), date });
});

test('clearing a punch is explicit and reflected in both copies', async () => {
  const h = harness(); const row = (await h.load()).find((r) => r.exists);
  await h.save([edit(row, 'checkOut', '')]);
  assert.equal(h.records.get(canonical).checkOut, null); assert.equal(h.records.get(mirror).checkOut, null);
  assert.equal(h.records.get(canonical).totalHours, 0);
  assert.equal((await h.load()).find((r) => r.exists).checkOut, '');
});
for (const options of [{ permitted: false }, { failCommit: true }]) {
  test(`RBAC/transaction failure leaves records unchanged: ${JSON.stringify(options)}`, async () => {
    const h = harness(options), before = new Map(h.records);
    const row = (await h.load()).find((r) => r.exists);
    const result = await h.save([edit(row, 'checkOut', '19:00')]);
    assert.equal(result.saved.length, 0); assert.ok(result.errors[attendanceId]); assert.deepEqual(h.records, before);
  });
}

test('machine, app and approved GPS canonical rows retain their states; document IDs win over stored IDs', async () => {
  const h = harness();
  for (const [day, source] of [['19', 'app'], ['20', 'gps']]) h.records.set(`${company}/Attendance/employee-a_2026-09-${day}`, { ...h.original, id: 'bad-stored-id', dateKey: `2026-09-${day}`, attendanceSource: source, hardwareVerified: false });
  const rows = (await h.load()).filter((r) => r.exists);
  assert.equal(rows.length, 3); assert.ok(rows.every((r) => r.checkIn === '09:55' && r.checkOut === '18:20'));
  assert.equal(rows[2].id, 'employee-a_2026-09-20');
});

test('overnight edits preserve actual checkout day and status edits submit only status', () => {
  const rows = helpers.monthlyRows([{ id: attendanceId, employeeFirestoreId: 'employee-a', date, checkIn: stamp('22:00'), checkOut: Timestamp.fromDate(new Date('2026-09-19T06:00:00+05:30')), status: 'present' }], 'employee-a', '2026-09');
  const row = rows.find((r) => r.exists);
  assert.equal(helpers.correctionChanges(edit(row, 'checkOut', '06:30')).checkOut, '2026-09-19T01:00:00.000Z');
  assert.deepEqual(helpers.correctionChanges(edit(row, 'status', 'halfday')), { status: 'halfday' });
});

test('monthly correction component compiles', async () => { assert.ok(await compile('components/AttendanceCorrection.jsx')); });


test('no-record row creates from trusted employee, saves and reloads; repeated save creates no duplicate docs', async () => {
  const h = harness(); h.records.delete(canonical); h.records.delete(mirror);
  const empty = (await h.load()).find((r) => r.date === date);
  assert.equal(empty.exists, false); assert.equal(empty.status, '');
  await h.save([empty]); assert.equal(h.calls.length, 0); assert.equal(h.records.has(canonical), false);
  const edited = edit(edit(edit(empty, 'checkIn', '09:55'), 'checkOut', '18:20'), 'remarks', 'Added missing day');
  const result = await h.save([edited]);
  assert.deepEqual(result.errors, {}); assert.deepEqual(result.saved, [attendanceId]);
  const created = h.records.get(canonical);
  assert.deepEqual(created, h.records.get(mirror));
  assert.equal(created.companyId, 'tenant-a'); assert.equal(created.employeeId, '001'); assert.equal(created.employeeName, 'Alex');
  assert.equal(created.attendanceSource, 'manual'); assert.equal(created.status, 'late');
  assert.equal(created.workedMinutes, 505); assert.equal(created.totalHours, 505 / 60);
  const loaded = (await h.load()).find((r) => r.date === date);
  assert.equal(loaded.checkIn, '09:55'); assert.equal(loaded.checkOut, '18:20'); assert.equal(loaded.remarks, 'Added missing day');
  await h.save([edited]);
  assert.equal([...h.records.keys()].filter((key) => key.includes('/Attendance/')).length, 2);
  assert.deepEqual(h.records.get(canonical).checkIn, created.checkIn);
  assert.deepEqual(h.records.get(canonical).createdAt, created.createdAt);
});

test('status-only empty row is explicitly created; unedited dates remain absent', async () => {
  const h = harness(); const rows = await h.load();
  const result = await h.save([edit(rows[0], 'status', 'absent'), ...rows.slice(1)]);
  assert.deepEqual(result.errors, {});
  assert.equal(h.records.get(`${company}/Attendance/employee-a_2026-09-01`).status, 'absent');
  assert.equal(h.records.has(`${company}/Attendance/employee-a_2026-09-02`), false);
});

test('stale empty row reuses legacy canonical document and preserves untouched fields', async () => {
  const h = harness(); h.records.delete(canonical); h.records.delete(mirror);
  const empty = (await h.load()).find((r) => r.date === date);
  const legacy = `${company}/Attendance/legacy-id`;
  h.records.set(legacy, h.original);
  const result = await h.save([edit(empty, 'remarks', 'Legacy correction')]);
  assert.deepEqual(result.errors, {}); assert.equal(h.records.has(canonical), false);
  assert.equal(h.records.get(legacy).remarks, 'Legacy correction');
  assert.deepEqual(h.records.get(legacy).checkIn, h.original.checkIn);
  assert.deepEqual(h.records.get(mirror).checkIn, h.original.checkIn);
});

test('ShiftPolicy applies break deduction, maximum hours and derived status, preserving explicit manager status', async () => {
  const h = harness();
  h.records.set(`${company}/ShiftPolicies/shift`, { active: true, attendance: { maximumWorkingHours: 420 }, break: { enabled: true, duration: 30 } });
  const row = (await h.load()).find((r) => r.exists);
  await h.save([edit(row, 'checkOut', '18:45')]);
  assert.equal(h.records.get(canonical).actualWorkingMinutes, 500);
  assert.equal(h.records.get(canonical).workedMinutes, 420);
  assert.equal(h.records.get(canonical).status, 'pending');
  assert.equal(h.records.get(canonical).requiresManagerReview, true);
  await h.save([edit(edit(row, 'checkOut', '18:45'), 'status', 'halfday')]);
  assert.equal(h.records.get(canonical).status, 'halfday');
});

test('new overnight row resolves night shift on server and saves checkout on following day', async () => {
  const h = harness(); h.records.delete(canonical); h.records.delete(mirror);
  h.records.set(`${company}/ShiftPolicies/shift`, { active: true, basic: { isNightShift: true }, timing: { startTime: '22:00', endTime: '06:00' } });
  const empty = (await h.load()).find((r) => r.date === date);
  assert.deepEqual((await h.save([edit(edit(empty, 'checkIn', '22:00'), 'checkOut', '06:00')])).errors, {});
  assert.equal(h.records.get(canonical).checkOut.toDate().toISOString(), '2026-09-19T00:30:00.000Z');
  assert.equal(h.records.get(canonical).workedMinutes, 480);
});

test('creation ignores forged company/name/employee-code fields and verifies employee membership', async () => {
  const h = harness(); h.records.delete(canonical); h.records.delete(mirror);
  await h.invoke({ employeeFirestoreId: 'employee-a', workDate: date, companyId: 'tenant-b', changes: { status: 'present', employeeId: 'forged', employeeName: 'Forged', companyId: 'tenant-b' } });
  assert.equal(h.records.get(canonical).companyId, 'tenant-a'); assert.equal(h.records.get(canonical).employeeName, 'Alex'); assert.equal(h.records.get(canonical).employeeId, '001');
  await assert.rejects(h.invoke({ employeeFirestoreId: 'outsider', workDate: date, changes: { status: 'present' } }), /Employee does not belong/);
  await assert.rejects(h.invoke({ attendanceId, employeeFirestoreId: 'outsider', workDate: date, changes: { status: 'present' } }), /INVALID_ATTENDANCE_ID/);
});

for (const target of [
  { employeeFirestoreId: '../other', workDate: date },
  { employeeFirestoreId: 'employee-a', workDate: '2026-99-18' },
  { employeeFirestoreId: 'employee-a', workDate: '2026-02-30' },
  { attendanceId: 'nested/path' },
]) {
  test(`invalid target returns validation error, not internal: ${JSON.stringify(target)}`, async () => {
    const h = harness();
    await assert.rejects(h.invoke({ ...target, changes: { status: 'present' } }), (error) => error.code === 'invalid-argument');
    assert.equal(h.commits.length, 0);
  });
}

test('missing shift, invalid time and missing IN return actionable errors without writes', async () => {
  const h = harness(); const before = new Map(h.records);
  await assert.rejects(h.invoke({ attendanceId, changes: { checkOut: '18:45' } }), /valid check-in or check-out/);
  await assert.rejects(h.invoke({ employeeFirestoreId: 'employee-a', workDate: '2026-09-19', changes: { checkOut: '2026-09-19T12:00:00Z' } }), /Enter a check-in/);
  assert.deepEqual(h.records, before);
  h.records.delete(`${company}/ShiftPolicies/shift`);
  await assert.rejects(h.invoke({ attendanceId, changes: { checkOut: '2026-09-18T13:00:00Z' } }), /Assign an active shift/);
});

test('failed create leaves both documents absent and reports a meaningful retry error', async () => {
  const h = harness({ failCommit: true }); h.records.delete(canonical); h.records.delete(mirror);
  const empty = (await h.load()).find((r) => r.date === date);
  const result = await h.save([edit(empty, 'status', 'absent')]);
  assert.match(result.errors[attendanceId], /could not be saved/);
  assert.equal(h.records.has(canonical), false); assert.equal(h.records.has(mirror), false);
});
