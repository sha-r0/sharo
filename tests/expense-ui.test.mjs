import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expenseDetails } from '../src/lib/expenses/details.js';
const require = createRequire(import.meta.url);
const { transform, loadBindings } = require('next/dist/build/swc');
await loadBindings();
async function renderComponent(name, props) {
 const file = new URL(`../src/app/(dashboard)/manager/expenses/components/${name}.jsx`, import.meta.url);
 const { code } = await transform(fs.readFileSync(file,'utf8'), { filename:file.pathname, jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}}}, module:{type:'commonjs'} });
 const module={exports:{}};
 new Function('require','module','exports',code)((id)=>id==='@/lib/expenses/details'?{expenseDetails}:require(id),module,module.exports);
 return renderToStaticMarkup(React.createElement(module.exports.default,props));
}
test('skeleton renders immediately with accessible loading status and eight row placeholders',async()=>{
 const html=await renderComponent('ExpenseSkeleton');assert.match(html,/Loading expenses/);assert.match(html,/motion-safe:animate-pulse/);assert.equal((html.match(/h-28/g)||[]).length,8);assert.equal((html.match(/h-36/g)||[]).length,5);
});
test('description-first Details render route and configured metadata without empty labels',async()=>{
 const html=await renderComponent('ExpenseDetails',{expense:{description:'rapido',travelFrom:'aashram',travelTo:'sajeenbag',locationType:'Delhi NCR'}});
 assert.ok(html.indexOf('rapido')<html.indexOf('From:'));assert.match(html,/aashram/);assert.match(html,/sajeenbag/);assert.match(html,/Delhi NCR/);assert.doesNotMatch(html,/GST:/);
 const actual=await renderComponent('ExpenseDetails',{expense:{description:'Office receipt',category:'Travel'}});assert.match(actual,/Office receipt/);assert.doesNotMatch(actual,/From:|To:|Quantity:|Rate:/);
});
