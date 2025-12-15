// ============================================================================
// x402 Payment Protocol Configuration
// ============================================================================
// Configuration for x402-powered AI signal service
// x402 enables HTTP 402 Payment Required for micropayments

export const X402_CONFIG = {
  // Enable x402 payment system
  enabled: process.env.X402_ENABLED === "true",

  // Payment configuration
  priceUsdc: process.env.X402_PRICE_USDC || "0.25",

  // Recipient wallet address (where payments are sent)
  recipientAddress: process.env.X402_RECIPIENT_ADDRESS || "",

  // Network configuration
  // Options: "polygon-amoy" (testnet), "polygon" (mainnet), "base" (mainnet), "base-sepolia" (testnet)
  network: process.env.X402_NETWORK || "polygon-amoy",

  // x402 facilitator URL for payment verification
  // Coinbase CDP facilitator handles verification and settlement
  facilitatorUrl: process.env.X402_FACILITATOR_URL || "https://x402.org/facilitator",

  // LLM configuration for signal explanations
  llmProvider: (process.env.LLM_PROVIDER || "openai") as "openai" | "anthropic",
  llmApiKey: process.env.LLM_API_KEY || "",
  llmModel: process.env.LLM_MODEL || "gpt-4o-mini", // Cost-effective model
} as const;

// Fail-fast validation on module import
// This ensures required variables are set before the app boots
if (X402_CONFIG.enabled) {
  if (!X402_CONFIG.recipientAddress) {
    throw new Error(
      "X402_RECIPIENT_ADDRESS is required when X402_ENABLED=true. " +
      "Set this to your wallet address where x402 payments will be received."
    );
  }
  if (!X402_CONFIG.llmApiKey) {
    throw new Error(
      "LLM_API_KEY is required when X402_ENABLED=true. " +
      "Set this to your OpenAI or Anthropic API key for signal explanations."
    );
  }
}
