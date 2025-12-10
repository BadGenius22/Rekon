import { NextResponse } from "next/server";
import { buildHmacSignature } from "@polymarket/builder-signing-sdk";

export async function POST(request: Request) {
  const { method, path, body } = await request.json();

  const apiKey = process.env.POLYMARKET_BUILDER_API_KEY;
  const secret = process.env.POLYMARKET_BUILDER_SECRET;
  const passphrase = process.env.POLYMARKET_BUILDER_PASSPHRASE;

  // Debug logging
  console.log("[/api/polymarket/sign] Request received:", {
    method,
    path,
    hasBody: !!body,
    hasApiKey: !!apiKey,
    hasSecret: !!secret,
    hasPassphrase: !!passphrase,
  });

  if (!apiKey || !secret || !passphrase) {
    console.error("[/api/polymarket/sign] Missing credentials:", {
      hasApiKey: !!apiKey,
      hasSecret: !!secret,
      hasPassphrase: !!passphrase,
    });
    return NextResponse.json(
      { error: "Builder credentials not configured" },
      { status: 500 }
    );
  }

  if (!method || !path) {
    return NextResponse.json(
      { error: "Missing required fields: method, path" },
      { status: 400 }
    );
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = buildHmacSignature(
    secret,
    timestamp,
    method,
    path,
    body || ""
  );

  console.log("[/api/polymarket/sign] Signature generated successfully");

  return NextResponse.json({
    POLY_BUILDER_SIGNATURE: signature,
    POLY_BUILDER_TIMESTAMP: timestamp,
    POLY_BUILDER_API_KEY: apiKey,
    POLY_BUILDER_PASSPHRASE: passphrase,
  });
}
