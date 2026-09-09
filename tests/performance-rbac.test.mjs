import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as catalog from '../src/app/allservice/rbac/permissionCatalog.js';
import * as employeeAuth from '../src/app/allservice/rbac/employeeAuth.js';
import { resolveAccess, canAccessPath, can } from '../src/app/allservice/rbac/AuthorizationService.js';
const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const fromSource=source=>import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('owner, direct routes and sidebar all use the existing permission checks',()=>{
 const owner=resolveAccess({currentUser:{uid:'owner'},company:{ownerUid:'owner'},employee:{access:{effectivePermissions:[]}}});
 assert.ok(catalog.ALL_PERMISSIONS.includes('performance.view'));
 assert.ok(catalog.ALL_PERMISSIONS.includes('performance.manage'));
 for(const path of ['/manager/performance','/manager/performance/employee-a']){
  assert.equal(catalog.permissionForPath(path),'performance.view');assert.equal(canAccessPath(owner,path),true);
  assert.equal(canAccessPath({permissions:[]},path),false);
  assert.equal(canAccessPath({permissions:['performance.manage']},path),false);
  assert.equal(canAccessPath({permissions:['performance.view']},path),true);
 }
 const sidebar=read('../src/app/(dashboard)/manager/components/Sidebar.jsx');
 assert.match(sidebar,/label: "Performance", href: "\/manager\/performance"/);
 assert.match(sidebar,/filter\(\(item\) => canAccessPath\(access, item.href\)/);
 assert.match(read('../src/components/auth/ProtectedRoute.jsx'),/canAccessPath/);
 assert.equal(can(owner,'performance.manage'),true);
});

test('session backfills only authorized missing Performance permissions transactionally and idempotently',async()=>{
 const records={'Companies/A':{ownerUid:'owner',serviceStatus:'active'}};
 const writes=[];const reads=[];
 const ref=path=>({path,collection:name=>ref(`${path}/${name}`),doc:(id='audit')=>ref(`${path}/${id}`),get:async()=>snap(path)});
 const snap=path=>({id:path.split('/').at(-1),exists:!!records[path],data:()=>records[path],ref:ref(path)});
 const db={collection:name=>ref(name),runTransaction:async callback=>callback({
  get:async reference=>{reads.push(reference.path);return snap(reference.path);},
  update:(reference,fields)=>{writes.push({path:reference.path,fields});for(const [path,value] of Object.entries(fields)){const [parent,key]=path.split('.');records[reference.path][parent][key]=value;}},
  set:(reference,fields)=>{writes.push({path:reference.path,fields});},
 })};
 globalThis.__performanceRBAC={...catalog,...employeeAuth,adminDb:db,FieldValue:{serverTimestamp:()=> 'timestamp'}};
 const source=read('../src/lib/server/refreshPerformancePermissions.js').replace(/^import .*;\n/gm,'');
 const names=['adminDb','FieldValue','calculateEffectivePermissions','normalizeRoleId','permissionsForRole','isActiveEmployee','resolveEmployeeAuthUid','resolveEmployeeRoleId','resolvePermissionOverrides'];
 const {refreshPerformancePermissions}=await fromSource(`const {${names.join(',')}}=globalThis.__performanceRBAC;\n${source}`);
 const reset=(roleId='hr_manager',extras={})=>{
  writes.length=0;reads.length=0;delete records['Companies/A/Roles/hr_manager'];
  records['Companies/A/Usermanagement/e']={employment:{status:'active'},access:{authUid:'user',roleId,effectivePermissions:['dashboard.view','custom.existing'],...extras}};
 };
 for(const roleId of Object.keys(catalog.ROLE_TEMPLATES).filter(id=>id!=='owner').concat(['admin','manager','custom'])){
  reset(roleId);await refreshPerformancePermissions('A','e','user');
  const permissions=records['Companies/A/Usermanagement/e'].access.effectivePermissions;
  assert.equal(permissions.includes('performance.view'),catalog.permissionsForRole(roleId).includes('performance.view'),roleId);
  assert.equal(permissions.includes('performance.manage'),false,roleId);
  assert.ok(permissions.includes('custom.existing'));
  const firstWrites=writes.length;await refreshPerformancePermissions('A','e','user');assert.equal(writes.length,firstWrites);
 }
 reset('hr_manager',{permissionOverrides:{grant:['performance.view'],deny:['performance.view']}});
 await refreshPerformancePermissions('A','e','user');assert.equal(writes.length,0);
 reset();records['Companies/A/Roles/hr_manager']={permissions:['dashboard.view'],system:true};
 await refreshPerformancePermissions('A','e','user');assert.equal(writes.length,0); // Tenant's edited default wins.
 reset('custom');records['Companies/A/Roles/custom']={permissions:['performance.view']};
 await refreshPerformancePermissions('A','e','user');assert.ok(records['Companies/A/Usermanagement/e'].access.effectivePermissions.includes('performance.view'));
 reset('employee',{permissionOverrides:{grant:['performance.manage'],deny:[]}});
 await refreshPerformancePermissions('A','e','user');assert.deepEqual(records['Companies/A/Usermanagement/e'].access.effectivePermissions,['dashboard.view','custom.existing','performance.manage']);
 for(const extras of [{authUid:'other'},{loginEnabled:false},{status:'inactive'},{effectivePermissions:undefined}]){
  reset('hr_manager',extras);await refreshPerformancePermissions('A','e','user');assert.equal(writes.length,0);
 }
 reset('owner');await refreshPerformancePermissions('A','e','user');assert.equal(writes.length,0);
 reset();await refreshPerformancePermissions('B','e','user');assert.equal(writes.length,0);
 reset();await refreshPerformancePermissions('A','e','user');assert.ok(reads.every(path=>path.startsWith('Companies/A')));
 assert.deepEqual(Object.keys(writes[0].fields),['access.effectivePermissions','access.permissionsUpdatedAt']);
 assert.equal(writes[1].fields.type,'employee.permissions-changed');
 assert.equal(writes[1].fields.metadata.reason,'performance-permission-snapshot-refresh');
 // Verify the actual session handler calls the refresh before returning identity.
 reset();records['Usermanagement/user']={uid:'user',companyId:'A',companyEmployeeId:'e'};
 Object.assign(globalThis.__performanceRBAC,{refreshPerformancePermissions,adminAuth:{verifyIdToken:async()=>({uid:'user',companyId:'A'})}});
 // The only query in this known employee case is ownership lookup.
 const queryRef=path=>({...ref(path),collection:name=>queryRef(`${path}/${name}`),doc:id=>queryRef(`${path}/${id}`),where:()=>({limit:()=>({get:async()=>({empty:true,docs:[]})})})});
 db.collection=name=>queryRef(name);
 const sessionSource=read('../src/app/api/rbac/session/route.js').replace(/^import .*;\n/gm,'');
 const session=await fromSource(`const {adminAuth,adminDb,refreshPerformancePermissions}=globalThis.__performanceRBAC; const NextResponse={json:(body,options={})=>({body,status:options.status||200})};\n${sessionSource}`);
 const response=await session.GET(new Request('http://localhost/api/rbac/session?companyId=B',{headers:{authorization:'Bearer token'}}));
 assert.equal(response.status,200);assert.equal(response.body.companyId,'A');
 assert.ok(records['Companies/A/Usermanagement/e'].access.effectivePermissions.includes('performance.view'));
 delete globalThis.__performanceRBAC;
});
