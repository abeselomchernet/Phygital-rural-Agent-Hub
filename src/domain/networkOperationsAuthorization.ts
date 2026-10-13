import { z } from "zod";

export const NetworkOperationsRoleSchema = z.enum([
  "AGENT",
  "SUPERVISOR",
  "OPERATIONS",
  "PARTNER_ADMIN",
]);
export type NetworkOperationsRole = z.infer<typeof NetworkOperationsRoleSchema>;

export const NetworkOperationsActionSchema = z.enum([
  "READ",
  "RECONCILE_PROVIDER",
]);
export type NetworkOperationsAction = z.infer<typeof NetworkOperationsActionSchema>;

export const NetworkOperationsObjectKindSchema = z.enum([
  "NETWORK_LIQUIDITY",
  "CASH_FLEET_PLAN",
  "FMCG_INVENTORY_PLAN",
  "PARTNER_ECOSYSTEM",
  "PROVIDER_RECONCILIATION",
]);
export type NetworkOperationsObjectKind = z.infer<
  typeof NetworkOperationsObjectKindSchema
>;

export const NetworkOperationsObjectIdSchema = z
  .string()
  .regex(/^synthetic-netobj-[a-z0-9-]+$/);
export type NetworkOperationsObjectId = z.infer<
  typeof NetworkOperationsObjectIdSchema
>;

export const NetworkOperationsObjectSchema = z
  .object({
    objectId: NetworkOperationsObjectIdSchema,
    kind: NetworkOperationsObjectKindSchema,
    label: z.string().min(1).max(120),
    scope: z.enum([
      "SYNTHETIC_NETWORK",
      "SYNTHETIC_EAST",
      "SYNTHETIC_CENTRAL",
      "SYNTHETIC_SOUTH",
    ]),
    mutable: z.literal(false),
    authorityBoundary: z.string().min(1).max(280),
  })
  .strict();
export type NetworkOperationsObject = z.infer<
  typeof NetworkOperationsObjectSchema
>;

export const networkOperationsObjects: readonly NetworkOperationsObject[] = [
  {
    objectId: "synthetic-netobj-liquidity-network",
    kind: "NETWORK_LIQUIDITY",
    label: "Network Liquidity Coverage / LCI planning",
    scope: "SYNTHETIC_NETWORK",
    mutable: false,
    authorityBoundary:
      "Read-only synthetic decision support; not prudential LCR and no PartnerFI posting authority.",
  },
  {
    objectId: "synthetic-netobj-cash-fleet-east",
    kind: "CASH_FLEET_PLAN",
    label: "Cash Fleet planning · East",
    scope: "SYNTHETIC_EAST",
    mutable: false,
    authorityBoundary:
      "Planning-only object; no cash custody, movement, dispatch or handover authority.",
  },
  {
    objectId: "synthetic-netobj-cash-fleet-central",
    kind: "CASH_FLEET_PLAN",
    label: "Cash Fleet planning · Central",
    scope: "SYNTHETIC_CENTRAL",
    mutable: false,
    authorityBoundary:
      "Planning-only object; no cash custody, movement, dispatch or handover authority.",
  },
  {
    objectId: "synthetic-netobj-fmcg-south",
    kind: "FMCG_INVENTORY_PLAN",
    label: "FMCG inventory / restock planning · South",
    scope: "SYNTHETIC_SOUTH",
    mutable: false,
    authorityBoundary:
      "Read-only inventory/restock planning; no purchase order, dispatch, delivery confirmation or settlement authority.",
  },
  {
    objectId: "synthetic-netobj-partner-ecosystem",
    kind: "PARTNER_ECOSYSTEM",
    label: "Partner ecosystem capability/evidence view",
    scope: "SYNTHETIC_NETWORK",
    mutable: false,
    authorityBoundary:
      "Read-only capability and provenance evidence; code presence does not authorize a partner capability.",
  },
  {
    objectId: "synthetic-netobj-provider-reconciliation",
    kind: "PROVIDER_RECONCILIATION",
    label: "Bounded provider reconciliation",
    scope: "SYNTHETIC_NETWORK",
    mutable: false,
    authorityBoundary:
      "Read/reconcile bounded gateway evidence only; provider success is not PartnerFI settlement.",
  },
].map((entry) => NetworkOperationsObjectSchema.parse(entry));

const allObjectIds = networkOperationsObjects.map((entry) => entry.objectId);
const operationsObjectIds = networkOperationsObjects
  .filter(
    (entry) =>
      entry.kind === "PARTNER_ECOSYSTEM" || entry.kind === "PROVIDER_RECONCILIATION",
  )
  .map((entry) => entry.objectId);

export function defaultNetworkObjectIdsForRole(
  role: NetworkOperationsRole,
): readonly NetworkOperationsObjectId[] {
  const parsedRole = NetworkOperationsRoleSchema.parse(role);
  if (parsedRole === "AGENT") return [];
  if (parsedRole === "OPERATIONS") return [...operationsObjectIds];
  return [...allObjectIds];
}

export function isNetworkOperationsActionAuthorized(
  role: NetworkOperationsRole,
  objectId: NetworkOperationsObjectId,
  action: NetworkOperationsAction,
) {
  const parsedRole = NetworkOperationsRoleSchema.parse(role);
  const parsedObjectId = NetworkOperationsObjectIdSchema.parse(objectId);
  const parsedAction = NetworkOperationsActionSchema.parse(action);
  const object = networkOperationsObjects.find(
    (entry) => entry.objectId === parsedObjectId,
  );
  if (!object) return false;
  if (parsedRole === "AGENT") return false;
  if (parsedRole === "OPERATIONS") {
    if (object.kind === "PROVIDER_RECONCILIATION") return true;
    return parsedAction === "READ" && object.kind === "PARTNER_ECOSYSTEM";
  }
  if (parsedAction === "READ") return true;
  return object.kind === "PROVIDER_RECONCILIATION";
}

export function networkOperationsAccessSummary(role: NetworkOperationsRole) {
  const parsedRole = NetworkOperationsRoleSchema.parse(role);
  return networkOperationsObjects.map((object) => ({
    objectId: object.objectId,
    label: object.label,
    scope: object.scope,
    kind: object.kind,
    canRead: isNetworkOperationsActionAuthorized(
      parsedRole,
      object.objectId,
      "READ",
    ),
    canReconcileProvider: isNetworkOperationsActionAuthorized(
      parsedRole,
      object.objectId,
      "RECONCILE_PROVIDER",
    ),
    mutable: false as const,
    authorityBoundary: object.authorityBoundary,
  }));
}
