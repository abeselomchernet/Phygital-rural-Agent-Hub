import {
  generateMpesaEthiopiaSandboxToken,
  MPESA_ETHIOPIA_SANDBOX_BASE_URL,
} from "../src/domain/mpesaEthiopiaToken";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name}_REQUIRED`);
  return value;
}

if (process.env.MPESA_ETHIOPIA_SANDBOX_NETWORK_ENABLED !== "true")
  throw new Error("MPESA_ETHIOPIA_SANDBOX_NETWORK_DISABLED");

const result = await generateMpesaEthiopiaSandboxToken({
  mode: "sandbox",
  networkEnabled: true,
  baseUrl: MPESA_ETHIOPIA_SANDBOX_BASE_URL,
  consumerKey: required("MPESA_ETHIOPIA_CONSUMER_KEY"),
  consumerSecret: required("MPESA_ETHIOPIA_CONSUMER_SECRET"),
  timeoutMs: 15_000,
});

// Deliberately do not print the access token or any credential material.
console.log(JSON.stringify({
  ok: true,
  provider: "MPESA_ETHIOPIA_DIRECT",
  environment: "sandbox",
  tokenType: result.token_type,
  expiresIn: result.expires_in,
}));
