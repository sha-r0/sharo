import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveReimbursement } from '../src/lib/server/expenseReimbursement.js';
import { listExpenses } from '../src/lib/server/expenseListService.js';
import { filterExpenses, summarizeExpenses, expenseOptions } from '../src/lib/expenses/dashboard.js';
import lifecycle from '../functions/src/expense/lifecycle.js';
for (const [name,expense,expected] of [
 ['pending',{status:'pending',amount:500},{reimbursementStatus:'not_applicable',reimbursedAmount:0,outstandingAmount:0}],
 ['approved',{status:'approved',amount:500},{reimbursementStatus:'unpaid',reimbursedAmount:0,outstandingAmount:500}],
 ['legacy paid',{status:'approved',amount:500,reimbursed:true},{reimbursementStatus:'paid',reimbursedAmount:500,outstandingAmount:0}],
 ['partial',{status:'approved',amount:500,reimbursedAmount:200},{reimbursementStatus:'partially_paid',reimbursedAmount:200,outstandingAmount:300}],
 ['rejected',{status:'rejected',amount:500},{reimbursementStatus:'not_applicable',reimbursedAmount:0,outstandingAmount:0}],
 ['over policy',{status:'approved',amount:220,allowedAmount:150,policyExceeded:true},{reimbursementStatus:'unpaid',reimbursedAmount:0,outstandingAmount:220}],
 ['non reimbursable',{status:'approved',amount:500,reimbursable:false},{reimbursementStatus:'not_applicable',reimbursedAmount:0,outstandingAmount:0}],
]) test(name,()=> {const before=structuredClone(expense);assert.deepEqual(deriveReimbursement(expense),expected);assert.deepEqual(expense,before);});
test('amounts clamp invalid and excess reimbursement; status alone does not imply payment',()=>{
 assert.equal(deriveReimbursement({status:'approved',amount:500,reimbursedAmount:-2}).outstandingAmount,500);
 assert.equal(deriveReimbursement({status:'approved',amount:500,reimbursedAmount:800}).outstandingAmount,0);
 assert.equal(deriveReimbursement({status:'approved',amount:500,reimbursementStatus:'paid'}).reimbursementStatus,'unpaid');
 for(const field of ['reimbursementStatus','reimbursedAmount','reimbursed','reimbursedAt','reimbursedBy','reimbursable']) assert.throws(()=>lifecycle.editableUpdates({[field]:true}),/INVALID_REQUEST/);
});
const rows=[{id:'a',amount:220,status:'approved',allowedAmount:150,date:'2026-09-01',employeeId:'E1',employeeName:'Alice',projectFirestoreId:'P1',projectName:'Site',category:'Food',description:'Lunch'}, {id:'b',amount:100,status:'rejected',date:'2026-09-02',employeeId:'E2',employeeName:'Bob',projectFirestoreId:'P2',projectName:'Site',category:'Travel'}];
test('filtered cards include rejected amounts, real excess and distinct project IDs',()=>{
 assert.deepEqual(summarizeExpenses(rows),{totalExpense:320,approvedExpense:220,pendingExpense:0,rejectedExpense:100,overPolicy:70});
 const filters={fromDate:'2026-09-01',toDate:'2026-09-30',search:'lunch'};
 assert.deepEqual(filterExpenses(rows,filters),[rows[0]]);
 assert.deepEqual(filterExpenses(rows,{...filters,search:'',project:'P2',status:'rejected'}),[rows[1]]);
 assert.equal(expenseOptions(rows,'project').length,2);
});
test('list uses one company query, scopes employees, and derives server read model',async()=>{
 const calls=[];const source={where(...args){calls.push(args);return this;},async get(){calls.push('get');return {docs:rows.map(row=>({id:row.id,data:()=>row}))};}};
 const db={collectionGroup(name){assert.equal(name,'Reimbursements');return {where(field,op,id){assert.equal(id,'tenant-a');return {get:async()=>({docs:[]})};}};},collection(name){assert.equal(name,'Companies');return {doc(id){assert.equal(id,'tenant-a');return {collection(name){assert.equal(name,'Expenses');return source;}};}};}};
 const context={companyId:'tenant-a',permissions:['expense.view'],employee:{employeeId:'E1',access:{roleId:'employee'}}};
 const result=await listExpenses(db,context);assert.deepEqual(calls,[['employeeId','==','E1'],'get']);assert.equal(result[0].reimbursement.outstandingAmount,220);
 await assert.rejects(listExpenses(db,{...context,permissions:[]}),/FORBIDDEN/);
 calls.length=0;await listExpenses(db,{...context,isOwner:true,permissions:[]});assert.deepEqual(calls,['get']);
});

test('missing collection-group index falls back to authorized expense histories without losing balances', async()=>{
 const reads=[];
 const historyDoc={id:'payment',data:()=>({amount:100,paymentDate:'2026-09-10'}),ref:{parent:{parent:{id:'a',parent:{path:'Companies/tenant-a/Expenses'}}}}};
 const doc={id:'a',data:()=>({status:'approved',amount:220,employeeId:'E1',employeeName:'Owner'}),ref:{path:'Companies/tenant-a/Expenses/a',collection(name){assert.equal(name,'Reimbursements');return {get:async()=>{reads.push(this.path);return {docs:[historyDoc]};}};}}};
 const source={where(field,op,value){assert.equal(value,'E1');return this;},get:async()=>({docs:[doc]})};
 const failure=Object.assign(new Error('The query requires a COLLECTION_GROUP_ASC index'),{code:9});
 const db={collection:()=>({doc:(id)=>{assert.equal(id,'tenant-a');return {collection:()=>source};}}),collectionGroup:()=>({where:()=>({get:async()=>{throw failure;}})})};
 for(const context of [{companyId:'tenant-a',isOwner:true},{companyId:'tenant-a',permissions:['expense.view'],employee:{employeeId:'E1',access:{roleId:'employee'}}}]) {
  const result=await listExpenses(db,context);assert.equal(result[0].reimbursement.reimbursedAmount,100);assert.equal(result[0].reimbursement.outstandingAmount,120);assert.equal(result[0].status,'approved');
 }
 assert.deepEqual(reads,['Companies/tenant-a/Expenses/a','Companies/tenant-a/Expenses/a']);
 failure.code=7;failure.message='Permission denied';
 await assert.rejects(listExpenses(db,{companyId:'tenant-a',isOwner:true}),error=>error.code===7 && error.path==='collectionGroup(Reimbursements)' && error.operation==='get');
 assert.equal(reads.length,2);
 failure.code=9;failure.message='Missing index';
 doc.ref.collection=()=>({get:async()=>{throw Object.assign(new Error('History unavailable'),{code:14});}});
 await assert.rejects(listExpenses(db,{companyId:'tenant-a',isOwner:true}),error=>error.code===14 && error.path==='Companies/tenant-a/Expenses/a/Reimbursements');
});
