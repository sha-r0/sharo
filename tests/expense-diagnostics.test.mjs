import test from 'node:test';
import assert from 'node:assert/strict';
import { logFirestoreFailure } from '../src/lib/firestoreDiagnostics.js';
test('diagnostics serialize Error code/message and actual failed path',()=>{
 const original=console.error;const calls=[];console.error=(...args)=>calls.push(args);
 try{logFirestoreFailure({feature:'expenses',operation:'GET',path:'/api/expenses',error:Object.assign(new Error('Missing index'),{code:9,path:'collectionGroup(Reimbursements)',operation:'get'})});}
 finally{console.error=original;}
 const log=JSON.parse(calls[0][1]);assert.equal(log.code,9);assert.equal(log.message,'Missing index');assert.equal(log.path,'collectionGroup(Reimbursements)');assert.equal(log.operation,'get');
});
