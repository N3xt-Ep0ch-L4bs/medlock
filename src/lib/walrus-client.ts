"use client";

import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { getFullnodeUrl } from "@mysten/sui/client";
import { walrus } from "@mysten/walrus";

// Get WASM URL - in Next.js we need to handle this properly
let walrusWasmUrl: string | undefined;

// Try to load WASM URL for browser environments
if (typeof window !== "undefined") {
  // For browser, we'll use a CDN fallback if needed
  walrusWasmUrl = "https://unpkg.com/@mysten/walrus-wasm@latest/web/walrus_wasm_bg.wasm";
}

/**
 * Creates a Walrus-enabled Sui client
 * This client extends the standard Sui client with Walrus storage capabilities
 * @param network - The Sui network to connect to (default: "testnet")
 * @param relayUrl - Optional custom upload relay URL
 */
export function createWalrusClient(
  network: "testnet" | "mainnet" | "devnet" = "testnet",
  relayUrl?: string
) {
  const client = new SuiJsonRpcClient({
    url: getFullnodeUrl(network),
    // Setting network on your client is required for walrus to work correctly
    network,
  }).$extend(
    walrus({
      // Enable upload relay to abstract storage node retries and indexing lag
      uploadRelay: {
        host:
          relayUrl ||
          import.meta.env.VITE_WALRUS_RELAY_URL ||
          (network === "testnet"
            ? "https://upload-relay.testnet.walrus.space"
            : network === "mainnet"
            ? "https://upload-relay.mainnet.walrus.space"
            : "https://upload-relay.devnet.walrus.space"),
        // Limit the max tip in MIST (1 SUI = 1_000_000_000 MIST)
        // Adjust as needed based on relay tip-config
        sendTip: { max: 1_000_000 }, // 0.001 SUI
      },
      // Configure WASM URL for browser environments
      ...(walrusWasmUrl && { wasmUrl: walrusWasmUrl }),
      // Configure storage node client options
      storageNodeClientOptions: {
        timeout: 60_000, // 60 second timeout
        onError: (error) => {
          // Log errors for debugging, but don't throw (Walrus is fault-tolerant)
          // Suppress expected errors that are handled by retry logic
          const errorName = (error as any)?.name || "";
          const errorMessage = String((error as any)?.message || error || "");
          const errorStack = String((error as any)?.stack || "");

          // These are expected errors in a distributed storage system:
          // - 404s: Storage nodes may not have synced the data yet
          // - SSL errors: Some dev nodes have self-signed certificates
          // - Network errors: Nodes may be temporarily unavailable
          // Our retry logic will handle these gracefully
          const isExpectedError =
            errorName === "NotFoundError" ||
            errorMessage.includes("404") ||
            errorMessage.includes("sliver") ||
            errorMessage.includes("unavailable") ||
            errorMessage.includes("ERR_CERT_AUTHORITY_INVALID") ||
            errorMessage.includes("Failed to fetch") ||
            errorMessage.includes("ECONNREFUSED") ||
            errorMessage.includes("ETIMEDOUT") ||
            errorStack.includes("ERR_CERT_AUTHORITY_INVALID");

          // Only log unexpected errors (these might indicate a real problem)
          if (!isExpectedError) {
            console.warn("Walrus storage node error (unexpected):", error);
          }
          // Suppress expected errors - they're handled by retry logic
          // Uncomment for debugging:
          // else {
          //   console.debug("Walrus storage node error (expected, will retry):", errorMessage);
          // }
        },
      },
    })
  );

  return client;
}

// Export a singleton instance per network (can be created lazily)
const walrusClientInstances: Record<
  string,
  ReturnType<typeof createWalrusClient> | null
> = {};

/**
 * Get or create a Walrus client singleton for the specified network
 * @param network - The Sui network to connect to (default: "testnet")
 * @param relayUrl - Optional custom upload relay URL
 */
export function getWalrusClient(
  network: "testnet" | "mainnet" | "devnet" = "testnet",
  relayUrl?: string
) {
  const key = `${network}${relayUrl ? `_${relayUrl}` : ""}`;
  if (!walrusClientInstances[key]) {
    walrusClientInstances[key] = createWalrusClient(network, relayUrl);
  }
  return walrusClientInstances[key];
}

