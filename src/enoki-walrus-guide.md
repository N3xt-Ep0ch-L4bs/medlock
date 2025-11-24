# Guide: Implementing Enoki zkLogin with Walrus

This guide walks you through implementing Enoki zkLogin authentication with Walrus decentralized storage in a Sui dApp.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Setup](#setup)
4. [Implementation Steps](#implementation-steps)
5. [Code Examples](#code-examples)
6. [Common Issues & Troubleshooting](#common-issues--troubleshooting)

---

## Overview

### What is Enoki zkLogin?

Enoki zkLogin enables passwordless authentication for Sui dApps using OAuth providers (like Google) without requiring users to manage private keys. It uses zero-knowledge proofs to authenticate users while maintaining privacy.

### What is Walrus?

Walrus is a decentralized storage protocol built on Sui that allows you to store data on-chain in a cost-effective way. It's ideal for storing user profiles, posts, and other application data.

### Why Combine Them?

- **Enoki zkLogin**: Provides seamless user onboarding without seed phrases
- **Walrus**: Enables decentralized data storage with on-chain guarantees
- **Together**: Create a fully decentralized app with great UX

---

## Prerequisites

Before starting, ensure you have:

1. **Node.js** (v18 or higher)
2. **A Sui dApp project** (Next.js, React, etc.)
3. **Enoki API Key** - Get one from [Enoki Dashboard](https://enoki.com)
4. **Google OAuth Client ID** - Create one in [Google Cloud Console](https://console.cloud.google.com)
5. **Basic understanding** of:
   - React/Next.js
   - Sui blockchain concepts
   - TypeScript

---

## Setup

### 1. Install Required Dependencies

```bash
npm install @mysten/enoki @mysten/dapp-kit @mysten/sui @mysten/walrus @mysten/walrus-wasm @tanstack/react-query
```

### 2. Environment Variables

Create a `.env.local` file (or `.env`) with:

```env
NEXT_PUBLIC_ENOKI_API_KEY=your_enoki_api_key_here
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
NEXT_PUBLIC_WALRUS_RELAY_URL=https://upload-relay.testnet.walrus.space
```

**Getting your Enoki API Key:**
1. Visit [Enoki Dashboard](https://enoki.com)
2. Sign up or log in
3. Create a new project
4. Copy your API key

**Getting your Google Client ID:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure OAuth consent screen
6. Add authorized JavaScript origins (your app URL)
7. Copy the Client ID

---

## Implementation Steps

### Step 1: Create Enoki Provider

Create `src/contexts/enoki-provider.tsx`:

```typescript
"use client";

import { registerEnokiWallets } from "@mysten/enoki";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WalletProvider, SuiClientProvider } from "@mysten/dapp-kit";
import { type ReactNode } from "react";

// Get environment variables
const enokiApiKey = process.env.NEXT_PUBLIC_ENOKI_API_KEY || "";
const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

// Create Sui client for testnet
const testnetClient = new SuiClient({
  url: getFullnodeUrl("testnet"),
});

// Create React Query client
const queryClient = new QueryClient();

// Register Enoki wallets BEFORE provider renders
// This must happen synchronously
if (enokiApiKey && googleClientId) {
  try {
    registerEnokiWallets({
      client: testnetClient,
      network: "testnet",
      apiKey: enokiApiKey,
      providers: {
        google: {
          clientId: googleClientId,
        },
      },
    });
    console.log("Enoki wallets registered successfully");
  } catch (error) {
    console.error("Failed to register Enoki wallets:", error);
  }
} else {
  if (typeof window !== "undefined") {
    console.warn(
      "Enoki API key or Google Client ID not found. Check your environment variables.",
      {
        hasApiKey: !!enokiApiKey,
        hasClientId: !!googleClientId,
      }
    );
  }
}

export function EnokiProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider
        networks={{
          testnet: { url: getFullnodeUrl("testnet") },
          mainnet: { url: getFullnodeUrl("mainnet") },
        }}
        defaultNetwork="testnet"
      >
        <WalletProvider autoConnect>{children}</WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
```

**Key Points:**
- `registerEnokiWallets()` must be called **before** the provider renders
- Use `autoConnect` to automatically reconnect users
- Configure networks (testnet/mainnet) based on your needs

### Step 2: Create Walrus Client

Create `src/lib/walrus-client.ts`:

```typescript
"use client";

import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { getFullnodeUrl } from "@mysten/sui/client";
import { walrus } from "@mysten/walrus";

// Get WASM URL for browser environments
let walrusWasmUrl: string | undefined;

if (typeof window !== "undefined") {
  walrusWasmUrl = "https://unpkg.com/@mysten/walrus-wasm@latest/web/walrus_wasm_bg.wasm";
}

/**
 * Creates a Walrus-enabled Sui client
 */
export function createWalrusClient() {
  const client = new SuiJsonRpcClient({
    url: getFullnodeUrl("testnet"),
    network: "testnet", // Required for Walrus
  }).$extend(
    walrus({
      // Upload relay handles retries and indexing lag
      uploadRelay: {
        host:
          process.env.NEXT_PUBLIC_WALRUS_RELAY_URL ||
          "https://upload-relay.testnet.walrus.space",
        sendTip: { max: 1_000_000 }, // 0.001 SUI max tip
      },
      // WASM URL for browser
      ...(walrusWasmUrl && { wasmUrl: walrusWasmUrl }),
      // Storage node client options
      storageNodeClientOptions: {
        timeout: 60_000, // 60 seconds
        onError: (error) => {
          // Log unexpected errors only
          const errorName = (error as any)?.name || "";
          const errorMessage = String((error as any)?.message || error || "");
          
          const isExpectedError =
            errorName === "NotFoundError" ||
            errorMessage.includes("404") ||
            errorMessage.includes("unavailable") ||
            errorMessage.includes("Failed to fetch");
          
          if (!isExpectedError) {
            console.warn("Walrus storage node error:", error);
          }
        },
      },
    })
  );

  return client;
}

// Singleton instance
let walrusClientInstance: ReturnType<typeof createWalrusClient> | null = null;

export function getWalrusClient() {
  if (!walrusClientInstance) {
    walrusClientInstance = createWalrusClient();
  }
  return walrusClientInstance;
}
```

**Key Points:**
- Use `SuiJsonRpcClient` with `$extend(walrus(...))` to add Walrus capabilities
- Configure `uploadRelay` for better reliability
- Set `network` explicitly (required for Walrus)
- Handle errors gracefully (404s are expected during sync)

### Step 3: Create Wallet Signer Hook

Create `src/hooks/use-wallet-signer.ts`:

```typescript
"use client";

import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useMemo } from "react";
import type { Signer } from "@mysten/sui/cryptography";

/**
 * Hook to get a Signer from the current connected wallet
 * Required for Walrus operations that need transaction signing
 */
export function useWalletSigner(): Signer | null {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransactionAsync } = useSignAndExecuteTransaction();

  return useMemo(() => {
    if (!currentAccount || !signAndExecuteTransactionAsync) {
      return null;
    }

    const address = currentAccount.address;

    // Create a signer adapter for Walrus
    return {
      toSuiAddress: () => address,
      signAndExecuteTransaction: async ({ transaction, client }: { transaction: Transaction; client: any }) => {
        // Sign and execute using dapp-kit
        const result = await signAndExecuteTransactionAsync({
          transaction,
        });

        // Wait for transaction confirmation
        if (client && result.digest) {
          await client.waitForTransaction({
            digest: result.digest,
            options: { showEffects: true },
          });

          // Get full transaction response
          const txResponse = await client.getTransactionBlock({
            digest: result.digest,
            options: {
              showEffects: true,
              showObjectChanges: true,
            },
          });

          // Transform objectChanges to changedObjects format (Walrus expects this)
          let effects = txResponse.effects;
          
          if (effects && txResponse.objectChanges && !effects.changedObjects) {
            const changedObjects = txResponse.objectChanges
              .map((change: any) => {
                let idOperation = "Mutated";
                if (change.type === "created") idOperation = "Created";
                else if (change.type === "deleted") idOperation = "Deleted";
                else if (change.type === "mutated") idOperation = "Mutated";
                
                const objectId = change.objectId || 
                                 change.object?.objectId || 
                                 change.reference?.objectId;
                
                return objectId ? { idOperation, id: objectId } : null;
              })
              .filter((obj: any) => obj !== null);
            
            effects = { ...effects, changedObjects };
          }

          return {
            digest: result.digest,
            effects: effects || txResponse.effects,
          };
        }

        return {
          digest: result.digest,
          effects: result.effects as any,
        };
      },
      getPublicKey: async () => {
        return {
          toSuiPublicKey: () => address,
        } as any;
      },
      getKeyScheme: () => "ZkLogin" as any,
    } as unknown as Signer;
  }, [currentAccount, signAndExecuteTransactionAsync]);
}
```

**Key Points:**
- Adapts dapp-kit hooks to Walrus's Signer interface
- Handles transaction execution and effect transformation
- Returns proper format that Walrus expects

### Step 4: Create Sign-In Component

Create `src/components/auth/google-signin-button.tsx`:

```typescript
"use client";

import { useWallets, useConnectWallet } from "@mysten/dapp-kit";
import { useState } from "react";
import { Button } from "@/components/ui/button";

// Helper to identify Google Enoki wallet
function isGoogleWallet(wallet: any) {
  return wallet.name === "Enoki" && wallet.accounts?.[0]?.chains?.includes("sui:testnet");
}

export default function GoogleSignInButton() {
  const wallets = useWallets();
  const { mutate: connect } = useConnectWallet();
  const [isConnecting, setIsConnecting] = useState(false);

  // Find Google Enoki wallet
  const googleWallet = wallets.find(isGoogleWallet);

  const handleSignIn = async () => {
    if (!googleWallet) {
      console.error("Google Enoki wallet not found");
      return;
    }

    setIsConnecting(true);
    try {
      connect(
        {
          wallet: googleWallet,
        },
        {
          onSuccess: () => {
            console.log("Successfully connected to Enoki wallet");
            setIsConnecting(false);
          },
          onError: (error) => {
            console.error("Failed to connect:", error);
            setIsConnecting(false);
          },
        }
      );
    } catch (error) {
      console.error("Error connecting:", error);
      setIsConnecting(false);
    }
  };

  return (
    <Button
      onClick={handleSignIn}
      disabled={isConnecting || !googleWallet}
      size="lg"
      className="w-full"
    >
      {isConnecting ? "Signing in..." : "Sign in with Google"}
    </Button>
  );
}
```

### Step 5: Use Walrus for Storage

Create `src/lib/walrus-storage.ts` (example for storing user profiles):

```typescript
"use client";

import { getWalrusClient } from "./walrus-client";
import type { Signer } from "@mysten/sui/cryptography";

const STORAGE_EPOCHS = 3; // Store for ~30 days
const DELETABLE = true;

/**
 * Store a user profile in Walrus
 */
export async function storeProfile(
  user: { id: string; name: string; handle: string; bio?: string },
  signer: Signer
): Promise<{ blobId: string; userId: string }> {
  const client = getWalrusClient();
  
  // Create the data to store
  const profileData = {
    userId: user.id,
    name: user.name,
    handle: user.handle,
    bio: user.bio || "",
    updatedAt: new Date().toISOString(),
  };

  // Convert to JSON string
  const jsonString = JSON.stringify(profileData);
  const bytes = new TextEncoder().encode(jsonString);

  // Store in Walrus
  const blobId = await client.walrus.put({
    signer,
    data: bytes,
    epochs: STORAGE_EPOCHS,
    deletable: DELETABLE,
  });

  console.log("Profile stored in Walrus:", { blobId, userId: user.id });

  return { blobId, userId: user.id };
}

/**
 * Retrieve a user profile from Walrus
 */
export async function getProfile(blobId: string): Promise<any | null> {
  const client = getWalrusClient();

  try {
    const data = await client.walrus.get(blobId);
    
    if (!data) {
      return null;
    }

    // Decode JSON
    const jsonString = new TextDecoder().decode(data);
    const profile = JSON.parse(jsonString);

    return profile;
  } catch (error) {
    console.error("Failed to retrieve profile:", error);
    return null;
  }
}
```

### Step 6: Wire Everything Together

In your app layout (`src/app/layout.tsx` or `src/components/providers.tsx`):

```typescript
import { EnokiProvider } from "@/contexts/enoki-provider";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <EnokiProvider>
          {children}
        </EnokiProvider>
      </body>
    </html>
  );
}
```

In your login page:

```typescript
import GoogleSignInButton from "@/components/auth/google-signin-button";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useWalletSigner } from "@/hooks/use-wallet-signer";
import { storeProfile } from "@/lib/walrus-storage";

export default function LoginPage() {
  const currentAccount = useCurrentAccount();
  const signer = useWalletSigner();

  // After user connects, you can store their profile
  const handleStoreProfile = async () => {
    if (!signer || !currentAccount) return;

    const user = {
      id: currentAccount.address,
      name: "User Name",
      handle: "username",
      bio: "Bio here",
    };

    const { blobId } = await storeProfile(user, signer);
    console.log("Profile stored with blobId:", blobId);
  };

  return (
    <div>
      {!currentAccount ? (
        <GoogleSignInButton />
      ) : (
        <div>
          <p>Connected: {currentAccount.address}</p>
          <button onClick={handleStoreProfile}>Store Profile</button>
        </div>
      )}
    </div>
  );
}
```

---

## Code Examples

### Example 1: Storing Posts

```typescript
import { getWalrusClient } from "@/lib/walrus-client";
import { useWalletSigner } from "@/hooks/use-wallet-signer";

export async function createPost(
  content: string,
  authorId: string,
  signer: Signer
) {
  const client = getWalrusClient();

  const postData = {
    id: crypto.randomUUID(),
    content,
    authorId,
    createdAt: new Date().toISOString(),
    likes: 0,
  };

  const bytes = new TextEncoder().encode(JSON.stringify(postData));

  const blobId = await client.walrus.put({
    signer,
    data: bytes,
    epochs: 3,
    deletable: true,
  });

  return { blobId, postId: postData.id };
}
```

### Example 2: Storing Images

```typescript
export async function storeImage(
  imageFile: File,
  signer: Signer
): Promise<string> {
  const client = getWalrusClient();

  // Convert file to bytes
  const arrayBuffer = await imageFile.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Store in Walrus
  const blobId = await client.walrus.put({
    signer,
    data: bytes,
    epochs: 3,
    deletable: true,
  });

  return blobId;
}

// Retrieve image
export async function getImage(blobId: string): Promise<Blob | null> {
  const client = getWalrusClient();

  try {
    const data = await client.walrus.get(blobId);
    if (!data) return null;

    return new Blob([data]);
  } catch (error) {
    console.error("Failed to retrieve image:", error);
    return null;
  }
}
```

### Example 3: Building an Index

```typescript
// Store a global index of all posts
export async function updateGlobalIndex(
  postId: string,
  blobId: string,
  signer: Signer
) {
  const client = getWalrusClient();

  // Get existing index
  const existingIndexBlobId = localStorage.getItem("global_index_blobId");
  let index: any[] = [];

  if (existingIndexBlobId) {
    try {
      const data = await client.walrus.get(existingIndexBlobId);
      if (data) {
        index = JSON.parse(new TextDecoder().decode(data));
      }
    } catch (error) {
      console.warn("Failed to load existing index, starting fresh");
    }
  }

  // Add new post
  index.push({
    postId,
    blobId,
    addedAt: new Date().toISOString(),
  });

  // Store updated index
  const bytes = new TextEncoder().encode(JSON.stringify(index));
  const newBlobId = await client.walrus.put({
    signer,
    data: bytes,
    epochs: 3,
    deletable: true,
  });

  localStorage.setItem("global_index_blobId", newBlobId);
  return newBlobId;
}
```

---

## Common Issues & Troubleshooting

### Issue 1: "Enoki wallets not found"

**Symptoms:** Google wallet doesn't appear in available wallets

**Solutions:**
- Verify `NEXT_PUBLIC_ENOKI_API_KEY` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` are set
- Ensure `registerEnokiWallets()` is called **before** `WalletProvider` renders
- Check browser console for registration errors
- Verify Google OAuth credentials are correct

### Issue 2: "Transaction failed" when storing in Walrus

**Symptoms:** `walrus.put()` throws an error

**Solutions:**
- Ensure user has sufficient SUI balance (for gas fees)
- Check that `signer` is not null (wallet must be connected)
- Verify network is set correctly (`testnet` or `mainnet`)
- Check transaction effects for specific error messages

### Issue 3: "Blob not found" after storing

**Symptoms:** Data stored but can't be retrieved immediately

**Solutions:**
- This is **normal** - storage nodes need time to sync (can take 30-60 seconds)
- Use retry logic with exponential backoff
- Consider using `uploadRelay` for better reliability
- Check blobId is correct (it's a content hash)

### Issue 4: "WASM not loading"

**Symptoms:** Walrus operations fail in browser

**Solutions:**
- Ensure `@mysten/walrus-wasm` is installed
- Check WASM URL is accessible: `https://unpkg.com/@mysten/walrus-wasm@latest/web/walrus_wasm_bg.wasm`
- Verify CORS settings if using custom WASM URL
- Check browser console for WASM loading errors

### Issue 5: "Signer interface mismatch"

**Symptoms:** TypeScript errors or runtime errors with signer

**Solutions:**
- Use the `useWalletSigner()` hook pattern shown above
- Ensure `signAndExecuteTransaction` returns proper format with `digest` and `effects`
- Transform `objectChanges` to `changedObjects` format
- Use type assertions (`as unknown as Signer`) if needed

### Issue 6: "Network mismatch"

**Symptoms:** Operations fail with network errors

**Solutions:**
- Ensure all clients use the same network (`testnet` or `mainnet`)
- Set `network` explicitly in `SuiJsonRpcClient`
- Match network in `registerEnokiWallets()` and `SuiClientProvider`
- Check environment variables match your network choice

---

## Best Practices

1. **Error Handling**: Always wrap Walrus operations in try-catch blocks
2. **Retry Logic**: Implement retries for `walrus.get()` operations (404s are common)
3. **Caching**: Cache frequently accessed data locally (IndexedDB/localStorage)
4. **Indexing**: Build indexes for efficient data retrieval
5. **Epochs**: Set appropriate storage epochs based on data lifetime needs
6. **Testing**: Test on testnet before deploying to mainnet
7. **Monitoring**: Log blobIds and track storage operations for debugging

---

## Additional Resources

- [Enoki Documentation](https://docs.enoki.com)
- [Walrus Documentation](https://docs.walrus.space)
- [Sui Documentation](https://docs.sui.io)
- [dapp-kit Documentation](https://sui-typescript-docs.vercel.app/dapp-kit)

---

## Summary

This guide covered:
1. ✅ Setting up Enoki zkLogin with Google OAuth
2. ✅ Configuring Walrus for decentralized storage
3. ✅ Creating a wallet signer adapter
4. ✅ Storing and retrieving data from Walrus
5. ✅ Handling common issues

Your app now has:
- Passwordless authentication via Enoki zkLogin
- Decentralized storage via Walrus
- Seamless user experience

Happy building! 🚀

