"use client";

import { useCurrentAccount, useSignAndExecuteTransaction, useSignPersonalMessage } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useMemo } from "react";
import type { Signer } from "@mysten/sui/cryptography";

/**
 * Hook to get a Signer from the current connected wallet
 * This is needed for Walrus operations that require signing and executing transactions
 */
export function useWalletSigner(): Signer | null {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransactionAsync } = useSignAndExecuteTransaction();
  const { mutateAsync: signPersonalMessageAsync } = useSignPersonalMessage();

  return useMemo(() => {
    if (!currentAccount || !signAndExecuteTransactionAsync) {
      if (!currentAccount) {
        console.warn("useWalletSigner: No current account (wallet not connected)");
      }
      if (!signAndExecuteTransactionAsync) {
        console.warn("useWalletSigner: signAndExecuteTransactionAsync not available");
      }
      return null;
    }

    const address = currentAccount.address;

    // Create a signer adapter that uses dapp-kit hooks
    // Walrus requires a Signer with toSuiAddress() and signAndExecuteTransaction() methods
    // The signAndExecuteTransaction method receives { transaction: Transaction, client: SuiClient }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - Signer interface requires strict types, but this adapter works at runtime for Walrus
    return {
      toSuiAddress: () => address,
      sign: async (data: Uint8Array) => {
        // For personal messages, we'd need useSignPersonalMessage hook
        // For now, throw an error as this might not be needed for Walrus
        throw new Error("Personal message signing not implemented for Walrus signer");
      },
      signTransaction: async (transaction: Uint8Array) => {
        // For signing without executing, we'd need useSignTransaction hook
        // For now, throw an error as this might not be needed for Walrus
        throw new Error("Transaction signing without execution not implemented for Walrus signer");
      },
      signWithIntent: async (bytes: Uint8Array, intent: any) => {
        // Sign with intent - not typically used by Walrus
        throw new Error("Sign with intent not implemented for Walrus signer");
      },
      signPersonalMessage: async (bytes: Uint8Array) => {
        // Sign personal message using dapp-kit hook
        if (!signPersonalMessageAsync) {
          throw new Error("Personal message signing not available. Please ensure your wallet supports personal message signing.");
        }
        try {
          const result = await signPersonalMessageAsync({
            message: bytes,
          });
          // Return the signature bytes
          // The result should have a signature field that contains the signature
          // It might be a Uint8Array, base64 string, or hex string
          if (!result.signature) {
            throw new Error("No signature returned from personal message signing");
          }
          
          // Handle different signature formats
          if (result.signature instanceof Uint8Array) {
            return result.signature;
          } else if (typeof result.signature === 'string') {
            // If it's a base64 string, decode it
            // Check if it's base64 or hex
            if (result.signature.startsWith('0x')) {
              // Hex string - convert to Uint8Array
              const hex = result.signature.slice(2);
              return new Uint8Array(hex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
            } else {
              // Assume base64 - decode it
              const binaryString = atob(result.signature);
              return new Uint8Array(binaryString.length).map((_, i) => binaryString.charCodeAt(i));
            }
          } else {
            throw new Error(`Unexpected signature format: ${typeof result.signature}`);
          }
        } catch (error) {
          console.error("Error signing personal message:", error);
          throw new Error(`Failed to sign personal message: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      },
      signAndExecuteTransaction: async ({ transaction, client }: { transaction: Transaction; client: any }) => {
        // Walrus provides a Transaction object (not bytes) and a client
        console.log("Signing and executing transaction for Walrus...");
        
        // Use dapp-kit's hook to sign and execute
        const result = await signAndExecuteTransactionAsync({
          transaction,
        });

        console.log("Transaction executed, digest:", result.digest);

        // The result from useSignAndExecuteTransaction has effects as a base64 string,
        // but Walrus expects effects as an object with status and changedObjects properties
        // We need to get the full transaction response from the client
        if (client && result.digest) {
          try {
            // Wait for the transaction to be available and confirmed
            console.log("Waiting for transaction to be confirmed...");
            await client.waitForTransaction({
              digest: result.digest,
              options: {
                showEffects: true,
              },
            });

            // Use the client's getTransactionBlock to get the full response with effects
            const txResponse = await client.getTransactionBlock({
              digest: result.digest,
              options: {
                showEffects: true,
                showObjectChanges: true,
              },
            });

            console.log("Transaction response received:", {
              hasEffects: !!txResponse.effects,
              hasObjectChanges: !!txResponse.objectChanges,
              objectChangesCount: txResponse.objectChanges?.length || 0,
            });

            // Log the objectChanges to debug
            if (txResponse.objectChanges) {
              console.log("Object changes (full JSON):", JSON.stringify(txResponse.objectChanges, null, 2));
              console.log("Object changes (summary):", txResponse.objectChanges.map((change: any) => ({
                type: change.type,
                objectId: change.objectId || change.object?.objectId || change.reference?.objectId,
                objectType: change.objectType || change.object?.type,
                hasOwner: !!change.owner,
                owner: change.owner,
              })));
            }

            // Check if transaction succeeded
            if (txResponse.effects?.status?.status === "failure") {
              const error = txResponse.effects.status.error || "Unknown error";
              console.error("Transaction failed:", error);
              throw new Error(`Transaction failed: ${error}`);
            }

            // Verify the blob object exists on-chain (quick check)
            const blobObjectId = txResponse.objectChanges
              ?.find((change: any) => 
                change.type === "created" && 
                change.objectType?.includes("::blob::Blob")
              )?.objectId;
            
            if (blobObjectId) {
              console.log("Blob object ID:", blobObjectId);
              // Quick verification that blob exists on-chain
              try {
                const blobObject = await client.getObject({
                  id: blobObjectId,
                  options: { showContent: true },
                });
                if (blobObject && blobObject.data) {
                  console.log("Blob object verified on-chain");
                }
              } catch (error) {
                console.warn("Blob object not immediately available, but continuing...");
              }
            }
            
            // Note: We don't wait here because:
            // 1. Storage nodes check by blobId (content hash), not object ID
            // 2. Storage nodes maintain their own index that may lag
            // 3. Waiting doesn't help - this is a storage node sync issue, not timing
            // 4. The blob IS registered on-chain, storage nodes just need time to update their index

            // Walrus expects effects.changedObjects, but the new API returns objectChanges separately
            // We need to transform objectChanges into changedObjects format
            let effects = txResponse.effects;
            
            // If effects exists but doesn't have changedObjects, we need to add it
            if (effects && txResponse.objectChanges && !effects.changedObjects) {
              // Transform objectChanges to changedObjects format
              // Walrus expects: { idOperation: "Created" | "Mutated" | "Deleted", id: string }
              const changedObjects = txResponse.objectChanges
                .map((change: any) => {
                  // Determine the operation type based on the change type
                  let idOperation = "Mutated";
                  if (change.type === "created") {
                    idOperation = "Created";
                  } else if (change.type === "deleted") {
                    idOperation = "Deleted";
                  } else if (change.type === "mutated") {
                    idOperation = "Mutated";
                  }
                  
                  // Get the object ID - try multiple possible locations
                  const objectId = change.objectId || 
                                   change.object?.objectId || 
                                   change.reference?.objectId ||
                                   change.object?.data?.objectId;
                  
                  return objectId ? {
                    idOperation,
                    id: objectId,
                  } : null;
                })
                .filter((obj: any) => obj !== null); // Filter out null values
              
              effects = {
                ...effects,
                changedObjects,
              };

              console.log("Transformed objectChanges to changedObjects:", JSON.stringify(changedObjects, null, 2));
              const createdObjects = changedObjects.filter((obj: any) => obj.idOperation === "Created");
              console.log("Created objects:", JSON.stringify(createdObjects, null, 2));
            }

            // Return the response in the format Walrus expects
            const response = {
              digest: result.digest,
              effects: effects || txResponse.effects,
            };
            
            console.log("Returning transaction response to Walrus:", {
              digest: response.digest,
              hasEffects: !!response.effects,
              hasChangedObjects: !!(response.effects as any)?.changedObjects,
              changedObjectsCount: (response.effects as any)?.changedObjects?.length || 0,
              createdObjectsCount: (response.effects as any)?.changedObjects?.filter((obj: any) => obj.idOperation === "Created")?.length || 0,
            });
            return response;
          } catch (error) {
            console.error("Failed to fetch transaction effects:", error);
            throw error; // Re-throw to let Walrus know the transaction failed
          }
        }

        // If no client provided, return the result as-is
        console.warn("No client provided, returning basic result");
        return {
          digest: result.digest,
          effects: result.effects as any,
        };
      },
      getPublicKey: () => {
        // Return a public key object that matches the Signer interface
        // For Enoki/zkLogin wallets, we don't have a traditional public key
        // Return a mock object that satisfies the interface
        // Seal requires toSuiAddress() method on the public key
        // NOTE: This must be synchronous (not async) for Seal compatibility
        return {
          toSuiAddress: () => address,
          toSuiPublicKey: () => address,
          toRawBytes: () => new Uint8Array(32), // Empty bytes for zkLogin
          flag: () => 0, // ZkLogin flag
        } as any;
      },
      getKeyScheme: () => {
        // Return a key scheme (for zkLogin, this might be different)
        // Using a default value that satisfies the interface
        return "ZkLogin" as any;
      },
    } as unknown as Signer;
  }, [currentAccount, signAndExecuteTransactionAsync, signPersonalMessageAsync]);
}

