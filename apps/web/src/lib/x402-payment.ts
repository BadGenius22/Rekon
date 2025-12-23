/**
 * x402 Payment Utility - Manual Implementation
 *
 * Implements the x402 payment protocol manually using wagmi wallet.
 * This bypasses thirdweb's UI entirely and uses the already-connected
 * wallet from RainbowKit/wagmi.
 *
 * x402 Protocol Flow:
 * 1. Make request to protected endpoint
 * 2. Server returns 402 with payment requirements in header
 * 3. Client signs the payment using their wallet (EIP-712)
 * 4. Client retries request with X-PAYMENT header
 * 5. Server validates payment and returns content
 */

import type { WalletClient } from "viem";

/**
 * x402 Payment Requirements from server
 */
export interface X402PaymentRequirements {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  outputSchema: null;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra: {
    name: string;
    version: string;
    primaryType?: string;
  };
}

/**
 * EIP-712 typed data for x402 payment
 */
const X402_PAYMENT_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
} as const;

/**
 * Generate a random nonce for payment
 */
function generateNonce(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}` as `0x${string}`;
}

/**
 * Make a request with x402 payment using the wagmi wallet
 *
 * This function handles the entire x402 payment flow:
 * 1. Makes initial request
 * 2. If 402 is returned, parses payment requirements
 * 3. Signs the payment with the user's wallet (prompts in wallet extension only)
 * 4. Retries request with payment header
 *
 * @param url - The URL to fetch
 * @param walletClient - The wagmi wallet client for signing
 * @returns The response data
 */
export async function fetchWithX402Payment<T>(
  url: string,
  walletClient: WalletClient
): Promise<T> {
  // Step 1: Make initial request
  const initialResponse = await fetch(url);

  // If not 402, return response directly
  if (initialResponse.status !== 402) {
    if (!initialResponse.ok) {
      throw new Error(
        `Request failed: ${initialResponse.status} ${initialResponse.statusText}`
      );
    }
    return initialResponse.json();
  }

  // Step 2: Parse payment requirements from header or body
  // Read response body first (CORS might block headers)
  const bodyText = await initialResponse.text();

  let requirements: X402PaymentRequirements | null = null;
  let paymentRequiredHeader: string | null = null;

  // Try to get from headers first (if CORS allows)
  paymentRequiredHeader =
    initialResponse.headers.get("X-Payment-Required") ||
    initialResponse.headers.get("x-payment-required") ||
    initialResponse.headers.get("X-PAYMENT-REQUIRED");

  if (paymentRequiredHeader) {
    try {
      // Header is base64 encoded JSON
      const decoded = atob(paymentRequiredHeader);
      requirements = JSON.parse(decoded) as X402PaymentRequirements;
    } catch (e) {
      paymentRequiredHeader = null; // Try body instead
    }
  }

  // If not in headers or parsing failed, try response body
  if (!requirements && bodyText) {
    try {
      const bodyJson = JSON.parse(bodyText);

      // Thirdweb's settlePayment returns payment requirements in "accepts" array
      if (
        bodyJson.accepts &&
        Array.isArray(bodyJson.accepts) &&
        bodyJson.accepts.length > 0
      ) {
        const accept = bodyJson.accepts[0];

        // Map thirdweb's format to our X402PaymentRequirements format
        requirements = {
          scheme: accept.scheme || "exact",
          network: accept.network || "", // e.g., "eip155:137"
          maxAmountRequired: accept.maxAmountRequired || "0",
          resource: accept.resource || "",
          description: accept.description || "",
          mimeType: accept.mimeType || "application/json",
          outputSchema: accept.outputSchema || null,
          payTo: accept.payTo || "",
          maxTimeoutSeconds: accept.maxTimeoutSeconds || 3600,
          asset: accept.asset || "",
          extra: accept.extra || {
            name: "USD Coin",
            version: "2",
          },
        };
      } else if (bodyJson.paymentRequirements) {
        requirements = bodyJson.paymentRequirements as X402PaymentRequirements;
      } else if (bodyJson.requirements) {
        requirements = bodyJson.requirements as X402PaymentRequirements;
      } else if (bodyJson.paymentRequired) {
        // If it's a string, it might be base64 encoded
        if (typeof bodyJson.paymentRequired === "string") {
          try {
            const decoded = atob(bodyJson.paymentRequired);
            requirements = JSON.parse(decoded) as X402PaymentRequirements;
          } catch (e) {
            // Not base64, try as direct JSON
            requirements = bodyJson.paymentRequired as X402PaymentRequirements;
          }
        } else {
          requirements = bodyJson.paymentRequired as X402PaymentRequirements;
        }
      }
    } catch (e) {
      // Failed to parse body, will throw below if no requirements
    }
  }

  if (!requirements) {
    throw new Error("402 response missing payment requirements");
  }

  // Step 3: Prepare and sign the payment
  const account = walletClient.account;
  if (!account) {
    throw new Error("Wallet has no account");
  }

  const now = Math.floor(Date.now() / 1000);
  const validAfter = BigInt(now - 60); // Valid from 1 minute ago
  const validBefore = BigInt(now + requirements.maxTimeoutSeconds);
  const nonce = generateNonce();
  const value = BigInt(requirements.maxAmountRequired);

  // Get chain ID from wallet client
  const chainId = walletClient.chain?.id;
  if (!chainId) {
    throw new Error("Wallet has no chain");
  }

  // Sign the EIP-712 typed data
  // This will prompt the user in their wallet extension (MetaMask, etc.)
  const primaryType =
    requirements.extra?.primaryType || "TransferWithAuthorization";
  const domainName = requirements.extra?.name || "USD Coin";
  const domainVersion = requirements.extra?.version || "2";

  const signature = await walletClient.signTypedData({
    account,
    domain: {
      name: domainName,
      version: domainVersion,
      chainId: chainId,
      verifyingContract: requirements.asset as `0x${string}`,
    },
    types: X402_PAYMENT_TYPES,
    primaryType: primaryType as "TransferWithAuthorization",
    message: {
      from: account.address,
      to: requirements.payTo as `0x${string}`,
      value: value,
      validAfter: validAfter,
      validBefore: validBefore,
      nonce: nonce,
    },
  });

  // Step 4: Create payment header
  const paymentPayload = {
    x402Version: 1,
    scheme: requirements.scheme,
    network: requirements.network,
    payload: {
      signature,
      authorization: {
        from: account.address.toLowerCase(),
        to: requirements.payTo.toLowerCase(),
        value: requirements.maxAmountRequired,
        validAfter: validAfter.toString(),
        validBefore: validBefore.toString(),
        nonce: nonce,
      },
    },
  };

  const paymentHeader = btoa(JSON.stringify(paymentPayload));

  // Step 5: Retry request with payment header
  const paidResponse = await fetch(url, {
    headers: {
      "X-Payment": paymentHeader,
    },
  });

  if (!paidResponse.ok) {
    const errorText = await paidResponse.text();

    // Parse error to provide better message
    let errorMessage = `Payment request failed: ${paidResponse.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      const errMsg = (errorJson.errorMessage || errorJson.error || "").toLowerCase();

      // Check for specific error conditions
      if (
        errMsg.includes("insufficient") ||
        errMsg.includes("balance") ||
        errMsg.includes("not enough") ||
        errMsg.includes("exceeds balance") ||
        errMsg.includes("transfer amount exceeds")
      ) {
        errorMessage = "Insufficient USDC balance. Please add funds to your wallet.";
      } else if (
        errMsg.includes("no facilitator wallet address") ||
        errMsg.includes("facilitator wallet")
      ) {
        errorMessage =
          "Payment system configuration error: The server's payment facilitator wallet is not configured. Please contact support.";
      } else if (
        errMsg.includes("invalid signature") ||
        errMsg.includes("signature verification")
      ) {
        errorMessage = "Payment signature verification failed. Please try again.";
      } else if (
        errMsg.includes("expired") ||
        errMsg.includes("timeout")
      ) {
        errorMessage = "Payment request expired. Please try again.";
      } else if (
        errMsg.includes("reverted") ||
        errMsg.includes("execution reverted")
      ) {
        errorMessage = "Transaction failed on-chain. Please ensure you have enough USDC and try again.";
      } else if (errorJson.errorMessage) {
        errorMessage = `Payment failed: ${errorJson.errorMessage}`;
      } else if (errorJson.error) {
        errorMessage = `Payment failed: ${errorJson.error}`;
      }
    } catch (e) {
      // Not JSON, use raw error text
      errorMessage = `Payment request failed: ${
        paidResponse.status
      } - ${errorText.substring(0, 200)}`;
    }

    throw new Error(errorMessage);
  }

  return paidResponse.json();
}
