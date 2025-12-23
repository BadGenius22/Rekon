/**
 * Rekon x402 Configuration
 * Copyright (c) 2025 Dewangga Praxindo
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

// Configuration for x402-powered AI signal service
// x402 enables HTTP 402 Payment Required for micropayments

export const X402_CONFIG = {
  // Enable x402 payment system
  enabled: process.env.X402_ENABLED === "true",

  // Payment configuration (0.05 USDC for hackathon demo testing)
  priceUsdc: process.env.X402_PRICE_USDC || "0.05",

  // Recipient wallet address (where payments are sent)
  // This is also used as the serverWalletAddress for thirdweb facilitator
  recipientAddress: process.env.X402_RECIPIENT_ADDRESS || "",

  // Network configuration
  // Options: "polygon" (mainnet), "polygon-amoy" (testnet), "base" (mainnet), "base-sepolia" (testnet)
  network: process.env.X402_NETWORK || "polygon-mainnet",

  // Thirdweb configuration (recommended for MVP)
  // Get your keys from https://thirdweb.com/dashboard
  thirdwebSecretKey: process.env.THIRDWEB_SECRET_KEY || "",
  thirdwebClientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "",

  // Vault access token for server wallet authentication
  // Required when using self-managed vault
  thirdwebVaultAccessToken: process.env.THIRDWEB_VAULT_ACCESS_TOKEN || "",

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
  // Thirdweb secret key is required for server-side facilitator
  if (!X402_CONFIG.thirdwebSecretKey) {
    throw new Error(
      "THIRDWEB_SECRET_KEY is required when X402_ENABLED=true. " +
        "Get your secret key from https://thirdweb.com/dashboard"
    );
  }
}
