import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { validateReceipt, validateReceiptBytes, MAX_RECEIPT_BYTES, createReceiptSubmission, receiptPreview } from '../src/lib/expenses/receipt.js';
import { uploadExpenseReceipt, readReceiptForm } from '../src/lib/server/expenseReceiptUpload.js';
const formats = [['jpg','image/jpeg',[255,216,255]], ['jpeg','image/jpeg',[255,216,255]], ['png','image/png',[137,80,78,71,13,10,26,10]], ['pdf','application/pdf',[37,80,68,70,45]]];
const fileFor = ([ext,type,bytes] = formats[0]) => new File([new Uint8Array(bytes)], `receipt.${ext}`, {type});
const context = {companyId:'tenant-a', token:{uid:'worker'}, permissions:['expense.create','expense.edit'], employee:{id:'worker',access:{roleId:'employee'}}};
function fixture(file = fileFor(), actor = context) {
 const saved = new Map(); const paths=[];
 const bucket={file(path){ paths.push(path); return {path, async save(bytes,options){if(saved.has(path)) throw {code:412}; saved.set(path,{bytes,options});}};}};
 const form=new FormData();form.set('file',file);form.set('uploadId',randomUUID());
 return {saved,paths,form,bucket,context:actor,downloadURL:async object=>`https://bucket.test/${object.path}`,db:{collection(name){assert.equal(name,'Companies'); return {doc(id){assert.equal(id,actor.companyId);return {collection(){return {doc(){return {get:async()=>({exists:true,data:()=>({employeeFirestoreId:'worker',status:'pending'})})};}};}};}};}}};
}
for(const format of formats) test(`${format[0]} uploads with validated metadata and immutable retry`, async()=>{
 const options=fixture(fileFor(format)); const first=await uploadExpenseReceipt(options); const second=await uploadExpenseReceipt(options);
 assert.deepEqual(first,second);assert.equal(options.saved.size,1);
 const stored=[...options.saved.values()][0];assert.equal(stored.options.metadata.contentType,format[1]);assert.equal(stored.options.preconditionOpts.ifGenerationMatch,0);
 assert.match(first.billUrl,/companies\/tenant-a\/expenses\/receipts\//);
});
test('unsupported extension, MIME, empty, oversize and forged signature rejected',()=>{
 for(const file of [{name:'bill.exe',type:'image/jpeg',size:3},{name:'bill.jpg',type:'text/html',size:3},{name:'bill.pdf',size:0},{name:'bill.png',size:MAX_RECEIPT_BYTES+1}]) assert.throws(()=>validateReceipt(file));
 assert.throws(()=>validateReceiptBytes({name:'bill.jpg',size:3},new Uint8Array([1,2,3])),/content/);
});
test('server permissions and tenant authority',async()=>{
 await assert.rejects(uploadExpenseReceipt(fixture(fileFor(),{...context,permissions:[]})),/FORBIDDEN/);
 const forged=fixture();forged.form.set('companyId','tenant-b');await assert.rejects(uploadExpenseReceipt(forged),/Invalid/);
 const other=fixture(fileFor(),{...context,companyId:'tenant-b'}); assert.match((await uploadExpenseReceipt(other)).billUrl,/companies\/tenant-b\//);
 const edit=fixture();edit.form.set('expenseId','existing');await uploadExpenseReceipt(edit);
 const denied=fixture(fileFor(),{...context,employee:{id:'another'}});denied.form.set('expenseId','existing');await assert.rejects(uploadExpenseReceipt(denied),/FORBIDDEN/);
 const owner=fixture(fileFor(),{...context,isOwner:true,permissions:[]});await uploadExpenseReceipt(owner);
});
test('multipart parser enforces request size and reads file',async()=>{
 const form=fixture().form;const result=await readReceiptForm(new Request('https://local',{method:'POST',body:form}));assert.equal(result.get('file').name,'receipt.jpg');
 await assert.rejects(readReceiptForm(new Request('https://local',{method:'POST',body:'x',headers:{'content-length':String(MAX_RECEIPT_BYTES+65537)}})),/5 MB/);
});
test('upload failure prevents saving; save retry reuses uploaded receipt',async()=>{
 let saves=0; const file=fileFor();const fail=createReceiptSubmission(async()=>{throw new Error('upload failed');});
 await assert.rejects(fail({input:{amount:220},file,save:()=>saves++}),/upload failed/);assert.equal(saves,0);
 let uploads=0;const submit=createReceiptSubmission(async()=>{uploads++;return 'https://bucket.test/bill.jpg';});
 await assert.rejects(submit({input:{amount:220},file,save:async()=>{throw new Error('save failed');}}));
 const stages=[];const result=await submit({input:{amount:220},file,onStage:s=>stages.push(s),save:async input=>input});
 assert.equal(uploads,1);assert.deepEqual(result,{amount:220,billUrl:'https://bucket.test/bill.jpg'});assert.equal(stages.at(-1),'Saving expense…');
});
test('no receipt works, untouched edit preserves URL by omission, replace and explicit remove',async()=>{
 const submit=createReceiptSubmission(async()=> 'https://bucket.test/new.pdf');const save=async input=>input;
 assert.deepEqual(await submit({input:{amount:120},save}),{amount:120});
 assert.deepEqual(await submit({input:{billUrl:'https://bucket.test/old.jpg'},save}),{billUrl:'https://bucket.test/old.jpg'});
 assert.equal((await submit({input:{},file:fileFor(formats[3]),expenseId:'existing',save})).billUrl,'https://bucket.test/new.pdf');
 assert.equal((await submit({input:{},removed:true,save})).billUrl,'');
});
test('preview handles encoded PDF paths, images, no attachment and unsafe URLs',()=>{
 assert.equal(receiptPreview('https://firebasestorage.googleapis.com/v0/b/bucket/o/a%2Fbill.pdf?alt=media').kind,'pdf');
 assert.equal(receiptPreview('https://bucket.test/a.png').kind,'image');
 assert.equal(receiptPreview('').kind,'none');assert.equal(receiptPreview('javascript:alert(1)').kind,'invalid');
});
