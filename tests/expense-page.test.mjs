import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createExpensePageCache } from '../src/lib/expenses/pageCache.js';
import { summarizeExpenses } from '../src/lib/expenses/dashboard.js';
import { expenseDetails } from '../src/lib/expenses/details.js';
import { pageExpenses, getExpense, expensePeriod } from '../src/lib/server/expensePageService.js';
const row = { id:'a',date:'2026-09-10',amount:100,status:'pending' };
const response = () => ({expenses:[row],summary:summarizeExpenses([row]),totalCount:1,cursor:null});
test('month cache deduplicates concurrent mounts, preserves pages, and expires safely',async()=>{
 let time=0,calls=0;const cache=createExpensePageCache({now:()=>time,ttl:100});
 const fetch=async()=>{calls++;return response();};
 const first=cache.load('company-a:user1','2026-09',null,false,fetch);
 assert.equal(cache.load('company-a:user1','2026-09',null,false,fetch),first);
 await first;assert.equal(calls,1);
 await cache.load('company-a:user1','2026-08',null,false,fetch);
 await cache.load('company-a:user1','2026-09',null,false,fetch);assert.equal(calls,2);
 await cache.load('company-a:user1','2026-09',null,true,fetch);assert.equal(calls,3);
 time=101;await cache.load('company-a:user1','2026-09',null,false,fetch);assert.equal(calls,4);
 await cache.load('company-b:user1','2026-09',null,false,fetch);assert.equal(calls,5);
 cache.clear();assert.equal(cache.peek('company-b:user1','2026-09'),null);
});
test('pagination deduplicates rows; authoritative row changes adjust period cards without a refetch',async()=>{
 const cache=createExpensePageCache();let calls=0;
 await cache.load('scope','2026-09',null,false,async()=>{calls++;return {...response(),totalCount:2,summary:summarizeExpenses([row,{...row,amount:200}]),cursor:'next'};});
 await cache.load('scope','2026-09','next',false,async()=>{calls++;return {expenses:[row,{...row,id:'b',amount:200}],cursor:null};});
 let data=cache.replace('scope','2026-09','a',{...row,status:'approved'});
 assert.equal(data.expenses.length,2);assert.equal(data.summary.approvedExpense,100);assert.equal(data.summary.pendingExpense,200);
 data=cache.replace('scope','2026-09','b',null);assert.equal(data.totalCount,1);assert.equal(data.summary.totalExpense,100);assert.equal(calls,2);
});
test('logout invalidates pending responses so they cannot repopulate the cache',async()=>{
 const cache=createExpensePageCache();let resolve;
 const pending=cache.load('scope','2026-09',null,false,()=>new Promise(r=>resolve=r));
 await Promise.resolve();cache.clear();resolve(response());await assert.rejects(pending,/STALE_EXPENSE_REQUEST/);
 assert.equal(cache.peek('scope','2026-09'),null);
});
test('Details uses stored fields, omits empty metadata, and never guesses from category name',()=>{
 assert.deepEqual(expenseDetails({travelFrom:'Delhi',travelTo:'Jaipur',locationType:'Delhi NCR'}),[['From','Delhi'],['To','Jaipur'],['Location','Delhi NCR']]);
 assert.deepEqual(expenseDetails({locationType:'Delhi NCR'}),[['Location','Delhi NCR']]);
 assert.deepEqual(expenseDetails({locationType:'Delhi NCR',gstType:'with_gst'}),[['Location','Delhi NCR'],['GST','With GST']]);
 assert.deepEqual(expenseDetails({quantity:12,unitLabel:'km',configuredRate:8}),[['Distance','12 km'],['Rate','₹8 / km']]);
 assert.deepEqual(expenseDetails({quantity:5,ruleBasis:'per_person',configuredRate:800}),[['Labour Count','5 person'],['Rate','₹800 / person']]);
 assert.deepEqual(expenseDetails({category:'Travel',description:'Actual receipt',travelFrom:'',quantity:null}),[]);
});
test('period validation rejects malformed and out-of-range months',()=>{
 assert.deepEqual(expensePeriod('2026-12'),{start:'2026-12-01',end:'2027-01-01'});
 for(const month of ['bad','2026-13','2026-00','2026-9','0000-01']) assert.throws(()=>expensePeriod(month),/INVALID_PERIOD/);
});
test('real paginated month reads, full-period cards, target reconciliation and tenant security', {skip:!process.env.FIRESTORE_EMULATOR_HOST}, async()=>{
 const app=initializeApp({projectId:'demo-sharo'},'expense-pages');const db=getFirestore(app);
 const company=db.collection('Companies').doc('expense-pages');
 const owner={companyId:'expense-pages',isOwner:true};
 const employee={companyId:'expense-pages',permissions:['expense.view'],employee:{employeeId:'E1',access:{roleId:'employee'}}};
 try{
  const batch=db.batch();
  for(let index=0;index<65;index++){
   const ref=company.collection('Expenses').doc(`row-${String(index).padStart(3,'0')}`);
   batch.set(ref,{employeeId:index<40?'E1':'E2',date:'2026-09-10',amount:100,status:'approved',allowedAmount:90});
   batch.set(ref.collection('Reimbursements').doc('payment'),{companyId:company.id,expenseId:ref.id,amount:25,paymentDate:'2026-09-11'});
  }
  batch.set(company.collection('Expenses').doc('older'),{employeeId:'E1',date:'2026-08-10',amount:99999,status:'approved'});
  await batch.commit();
  const first=await pageExpenses(db,owner,'2026-09');assert.equal(first.expenses.length,30);assert.equal(first.totalCount,65);assert.equal(first.summary.totalExpense,6500);assert.equal(first.summary.overPolicy,650);
  assert.equal(first.expenses.every(expense=>expense.reimbursement.reimbursedAmount===25),true);
  const second=await pageExpenses(db,owner,'2026-09',first.cursor);const third=await pageExpenses(db,owner,'2026-09',second.cursor);
  assert.equal(second.expenses.length,30);assert.equal(third.expenses.length,5);assert.equal(third.cursor,null);assert.equal(second.summary,undefined);
  assert.equal(new Set([...first.expenses,...second.expenses,...third.expenses].map(e=>e.id)).size,65);
  const own=await pageExpenses(db,employee,'2026-09');assert.equal(own.totalCount,40);assert.equal(own.summary.totalExpense,4000);assert.equal(own.expenses.every(e=>e.employeeId==='E1'),true);
  await assert.rejects(getExpense(db,employee,'row-064'),/FORBIDDEN/);
  const target=await getExpense(db,owner,'row-064');assert.equal(target.reimbursements.length,1);
  await assert.rejects(getExpense(db,{...owner,companyId:'other'},'row-064'),/EXPENSE_NOT_FOUND/);
  await assert.rejects(pageExpenses(db,{...employee,permissions:[]},'2026-09'),/FORBIDDEN/);
  await assert.rejects(pageExpenses(db,owner,'2026-09','invalid'),/INVALID_CURSOR/);
  assert.equal((await company.collection('ActivityLogs').get()).size,0);
  // Simulate only the undeployed employee/date index, retaining actual bounded month reads.
  const broken={collection(name){const companies=db.collection(name);return {doc(id){const original=companies.doc(id);return {collection(collection){const source=original.collection(collection);const originalWhere=source.where.bind(source);source.where=(field,...rest)=>field==='employeeId'?{where(){return this;},orderBy(){return this;},limit(){return this;},select(){return this;},get:async()=>{throw Object.assign(new Error('Missing index'),{code:9});}}:originalWhere(field,...rest);return source;}};}};},collectionGroup:db.collectionGroup.bind(db),getAll:db.getAll.bind(db)};
  const fallback=await pageExpenses(broken,employee,'2026-09');assert.equal(fallback.totalCount,40);assert.equal(fallback.expenses.length,30);assert.equal(fallback.expenses.every(e=>e.employeeId==='E1'),true);
 }finally{await db.terminate();await deleteApp(app);}
});
