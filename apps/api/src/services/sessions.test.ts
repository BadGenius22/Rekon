import { describe, it, expect, vi, type Mock } from "vitest";
import type { UserSession } from "@rekon/types";

// Mock Redis client so we exercise the in-memory code paths
vi.mock("../adapters/redis", () => ({
  getRedisClient: () => null,
}));

// Mock ethers.verifyMessage so we control signature verification
vi.mock("ethers", () => ({
  verifyMessage: vi.fn(),
}));

import {
  createSession,
  createWalletChallenge,
  verifyWalletSignature,
  getSession,
} from "./sessions";
import { verifyMessage } from "ethers";

describe("services/sessions - createSession", () => {
  it("creates a session with sessionId, expiresAt, and default preferences for anonymous sessions", async () => {
    const session = await createSession();

    expect(session.sessionId).toBeDefined();
    expect(session.sessionId).toHaveLength(64); // 32 bytes hex

    expect(session.createdAt).toBeDefined();
    expect(session.lastActiveAt).toBeDefined();
    expect(session.expiresAt).toBeDefined();

    // Default trading preferences should be set when no user attribution
    expect(session.tradingPreferences).toMatchObject({
      defaultTimeInForce: "GTC",
      defaultOrderType: "limit",
    });

    // Session should be retrievable via getSession
    const stored = await getSession(session.sessionId);
    expect(stored).not.toBeNull();
    expect(stored?.sessionId).toBe(session.sessionId);
  });

  it("omits default trading preferences when attribution.userId is present", async () => {
    const session = await createSession({
      attribution: {
        userId: "user-123",
      },
    });

    expect(session.sessionId).toBeDefined();
    expect(session.tradingPreferences).toBeUndefined();
  });
});

describe("services/sessions - wallet challenge and verification", () => {
  const mockedVerifyMessage = verifyMessage as unknown as Mock;

  it("creates a wallet challenge and stores nonce, then verifies a valid signature and links wallet", async () => {
    const session = await createSession();

    const challenge = await createWalletChallenge(session.sessionId);
    expect(challenge).not.toBeNull();
    expect(challenge?.nonce).toContain("rekon_wallet_link_");
    expect(challenge?.message).toContain(`Session: ${session.sessionId}`);

    const walletAddress = "0xABCDEF0000000000000000000000000000000000";
    const signature = "0xsignature";

    // Simulate verifyMessage returning the correct wallet address
    mockedVerifyMessage.mockReturnValueOnce(walletAddress);

    const updated = await verifyWalletSignature(
      session.sessionId,
      walletAddress,
      signature
    );

    expect(updated).not.toBeNull();
    expect(updated?.walletAddress).toBe(walletAddress);
    expect(updated?.signatureType).toBe(0);
  });

  it("fails verification when signature does not match walletAddress", async () => {
    const session = await createSession();

    const challenge = await createWalletChallenge(session.sessionId);
    expect(challenge).not.toBeNull();

    const walletAddress = "0xABCDEF0000000000000000000000000000000000";

    // Simulate verifyMessage returning a different address
    mockedVerifyMessage.mockReturnValueOnce(
      "0x1111111111111111111111111111111111111111"
    );

    const result = await verifyWalletSignature(
      session.sessionId,
      walletAddress,
      "0xsignature"
    );

    expect(result).toBeNull();
  });

  it("fails verification when there is no active challenge", async () => {
    const session = await createSession();

    const walletAddress = "0xABCDEF0000000000000000000000000000000000";

    // No createWalletChallenge call here, so nonce is missing
    const result = await verifyWalletSignature(
      session.sessionId,
      walletAddress,
      "0xsignature"
    );

    expect(result).toBeNull();
  });
});
