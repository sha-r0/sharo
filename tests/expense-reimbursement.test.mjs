import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { recordReimbursement } from '../src/lib/server/expenseReimbursementService.js';
import { deriveReimbursement } from '../src/lib/server/expenseReimbursement.js';
import { listExpenses } from '../src/lib/server/expenseListService.js';
import { validateReimbursement } from '../src/lib/expenses/reimbursementInput.js';
import lifecycle from '../functions/src/expense/lifecycle.js';
const input=(amount)=>({requestId:randomUUID(),amount,paymentDate:'2026-09-10',paymentMode:'UPI',referenceNumber:'reference',remarks:''});
const owner={companyId:'phase6',isOwner:true,permissions:[],token:{uid:'phase6-owner'},company:{ownerName:'Owner'}};
test('payment validation rejects forged metadata and invalid money/date/mode',()=>{
 for(const amount of [0,-1,NaN,Infinity,0.001,'10']) assert.throws(()=>validateReimbursement(input(amount)),/INVALID/);
 for(const key of ['companyId','employeeId','createdBy','reimbursedAmount','outstandingAmount','reimbursementStatus']) assert.throws(()=>validateReimbursement({...input(1),[key]:'forged'}),/INVALID/);
 assert.throws(()=>validateReimbursement({...input(1),paymentDate:'2026-02-30'}),/INVALID/);
 assert.throws(()=>validateReimbursement({...input(1),paymentMode:'gateway'}),/INVALID/);
});
test('ledger overrides caches and flags unverified legacy balances',()=>{
 assert.equal(deriveReimbursement({status:'approved',amount:1000,reimbursedAmount:999},[{amount:400}]).outstandingAmount,600);
 assert.equal(deriveReimbursement({status:'approved',amount:1000,reimbursedAmount:200},[]).reconciliationRequired,true);
 assert.equal(deriveReimbursement({status:'approved',amount:1000,reimbursed:true},[]).outstandingAmount,0);
});
test('real Firestore payment concurrency, mirrors, audit and reconciliation', {skip:!process.env.FIRESTORE_EMULATOR_HOST},async(t)=>{
 const app=initializeApp({projectId:'demo-sharo'},'phase6');const db=getFirestore(app);const company=db.collection('Companies').doc('phase6');
 const ref=(id)=>company.collection('Expenses').doc(id);
 const pay=(id,body,actor=owner)=>recordReimbursement(db,actor,id,body,FieldValue);
 const seed=async(id,extra={})=>ref(id).set({companyId:'phase6',amount:1000,status:'approved',employeeId:'E6',employeeFirestoreId:'worker',...extra});
 try{
  await company.set({ownerUid:owner.token.uid});await company.collection('Usermanagement').doc('worker').set({employeeId:'E6'});
  await t.test('400 then 600, immutable retry, extra 1 rejected, mirror and audit synchronized',async()=>{
   await seed('partial');const first=input(400);let result=await pay('partial',first);assert.equal(result.reimbursement.outstandingAmount,600);assert.equal(result.reimbursement.reimbursementStatus,'partially_paid');
   assert.equal((await pay('partial',first)).duplicate,true);await assert.rejects(pay('partial',{...first,amount:401}),/SUBMISSION_CONFLICT/);
   await ref('partial').update({reimbursedAmount:999}); // cache cannot determine payment allowance
   result=await pay('partial',input(600));assert.equal(result.reimbursement.outstandingAmount,0);assert.equal(result.reimbursement.reimbursementStatus,'paid');
   await assert.rejects(pay('partial',input(1)),/OVERPAYMENT/);
   assert.equal((await ref('partial').collection('Reimbursements').get()).size,2);
   assert.deepEqual((await ref('partial').get()).data(),(await company.collection('Usermanagement').doc('worker').collection('Expenses').doc('partial').get()).data());
   assert.equal((await company.collection('ActivityLogs').where('targetExpenseId','==','partial').get()).size,2);
   const ledger=(await ref('partial').collection('Reimbursements').get()).docs[0].data();assert.equal(ledger.createdBy.uid,owner.token.uid);assert.ok(ledger.createdAt);
  });
  await t.test('two simultaneous 400 requests against remaining 400 cannot overpay',async()=>{
   await seed('race');await pay('race',input(600));const results=await Promise.allSettled([pay('race',input(400)),pay('race',input(400))]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
   const ledger=(await ref('race').collection('Reimbursements').get()).docs.map(d=>d.data());assert.equal(ledger.reduce((n,r)=>n+r.amount,0),1000);
  });
  await t.test('pending/rejected, tenant, permission and legacy checks',async()=>{
   for(const status of ['pending','rejected']){await seed(status,{status});await assert.rejects(pay(status,input(1)),/NOT_REIMBURSABLE/);}
   await seed('legacy',{reimbursed:true});await assert.rejects(pay('legacy',input(1)),/LEGACY_PAID/);assert.equal((await ref('legacy').collection('Reimbursements').get()).size,0);
   await seed('unverified',{reimbursedAmount:200});await assert.rejects(pay('unverified',input(1)),/RECONCILIATION_REQUIRED/);
   await seed('secure');await assert.rejects(pay('secure',input(1),{...owner,companyId:'other'}),/EXPENSE_NOT_FOUND/);
   await assert.rejects(pay('secure',input(1),{...owner,isOwner:false,permissions:['expense.manage'],employee:{access:{roleId:'employee'}}}),/FORBIDDEN/);
   await assert.rejects(pay('secure',input(1),{...owner,isOwner:false,permissions:[],employee:{access:{roleId:'manager'}}}),/FORBIDDEN/);
   await pay('secure',input(1),{...owner,isOwner:false,permissions:['expense.manage'],employee:{access:{roleId:'accounts'}}});
  });
  await t.test('reconciled list uses history and paid expenses cannot be deleted or change amount',async()=>{
   await ref('partial').update({reimbursedAmount:0});const listed=await listExpenses(db,owner);const expense=listed.find(e=>e.id==='partial');assert.equal(expense.reimbursement.reimbursedAmount,1000);assert.equal(expense.reimbursements.length,2);
   for(const action of ['edit','delete']) await assert.rejects(lifecycle.mutateExpense(db,{...owner,uid:owner.token.uid},'partial',action,{amount:900},FieldValue),/REIMBURSEMENT_LOCKED/);
  });
 }finally{await db.terminate();await deleteApp(app);}
});
