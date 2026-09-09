import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ALL_PERMISSIONS } from '../src/app/allservice/rbac/permissionCatalog.js';
import { buildPerformanceReport, buildEmployeePerformanceDetail, getPerformancePeriodRange, getPreviousEquivalentPeriodRange, isWeeklyOff, dateKey, rankPerformanceRows } from '../src/lib/performance.js';
const employee = (id='a', overrides={}) => ({ id, employeeId:id, personalInfo:{fullName:id}, employment:{status:'active', joiningDate:'2026-01-01'}, shiftPolicy:{weeklyOff:{}}, ...overrides });
const days = Array.from({length:30},(_,i)=>`2026-09-${String(i+1).padStart(2,'0')}`);
const attendance = (id='a') => days.map(date=>({employeeFirestoreId:id,date,status:'present'}));
const logs = (id='a') => days.map(date=>({employeeFirestoreId:id,date,status:'completed',completedTasks:2,projectFirestoreId:'p'}));
const base = () => ({ employees:[employee()], attendance:attendance(),workLogs:logs(),projects:[{id:'p',projectId:'PRJ'}],period:'month',year:2026,month:9,now:new Date('2026-10-01T00:00:00Z') });
const row = overrides => buildPerformanceReport({...base(),...overrides}).rankings[0];

test('calendar periods, leap year, equivalent periods and strict validation',()=>{
 for(const [spec,start,end] of [[{period:'month',year:2024,month:2},'2024-02-01','2024-02-29'],[{period:'quarter',year:2026,quarter:3},'2026-07-01','2026-09-30'],[{period:'year',year:2026},'2026-01-01','2026-12-31']]){
  const range=getPerformancePeriodRange(spec); assert.equal(range.startKey,start);assert.equal(range.endKey,end);
 }
 assert.equal(getPreviousEquivalentPeriodRange(getPerformancePeriodRange({period:'month',year:2026,month:1})).startKey,'2025-12-01');
 assert.equal(getPreviousEquivalentPeriodRange(getPerformancePeriodRange({period:'quarter',year:2026,quarter:1})).startKey,'2025-10-01');
 assert.equal(getPreviousEquivalentPeriodRange(getPerformancePeriodRange({period:'year',year:2026})).startKey,'2025-01-01');
 for(const spec of [{period:'week'},{month:13},{quarter:1.5},{year:100000}]) assert.throws(()=>getPerformancePeriodRange(spec),/INVALID/);
 assert.equal(dateKey('2026-09-01'),'2026-09-01');assert.equal(dateKey('2026-08-31T20:00:00Z'),'2026-09-01');
});
for(const kind of ['leave','holiday','weekly off']) test(`${kind} is neutral even with a late punch on the excluded date`,()=>{
 const overrides={attendance:attendance().map(log=>({...log,status:log.date==='2026-09-06'?'late':'present'}))};
 if(kind==='leave') overrides.leaves=[{employeeFirestoreId:'a',status:'approved',fromDate:'2026-09-06',toDate:'2026-09-06'}];
 if(kind==='holiday') overrides.holidays=[{date:'2026-09-06'}];
 if(kind==='weekly off') overrides.employees=[employee('a',{shiftPolicy:{weeklyOff:{sunday:true}}})];
 const result=row(overrides);assert.equal(result.attendancePercent,100);assert.equal(result.punctualityScore,100);assert.equal(result.lateArrivals,0);assert.equal(result.eligibleWorkingDays,kind==='weekly off'?26:29);
});
test('weekly-off supports both stored policy formats and selected Saturday weeks',()=>{
 assert.equal(isWeeklyOff('2026-09-05',{weeklyOff:{sunday:true}}),false);
 for(const policy of [{weeklyOff:{saturday:true},saturdayWeeks:[2]},{weeklyOff:{primary:'Saturday',weeks:[2]}}]){
 assert.equal(isWeeklyOff('2026-09-05',policy),false);assert.equal(isWeeklyOff('2026-09-12',policy),true);
 }
});
test('joining date and current date bound eligible days, future employee has none',()=>{
 assert.equal(row({employees:[employee('a',{employment:{status:'active',joiningDate:'2026-09-15'}})]}).eligibleWorkingDays,16);
 assert.equal(row({now:new Date('2026-09-09T12:00:00Z')}).eligibleWorkingDays,9);
 const future=row({employees:[employee('a',{joiningDate:'2026-11-01',employment:{status:'active'}})]});assert.equal(future.eligibleWorkingDays,0);assert.equal(future.overallScore,null);
});
test('half day, explicit absence and lateness normalize correctly',()=>{
 const records=attendance();records[0].status='half-day';records[1].status='absent';records[1].checkIn='2026-09-02T09:00:00Z';records[2].lateMinutes=15;
 const result=row({attendance:records});assert.equal(result.presentDays,28.5);assert.equal(result.attendanceScore,95);assert.equal(result.lateArrivals,1);assert.equal(result.punctualityScore,96.6);
});
test('work completion uses tasks or completed status; endTime and raw hours are not completion',()=>{
 const work=logs().map((log,index)=>({...log,status:index<15?'completed':'working',completedTasks:0,endTime:'2026-09-30T12:00:00Z',totalHours:999}));
 const result=row({workLogs:work});assert.equal(result.workExecutionScore,50);assert.equal(result.completedWork,15);
 assert.equal(row().completedWork,60); // Tasks are not double-counted with completed status.
 assert.equal(row({workLogs:work.map(({status,completedTasks,...log})=>log)}).overallScore,null);
});
test('distinct valid project aliases count once, dated assignments overlap, capped at 15 points',()=>{
 assert.equal(row({workLogs:logs().map(log=>({...log,projectId:'PRJ'}))}).projectCount,1);
 assert.equal(row({workLogs:logs().map(log=>({...log,projectFirestoreId:'foreign'}))}).projectCount,0);
 const projects=Array.from({length:10},(_,i)=>({id:`p${i}`,startDate:'2026-09-01',endDate:'2026-09-30',employees:[{firestoreId:'a'}]}));
 const result=row({projects});assert.equal(result.projectCount,10);assert.equal(result.projectParticipationScore,100);assert.equal(result.overallScore,100);
 assert.equal(row({projects:projects.map(p=>({...p,endDate:'2026-08-31'}))}).projectCount,0);
});
test('sparse or absent logs, unknown schedules, short samples cannot rank or produce an overall score',()=>{
 for(const overrides of [{workLogs:[]},{workLogs:logs().slice(0,2)},{workLogs:Array(30).fill(logs()[0])},{employees:[employee('a',{shiftPolicy:null})]},{now:new Date('2026-09-04T12:00:00Z')}]){
 const result=row(overrides);assert.equal(result.overallScore,null);assert.equal(result.rankingEligible,false);assert.equal(result.rank,null);assert.notEqual(result.dataCoverage,'good');
 }
 assert.equal(row({attendance:[],workLogs:[]}).dataCoverage,'insufficient');
 assert.equal(row({workLogs:logs().slice(0,24)}).rankingEligible,true);
});
test('ranking uses deterministic ID order, excludes inactive and insufficient employees',()=>{
 const report=buildPerformanceReport({...base(),employees:[employee('b'),employee('a'),employee('c'),employee('d',{employment:{status:'inactive'},access:{status:'active'}})],attendance:[...attendance('a'),...attendance('b'),...attendance('c')],workLogs:[...logs('a'),...logs('b')]});
 assert.deepEqual(report.rankings.filter(r=>r.rankingEligible).map(r=>[r.employeeId,r.rank]),[['a',1],['b',2]]);assert.equal(report.summary.eligibleEmployees,2);assert.equal(report.rankings.some(r=>r.employeeId==='d'),false);
 const detail=buildEmployeePerformanceDetail({...base(),employeeId:'a'});assert.equal(detail.employee.rank,1);
 assert.equal(buildEmployeePerformanceDetail({...base(),employeeId:'foreign'}).employee,null);
});
test('trend requires sufficient current and previous data; never fabricates history',()=>{
 assert.equal(row().trendChange,null);assert.deepEqual(row().performanceTrend,[]);
 const priorDates=Array.from({length:31},(_,i)=>`2026-08-${String(i+1).padStart(2,'0')}`);
 const result=row({attendance:[...attendance(),...priorDates.map(date=>({employeeFirestoreId:'a',date,status:'present'}))],workLogs:[...logs(),...priorDates.map(date=>({employeeFirestoreId:'a',date,status:'completed',projectFirestoreId:'p'}))]});
 assert.equal(result.trendChange,0);assert.equal(result.performanceTrend.length,2);
});
test('sensitive attributes do not affect scores and are not returned',()=>{
 const result=row({employees:[employee('a',{salary:999999,gender:'female',age:70,phone:'secret',health:'secret'})]});assert.equal(result.overallScore,row().overallScore);assert.doesNotMatch(JSON.stringify(result),/salary|gender|phone|health|secret/);
});

// Execute real handlers, authorization and repository code against an isolated
// in-memory Admin SDK. Only SDK boundaries and NextResponse are substituted.
test('API rejects missing permissions and cannot cross tenants through query, IDs or forged claims',async()=>{
 const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
 const moduleFrom=source=>import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
 const records={
  'Companies/A':{ownerUid:'owner-a'},'Companies/B':{ownerUid:'owner-b'},
  'Usermanagement/user-a':{uid:'user-a',companyId:'A',companyEmployeeId:'a'},
  'Companies/A/Usermanagement/a':employee('a',{access:{authUid:'user-a',effectivePermissions:['performance.view']}}),
  'Companies/B/Usermanagement/b':employee('b'),
 };
 const reads=[];
 const snapshot=(path,data)=>({exists:!!data,id:path.split('/').at(-1),data:()=>data,ref:ref(path)});
 function ref(path,filters=[]){return {
  collection:name=>ref(`${path}/${name}`),doc:id=>ref(`${path}/${id}`),
  where:(field,op,value)=>ref(path,[...filters,[field,value]]),limit:()=>ref(path,filters),
  get:async()=>{reads.push(path);if(path.split('/').length%2===0)return snapshot(path,records[path]);
   const docs=Object.entries(records).filter(([key,data])=>key.startsWith(`${path}/`)&&key.split('/').length===path.split('/').length+1&&filters.every(([field,value])=>field.split('.').reduce((obj,key)=>obj?.[key],data)===value)).map(([key,data])=>snapshot(key,data));return {docs,empty:!docs.length};
  }
 };}
 globalThis.__performanceTest={ALL_PERMISSIONS,adminDb:{collection:name=>ref(name)},adminAuth:{verifyIdToken:async token=>({uid:token,companyId:'B'})}};
 const auth=await moduleFrom(read('../src/lib/server/authorizeCompanyRequest.js').replace(/import .*firebase-admin";/,'const { adminDb, adminAuth } = globalThis.__performanceTest;').replace(/import .*permissionCatalog";/,'const { ALL_PERMISSIONS } = globalThis.__performanceTest;'));
 Object.assign(globalThis.__performanceTest,auth,{buildPerformanceReport,buildEmployeePerformanceDetail,getPerformancePeriodRange});
 const shared=await moduleFrom(read('../src/app/api/performance/_shared.js').replace(/import .*firebase-admin";/,'const {adminDb} = globalThis.__performanceTest;').replace(/import .*performance";/,'const {buildPerformanceReport,buildEmployeePerformanceDetail,getPerformancePeriodRange} = globalThis.__performanceTest;'));
 Object.assign(globalThis.__performanceTest,shared);
 const loadRoute=path=>moduleFrom(read(path).replace(/import \{ NextResponse \} from "next\/server";/,'const NextResponse = {json:(body,options={})=>({body,status:options.status || 200})};').replace(/import .*authorizeCompanyRequest";/,'const {authorizeCompanyRequest,requireCompanyPermission}=globalThis.__performanceTest;').replace(/import .*_shared";/,'const {buildPerformanceDashboardResponse,buildEmployeePerformanceResponse,loadPerformanceDataset,parsePerformanceQuery}=globalThis.__performanceTest;'));
 const list=await loadRoute('../src/app/api/performance/route.js'),detail=await loadRoute('../src/app/api/performance/[employeeId]/route.js');
 const request=(token,query='')=>new Request(`http://localhost/api/performance?period=month&year=2026&month=9&companyId=B${query}`,{headers:token?{authorization:`Bearer ${token}`}:{}});
 assert.equal((await list.GET(request(null))).status,401);
 reads.length=0;
 const response=await list.GET(request('user-a'));assert.equal(response.status,200);assert.deepEqual(response.body.rankings.map(row=>row.employeeFirestoreId),['a']);assert.equal(response.body.company,undefined);
 assert.equal(reads.some(path=>path.startsWith('Companies/B/')),false);
 assert.equal((await detail.GET(request('user-a'),{params:Promise.resolve({employeeId:'b'})})).status,404);
 assert.equal((await detail.GET(request('user-a'),{params:Promise.resolve({employeeId:'../B/Usermanagement/b'})})).status,404);
 records['Companies/A/Usermanagement/a'].access.effectivePermissions=[];
 reads.length=0;assert.equal((await list.GET(request('user-a'))).status,403);assert.equal(reads.includes('Companies/A/Attendance'),false);
 assert.equal((await list.GET(request('owner-a','&quarter=7'))).status,400);
 assert.equal((await list.GET(request('owner-a'))).status,200);
 delete globalThis.__performanceTest;
});

test('each ranking tie-break has the specified precedence',()=>{
 const baseRow={rankingEligible:true,overallScore:80,attendanceScore:90,lateArrivals:2,completedWork:10};
 const rows=[
 {...baseRow,employeeId:'z',overallScore:81},
 {...baseRow,employeeId:'y',attendanceScore:91},
 {...baseRow,employeeId:'x',lateArrivals:1},
 {...baseRow,employeeId:'w',completedWork:11},
 {...baseRow,employeeId:'b'}, {...baseRow,employeeId:'a'},
 ];
 assert.deepEqual(rankPerformanceRows(rows.reverse()).map(row=>row.employeeId),['z','y','x','w','a','b']);
});
