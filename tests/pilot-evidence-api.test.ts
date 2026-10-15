import assert from "node:assert/strict";
import test from "node:test";

import { SYNTHETIC_HUB_IDS } from "../src/domain/hub";
import { createApp } from "../src/server/app";

type Session = { cookie: string; csrfToken: string; body: any };
async function startSession(base:string,input:{role:string;workspaceKey:string}):Promise<Session>{
  const response=await fetch(base+"/api/demo/session/start",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)});
  assert.equal(response.status,200); const body=await response.json(); const cookie=response.headers.get("set-cookie")?.split(";")[0]; assert.ok(cookie);
  return {cookie,csrfToken:body.csrfToken,body};
}
function getPilotEvidence(base:string,session:Session|null,hubId:string){
  return fetch(`${base}/api/demo/hubs/${hubId}/pilot-evidence`,{headers:session?{Cookie:session.cookie}:undefined});
}

test("Pilot Evidence API requires authentication and a governed supervision/review role",async()=>{
  const server=createApp({allowPrivilegedSyntheticRoles:true}).listen(0,"127.0.0.1"); await new Promise<void>((resolve)=>server.once("listening",resolve));
  const base=`http://127.0.0.1:${(server.address() as any).port}`;
  try{
    assert.equal((await getPilotEvidence(base,null,SYNTHETIC_HUB_IDS.ADAMA_SHARED)).status,401);
    const agent=await startSession(base,{role:"AGENT",workspaceKey:"ALPHA_AGENT_ADAMA"});
    const denied=await getPilotEvidence(base,agent,SYNTHETIC_HUB_IDS.ADAMA_SHARED); assert.equal(denied.status,403); assert.deepEqual(await denied.json(),{error:"ROLE_ACCESS_DENIED"});
  }finally{server.close();}
});

test("Alpha Supervisor receives only bounded Stage-4 synthetic pilot evidence",async()=>{
  const server=createApp({allowPrivilegedSyntheticRoles:true}).listen(0,"127.0.0.1"); await new Promise<void>((resolve)=>server.once("listening",resolve));
  const base=`http://127.0.0.1:${(server.address() as any).port}`;
  try{
    const supervisor=await startSession(base,{role:"SUPERVISOR",workspaceKey:"ALPHA_SUPERVISOR_ADAMA"});
    const response=await getPilotEvidence(base,supervisor,SYNTHETIC_HUB_IDS.ADAMA_SHARED); assert.equal(response.status,200); const body=await response.json();
    assert.equal(body.readOnly,true); assert.equal(body.programs.length,1); const program=body.programs[0];
    assert.equal(program.program.partnerOrgId,"org_syn_partnerfi_alpha"); assert.equal(program.gateAssessments.length,11); assert.equal(program.scaleDecision,null);
    assert.equal(program.readBoundary.actualPilotRunning,false); assert.equal(program.readBoundary.numericThresholdCanAuthorizeScale,false); assert.equal(program.readBoundary.boundedExpansionAuthorityGranted,false);
    assert.equal(program.readBoundary.realDataIncluded,false); assert.equal(program.readBoundary.realFundsIncluded,false); assert.equal(program.readBoundary.settlementAuthorityGranted,false);
    assert.equal(JSON.stringify(body).includes("org_syn_partnerfi_beta"),false);
    assert.equal(program.gateAssessments.some((entry:any)=>entry.status.startsWith("EVIDENCE_ACCEPTED")),false);
  }finally{server.close();}
});

test("Operations projection is PartnerFI-scoped on the shared Hub",async()=>{
  const server=createApp({allowPrivilegedSyntheticRoles:true}).listen(0,"127.0.0.1"); await new Promise<void>((resolve)=>server.once("listening",resolve));
  const base=`http://127.0.0.1:${(server.address() as any).port}`;
  try{
    const operations=await startSession(base,{role:"OPERATIONS",workspaceKey:"ALPHA_OPERATIONS_ADAMA"});
    const response=await getPilotEvidence(base,operations,SYNTHETIC_HUB_IDS.ADAMA_SHARED); assert.equal(response.status,200); const body=await response.json();
    assert.equal(body.programs.length,1); assert.equal(body.programs[0].program.programId,"pilotprogram_syn_adama_alpha_stage4");
    assert.equal(JSON.stringify(body).includes("pilotprogram_syn_adama_beta_stage4"),false);
  }finally{server.close();}
});

test("Pilot Evidence API fails closed for an inaccessible Hub",async()=>{
  const server=createApp({allowPrivilegedSyntheticRoles:true}).listen(0,"127.0.0.1"); await new Promise<void>((resolve)=>server.once("listening",resolve));
  const base=`http://127.0.0.1:${(server.address() as any).port}`;
  try{
    const operations=await startSession(base,{role:"OPERATIONS",workspaceKey:"ALPHA_OPERATIONS_ADAMA"});
    const response=await getPilotEvidence(base,operations,SYNTHETIC_HUB_IDS.ARISI_ALPHA); assert.equal(response.status,403); assert.deepEqual(await response.json(),{error:"HUB_ACCESS_DENIED"});
  }finally{server.close();}
});

test("Pilot Evidence endpoint is read-only and mounts no decision/scale mutation surface",async()=>{
  const server=createApp({allowPrivilegedSyntheticRoles:true}).listen(0,"127.0.0.1"); await new Promise<void>((resolve)=>server.once("listening",resolve));
  const base=`http://127.0.0.1:${(server.address() as any).port}`;
  try{
    const admin=await startSession(base,{role:"PARTNER_ADMIN",workspaceKey:"ALPHA_PARTNER_ADMIN_ADAMA"});
    const response=await fetch(`${base}/api/demo/hubs/${SYNTHETIC_HUB_IDS.ADAMA_SHARED}/pilot-evidence`,{method:"POST",headers:{Cookie:admin.cookie,"Content-Type":"application/json","x-csrf-token":admin.csrfToken},body:JSON.stringify({decision:"APPROVE_BOUNDED_EXPANSION"})});
    assert.equal(response.status,404);
  }finally{server.close();}
});
