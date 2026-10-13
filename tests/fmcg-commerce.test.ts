import assert from "node:assert/strict";
import test from "node:test";
import {
  FmcgInventoryItemSchema,
  FmcgPartnerProfileSchema,
  FmcgPlanningRouteSchema,
  SYNTHETIC_FMCG_POLICY,
  buildSyntheticFmcgInventoryLogisticsPlan,
  syntheticFmcgInventoryFixtures,
  syntheticFmcgPartnerProfile,
  syntheticFmcgPlanningRoutes,
} from "../src/domain/fmcgCommerce";

test("synthetic FMCG policy keeps live commercial and financial authority disabled", () => {
  assert.equal(SYNTHETIC_FMCG_POLICY.mode, "INVENTORY_LOGISTICS_SIMULATION_ONLY");
  assert.equal(SYNTHETIC_FMCG_POLICY.liveOrderingAuthorized, false);
  assert.equal(SYNTHETIC_FMCG_POLICY.dispatchAuthorized, false);
  assert.equal(SYNTHETIC_FMCG_POLICY.deliveryConfirmationAuthorized, false);
  assert.equal(SYNTHETIC_FMCG_POLICY.commercialSettlementAuthorized, false);
  assert.equal(SYNTHETIC_FMCG_POLICY.partnerFiPostingAuthorized, false);
  assert.equal(SYNTHETIC_FMCG_POLICY.customerKycAccessAuthorized, false);
  assert.equal(SYNTHETIC_FMCG_POLICY.customerBankBalanceAccessAuthorized, false);
});

test("FMCG partner data scope is synthetic and purpose-limited", () => {
  assert.equal(FmcgPartnerProfileSchema.safeParse(syntheticFmcgPartnerProfile).success, true);
  assert.deepEqual(syntheticFmcgPartnerProfile.permittedDataClasses, [
    "SYNTHETIC_INVENTORY_AGGREGATE",
    "SYNTHETIC_ROUTE_REFERENCE",
    "SYNTHETIC_RESTOCK_DRAFT_REFERENCE",
  ]);
  assert.equal(syntheticFmcgPartnerProfile.customerKycAccessAuthorized, false);
  assert.equal(syntheticFmcgPartnerProfile.customerBankBalanceAccessAuthorized, false);
});

test("inventory and planning-route fixtures are strict synthetic records", () => {
  assert.equal(syntheticFmcgInventoryFixtures.length, 4);
  assert.equal(syntheticFmcgPlanningRoutes.length, 3);

  for (const item of syntheticFmcgInventoryFixtures) {
    assert.equal(FmcgInventoryItemSchema.safeParse(item).success, true);
    assert.match(item.skuId, /^synthetic-sku-/);
    assert.equal(item.source, "SYNTHETIC_FIXED_FIXTURE");
  }

  for (const route of syntheticFmcgPlanningRoutes) {
    assert.equal(FmcgPlanningRouteSchema.safeParse(route).success, true);
    assert.equal(route.routeState, "PLANNING_ONLY");
    assert.equal(route.dispatchAuthorized, false);
    assert.equal(route.deliveryConfirmationAuthorized, false);
    assert.equal(route.commercialSettlementAuthorized, false);
  }
});

test("restock planning is deterministic and creates no live workflow state", () => {
  const plan = buildSyntheticFmcgInventoryLogisticsPlan();

  assert.equal(plan.inventoryItems, 4);
  assert.equal(plan.lowStockItems, 3);
  assert.equal(plan.requestedUnits, 51);
  assert.equal(plan.plannedUnits, 42);
  assert.equal(plan.unmatchedUnits, 9);
  assert.equal(plan.drafts.length, 3);
  assert.equal(plan.liveOrderingAuthorized, false);
  assert.equal(plan.dispatchAuthorized, false);
  assert.equal(plan.partnerFiPostingAuthorized, false);
  assert.equal(plan.commercialSettlementAuthorized, false);

  for (const draft of plan.drafts) {
    assert.equal(draft.orderSubmitted, false);
    assert.equal(draft.dispatchCreated, false);
    assert.equal(draft.deliveryConfirmed, false);
    assert.equal(draft.settlementRecorded, false);
  }
});

test("route planning never over-allocates synthetic route capacity", () => {
  const plan = buildSyntheticFmcgInventoryLogisticsPlan();
  const allocated = new Map<string, number>();

  for (const draft of plan.drafts) {
    if (!draft.routeId) continue;
    allocated.set(draft.routeId, (allocated.get(draft.routeId) ?? 0) + draft.plannedUnits);
  }

  for (const route of syntheticFmcgPlanningRoutes) {
    assert.ok((allocated.get(route.routeId) ?? 0) <= route.planningCapacityUnits);
  }
});

test("schemas fail closed if forbidden FMCG authority or data access is asserted", () => {
  assert.throws(() =>
    FmcgPartnerProfileSchema.parse({
      ...syntheticFmcgPartnerProfile,
      customerKycAccessAuthorized: true,
    }),
  );

  assert.throws(() =>
    FmcgPlanningRouteSchema.parse({
      ...syntheticFmcgPlanningRoutes[0],
      dispatchAuthorized: true,
    }),
  );
});
