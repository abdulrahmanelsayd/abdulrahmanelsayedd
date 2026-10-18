import test from "node:test";
import assert from "node:assert/strict";
import {reviewDependencyAudit} from "../../tools/audit-policy.ts";

function fixture(){
  const chain:Record<string,string>={"eslint-config-next":"@next/eslint-plugin-next","@next/eslint-plugin-next":"fast-glob","fast-glob":"micromatch","micromatch":"braces"};
  const names=[...Object.keys(chain),"braces"];
  const report={auditReportVersion:2,metadata:{vulnerabilities:{total:5}},vulnerabilities:Object.fromEntries(names.map(name=>[name,{
    name,severity:"high",nodes:["node_modules/"+name],
    via:[name==="braces"?{name,url:"https://github.com/advisories/GHSA-vfj7-8cjw-p6xm",range:"<=3.0.3",severity:"high"}:chain[name]],
    fixAvailable:{name:"eslint-config-next",version:"14.2.35",isSemVerMajor:true},
  }]))};
  const lock={packages:{"":{devDependencies:{"eslint-config-next":"16.3.8"}},...Object.fromEntries(names.map(name=>["node_modules/"+name,{version:name==="braces"?"3.0.3":"1.0.0",dev:true}]))}};
  return {report,lock};
}
test("the reviewed development chain is reported explicitly, never as clean",()=>{
  const {report,lock}=fixture();const result=reviewDependencyAudit(report,lock);
  assert.equal(result.status,"known-development-exception");assert.equal(result.packages.length,5);
});
test("a genuinely clean full audit needs no exception",()=>{
  const {lock}=fixture();assert.equal(reviewDependencyAudit({auditReportVersion:2,metadata:{vulnerabilities:{total:0}},vulnerabilities:{}},lock).status,"clean");
});
test("missing, failed and inconsistent audits fail closed",()=>{
  const {report,lock}=fixture();for(const value of [null,{}, {...report,error:{code:"ENETUNREACH"}}, {...report,metadata:{vulnerabilities:{total:0}}}]) assert.throws(()=>reviewDependencyAudit(value,lock),/rejected/);
});
test("a new advisory or changed dependency chain cannot inherit the exception",()=>{
  const first=fixture();first.report.vulnerabilities.braces.via=[{name:"braces",url:"https://github.com/advisories/another-advisory",range:"<=3.0.3",severity:"high"}];
  assert.throws(()=>reviewDependencyAudit(first.report,first.lock),/changed braces/);
  const second=fixture();second.report.vulnerabilities.micromatch.via=["different-dependency"];
  assert.throws(()=>reviewDependencyAudit(second.report,second.lock),/changed dependency chain/);
});
test("production nodes, unknown versions and a patched path need a new review",()=>{
  for(const kind of ["production","version","fix"]){
    const {report,lock}=fixture();
    if(kind==="production") Object.assign(lock.packages,{"node_modules/braces":{version:"3.0.3",dev:false}});
    if(kind==="version") Object.assign(lock.packages,{"node_modules/braces":{version:"3.0.4",dev:true}});
    if(kind==="fix") report.vulnerabilities.braces.fixAvailable={name:"eslint-config-next",version:"16.4.3",isSemVerMajor:false};
    assert.throws(()=>reviewDependencyAudit(report,lock),/rejected/);
  }
});
