import assert from "node:assert/strict";
import test from "node:test";
import { classifyTelebirrPreorderResponse } from "../src/domain/telebirrPreorderResponse";

const expectedMerchantOrderId = "ORDER123456";

test("preorder response may create a bound provider order but never payment or settlement", () => {
  const result = classifyTelebirrPreorderResponse(
    {
      result: "SUCCESS",
      code: "0",
      nonce_str: "SYNTHETICNONCE",
      sign: "unverified-provider-signature",
      sign_type: "SHA256WithRSA",
      biz_content: {
        merch_order_id: expectedMerchantOrderId,
        prepay_id: "SYNTHETICPREPAY123",
      },
    },
    expectedMerchantOrderId,
  );

  assert.deepEqual(result, {
    state: "ORDER_CREATED",
    merchantOrderId: expectedMerchantOrderId,
    prepayId: "SYNTHETICPREPAY123",
    paymentConfirmed: false,
    settlementConfirmed: false,
  });
});

test("explicit Telebirr failure remains provider rejected even if HTTP transport could be successful", () => {
  const result = classifyTelebirrPreorderResponse(
    {
      errorCode: "60200098",
      errorMsg:
        "Product is not subscribed or the contract status is not allowed to do this operation.",
      result: "FAIL",
      code: "60200098",
      biz_content: {
        merch_order_id: null,
        prepay_id: null,
      },
    },
    expectedMerchantOrderId,
  );

  assert.deepEqual(result, {
    state: "PROVIDER_REJECTED",
    providerCode: "60200098",
    paymentConfirmed: false,
    settlementConfirmed: false,
  });
});

test("preorder response must bind to the exact submitted merchant order id", () => {
  const result = classifyTelebirrPreorderResponse(
    {
      result: "SUCCESS",
      biz_content: {
        merch_order_id: "DIFFERENTORDER",
        prepay_id: "SYNTHETICPREPAY123",
      },
    },
    expectedMerchantOrderId,
  );

  assert.deepEqual(result, {
    state: "RESPONSE_BINDING_MISMATCH",
    paymentConfirmed: false,
    settlementConfirmed: false,
  });
});

test("missing prepay or merchant-order binding remains unverified rather than successful", () => {
  assert.deepEqual(
    classifyTelebirrPreorderResponse(
      {
        result: "SUCCESS",
        biz_content: { merch_order_id: expectedMerchantOrderId },
      },
      expectedMerchantOrderId,
    ),
    {
      state: "RESPONSE_UNVERIFIED",
      paymentConfirmed: false,
      settlementConfirmed: false,
    },
  );

  assert.deepEqual(
    classifyTelebirrPreorderResponse(
      {
        result: "SUCCESS",
        biz_content: { prepay_id: "SYNTHETICPREPAY123" },
      },
      expectedMerchantOrderId,
    ),
    {
      state: "RESPONSE_UNVERIFIED",
      paymentConfirmed: false,
      settlementConfirmed: false,
    },
  );
});

test("provider response signature fields are not treated as verified authority until contract is pinned", () => {
  const result = classifyTelebirrPreorderResponse(
    {
      result: "SUCCESS",
      sign: "present-but-not-verified",
      sign_type: "SHA256WithRSA",
      biz_content: {
        merch_order_id: expectedMerchantOrderId,
        prepay_id: "SYNTHETICPREPAY123",
      },
    },
    expectedMerchantOrderId,
  );

  assert.equal(result.state, "ORDER_CREATED");
  assert.equal(result.paymentConfirmed, false);
  assert.equal(result.settlementConfirmed, false);
});

test("unsafe expected merchant identifiers fail closed before classification", () => {
  assert.throws(() =>
    classifyTelebirrPreorderResponse(
      {
        biz_content: {
          merch_order_id: "ORDER123",
          prepay_id: "PREPAY123",
        },
      },
      "ORDER-UNSAFE",
    ),
  );
});
