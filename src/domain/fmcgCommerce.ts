import { z } from "zod";

export const SYNTHETIC_FMCG_POLICY = {
  mode: "INVENTORY_LOGISTICS_SIMULATION_ONLY",
  dataMode: "SYNTHETIC_MINIMIZED",
  liveOrderingAuthorized: false,
  dispatchAuthorized: false,
  deliveryConfirmationAuthorized: false,
  commercialSettlementAuthorized: false,
  partnerFiPostingAuthorized: false,
  customerKycAccessAuthorized: false,
  customerBankBalanceAccessAuthorized: false,
} as const;

const UnitsSchema = z.number().int().nonnegative().max(100_000);
const PositiveUnitsSchema = z.number().int().positive().max(100_000);

export const FmcgPartnerProfileSchema = z
  .object({
    partnerOrgId: z.literal("synthetic-fmcg"),
    displayName: z.string().min(1).max(120),
    environment: z.literal("synthetic"),
    permittedDataClasses: z
      .array(
        z.enum([
          "SYNTHETIC_INVENTORY_AGGREGATE",
          "SYNTHETIC_ROUTE_REFERENCE",
          "SYNTHETIC_RESTOCK_DRAFT_REFERENCE",
        ]),
      )
      .min(1)
      .max(3),
    customerKycAccessAuthorized: z.literal(false),
    customerBankBalanceAccessAuthorized: z.literal(false),
    liveOrderingAuthorized: z.literal(false),
    dispatchAuthorized: z.literal(false),
    commercialSettlementAuthorized: z.literal(false),
  })
  .strict();
export type FmcgPartnerProfile = z.infer<typeof FmcgPartnerProfileSchema>;

export const FmcgInventoryItemSchema = z
  .object({
    skuId: z.string().regex(/^synthetic-sku-[a-z0-9-]+$/),
    displayName: z.string().min(1).max(100),
    category: z.enum(["AGRI_INPUT", "SOLAR_DEVICE", "AGENT_CONSUMABLE"]),
    unitLabel: z.string().min(1).max(40),
    planningArea: z.string().min(1).max(80),
    stockOnHandUnits: UnitsSchema,
    reorderPointUnits: UnitsSchema,
    targetStockUnits: PositiveUnitsSchema,
    source: z.literal("SYNTHETIC_FIXED_FIXTURE"),
  })
  .strict();
export type FmcgInventoryItem = z.infer<typeof FmcgInventoryItemSchema>;

export const FmcgPlanningRouteSchema = z
  .object({
    routeId: z.string().regex(/^synthetic-fmcg-route-[a-z0-9-]+$/),
    partnerOrgId: z.literal("synthetic-fmcg"),
    displayName: z.string().min(1).max(120),
    eligiblePlanningAreas: z.array(z.string().min(1).max(80)).min(1).max(12),
    etaMinutes: z.number().int().positive().max(480),
    planningCapacityUnits: PositiveUnitsSchema,
    routeState: z.literal("PLANNING_ONLY"),
    dispatchAuthorized: z.literal(false),
    deliveryConfirmationAuthorized: z.literal(false),
    commercialSettlementAuthorized: z.literal(false),
  })
  .strict();
export type FmcgPlanningRoute = z.infer<typeof FmcgPlanningRouteSchema>;

export const FmcgRestockDraftSchema = z
  .object({
    draftId: z.string().regex(/^synthetic-restock-[a-z0-9-]+$/),
    skuId: z.string().regex(/^synthetic-sku-[a-z0-9-]+$/),
    displayName: z.string().min(1).max(100),
    planningArea: z.string().min(1).max(80),
    requestedUnits: PositiveUnitsSchema,
    plannedUnits: UnitsSchema,
    unmatchedUnits: UnitsSchema,
    routeId: z.string().regex(/^synthetic-fmcg-route-[a-z0-9-]+$/).nullable(),
    routeDisplayName: z.string().min(1).max(120).nullable(),
    etaMinutes: z.number().int().positive().max(480).nullable(),
    status: z.enum(["PLANNING_MATCH_ONLY", "UNMATCHED_PLANNING_SHORTFALL"]),
    orderSubmitted: z.literal(false),
    dispatchCreated: z.literal(false),
    deliveryConfirmed: z.literal(false),
    settlementRecorded: z.literal(false),
  })
  .strict();
export type FmcgRestockDraft = z.infer<typeof FmcgRestockDraftSchema>;

export const FmcgInventoryLogisticsPlanSchema = z
  .object({
    mode: z.literal("INVENTORY_LOGISTICS_SIMULATION_ONLY"),
    partnerOrgId: z.literal("synthetic-fmcg"),
    inventoryItems: z.number().int().nonnegative(),
    lowStockItems: z.number().int().nonnegative(),
    requestedUnits: UnitsSchema,
    plannedUnits: UnitsSchema,
    unmatchedUnits: UnitsSchema,
    drafts: z.array(FmcgRestockDraftSchema).max(100),
    liveOrderingAuthorized: z.literal(false),
    dispatchAuthorized: z.literal(false),
    partnerFiPostingAuthorized: z.literal(false),
    commercialSettlementAuthorized: z.literal(false),
  })
  .strict();
export type FmcgInventoryLogisticsPlan = z.infer<
  typeof FmcgInventoryLogisticsPlanSchema
>;

export const syntheticFmcgPartnerProfile: FmcgPartnerProfile =
  FmcgPartnerProfileSchema.parse({
    partnerOrgId: "synthetic-fmcg",
    displayName: "Synthetic FMCG / distributor",
    environment: "synthetic",
    permittedDataClasses: [
      "SYNTHETIC_INVENTORY_AGGREGATE",
      "SYNTHETIC_ROUTE_REFERENCE",
      "SYNTHETIC_RESTOCK_DRAFT_REFERENCE",
    ],
    customerKycAccessAuthorized: false,
    customerBankBalanceAccessAuthorized: false,
    liveOrderingAuthorized: false,
    dispatchAuthorized: false,
    commercialSettlementAuthorized: false,
  });

export const syntheticFmcgInventoryFixtures: readonly FmcgInventoryItem[] = [
  {
    skuId: "synthetic-sku-seed-pack",
    displayName: "Seed packs",
    category: "AGRI_INPUT",
    unitLabel: "packs",
    planningArea: "Synthetic East corridor",
    stockOnHandUnits: 18,
    reorderPointUnits: 20,
    targetStockUnits: 40,
    source: "SYNTHETIC_FIXED_FIXTURE",
  },
  {
    skuId: "synthetic-sku-solar-lantern",
    displayName: "Solar lanterns",
    category: "SOLAR_DEVICE",
    unitLabel: "units",
    planningArea: "Synthetic Central corridor",
    stockOnHandUnits: 8,
    reorderPointUnits: 10,
    targetStockUnits: 20,
    source: "SYNTHETIC_FIXED_FIXTURE",
  },
  {
    skuId: "synthetic-sku-receipt-roll",
    displayName: "Receipt rolls",
    category: "AGENT_CONSUMABLE",
    unitLabel: "rolls",
    planningArea: "Synthetic South corridor",
    stockOnHandUnits: 3,
    reorderPointUnits: 8,
    targetStockUnits: 20,
    source: "SYNTHETIC_FIXED_FIXTURE",
  },
  {
    skuId: "synthetic-sku-storage-bag",
    displayName: "Storage bags",
    category: "AGRI_INPUT",
    unitLabel: "bags",
    planningArea: "Synthetic East corridor",
    stockOnHandUnits: 34,
    reorderPointUnits: 20,
    targetStockUnits: 40,
    source: "SYNTHETIC_FIXED_FIXTURE",
  },
].map((item) => FmcgInventoryItemSchema.parse(item));

export const syntheticFmcgPlanningRoutes: readonly FmcgPlanningRoute[] = [
  {
    routeId: "synthetic-fmcg-route-east",
    partnerOrgId: "synthetic-fmcg",
    displayName: "Synthetic FMCG route · East",
    eligiblePlanningAreas: ["Synthetic East corridor"],
    etaMinutes: 30,
    planningCapacityUnits: 40,
    routeState: "PLANNING_ONLY",
    dispatchAuthorized: false,
    deliveryConfirmationAuthorized: false,
    commercialSettlementAuthorized: false,
  },
  {
    routeId: "synthetic-fmcg-route-central",
    partnerOrgId: "synthetic-fmcg",
    displayName: "Synthetic FMCG route · Central",
    eligiblePlanningAreas: ["Synthetic Central corridor", "Synthetic South corridor"],
    etaMinutes: 24,
    planningCapacityUnits: 20,
    routeState: "PLANNING_ONLY",
    dispatchAuthorized: false,
    deliveryConfirmationAuthorized: false,
    commercialSettlementAuthorized: false,
  },
  {
    routeId: "synthetic-fmcg-route-south",
    partnerOrgId: "synthetic-fmcg",
    displayName: "Synthetic FMCG route · South",
    eligiblePlanningAreas: ["Synthetic South corridor"],
    etaMinutes: 36,
    planningCapacityUnits: 16,
    routeState: "PLANNING_ONLY",
    dispatchAuthorized: false,
    deliveryConfirmationAuthorized: false,
    commercialSettlementAuthorized: false,
  },
].map((route) => FmcgPlanningRouteSchema.parse(route));

function stableDraftId(skuId: string) {
  return `synthetic-restock-${skuId.replace("synthetic-sku-", "")}`;
}

export function buildSyntheticFmcgInventoryLogisticsPlan(
  inventory: readonly FmcgInventoryItem[] = syntheticFmcgInventoryFixtures,
  routes: readonly FmcgPlanningRoute[] = syntheticFmcgPlanningRoutes,
): FmcgInventoryLogisticsPlan {
  const parsedInventory = inventory.map((item) => FmcgInventoryItemSchema.parse(item));
  const parsedRoutes = routes.map((route) => FmcgPlanningRouteSchema.parse(route));
  const capacityRemaining = new Map(
    parsedRoutes.map((route) => [route.routeId, route.planningCapacityUnits]),
  );

  const lowStock = parsedInventory.filter(
    (item) => item.stockOnHandUnits <= item.reorderPointUnits,
  );

  const drafts: FmcgRestockDraft[] = [];

  for (const item of lowStock) {
    const requestedUnits = Math.max(item.targetStockUnits - item.stockOnHandUnits, 0);
    if (requestedUnits <= 0) continue;

    const eligibleRoutes = parsedRoutes
      .filter((route) => route.eligiblePlanningAreas.includes(item.planningArea))
      .sort((a, b) => a.etaMinutes - b.etaMinutes || a.routeId.localeCompare(b.routeId));

    const route = eligibleRoutes.find(
      (candidate) => (capacityRemaining.get(candidate.routeId) ?? 0) > 0,
    );

    if (!route) {
      drafts.push(
        FmcgRestockDraftSchema.parse({
          draftId: stableDraftId(item.skuId),
          skuId: item.skuId,
          displayName: item.displayName,
          planningArea: item.planningArea,
          requestedUnits,
          plannedUnits: 0,
          unmatchedUnits: requestedUnits,
          routeId: null,
          routeDisplayName: null,
          etaMinutes: null,
          status: "UNMATCHED_PLANNING_SHORTFALL",
          orderSubmitted: false,
          dispatchCreated: false,
          deliveryConfirmed: false,
          settlementRecorded: false,
        }),
      );
      continue;
    }

    const remainingCapacity = capacityRemaining.get(route.routeId) ?? 0;
    const plannedUnits = Math.min(requestedUnits, remainingCapacity);
    const unmatchedUnits = requestedUnits - plannedUnits;
    capacityRemaining.set(route.routeId, remainingCapacity - plannedUnits);

    drafts.push(
      FmcgRestockDraftSchema.parse({
        draftId: stableDraftId(item.skuId),
        skuId: item.skuId,
        displayName: item.displayName,
        planningArea: item.planningArea,
        requestedUnits,
        plannedUnits,
        unmatchedUnits,
        routeId: route.routeId,
        routeDisplayName: route.displayName,
        etaMinutes: route.etaMinutes,
        status:
          unmatchedUnits > 0
            ? "UNMATCHED_PLANNING_SHORTFALL"
            : "PLANNING_MATCH_ONLY",
        orderSubmitted: false,
        dispatchCreated: false,
        deliveryConfirmed: false,
        settlementRecorded: false,
      }),
    );
  }

  const requestedUnits = drafts.reduce((sum, draft) => sum + draft.requestedUnits, 0);
  const plannedUnits = drafts.reduce((sum, draft) => sum + draft.plannedUnits, 0);

  return FmcgInventoryLogisticsPlanSchema.parse({
    mode: "INVENTORY_LOGISTICS_SIMULATION_ONLY",
    partnerOrgId: "synthetic-fmcg",
    inventoryItems: parsedInventory.length,
    lowStockItems: lowStock.length,
    requestedUnits,
    plannedUnits,
    unmatchedUnits: Math.max(requestedUnits - plannedUnits, 0),
    drafts,
    liveOrderingAuthorized: false,
    dispatchAuthorized: false,
    partnerFiPostingAuthorized: false,
    commercialSettlementAuthorized: false,
  });
}
