import { z } from "zod";

import { computeCanonicalSha256 } from "./evidenceIntegrity";
import {
  HubAccessContextSchema,
  HubIdSchema,
  HubTenantIdSchema,
  authorizeSyntheticHubAccess,
  type HubAccessContext,
} from "./hub";
import {
  HubWorkflowCorrelationIdSchema,
  HubWorkflowIdempotencyKeySchema,
  HubWorkflowRunIdSchema,
} from "./hubWorkflowEnvelope";
import {
  PartnerAdapterIdSchema,
  PartnerContractCapabilityIdSchema,
  PartnerContractRoleSchema,
  PartnerOrgIdSchema,
  PartnerRouteIdSchema,
  PartnerServiceIdSchema,
  type PartnerCapabilityContract,
  type PartnerResolvedRoute,
} from "./partnerCapabilityContract";
import {
  SYNTHETIC_PARTNERFI_SERVICE_CATALOGS,
  SYNTHETIC_PARTNERFI_SERVICE_CONTRACTS,
  type PartnerServiceCatalog,
} from "./partnerServiceCatalog";
import { SYNTHETIC_REFERENCE_ROUTES } from "./syntheticReferencePartners";

export const HubWorkflowIntentCertificationSchemaVersion = 1 as const;

const ReservationIdSchema = z
  .string()
  .min(18)
  .max(120)
  .regex(/^reservation_syn_[a-z0-9][a-z0-9_-]*$/);
const DigestSchema = z.string().regex(/^sha256:[0-9a-f]{64}$/);
const OperatorAssignmentIdSchema = z.string().regex(/^hubop_syn_[a-z0-9_]+$/);

export const HubWorkflowIntentFactsSchema = z
  .object({
    intentClass: z.enum([
      "REFERENCE_READ",
      "SERVICE_REQUEST",
      "SYNTHETIC_FINANCIAL_INTENT",
    ]),
    objectRef: z.string().regex(/^obj_syn_[a-z0-9_]+$/).nullable(),
    amountMinor: z.number().int().positive().max(100_000_000).nullable(),
    currency: z.literal("ETB").nullable(),
    variant: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[A-Z0-9][A-Z0-9_.-]*$/),
  })
  .strict()
  .superRefine((facts, ctx) => {
    const hasAmount = facts.amountMinor !== null;
    const hasCurrency = facts.currency !== null;
    if (hasAmount !== hasCurrency) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amountMinor"],
        message: "synthetic amount and currency must be present together",
      });
    }
  });
export type HubWorkflowIntentFacts = z.infer<typeof HubWorkflowIntentFactsSchema>;

export const HubWorkflowIntentRequestSchema = z
  .object({
    schemaVersion: z.literal(HubWorkflowIntentCertificationSchemaVersion),
    capturedAt: z.string().datetime({ offset: true }),
    expiresAt: z.string().datetime({ offset: true }),
    correlationId: HubWorkflowCorrelationIdSchema,
    runId: HubWorkflowRunIdSchema,
    idempotencyKey: HubWorkflowIdempotencyKeySchema,
    tenantId: HubTenantIdSchema,
    hubId: HubIdSchema,
    partnerOrgId: PartnerOrgIdSchema,
    serviceId: PartnerServiceIdSchema,
    capabilityId: PartnerContractCapabilityIdSchema,
    routeId: PartnerRouteIdSchema,
    adapterId: PartnerAdapterIdSchema,
    purpose: z.literal("HUB_OPERATE"),
    facts: HubWorkflowIntentFactsSchema,
  })
  .strict()
  .superRefine((request, ctx) => {
    if (Date.parse(request.expiresAt) <= Date.parse(request.capturedAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expiresAt"],
        message: "workflow intent expiry must be after capture time",
      });
    }
  });
export type HubWorkflowIntentRequest = z.infer<
  typeof HubWorkflowIntentRequestSchema
>;

const HubWorkflowBusinessIntentContentSchema = z
  .object({
    schemaVersion: z.literal(HubWorkflowIntentCertificationSchemaVersion),
    tenantId: HubTenantIdSchema,
    hubId: HubIdSchema,
    partnerOrgId: PartnerOrgIdSchema,
    serviceId: PartnerServiceIdSchema,
    capabilityId: PartnerContractCapabilityIdSchema,
    purpose: z.literal("HUB_OPERATE"),
    facts: HubWorkflowIntentFactsSchema,
  })
  .strict();

export function computeHubWorkflowBusinessIntentDigest(
  input: HubWorkflowIntentRequest,
) {
  const request = HubWorkflowIntentRequestSchema.parse(input);
  return computeCanonicalSha256(
    HubWorkflowBusinessIntentContentSchema.parse({
      schemaVersion: request.schemaVersion,
      tenantId: request.tenantId,
      hubId: request.hubId,
      partnerOrgId: request.partnerOrgId,
      serviceId: request.serviceId,
      capabilityId: request.capabilityId,
      purpose: request.purpose,
      facts: request.facts,
    }),
  );
}

export const HubWorkflowIntentReservationStateSchema = z.enum([
  "RESERVED_SYNTHETIC",
  "POSSIBLE_EXTERNAL_MUTATION",
  "RECONCILIATION_REQUIRED",
]);
export type HubWorkflowIntentReservationState = z.infer<
  typeof HubWorkflowIntentReservationStateSchema
>;

export const HubWorkflowIntentReservationSchema = z
  .object({
    schemaVersion: z.literal(HubWorkflowIntentCertificationSchemaVersion),
    reservationId: ReservationIdSchema,
    createdAt: z.string().datetime({ offset: true }),
    expiresAt: z.string().datetime({ offset: true }),
    lastUpdatedAt: z.string().datetime({ offset: true }),
    correlationId: HubWorkflowCorrelationIdSchema,
    runId: HubWorkflowRunIdSchema,
    idempotencyKey: HubWorkflowIdempotencyKeySchema,
    tenantId: HubTenantIdSchema,
    hubId: HubIdSchema,
    partnerOrgId: PartnerOrgIdSchema,
    serviceId: PartnerServiceIdSchema,
    capabilityId: PartnerContractCapabilityIdSchema,
    originalRouteId: PartnerRouteIdSchema,
    originalAdapterId: PartnerAdapterIdSchema,
    pinnedRouteId: PartnerRouteIdSchema,
    pinnedAdapterId: PartnerAdapterIdSchema,
    operatorAssignmentId: OperatorAssignmentIdSchema,
    businessIntentDigest: DigestSchema,
    facts: HubWorkflowIntentFactsSchema,
    state: HubWorkflowIntentReservationStateSchema,
    possibleMutationMarkedAt: z.string().datetime({ offset: true }).nullable(),
    ambiguityRecordedAt: z.string().datetime({ offset: true }).nullable(),
    liveNetworkAllowed: z.literal(false),
    settlementAuthorityGranted: z.literal(false),
  })
  .strict();
export type HubWorkflowIntentReservation = z.infer<
  typeof HubWorkflowIntentReservationSchema
>;

export const HubWorkflowIntentDecisionCodeSchema = z.enum([
  "RESERVED_NEW",
  "DUPLICATE_NOOP",
  "CONFLICT_REVIEW_REQUIRED",
  "ROUTE_CHANGE_REVIEW_REQUIRED",
  "STALE_INTENT_REJECTED",
  "REPLAY_AUTHORIZATION_DENIED",
  "ASSIGNMENT_CHANGED_REVIEW_REQUIRED",
  "ROUTE_FALLBACK_REJECTED",
  "RECONCILIATION_REQUIRED",
  "SYNTHETIC_DISPATCH_ELIGIBLE",
  "NO_RESERVATION",
]);
export type HubWorkflowIntentDecisionCode = z.infer<
  typeof HubWorkflowIntentDecisionCodeSchema
>;

export const HubWorkflowIntentDecisionSchema = z
  .object({
    decision: HubWorkflowIntentDecisionCodeSchema,
    logicalWorkflowCreated: z.boolean(),
    syntheticDispatchEligible: z.boolean(),
    liveNetworkAllowed: z.literal(false),
    assumedSuccess: z.literal(false),
    reservation: HubWorkflowIntentReservationSchema.nullable(),
  })
  .strict();
export type HubWorkflowIntentDecision = z.infer<
  typeof HubWorkflowIntentDecisionSchema
>;

export const HubWorkflowIntentCertificationSnapshotSchema = z
  .object({
    version: z.literal(1),
    reservations: z.array(HubWorkflowIntentReservationSchema).max(4096),
  })
  .strict()
  .superRefine((snapshot, ctx) => {
    const ids = snapshot.reservations.map((reservation) => reservation.reservationId);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reservations"],
        message: "reservation IDs must be unique",
      });
    }
    const scopes = snapshot.reservations.map((reservation) =>
      reservationScopeKey(reservation),
    );
    if (new Set(scopes).size !== scopes.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reservations"],
        message: "one reservation is allowed per scoped idempotency key",
      });
    }
  });
export type HubWorkflowIntentCertificationSnapshot = z.infer<
  typeof HubWorkflowIntentCertificationSnapshotSchema
>;

function requestScopeKey(request: Pick<
  HubWorkflowIntentRequest,
  "tenantId" | "hubId" | "partnerOrgId" | "idempotencyKey"
>) {
  return `${request.tenantId}|${request.hubId}|${request.partnerOrgId}|${request.idempotencyKey}`;
}

function reservationScopeKey(reservation: Pick<
  HubWorkflowIntentReservation,
  "tenantId" | "hubId" | "partnerOrgId" | "idempotencyKey"
>) {
  return `${reservation.tenantId}|${reservation.hubId}|${reservation.partnerOrgId}|${reservation.idempotencyKey}`;
}

function reservationIdFor(request: HubWorkflowIntentRequest, digest: string) {
  const scopeDigest = computeCanonicalSha256({
    scope: requestScopeKey(request),
    businessIntentDigest: digest,
  }).slice("sha256:".length, "sha256:".length + 32);
  return `reservation_syn_${scopeDigest}`;
}

function decision(
  code: HubWorkflowIntentDecisionCode,
  reservation: HubWorkflowIntentReservation | null,
  options: {
    logicalWorkflowCreated?: boolean;
    syntheticDispatchEligible?: boolean;
  } = {},
): HubWorkflowIntentDecision {
  return HubWorkflowIntentDecisionSchema.parse({
    decision: code,
    logicalWorkflowCreated: options.logicalWorkflowCreated ?? false,
    syntheticDispatchEligible: options.syntheticDispatchEligible ?? false,
    liveNetworkAllowed: false,
    assumedSuccess: false,
    reservation,
  });
}

function activationAllows(
  at: string,
  activation: { effectiveAt?: string | null; expiresAt?: string | null },
) {
  const evaluated = Date.parse(at);
  if (activation.effectiveAt && Date.parse(activation.effectiveAt) > evaluated)
    return false;
  if (activation.expiresAt && Date.parse(activation.expiresAt) <= evaluated)
    return false;
  return true;
}

function governedReferencesAllow(
  request: HubWorkflowIntentRequest,
  context: HubAccessContext,
  evaluatedAt: string,
) {
  const contracts = SYNTHETIC_PARTNERFI_SERVICE_CONTRACTS as unknown as Record<
    string,
    PartnerCapabilityContract
  >;
  const catalogs = SYNTHETIC_PARTNERFI_SERVICE_CATALOGS as unknown as Record<
    string,
    PartnerServiceCatalog
  >;
  const contract = contracts[request.partnerOrgId];
  const catalog = catalogs[request.partnerOrgId];
  if (!contract || !catalog) return false;
  if (
    contract.environment !== "synthetic" ||
    contract.lifecycleState !== "ACTIVE_SYNTHETIC" ||
    catalog.environment !== "synthetic" ||
    catalog.lifecycleState !== "PUBLISHED_SYNTHETIC"
  )
    return false;

  const role = PartnerContractRoleSchema.safeParse(context.role);
  if (!role.success) return false;
  const service = catalog.services.find(
    (entry) => entry.serviceId === request.serviceId,
  );
  if (!service) return false;
  if (!service.requiredCapabilities.includes(request.capabilityId)) return false;
  if (!service.roles.includes(role.data)) return false;
  if (!service.regions.includes(context.regionId)) return false;
  if (
    service.agentGroups.length > 0 &&
    !service.agentGroups.some((group) => context.agentGroupIds.includes(group))
  )
    return false;
  if (!service.routePolicy.routeIds.includes(request.routeId)) return false;
  if (!activationAllows(evaluatedAt, service.activation)) return false;

  const route = SYNTHETIC_REFERENCE_ROUTES[
    request.routeId as keyof typeof SYNTHETIC_REFERENCE_ROUTES
  ] as PartnerResolvedRoute | undefined;
  if (!route) return false;
  if (
    route.environment !== "synthetic" ||
    route.adapterId !== request.adapterId ||
    !route.supportedCapabilityIds.includes(request.capabilityId)
  )
    return false;

  const grant = contract.capabilityGrants.find(
    (entry) =>
      entry.capabilityId === request.capabilityId &&
      entry.serviceIds.includes(request.serviceId) &&
      entry.state === "SIMULATION_ONLY" &&
      entry.roles.includes(role.data) &&
      entry.regions.includes(context.regionId) &&
      entry.allowedRouteIds.includes(request.routeId) &&
      (entry.agentGroups.length === 0 ||
        entry.agentGroups.some((group) => context.agentGroupIds.includes(group))) &&
      activationAllows(evaluatedAt, entry.activation),
  );
  if (!grant) return false;
  if (
    request.facts.currency !== null &&
    grant.constraints.currencies.length > 0 &&
    !grant.constraints.currencies.includes(request.facts.currency)
  )
    return false;
  if (
    request.facts.amountMinor !== null &&
    grant.constraints.maxAmountMinor !== null &&
    request.facts.amountMinor > grant.constraints.maxAmountMinor
  )
    return false;
  return true;
}

function authorizeRequest(
  request: HubWorkflowIntentRequest,
  contextInput: HubAccessContext,
  evaluatedAt: string = request.capturedAt,
) {
  const context = HubAccessContextSchema.parse(contextInput);
  if (
    context.tenantId !== request.tenantId ||
    context.activePartnerOrgId !== request.partnerOrgId ||
    !governedReferencesAllow(request, context, evaluatedAt)
  )
    return null;
  const access = authorizeSyntheticHubAccess({
    hubId: request.hubId,
    purpose: request.purpose,
    context,
  });
  if (!access || access.partnerMembership.partnerOrgId !== request.partnerOrgId)
    return null;
  return access;
}

function cloneReservation(reservation: HubWorkflowIntentReservation) {
  return HubWorkflowIntentReservationSchema.parse(structuredClone(reservation));
}

export class HubWorkflowIntentCertificationStore {
  private reservations = new Map<string, HubWorkflowIntentReservation>();

  constructor(snapshot?: HubWorkflowIntentCertificationSnapshot) {
    if (!snapshot) return;
    const validated = HubWorkflowIntentCertificationSnapshotSchema.parse(snapshot);
    for (const reservation of validated.reservations)
      this.reservations.set(reservationScopeKey(reservation), cloneReservation(reservation));
  }

  reserve(
    requestInput: HubWorkflowIntentRequest,
    contextInput: HubAccessContext,
  ): HubWorkflowIntentDecision {
    const request = HubWorkflowIntentRequestSchema.parse(requestInput);
    const access = authorizeRequest(request, contextInput);
    if (!access) throw new Error("HUB_WORKFLOW_INTENT_AUTHORIZATION_DENIED");

    const scope = requestScopeKey(request);
    const businessIntentDigest = computeHubWorkflowBusinessIntentDigest(request);
    const existing = this.reservations.get(scope);
    if (existing) {
      if (existing.businessIntentDigest !== businessIntentDigest)
        return decision("CONFLICT_REVIEW_REQUIRED", cloneReservation(existing));
      if (existing.state === "RECONCILIATION_REQUIRED")
        return decision("RECONCILIATION_REQUIRED", cloneReservation(existing));
      if (
        existing.originalRouteId !== request.routeId ||
        existing.originalAdapterId !== request.adapterId
      ) {
        return decision(
          existing.state === "POSSIBLE_EXTERNAL_MUTATION"
            ? "ROUTE_FALLBACK_REJECTED"
            : "ROUTE_CHANGE_REVIEW_REQUIRED",
          cloneReservation(existing),
        );
      }
      return decision("DUPLICATE_NOOP", cloneReservation(existing));
    }

    const reservation = HubWorkflowIntentReservationSchema.parse({
      schemaVersion: HubWorkflowIntentCertificationSchemaVersion,
      reservationId: reservationIdFor(request, businessIntentDigest),
      createdAt: request.capturedAt,
      expiresAt: request.expiresAt,
      lastUpdatedAt: request.capturedAt,
      correlationId: request.correlationId,
      runId: request.runId,
      idempotencyKey: request.idempotencyKey,
      tenantId: request.tenantId,
      hubId: request.hubId,
      partnerOrgId: request.partnerOrgId,
      serviceId: request.serviceId,
      capabilityId: request.capabilityId,
      originalRouteId: request.routeId,
      originalAdapterId: request.adapterId,
      pinnedRouteId: request.routeId,
      pinnedAdapterId: request.adapterId,
      operatorAssignmentId: access.operatorAssignment.operatorAssignmentId,
      businessIntentDigest,
      facts: request.facts,
      state: "RESERVED_SYNTHETIC",
      possibleMutationMarkedAt: null,
      ambiguityRecordedAt: null,
      liveNetworkAllowed: false,
      settlementAuthorityGranted: false,
    });
    this.reservations.set(scope, reservation);
    return decision("RESERVED_NEW", cloneReservation(reservation), {
      logicalWorkflowCreated: true,
    });
  }

  certifyReplay(input: {
    request: HubWorkflowIntentRequest;
    context: HubAccessContext;
    evaluatedAt: string;
    proposedRouteId?: string;
    proposedAdapterId?: string;
  }): HubWorkflowIntentDecision {
    const request = HubWorkflowIntentRequestSchema.parse(input.request);
    const evaluatedAt = z.string().datetime({ offset: true }).parse(input.evaluatedAt);
    const access = authorizeRequest(request, input.context, evaluatedAt);
    if (!access) return decision("REPLAY_AUTHORIZATION_DENIED", null);

    const existing = this.reservations.get(requestScopeKey(request));
    if (!existing) return decision("NO_RESERVATION", null);

    const reservation = cloneReservation(existing);
    if (reservation.businessIntentDigest !== computeHubWorkflowBusinessIntentDigest(request))
      return decision("CONFLICT_REVIEW_REQUIRED", reservation);
    if (Date.parse(evaluatedAt) > Date.parse(reservation.expiresAt))
      return decision("STALE_INTENT_REJECTED", reservation);
    if (reservation.state === "RECONCILIATION_REQUIRED")
      return decision("RECONCILIATION_REQUIRED", reservation);

    if (access.operatorAssignment.operatorAssignmentId !== reservation.operatorAssignmentId)
      return decision("ASSIGNMENT_CHANGED_REVIEW_REQUIRED", reservation);

    const proposedRouteId = PartnerRouteIdSchema.parse(
      input.proposedRouteId ?? request.routeId,
    );
    const proposedAdapterId = PartnerAdapterIdSchema.parse(
      input.proposedAdapterId ?? request.adapterId,
    );
    if (
      proposedRouteId !== reservation.pinnedRouteId ||
      proposedAdapterId !== reservation.pinnedAdapterId
    ) {
      return decision(
        reservation.state === "POSSIBLE_EXTERNAL_MUTATION"
          ? "ROUTE_FALLBACK_REJECTED"
          : "ROUTE_CHANGE_REVIEW_REQUIRED",
        reservation,
      );
    }

    return decision("SYNTHETIC_DISPATCH_ELIGIBLE", reservation, {
      syntheticDispatchEligible: true,
    });
  }

  markPossibleExternalMutation(input: {
    request: HubWorkflowIntentRequest;
    context: HubAccessContext;
    markedAt: string;
  }) {
    const request = HubWorkflowIntentRequestSchema.parse(input.request);
    const markedAt = z.string().datetime({ offset: true }).parse(input.markedAt);
    const gate = this.certifyReplay({
      request,
      context: input.context,
      evaluatedAt: markedAt,
    });
    if (gate.decision !== "SYNTHETIC_DISPATCH_ELIGIBLE")
      throw new Error(`HUB_WORKFLOW_DISPATCH_GATE_CLOSED:${gate.decision}`);

    const scope = requestScopeKey(request);
    const existing = this.reservations.get(scope);
    if (!existing) throw new Error("HUB_WORKFLOW_INTENT_RESERVATION_NOT_FOUND");
    if (existing.businessIntentDigest !== computeHubWorkflowBusinessIntentDigest(request))
      throw new Error("HUB_WORKFLOW_INTENT_CONFLICT");
    if (
      existing.originalRouteId !== request.routeId ||
      existing.originalAdapterId !== request.adapterId
    )
      throw new Error("HUB_WORKFLOW_ROUTE_PIN_MISMATCH");
    if (Date.parse(markedAt) > Date.parse(existing.expiresAt))
      throw new Error("HUB_WORKFLOW_INTENT_STALE");
    if (existing.state === "RECONCILIATION_REQUIRED")
      throw new Error("HUB_WORKFLOW_RECONCILIATION_REQUIRED");

    const updated = HubWorkflowIntentReservationSchema.parse({
      ...existing,
      state: "POSSIBLE_EXTERNAL_MUTATION",
      possibleMutationMarkedAt: existing.possibleMutationMarkedAt ?? markedAt,
      lastUpdatedAt: markedAt,
    });
    this.reservations.set(scope, updated);
    return cloneReservation(updated);
  }

  recordAmbiguousExternalOutcome(input: {
    request: HubWorkflowIntentRequest;
    recordedAt: string;
  }) {
    const request = HubWorkflowIntentRequestSchema.parse(input.request);
    const recordedAt = z.string().datetime({ offset: true }).parse(input.recordedAt);
    const scope = requestScopeKey(request);
    const existing = this.reservations.get(scope);
    if (!existing) throw new Error("HUB_WORKFLOW_INTENT_RESERVATION_NOT_FOUND");
    if (existing.businessIntentDigest !== computeHubWorkflowBusinessIntentDigest(request))
      throw new Error("HUB_WORKFLOW_INTENT_CONFLICT");
    if (existing.state !== "POSSIBLE_EXTERNAL_MUTATION")
      throw new Error("HUB_WORKFLOW_AMBIGUITY_REQUIRES_POSSIBLE_MUTATION");

    const updated = HubWorkflowIntentReservationSchema.parse({
      ...existing,
      state: "RECONCILIATION_REQUIRED",
      ambiguityRecordedAt: recordedAt,
      lastUpdatedAt: recordedAt,
    });
    this.reservations.set(scope, updated);
    return cloneReservation(updated);
  }

  get(requestInput: HubWorkflowIntentRequest) {
    const request = HubWorkflowIntentRequestSchema.parse(requestInput);
    const reservation = this.reservations.get(requestScopeKey(request));
    return reservation ? cloneReservation(reservation) : undefined;
  }

  snapshot(): HubWorkflowIntentCertificationSnapshot {
    return HubWorkflowIntentCertificationSnapshotSchema.parse({
      version: 1,
      reservations: [...this.reservations.values()]
        .map(cloneReservation)
        .sort((a, b) => a.reservationId.localeCompare(b.reservationId)),
    });
  }
}
