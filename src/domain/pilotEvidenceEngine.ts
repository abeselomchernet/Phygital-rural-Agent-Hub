import { z } from "zod";

import { computeCanonicalSha256 } from "./evidenceIntegrity";
import {
  HubIdSchema,
  HubTenantIdSchema,
  SYNTHETIC_HUB_IDS,
  SYNTHETIC_HUB_TENANT_IDS,
  syntheticHubs,
} from "./hub";
import { PartnerOrgIdSchema } from "./partnerCapabilityContract";
import { SYNTHETIC_PARTNER_IDS } from "./syntheticReferencePartners";

const uniqueStrings = (values: readonly string[]) => new Set(values).size === values.length;
const EvidenceRefsSchema = z.array(z.string().min(1).max(180)).min(1).max(64).refine(uniqueStrings, "evidence refs must be unique");

export const PilotEvidenceSchemaVersion = 1 as const;
export const PilotGateIdSchema = z.enum(["P1","P2","P3","P4","P5","P6","P7","P8","P9","P10","P11"]);
export type PilotGateId = z.infer<typeof PilotGateIdSchema>;
export const PilotEvidenceStatusSchema = z.enum(["UNKNOWN","COLLECTING","PARTIAL","MEETS_TARGET_UNREVIEWED","MISSES_TARGET_UNREVIEWED","EVIDENCE_ACCEPTED_MEETS_TARGET","EVIDENCE_ACCEPTED_MISSES_TARGET","WAIVED_WITH_REASON","NOT_APPLICABLE"]);
export type PilotEvidenceStatus = z.infer<typeof PilotEvidenceStatusSchema>;
export const PilotTargetComparatorSchema = z.enum(["GT","GTE","LT","LTE","EQ"]);
export type PilotTargetComparator = z.infer<typeof PilotTargetComparatorSchema>;
export const PilotMetricUnitSchema = z.enum(["USD_CENTS_PER_MONTH","BASIS_POINTS","SECONDS","BOOLEAN_FLAG"]);
export type PilotMetricUnit = z.infer<typeof PilotMetricUnitSchema>;

export const PilotTargetConstraintSchema = z.object({
  metricKey: z.string().regex(/^[a-z0-9_]+$/), comparator: PilotTargetComparatorSchema,
  threshold: z.number().int().min(0).max(1_000_000_000), unit: PilotMetricUnitSchema,
}).strict();
export type PilotTargetConstraint = z.infer<typeof PilotTargetConstraintSchema>;

export const PilotGateDefinitionSchema = z.object({
  gateId: PilotGateIdSchema, title: z.string().min(1).max(120),
  gateClass: z.enum(["PAPER_HYPOTHESIS","ENGINEERING_GATE"]),
  description: z.string().min(1).max(360), configurable: z.literal(true), evidenceLinked: z.literal(true),
  numericThresholdSelfAuthorizesScale: z.literal(false), evidenceRefs: EvidenceRefsSchema,
}).strict();
export type PilotGateDefinition = z.infer<typeof PilotGateDefinitionSchema>;

export const PilotTargetSchema = z.object({
  targetId: z.string().regex(/^pilottarget_syn_[a-z0-9_]+$/), gateId: PilotGateIdSchema,
  targetVersion: z.number().int().positive(), targetClass: z.enum(["PAPER_HYPOTHESIS","ENGINEERING_POLICY"]),
  constraints: z.array(PilotTargetConstraintSchema).min(1).max(16), evidenceRefs: EvidenceRefsSchema,
}).strict().superRefine((value,ctx)=>{
  const keys=value.constraints.map((item)=>item.metricKey);
  if(new Set(keys).size!==keys.length) ctx.addIssue({code:z.ZodIssueCode.custom,message:"target metric keys must be unique",path:["constraints"]});
});
export type PilotTarget = z.infer<typeof PilotTargetSchema>;

export const MetricObservationSchema = z.object({
  observationId: z.string().regex(/^pilotobs_syn_[a-z0-9_]+$/), gateId: PilotGateIdSchema,
  metricKey: z.string().regex(/^[a-z0-9_]+$/), value: z.number().int().min(0).max(1_000_000_000),
  unit: PilotMetricUnitSchema, observedAt: z.string().datetime(),
  observationClass: z.enum(["SYNTHETIC_TEST_FIXTURE","STAGING_TEST","REAL_PILOT_OBSERVATION"]),
  realPilotObservation: z.boolean(), evidenceRefs: EvidenceRefsSchema,
}).strict().superRefine((value,ctx)=>{
  if(value.observationClass==="REAL_PILOT_OBSERVATION" && !value.realPilotObservation) ctx.addIssue({code:z.ZodIssueCode.custom,message:"real pilot observations must be explicitly marked",path:["realPilotObservation"]});
  if(value.observationClass!=="REAL_PILOT_OBSERVATION" && value.realPilotObservation) ctx.addIssue({code:z.ZodIssueCode.custom,message:"synthetic/staging observations cannot claim real pilot status",path:["realPilotObservation"]});
});
export type MetricObservation = z.infer<typeof MetricObservationSchema>;

export const EvidenceArtifactReferenceSchema = z.object({
  artifactId: z.string().regex(/^pilotev_syn_[a-z0-9_]+$/), gateId: PilotGateIdSchema,
  artifactClass: z.enum(["SYNTHETIC_FIXTURE","REPOSITORY_TEST","GOVERNANCE_DOCUMENT","EXTERNAL_EVIDENCE"]),
  evidenceRef: z.string().min(1).max(180), integrityState: z.enum(["REFERENCE_RECORDED","DIGEST_RECORDED"]),
  digest: z.string().regex(/^sha256:[0-9a-f]{64}$/).nullable(), externallyVerified: z.boolean(), realPilotEvidence: z.boolean(),
}).strict().superRefine((value,ctx)=>{
  if(value.integrityState==="DIGEST_RECORDED"&&!value.digest) ctx.addIssue({code:z.ZodIssueCode.custom,message:"digest-recorded evidence requires a digest",path:["digest"]});
  if(value.integrityState==="REFERENCE_RECORDED"&&value.digest) ctx.addIssue({code:z.ZodIssueCode.custom,message:"reference-only evidence cannot carry a digest",path:["digest"]});
  if(value.artifactClass!=="EXTERNAL_EVIDENCE"&&value.externallyVerified) ctx.addIssue({code:z.ZodIssueCode.custom,message:"only external evidence may be externally verified",path:["externallyVerified"]});
});
export type EvidenceArtifactReference = z.infer<typeof EvidenceArtifactReferenceSchema>;

export const GateReviewSchema = z.object({
  reviewId: z.string().regex(/^pilotreview_syn_[a-z0-9_]+$/), gateId: PilotGateIdSchema,
  reviewState: z.enum(["SYNTHETIC_REVIEW_EXERCISE","FORMAL_REVIEW_PENDING","FORMAL_REVIEW_COMPLETED"]),
  reviewedAt: z.string().datetime().nullable(), reasonCode: z.string().regex(/^[A-Z0-9_]+$/),
  evidenceRefs: EvidenceRefsSchema, realPilotEvidenceAccepted: z.boolean(),
}).strict();
export type GateReview = z.infer<typeof GateReviewSchema>;

export const GateDecisionKindSchema = z.enum(["REQUEST_MORE_EVIDENCE","DEFERRED_PENDING_REAL_EVIDENCE","ACCEPT_MEETS_TARGET","ACCEPT_MISSES_TARGET","WAIVE_WITH_REASON","MARK_NOT_APPLICABLE"]);
export type GateDecisionKind = z.infer<typeof GateDecisionKindSchema>;
export const GateDecisionSchema = z.object({
  decisionId: z.string().regex(/^pilotdecision_syn_[a-z0-9_]+$/), gateId: PilotGateIdSchema,
  decisionKind: GateDecisionKindSchema, decidedAt: z.string().datetime(), reasonCode: z.string().regex(/^[A-Z0-9_]+$/),
  evidenceRefs: EvidenceRefsSchema, governanceActionRequired: z.literal(true), scaleAuthorityGranted: z.literal(false),
}).strict();
export type GateDecision = z.infer<typeof GateDecisionSchema>;

export const ScaleDecisionSchema = z.object({
  scaleDecisionId: z.string().regex(/^pilotscale_syn_[a-z0-9_]+$/),
  decision: z.enum(["CONTINUE_PILOT","REMEDIATE_AND_RETEST","PAUSE","STOP","APPROVE_BOUNDED_EXPANSION"]),
  decidedAt: z.string().datetime(), governanceAuthorityRef: z.string().min(1).max(160), reasonCode: z.string().regex(/^[A-Z0-9_]+$/),
  evidenceRefs: EvidenceRefsSchema, computedSideEffect: z.literal(false), realExpansionAuthorityGranted: z.literal(false),
}).strict();
export type ScaleDecision = z.infer<typeof ScaleDecisionSchema>;

export const PilotProgramSchema = z.object({
  schemaVersion: z.literal(PilotEvidenceSchemaVersion), programId: z.string().regex(/^pilotprogram_syn_[a-z0-9_]+$/),
  programVersion: z.number().int().positive(), tenantId: HubTenantIdSchema,
  hubIds: z.array(HubIdSchema).min(1).max(16).refine(uniqueStrings), partnerOrgId: PartnerOrgIdSchema,
  stage: z.literal("STAGE_4"), syntheticOnly: z.literal(true), regulatedPilotAuthorityGranted: z.literal(false),
  realDataAuthorized: z.literal(false), realFundsAuthorized: z.literal(false), evidenceRefs: EvidenceRefsSchema,
}).strict();
export type PilotProgram = z.infer<typeof PilotProgramSchema>;

export const PilotGateAssessmentSchema = z.object({
  gateDefinition: PilotGateDefinitionSchema, target: PilotTargetSchema,
  observations: z.array(MetricObservationSchema).max(64), evidenceArtifacts: z.array(EvidenceArtifactReferenceSchema).max(64),
  review: GateReviewSchema.nullable(), decision: GateDecisionSchema.nullable(),
  constraintResults: z.array(z.object({
    metricKey: z.string().regex(/^[a-z0-9_]+$/), observationId: z.string().regex(/^pilotobs_syn_[a-z0-9_]+$/).nullable(),
    observedValue: z.number().int().nullable(), threshold: z.number().int(), comparator: PilotTargetComparatorSchema,
    unit: PilotMetricUnitSchema, meetsTarget: z.boolean().nullable(),
  }).strict()).min(1).max(16),
  status: PilotEvidenceStatusSchema,
  statusBasis: z.enum(["NO_OBSERVATION","EVIDENCE_COLLECTION_STARTED","PARTIAL_OBSERVATION","SYNTHETIC_THRESHOLD_EVALUATION","GOVERNANCE_REVIEW"]),
  selfAuthorizedScale: z.literal(false),
}).strict();
export type PilotGateAssessment = z.infer<typeof PilotGateAssessmentSchema>;

export const PilotEvidenceReadModelSchema = z.object({
  schemaVersion: z.literal(PilotEvidenceSchemaVersion), program: PilotProgramSchema,
  gateAssessments: z.array(PilotGateAssessmentSchema).length(11), scaleDecision: ScaleDecisionSchema.nullable(),
  scaleDecisionState: z.literal("NO_AUTHORIZED_SCALE_DECISION_STAGE4"),
  gateStatusVocabulary: z.array(PilotEvidenceStatusSchema).length(9),
  pilotEvidenceDigest: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  readBoundary: z.object({
    stage: z.literal("STAGE_4"), syntheticOnly: z.literal(true), readOnly: z.literal(true),
    actualPilotRunning: z.literal(false), realPilotObservationsPresent: z.literal(false),
    externallyVerifiedPilotEvidencePresent: z.literal(false), numericThresholdCanAuthorizeScale: z.literal(false),
    governanceActionRequiredForScale: z.literal(true), boundedExpansionAuthorityGranted: z.literal(false),
    realDataIncluded: z.literal(false), realFundsIncluded: z.literal(false),
    partnerPostingAuthorityGranted: z.literal(false), settlementAuthorityGranted: z.literal(false),
  }).strict(),
}).strict();
export type PilotEvidenceReadModel = z.infer<typeof PilotEvidenceReadModelSchema>;

function compare(value:number, comparator:PilotTargetComparator, threshold:number){
  switch(comparator){case "GT":return value>threshold;case "GTE":return value>=threshold;case "LT":return value<threshold;case "LTE":return value<=threshold;case "EQ":return value===threshold;}
}

function statusFromDecision(decision:GateDecision|null):PilotEvidenceStatus|null{
  if(!decision) return null;
  switch(decision.decisionKind){
    case "ACCEPT_MEETS_TARGET": return "EVIDENCE_ACCEPTED_MEETS_TARGET";
    case "ACCEPT_MISSES_TARGET": return "EVIDENCE_ACCEPTED_MISSES_TARGET";
    case "WAIVE_WITH_REASON": return "WAIVED_WITH_REASON";
    case "MARK_NOT_APPLICABLE": return "NOT_APPLICABLE";
    case "REQUEST_MORE_EVIDENCE": case "DEFERRED_PENDING_REAL_EVIDENCE": return null;
  }
}

function validateProgramScope(program:PilotProgram){
  for(const hubId of program.hubIds){
    const hub=syntheticHubs.find((item)=>item.hubId===hubId);
    if(!hub||hub.tenantId!==program.tenantId) throw new Error("PILOT_EVIDENCE_HUB_SCOPE_MISMATCH");
    if(!hub.partnerMemberships.some((membership)=>membership.partnerOrgId===program.partnerOrgId)) throw new Error("PILOT_EVIDENCE_PARTNER_SCOPE_MISMATCH");
  }
}

function validateStage4Evidence(input:{observations:readonly MetricObservation[];evidenceArtifacts:readonly EvidenceArtifactReference[];reviews:readonly GateReview[];decisions:readonly GateDecision[];scaleDecision:ScaleDecision|null}){
  if(input.observations.some((item)=>item.realPilotObservation||item.observationClass==="REAL_PILOT_OBSERVATION")) throw new Error("PILOT_EVIDENCE_REAL_OBSERVATION_FORBIDDEN_STAGE4");
  if(input.evidenceArtifacts.some((item)=>item.realPilotEvidence||item.externallyVerified||item.artifactClass==="EXTERNAL_EVIDENCE")) throw new Error("PILOT_EVIDENCE_EXTERNAL_EVIDENCE_FORBIDDEN_STAGE4");
  if(input.reviews.some((item)=>item.realPilotEvidenceAccepted)) throw new Error("PILOT_EVIDENCE_FORMAL_ACCEPTANCE_FORBIDDEN_STAGE4");
  if(input.decisions.some((item)=>["ACCEPT_MEETS_TARGET","ACCEPT_MISSES_TARGET","WAIVE_WITH_REASON","MARK_NOT_APPLICABLE"].includes(item.decisionKind))) throw new Error("PILOT_EVIDENCE_ACCEPTED_DECISION_FORBIDDEN_STAGE4");
  if(input.scaleDecision) throw new Error("PILOT_EVIDENCE_SCALE_DECISION_FORBIDDEN_STAGE4");
}

export function evaluatePilotGate(input:{
  gateDefinition:unknown;target:unknown;observations:readonly unknown[];evidenceArtifacts?:readonly unknown[];review?:unknown|null;decision?:unknown|null;
}):PilotGateAssessment{
  const gateDefinition=PilotGateDefinitionSchema.parse(input.gateDefinition);
  const target=PilotTargetSchema.parse(input.target);
  const observations=input.observations.map((item)=>MetricObservationSchema.parse(item));
  const evidenceArtifacts=(input.evidenceArtifacts??[]).map((item)=>EvidenceArtifactReferenceSchema.parse(item));
  const review=input.review?GateReviewSchema.parse(input.review):null;
  const decision=input.decision?GateDecisionSchema.parse(input.decision):null;
  if(target.gateId!==gateDefinition.gateId) throw new Error("PILOT_EVIDENCE_TARGET_GATE_MISMATCH");
  for(const item of observations) if(item.gateId!==gateDefinition.gateId) throw new Error("PILOT_EVIDENCE_OBSERVATION_GATE_MISMATCH");
  for(const item of evidenceArtifacts) if(item.gateId!==gateDefinition.gateId) throw new Error("PILOT_EVIDENCE_ARTIFACT_GATE_MISMATCH");
  if(review&&review.gateId!==gateDefinition.gateId) throw new Error("PILOT_EVIDENCE_REVIEW_GATE_MISMATCH");
  if(decision&&decision.gateId!==gateDefinition.gateId) throw new Error("PILOT_EVIDENCE_DECISION_GATE_MISMATCH");
  const observationsByMetric=new Map(observations.map((item)=>[item.metricKey,item]));
  if(observationsByMetric.size!==observations.length) throw new Error("PILOT_EVIDENCE_DUPLICATE_METRIC_OBSERVATION");
  const constraintResults=target.constraints.map((constraint)=>{
    const observation=observationsByMetric.get(constraint.metricKey)??null;
    if(observation&&observation.unit!==constraint.unit) throw new Error("PILOT_EVIDENCE_METRIC_UNIT_MISMATCH");
    return {metricKey:constraint.metricKey,observationId:observation?.observationId??null,observedValue:observation?.value??null,threshold:constraint.threshold,comparator:constraint.comparator,unit:constraint.unit,meetsTarget:observation?compare(observation.value,constraint.comparator,constraint.threshold):null};
  });
  const reviewedStatus=statusFromDecision(decision);
  const observedCount=constraintResults.filter((item)=>item.observationId!==null).length;
  let status:PilotEvidenceStatus;
  let statusBasis:PilotGateAssessment["statusBasis"];
  if(reviewedStatus){status=reviewedStatus;statusBasis="GOVERNANCE_REVIEW";}
  else if(observedCount===0){status=evidenceArtifacts.length>0?"COLLECTING":"UNKNOWN";statusBasis=evidenceArtifacts.length>0?"EVIDENCE_COLLECTION_STARTED":"NO_OBSERVATION";}
  else if(observedCount<constraintResults.length){status="PARTIAL";statusBasis="PARTIAL_OBSERVATION";}
  else {status=constraintResults.every((item)=>item.meetsTarget===true)?"MEETS_TARGET_UNREVIEWED":"MISSES_TARGET_UNREVIEWED";statusBasis="SYNTHETIC_THRESHOLD_EVALUATION";}
  return PilotGateAssessmentSchema.parse({gateDefinition,target,observations:[...observations].sort((a,b)=>a.metricKey.localeCompare(b.metricKey)),evidenceArtifacts:[...evidenceArtifacts].sort((a,b)=>a.artifactId.localeCompare(b.artifactId)),review,decision,constraintResults,status,statusBasis,selfAuthorizedScale:false});
}

export function createStage4PilotEvidenceReadModel(input:{program:unknown;gateDefinitions:readonly unknown[];targets:readonly unknown[];observations?:readonly unknown[];evidenceArtifacts?:readonly unknown[];reviews?:readonly unknown[];decisions?:readonly unknown[];scaleDecision?:unknown|null;}):PilotEvidenceReadModel{
  const program=PilotProgramSchema.parse(input.program); validateProgramScope(program);
  const gateDefinitions=input.gateDefinitions.map((item)=>PilotGateDefinitionSchema.parse(item));
  const targets=input.targets.map((item)=>PilotTargetSchema.parse(item));
  const observations=(input.observations??[]).map((item)=>MetricObservationSchema.parse(item));
  const evidenceArtifacts=(input.evidenceArtifacts??[]).map((item)=>EvidenceArtifactReferenceSchema.parse(item));
  const reviews=(input.reviews??[]).map((item)=>GateReviewSchema.parse(item));
  const decisions=(input.decisions??[]).map((item)=>GateDecisionSchema.parse(item));
  const scaleDecision=input.scaleDecision?ScaleDecisionSchema.parse(input.scaleDecision):null;
  validateStage4Evidence({observations,evidenceArtifacts,reviews,decisions,scaleDecision});
  const gateIds=gateDefinitions.map((item)=>item.gateId);
  if(gateDefinitions.length!==11||new Set(gateIds).size!==11||PilotGateIdSchema.options.some((gateId)=>!gateIds.includes(gateId))) throw new Error("PILOT_EVIDENCE_P1_P11_REQUIRED");
  const targetGateIds=targets.map((item)=>item.gateId);
  if(targets.length!==11||new Set(targetGateIds).size!==11) throw new Error("PILOT_EVIDENCE_ONE_TARGET_PER_GATE_REQUIRED");
  if(new Set(reviews.map((item)=>item.gateId)).size!==reviews.length) throw new Error("PILOT_EVIDENCE_DUPLICATE_GATE_REVIEW");
  if(new Set(decisions.map((item)=>item.gateId)).size!==decisions.length) throw new Error("PILOT_EVIDENCE_DUPLICATE_GATE_DECISION");
  const gateAssessments=gateDefinitions.map((gateDefinition)=>{
    const target=targets.find((item)=>item.gateId===gateDefinition.gateId); if(!target) throw new Error("PILOT_EVIDENCE_TARGET_MISSING");
    return evaluatePilotGate({gateDefinition,target,observations:observations.filter((item)=>item.gateId===gateDefinition.gateId),evidenceArtifacts:evidenceArtifacts.filter((item)=>item.gateId===gateDefinition.gateId),review:reviews.find((item)=>item.gateId===gateDefinition.gateId)??null,decision:decisions.find((item)=>item.gateId===gateDefinition.gateId)??null});
  }).sort((a,b)=>Number(a.gateDefinition.gateId.slice(1))-Number(b.gateDefinition.gateId.slice(1)));
  const core={schemaVersion:PilotEvidenceSchemaVersion,program,gateAssessments,scaleDecision:null,scaleDecisionState:"NO_AUTHORIZED_SCALE_DECISION_STAGE4" as const,gateStatusVocabulary:[...PilotEvidenceStatusSchema.options],readBoundary:{stage:"STAGE_4" as const,syntheticOnly:true as const,readOnly:true as const,actualPilotRunning:false as const,realPilotObservationsPresent:false as const,externallyVerifiedPilotEvidencePresent:false as const,numericThresholdCanAuthorizeScale:false as const,governanceActionRequiredForScale:true as const,boundedExpansionAuthorityGranted:false as const,realDataIncluded:false as const,realFundsIncluded:false as const,partnerPostingAuthorityGranted:false as const,settlementAuthorityGranted:false as const}};
  return PilotEvidenceReadModelSchema.parse({...core,pilotEvidenceDigest:computeCanonicalSha256(core)});
}

export function verifyStage4PilotEvidenceReadModel(input:unknown):PilotEvidenceReadModel{
  const model=PilotEvidenceReadModelSchema.parse(input); const {pilotEvidenceDigest,...core}=model;
  if(pilotEvidenceDigest!==computeCanonicalSha256(core)) throw new Error("PILOT_EVIDENCE_DIGEST_MISMATCH"); return model;
}

export function searchStage4PilotEvidence(input:{readModels:readonly unknown[];tenantId:string;hubId:string;partnerOrgId:string;}):readonly PilotEvidenceReadModel[]{
  const tenantId=HubTenantIdSchema.parse(input.tenantId),hubId=HubIdSchema.parse(input.hubId),partnerOrgId=PartnerOrgIdSchema.parse(input.partnerOrgId);
  return input.readModels.map((item)=>verifyStage4PilotEvidenceReadModel(item)).filter((item)=>item.program.tenantId===tenantId&&item.program.partnerOrgId===partnerOrgId&&item.program.hubIds.includes(hubId)).sort((a,b)=>a.program.programId.localeCompare(b.program.programId));
}

const gate=(input:PilotGateDefinition)=>PilotGateDefinitionSchema.parse(input);
const target=(input:PilotTarget)=>PilotTargetSchema.parse(input);
const observation=(input:MetricObservation)=>MetricObservationSchema.parse(input);
const artifact=(input:EvidenceArtifactReference)=>EvidenceArtifactReferenceSchema.parse(input);
const commonGateEvidence=["EV-SYN-E6-PILOT-EVIDENCE-ENGINE-V1"];

export const SYNTHETIC_E6_GATE_DEFINITIONS:readonly PilotGateDefinition[]=[
  gate({gateId:"P1",title:"Hub profitability",gateClass:"PAPER_HYPOTHESIS",description:"Configurable monthly Hub net-profit hypothesis; model and observed values remain separate.",configurable:true,evidenceLinked:true,numericThresholdSelfAuthorizesScale:false,evidenceRefs:commonGateEvidence}),
  gate({gateId:"P2",title:"Hub/operator retention",gateClass:"PAPER_HYPOTHESIS",description:"Configurable churn hypothesis with explicit denominator/window semantics required by later pilot scope.",configurable:true,evidenceLinked:true,numericThresholdSelfAuthorizesScale:false,evidenceRefs:commonGateEvidence}),
  gate({gateId:"P3",title:"Revenue diversification",gateClass:"PAPER_HYPOTHESIS",description:"Configurable value-added revenue share hypothesis with included/excluded categories governed separately.",configurable:true,evidenceLinked:true,numericThresholdSelfAuthorizesScale:false,evidenceRefs:commonGateEvidence}),
  gate({gateId:"P4",title:"Liquidity/service continuity",gateClass:"PAPER_HYPOTHESIS",description:"Hub NLC/LCI service-continuity hypothesis; this is not a prudential LCR claim.",configurable:true,evidenceLinked:true,numericThresholdSelfAuthorizesScale:false,evidenceRefs:commonGateEvidence}),
  gate({gateId:"P5",title:"Resilience/value-added service uptake",gateClass:"PAPER_HYPOTHESIS",description:"Configurable uptake hypothesis whose denominator, eligibility, consent and partner policy remain explicit.",configurable:true,evidenceLinked:true,numericThresholdSelfAuthorizesScale:false,evidenceRefs:commonGateEvidence}),
  gate({gateId:"P6",title:"Partner neutrality",gateClass:"ENGINEERING_GATE",description:"Evidence gate for route neutrality, provenance, contract consistency and approved/versioned policy changes.",configurable:true,evidenceLinked:true,numericThresholdSelfAuthorizesScale:false,evidenceRefs:commonGateEvidence}),
  gate({gateId:"P7",title:"Offline recovery integrity",gateClass:"ENGINEERING_GATE",description:"Evidence gate for reconciliation, duplicate safety, idempotency conflicts and ambiguous-outcome handling.",configurable:true,evidenceLinked:true,numericThresholdSelfAuthorizesScale:false,evidenceRefs:commonGateEvidence}),
  gate({gateId:"P8",title:"Data-isolation compliance",gateClass:"ENGINEERING_GATE",description:"Evidence gate for object/organization isolation, redaction and retention/deletion completeness.",configurable:true,evidenceLinked:true,numericThresholdSelfAuthorizesScale:false,evidenceRefs:commonGateEvidence}),
  gate({gateId:"P9",title:"Device/operator readiness",gateClass:"ENGINEERING_GATE",description:"Evidence gate for training, approved device state, security controls and support/escalation readiness.",configurable:true,evidenceLinked:true,numericThresholdSelfAuthorizesScale:false,evidenceRefs:commonGateEvidence}),
  gate({gateId:"P10",title:"Evidence completeness",gateClass:"ENGINEERING_GATE",description:"Every pilot metric and claim must map to provenance/evidence; missing evidence remains UNKNOWN rather than PASS.",configurable:true,evidenceLinked:true,numericThresholdSelfAuthorizesScale:false,evidenceRefs:commonGateEvidence}),
  gate({gateId:"P11",title:"Incident/recovery readiness",gateClass:"ENGINEERING_GATE",description:"Evidence gate for incident ownership, escalation, rollback/kill-switch rehearsal and support/reconciliation paths.",configurable:true,evidenceLinked:true,numericThresholdSelfAuthorizesScale:false,evidenceRefs:commonGateEvidence}),
] as const;

function checklistTarget(gateId:PilotGateId,keys:readonly string[]){
  return target({targetId:`pilottarget_syn_${gateId.toLowerCase()}_v1`,gateId,targetVersion:1,targetClass:"ENGINEERING_POLICY",constraints:keys.map((metricKey)=>({metricKey,comparator:"EQ",threshold:1,unit:"BOOLEAN_FLAG" as const})),evidenceRefs:["EV-SYN-E6-ENGINEERING-GATE-TARGETS-V1"]});
}

export const SYNTHETIC_E6_TARGETS:readonly PilotTarget[]=[
  target({targetId:"pilottarget_syn_p1_v1",gateId:"P1",targetVersion:1,targetClass:"PAPER_HYPOTHESIS",constraints:[{metricKey:"monthly_hub_net_profit_usd_cents",comparator:"GT",threshold:15_000,unit:"USD_CENTS_PER_MONTH"}],evidenceRefs:["EV-SYN-E6-PAPER-HYPOTHESIS-P1-V1"]}),
  target({targetId:"pilottarget_syn_p2_v1",gateId:"P2",targetVersion:1,targetClass:"PAPER_HYPOTHESIS",constraints:[{metricKey:"hub_churn_basis_points",comparator:"LT",threshold:1_000,unit:"BASIS_POINTS"}],evidenceRefs:["EV-SYN-E6-PAPER-HYPOTHESIS-P2-V1"]}),
  target({targetId:"pilottarget_syn_p3_v1",gateId:"P3",targetVersion:1,targetClass:"PAPER_HYPOTHESIS",constraints:[{metricKey:"value_added_revenue_share_basis_points",comparator:"GT",threshold:4_000,unit:"BASIS_POINTS"}],evidenceRefs:["EV-SYN-E6-PAPER-HYPOTHESIS-P3-V1"]}),
  target({targetId:"pilottarget_syn_p4_v1",gateId:"P4",targetVersion:1,targetClass:"PAPER_HYPOTHESIS",constraints:[{metricKey:"liquidity_coverage_uptime_basis_points",comparator:"GTE",threshold:9_990,unit:"BASIS_POINTS"},{metricKey:"max_sustained_shortfall_seconds",comparator:"LTE",threshold:1_800,unit:"SECONDS"}],evidenceRefs:["EV-SYN-E6-PAPER-HYPOTHESIS-P4-V1"]}),
  target({targetId:"pilottarget_syn_p5_v1",gateId:"P5",targetVersion:1,targetClass:"PAPER_HYPOTHESIS",constraints:[{metricKey:"eligible_customer_uptake_basis_points",comparator:"GT",threshold:2_000,unit:"BASIS_POINTS"}],evidenceRefs:["EV-SYN-E6-PAPER-HYPOTHESIS-P5-V1"]}),
  checklistTarget("P6",["no_unauthorized_preferential_routing","route_provenance_complete","contract_capability_consistent","policy_changes_approved_versioned"]),
  checklistTarget("P7",["offline_requests_reconcile_after_sync","no_silent_duplication","idempotency_conflicts_detected","ambiguous_outcomes_reconciliation_required"]),
  checklistTarget("P8",["organization_isolation_tests_pass","nonfinancial_partner_data_scope_bounded","log_redaction_tests_pass","retention_deletion_evidence_complete"]),
  checklistTarget("P9",["training_current","approved_device_state","security_controls_active","support_escalation_tested"]),
  checklistTarget("P10",["metric_source_provenance_complete","claim_maps_to_evidence_artifact","missing_evidence_becomes_unknown"]),
  checklistTarget("P11",["incident_owner_defined","severity_escalation_rehearsed","rollback_kill_switch_tested","reconciliation_support_path_proven"]),
] as const;

function obs(gateId:PilotGateId,metricKey:string,value:number,unit:PilotMetricUnit,suffix:string){
  return observation({observationId:`pilotobs_syn_${gateId.toLowerCase()}_${suffix}`,gateId,metricKey,value,unit,observedAt:"2026-10-15T00:00:00.000Z",observationClass:"SYNTHETIC_TEST_FIXTURE",realPilotObservation:false,evidenceRefs:[`EV-SYN-E6-${gateId}-${suffix.toUpperCase()}-V1`]});
}
function checklistObs(gateId:PilotGateId,keys:readonly string[]){return keys.map((key,index)=>obs(gateId,key,1,"BOOLEAN_FLAG",`check_${index+1}`));}

export const SYNTHETIC_E6_ALPHA_OBSERVATIONS:readonly MetricObservation[]=[
  obs("P1","monthly_hub_net_profit_usd_cents",16_000,"USD_CENTS_PER_MONTH","profit_fixture"),
  obs("P2","hub_churn_basis_points",1_200,"BASIS_POINTS","churn_fixture"),
  obs("P4","liquidity_coverage_uptime_basis_points",9_985,"BASIS_POINTS","uptime_fixture"),
  obs("P4","max_sustained_shortfall_seconds",1_200,"SECONDS","shortfall_fixture"),
  ...checklistObs("P6",["no_unauthorized_preferential_routing","route_provenance_complete","contract_capability_consistent","policy_changes_approved_versioned"]),
  ...checklistObs("P7",["offline_requests_reconcile_after_sync","no_silent_duplication","idempotency_conflicts_detected","ambiguous_outcomes_reconciliation_required"]),
  ...checklistObs("P8",["organization_isolation_tests_pass","nonfinancial_partner_data_scope_bounded","log_redaction_tests_pass"]),
  ...checklistObs("P9",["training_current","approved_device_state","security_controls_active","support_escalation_tested"]),
  ...checklistObs("P10",["metric_source_provenance_complete","claim_maps_to_evidence_artifact","missing_evidence_becomes_unknown"]),
  ...checklistObs("P11",["incident_owner_defined","severity_escalation_rehearsed","reconciliation_support_path_proven"]),
] as const;

export const SYNTHETIC_E6_EVIDENCE_ARTIFACTS:readonly EvidenceArtifactReference[]=PilotGateIdSchema.options.map((gateId)=>artifact({
  artifactId:`pilotev_syn_${gateId.toLowerCase()}_repository_fixture`,gateId,
  artifactClass:["P1","P2","P3","P4","P5"].includes(gateId)?"GOVERNANCE_DOCUMENT":"REPOSITORY_TEST",
  evidenceRef:`EV-SYN-E6-${gateId}-REFERENCE-V1`,integrityState:"REFERENCE_RECORDED",digest:null,externallyVerified:false,realPilotEvidence:false,
}));

export const SYNTHETIC_E6_PROGRAMS:readonly PilotProgram[]=[
  PilotProgramSchema.parse({schemaVersion:1,programId:"pilotprogram_syn_adama_alpha_stage4",programVersion:1,tenantId:SYNTHETIC_HUB_TENANT_IDS.STAGE4,hubIds:[SYNTHETIC_HUB_IDS.ADAMA_SHARED],partnerOrgId:SYNTHETIC_PARTNER_IDS.PARTNERFI_ALPHA,stage:"STAGE_4",syntheticOnly:true,regulatedPilotAuthorityGranted:false,realDataAuthorized:false,realFundsAuthorized:false,evidenceRefs:["EV-SYN-E6-ADAMA-ALPHA-PROGRAM-V1"]}),
  PilotProgramSchema.parse({schemaVersion:1,programId:"pilotprogram_syn_adama_beta_stage4",programVersion:1,tenantId:SYNTHETIC_HUB_TENANT_IDS.STAGE4,hubIds:[SYNTHETIC_HUB_IDS.ADAMA_SHARED],partnerOrgId:SYNTHETIC_PARTNER_IDS.PARTNERFI_BETA,stage:"STAGE_4",syntheticOnly:true,regulatedPilotAuthorityGranted:false,realDataAuthorized:false,realFundsAuthorized:false,evidenceRefs:["EV-SYN-E6-ADAMA-BETA-PROGRAM-V1"]}),
] as const;

export const SYNTHETIC_E6_PILOT_EVIDENCE_READ_MODELS:readonly PilotEvidenceReadModel[]=[
  createStage4PilotEvidenceReadModel({program:SYNTHETIC_E6_PROGRAMS[0],gateDefinitions:SYNTHETIC_E6_GATE_DEFINITIONS,targets:SYNTHETIC_E6_TARGETS,observations:SYNTHETIC_E6_ALPHA_OBSERVATIONS,evidenceArtifacts:SYNTHETIC_E6_EVIDENCE_ARTIFACTS}),
  createStage4PilotEvidenceReadModel({program:SYNTHETIC_E6_PROGRAMS[1],gateDefinitions:SYNTHETIC_E6_GATE_DEFINITIONS,targets:SYNTHETIC_E6_TARGETS,observations:[],evidenceArtifacts:SYNTHETIC_E6_EVIDENCE_ARTIFACTS}),
] as const;
