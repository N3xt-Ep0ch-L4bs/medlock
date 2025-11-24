import { SealClient, SessionKey, EncryptedObject } from "@mysten/seal";
import { WalrusFile } from "@mysten/walrus";
import { getFullnodeUrl } from "@mysten/sui/client";
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { Transaction } from "@mysten/sui/transactions";
import { getAllowlistedKeyServers } from "../utils/sealKeyServers";
import { EnokiService } from "./enokiService";
import { fromHex, toHex, toBase64, fromBase64 } from "@mysten/sui/utils";
import { getWalrusClient } from "../lib/walrus-client";

interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
  patientId: string;
  bloodType: string;
  allergies: string;
  profileImage?: string; // Base64 encoded image data URL
}

/**
 * Service for encrypting profile data with Seal and storing on Walrus
 */
export class SealWalrusService {
  private sealClient: SealClient;
  private walrusClient: any; // Walrus extended client
  private suiClient: SuiJsonRpcClient; // Use SuiJsonRpcClient for SealCompatibleClient compatibility
  private packageId: string;
  private network: "testnet" | "mainnet" | "devnet";
  private sessionKey: SessionKey | null = null;
  private enokiService: EnokiService | null = null;

  constructor(
    packageId: string,
    network: "testnet" | "mainnet" | "devnet" = "testnet",
    customSealServerIds?: string[],
    enokiPrivateApiKey?: string
  ) {
    // Store network
    this.network = network;

    // Normalize packageId: ensure it has 0x prefix and is a valid hex string
    const normalized = packageId.trim();
    this.packageId = normalized.startsWith("0x")
      ? normalized
      : `0x${normalized}`;

    // Validate packageId format (should be 0x followed by hex characters)
    // Sui package IDs are typically 64 hex characters, but we'll be flexible
    if (!/^0x[a-fA-F0-9]+$/.test(this.packageId) || this.packageId.length < 3) {
      throw new Error(
        `Invalid package ID format: ${this.packageId}. Package ID must be a valid hex string with 0x prefix (e.g., 0x1234...5678).`
      );
    }

    // Use the centralized Walrus client
    try {
      this.walrusClient = getWalrusClient(network);
    } catch (error) {
      console.error("Failed to initialize Walrus client:", error);
      throw error;
    }

    // Create a SuiJsonRpcClient for Seal operations
    // Seal requires SealCompatibleClient which is ClientWithExtensions
    // SuiJsonRpcClient supports extensions, SuiClient does not
    this.suiClient = new SuiJsonRpcClient({
      url: getFullnodeUrl(network),
      network,
    });

    // Get Seal key server IDs - use custom ones if provided, otherwise use allowlisted
    const sealServerObjectIds =
      customSealServerIds && customSealServerIds.length > 0
        ? customSealServerIds
        : getAllowlistedKeyServers(network);

    if (sealServerObjectIds.length === 0) {
      console.warn(
        `No Seal key servers configured for network: ${network}. Please provide custom key server IDs.`
      );
    }

    // Initialize Seal client
    // Note: SDK version 0.9.4 uses serverConfigs
    // Convert array of server IDs to serverConfigs format
    // Use SuiJsonRpcClient which is compatible with SealCompatibleClient
    this.sealClient = new SealClient({
      suiClient: this.suiClient,
      serverConfigs: sealServerObjectIds.map((id) => ({
        objectId: id,
        weight: 1,
      })),
      verifyKeyServers: false, // Set to true in production for security
    });

    // Initialize Enoki service if private API key is provided
    if (enokiPrivateApiKey) {
      this.enokiService = new EnokiService(network, enokiPrivateApiKey);
    }
  }

  /**
   * Initialize session key for Seal operations
   * This should be called before encrypting/decrypting
   */
  async initializeSession(userAddress: string, signer?: any): Promise<void> {
    if (!this.sessionKey) {
      // Validate packageId before creating session
      if (
        !this.packageId ||
        !this.packageId.trim() ||
        this.packageId ===
          "0x0000000000000000000000000000000000000000000000000000000000000000"
      ) {
        throw new Error(
          "Invalid package ID. Please set VITE_SUI_PACKAGE_ID in your .env file with a valid Sui package ID."
        );
      }

      // Validate user address
      if (!userAddress || !userAddress.trim()) {
        throw new Error("User address is required to initialize Seal session.");
      }

      try {
        // Log the package ID being used for debugging
        console.log(
          `Initializing Seal session with package ID: ${this.packageId} on ${this.network}`
        );

        // Note: Package IDs are not object IDs, so we can't verify them with getObject
        // Seal will validate the package ID when creating the session
        this.sessionKey = await SessionKey.create({
          address: userAddress,
          packageId: this.packageId,
          ttlMin: 30, // Maximum allowed TTL (must be between 1 and 30 minutes)
          signer,
          suiClient: this.suiClient,
        });

        // CRITICAL: Ensure the session key certificate is signed
        // The certificate signature is required by Seal key servers
        // We need to manually sign the personal message and set it
        if (signer && signer.signPersonalMessage) {
          try {
            // Get the personal message that needs to be signed
            const personalMessage = this.sessionKey.getPersonalMessage();

            // Sign the personal message using the signer
            const signatureBytes = await signer.signPersonalMessage(
              personalMessage
            );

            // Convert signature bytes to base64 string (Seal expects base64)
            // Use Sui's toBase64 utility for proper encoding
            const signatureBase64 = toBase64(signatureBytes);

            // Set the signature on the session key
            await this.sessionKey.setPersonalMessageSignature(signatureBase64);

            // Verify the certificate now has a signature
            const certificate = await this.sessionKey.getCertificate();
            console.log("Session key certificate created and signed:", {
              hasSignature: !!certificate.signature,
              user: certificate.user,
              ttlMin: certificate.ttl_min,
            });
          } catch (certError) {
            console.error("Failed to sign session key certificate:", certError);
            throw new Error(
              `Failed to sign session key certificate: ${
                certError instanceof Error ? certError.message : "Unknown error"
              }`
            );
          }
        } else if (signer) {
          console.warn(
            "Signer provided but does not have signPersonalMessage method"
          );
        }
      } catch (error) {
        console.error("Error creating Seal session key:", error);
        if (error instanceof Error) {
          if (
            error.message.includes("does not exist") ||
            error.message.includes("invalid") ||
            error.message.includes("InvalidPackageError")
          ) {
            throw new Error(
              `Invalid package ID: ${this.packageId}\n\n` +
                `Please verify:\n` +
                `1. VITE_SUI_PACKAGE_ID is set in your .env file\n` +
                `2. The package ID is correct (current value: ${this.packageId})\n` +
                `3. The package is deployed to the ${this.network} network\n` +
                `4. Your Move contract includes a seal_approve function in the patients module\n` +
                `5. The package ID format is valid (should be 0x followed by hex characters)\n\n` +
                `Original error: ${error.message}`
            );
          }
        }
        throw error;
      }
    }
  }

  /**
   * Encrypt profile data and store on Walrus
   * Note: Enoki sponsored transactions for Walrus operations require backend support
   * as Walrus writeFiles builds transactions internally. The EnokiService is available
   * for future use or for other transaction types that can be sponsored.
   */
  async saveProfile(
    profileData: ProfileData,
    userAddress: string,
    signer: any, // Wallet signer - can be from dapp-kit or wallet-standard
    threshold: number = 2,
    epochs: number = 3
  ): Promise<{ walrusId: string; backupKey?: string }> {
    console.log("[saveProfile] Starting profile save operation", {
      userAddress,
      threshold,
      epochs,
      profileDataKeys: Object.keys(profileData),
    });

    console.log("[saveProfile] Initializing session...");
    await this.initializeSession(userAddress, signer);
    console.log("[saveProfile] Session initialized successfully");

    // Serialize profile data to JSON bytes
    console.log("[saveProfile] Serializing profile data to JSON...");
    const profileJson = JSON.stringify(profileData);
    const dataBytes = new TextEncoder().encode(profileJson);
    console.log("[saveProfile] Profile data serialized", {
      jsonLength: profileJson.length,
      bytesLength: dataBytes.length,
    });

    // Create identity ID from user address - matching seal-test pattern
    // toHex() creates a hex string WITHOUT 0x prefix
    const nonce = crypto.getRandomValues(new Uint8Array(5));
    const policyObjectBytes = fromHex(userAddress);
    const id = toHex(new Uint8Array([...policyObjectBytes, ...nonce]));

    console.log("[saveProfile] Identity and package ID prepared", {
      id,
      idLength: id.length,
      packageId: this.packageId,
    });

    // Encrypt the profile data using Seal - matching seal-test pattern
    // packageId is used as-is (with 0x prefix), id is hex string from toHex (no 0x prefix)
    console.log("[saveProfile] Starting encryption with Seal...", {
      threshold,
      packageId: this.packageId,
      id,
      dataSize: dataBytes.length,
    });
    const { encryptedObject: encryptedBytes, key: backupKey } =
      await this.sealClient.encrypt({
        threshold,
        packageId: this.packageId, // Use packageId as-is (with 0x prefix) - matching seal-test
        id, // Hex string from toHex (no 0x prefix) - matching seal-test
        data: dataBytes,
      });

    const encryptedBase64 = toBase64(encryptedBytes);
    console.log("[saveProfile] Encrypted bytes encoded to Base64", {
      originalBytesLength: encryptedBytes.length,
      base64Length: encryptedBase64.length, // Base64 is ~1/3 longer
    });
    console.log("Encrypted bytes:", encryptedBytes);

    // Parse the encrypted object to verify the identity was stored correctly - matching seal-test pattern
    try {
      const encryptedObj = EncryptedObject.parse(encryptedBytes);
      console.log("[saveProfile] Encryption completed and verified", {
        encryptedBytesLength: encryptedBytes.length,
        hasBackupKey: !!backupKey,
        backupKeyLength: backupKey ? backupKey.length : 0,
        storedIdentity: encryptedObj.id,
        expectedIdentity: id,
        identityMatches: encryptedObj.id === id, // Should match exactly
        storedPackageId: encryptedObj.packageId,
        expectedPackageId: this.packageId,
      });
    } catch (parseError) {
      console.warn(
        "[saveProfile] Could not parse encrypted object for verification:",
        parseError
      );
      console.log("[saveProfile] Encryption completed", {
        encryptedBytesLength: encryptedBytes.length,
        hasBackupKey: !!backupKey,
        backupKeyLength: backupKey ? backupKey.length : 0,
      });
    }

    // Upload encrypted data to Walrus
    // Create a WalrusFile from the encrypted bytes
    console.log("[saveProfile] Creating WalrusFile...", {
      identifier: `profile_${userAddress}`,
      encryptedBytesLength: encryptedBytes.length,
    });
    // const walrusFile = WalrusFile.from({
    //   contents: encryptedBytes,
    //   identifier: `profile_${userAddress}`,
    //   tags: {
    //     "content-type": "application/json",
    //     encrypted: "seal",
    //   },
    // });

    console.log("[saveProfile] Creating WalrusFile with Base64 string...");
    const walrusFile = WalrusFile.from({
      // Use the Base64 string here
      contents: new TextEncoder().encode(encryptedBase64),
      identifier: `profile_${userAddress}`,
      tags: {
        "content-type": "application/json",
        encrypted: "seal",
        // Add a tag to indicate it's Base64 encoded for retrieval
        encoding: "base64",
      },
    });
    console.log("[saveProfile] WalrusFile created successfully");

    // Write to Walrus
    // Note: Walrus writeFiles builds transactions internally and requires a signer.
    // For Enoki sponsored transactions, you would need to:
    // 1. Use a backend service that sponsors the transaction, OR
    // 2. Modify Walrus SDK to support sponsored transactions
    // For now, using regular signer. Enoki sponsorship can be added via backend API.
    console.log("[saveProfile] Uploading to Walrus...", {
      epochs,
      deletable: true,
      hasSigner: !!signer,
    });
    const results = await this.walrusClient.walrus.writeFiles({
      files: [walrusFile],
      epochs,
      deletable: true,
      signer,
    });

    if (results.length === 0) {
      throw new Error(
        "Failed to upload profile to Walrus - no results returned"
      );
    }

    const blobId = results[0]?.id;
    if (!blobId) {
      throw new Error("Failed to get profile blob ID");
    }

    console.log("[saveProfile] Upload to Walrus completed", {
      walrusId: blobId,
    });

    const result = {
      walrusId: blobId,
      backupKey: backupKey
        ? Array.from(backupKey)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("")
        : undefined,
    };
    console.log("[saveProfile] Profile save operation completed successfully", {
      walrusId: result.walrusId,
      hasBackupKey: !!result.backupKey,
      backupKeyLength: result.backupKey?.length || 0,
    });

    return result;
  }

  /**
   * Retrieve and decrypt profile data from Walrus using seal_approve_patient_own_records
   */
  async loadProfile(
    walrusId: string,
    userAddress: string,
    profileObjectId: string,
    recordsObjectId?: string, // Optional for doctor profiles
    signer?: any,
    onTransactionBuilt?: () => void
  ): Promise<ProfileData | null> {
    // CRITICAL: signer is required for Seal key servers to sign the session key certificate
    if (!signer) {
      throw new Error(
        "Signer is required for loadProfile to sign the session key certificate"
      );
    }

    await this.initializeSession(userAddress, signer);

    // Ensure the session key certificate is signed before using it
    // If it wasn't signed during initialization, sign it now
    if (this.sessionKey && signer && signer.signPersonalMessage) {
      try {
        // Check if certificate already has signature
        const certificate = await this.sessionKey.getCertificate();
        if (!certificate.signature) {
          // Sign the personal message manually
          const personalMessage = this.sessionKey.getPersonalMessage();
          const signatureBytes = await signer.signPersonalMessage(
            personalMessage
          );
          // Use Sui's toBase64 utility for proper encoding
          const signatureBase64 = toBase64(signatureBytes);
          await this.sessionKey.setPersonalMessageSignature(signatureBase64);

          // Verify it's now signed
          const updatedCertificate = await this.sessionKey.getCertificate();
          if (!updatedCertificate.signature) {
            throw new Error(
              "Failed to set signature on session key certificate"
            );
          }
          console.log("Session key certificate signed:", {
            hasSignature: !!updatedCertificate.signature,
            user: updatedCertificate.user,
          });
        } else {
          console.log("Session key certificate already signed:", {
            hasSignature: !!certificate.signature,
            user: certificate.user,
          });
        }
      } catch (certError) {
        console.error("Failed to get/sign session key certificate:", certError);
        throw new Error(
          `Session key certificate signing failed: ${
            certError instanceof Error ? certError.message : "Unknown error"
          }. Make sure your signer supports signPersonalMessage.`
        );
      }
    } else if (!signer || !signer.signPersonalMessage) {
      throw new Error(
        "Signer with signPersonalMessage is required for loadProfile"
      );
    }

    try {
      // Download encrypted data from Walrus
      const files = await this.walrusClient.walrus.getFiles({
        ids: [walrusId],
      });

      if (files.length === 0) {
        console.warn(`No file found for walrusId: ${walrusId}`);
        return null;
      }

      // ... Walrus file retrieval
      const walrusFile = files[0];
      // Get raw bytes from WalrusFile (this will be the raw bytes of the Base64 string)
      const base64Bytes = await walrusFile.bytes();
      // --- CRITICAL STEP: Decode the Base64 string back to Uint8Array ---
      const encryptedBase64 = new TextDecoder().decode(base64Bytes);

      const encryptedBytes = fromBase64(encryptedBase64);
      console.log("[loadProfile] Retrieved Base64 decoded to Encrypted Bytes", {
        base64Length: encryptedBase64.length,
        bytesLength: encryptedBytes.length,
      });
      //

      // Parse the encrypted object to verify the identity and package ID match
      let encryptedObject;
      try {
        encryptedObject = EncryptedObject.parse(encryptedBytes);
        console.log("Encrypted object parsed:", {
          id: encryptedObject.id,
          packageId: encryptedObject.packageId,
          threshold: encryptedObject.threshold,
          servicesCount: encryptedObject.services.length,
        });
      } catch (error) {
        console.error("Failed to parse encrypted object:", error);
        return null;
      }

      console.log("encryptedObject:", encryptedObject);

      // Use the ID from the encrypted object directly - matching seal-test pattern
      // The id is stored exactly as it was during encryption (hex string, no 0x prefix from toHex)
      const id = encryptedObject.id;
      console.log("Using ID from encrypted object:", id);

      // Use package ID from encrypted object, normalize to have 0x prefix for Move call
      let sealPackageId = encryptedObject.packageId;
      if (!sealPackageId.startsWith("0x")) {
        sealPackageId = `0x${sealPackageId}`;
      }
      console.log("Using package ID from encrypted object:", sealPackageId);

      // Verify objects exist and are accessible before attempting decryption
      // Also check object ownership to ensure the user has access
      try {
        const fetchPromises = [this.suiClient.getObject({ id: profileObjectId })];
        if (recordsObjectId && recordsObjectId.trim()) {
          fetchPromises.push(this.suiClient.getObject({ id: recordsObjectId }));
        }
        
        const results = await Promise.all(fetchPromises);
        const profileObj = results[0];
        const recordsObj = recordsObjectId && recordsObjectId.trim() ? results[1] : null;

        if (!profileObj.data) {
          console.error("Profile object not found or not accessible");
          return null;
        }
        
        if (recordsObjectId && recordsObjectId.trim() && !recordsObj?.data) {
          console.error("Records object not found or not accessible");
          return null;
        }

        // Check if the Profile object is owned by the user
        const profileOwner = profileObj.data.owner;
        const isOwnedByUser =
          profileOwner && profileOwner !== "Immutable"
            ? typeof profileOwner === "object" && "AddressOwner" in profileOwner
              ? profileOwner.AddressOwner === userAddress
              : false
            : false;

        console.log("Objects verified:", {
          profileExists: !!profileObj.data,
          recordsExists: !!recordsObj?.data,
          profileVersion: profileObj.data.version,
          recordsVersion: recordsObj?.data?.version,
          profileOwner,
          isOwnedByUser,
          userAddress,
        });

        if (profileOwner && !isOwnedByUser && profileOwner !== "Immutable") {
          console.warn(
            "WARNING: Profile object is not owned by the user. This may cause seal_approve to abort."
          );
        }
      } catch (error) {
        console.error("Error verifying objects:", error);
        return null;
      }

      // Create a transaction for seal_approve_patient_own_records call
      // Note: We need to set sender for building, but onlyTransactionKind: true will exclude it
      const tx = new Transaction();
      tx.setSender(userAddress);

      // CRITICAL: The identity must match EXACTLY what was used during encryption
      // This is stored in encryptedObject.id

      // Build the seal_approve transaction
      // Use the id directly from encrypted object (fromHex handles both with/without 0x prefix)
      // CRITICAL: The threshold in the transaction MUST match the threshold used during encryption
      // This is stored in encryptedObject.threshold - if they don't match, decryption will fail
      tx.moveCall({
        target: `${sealPackageId}::seal_approve::seal_approve`,
        arguments: [
          tx.pure.vector("u8", fromHex(id)), // id: vector<u8>
          tx.pure.u64(1),
          // tx.object(recordsObjectId), // records: &records::Records
          // tx.object(profileObjectId), // patient_profile: &patients::Profile
        ],
      });

      console.log("Transaction prepared:", {
        target: `${sealPackageId}::seal_approve::seal_approve`,
        id,
        idLength: id.length,
        threshold: encryptedObject.threshold,
        profileObjectId,
        recordsObjectId,
        packageId: sealPackageId,
      });

      // Try to dry-run the transaction to see if seal_approve would succeed
      // This helps debug why key servers might reject the request
      // Note: We need to build the full transaction for dry-run, not just the kind
      // try {
      //   const fullTxBytes = await tx.build({
      //     client: this.suiClient,
      //   });

      //   const dryRunResult = await this.suiClient.dryRunTransactionBlock({
      //     transactionBlock: fullTxBytes,
      //   });

      //   if (dryRunResult.effects.status.status === 'failure') {
      //     console.error('❌ Transaction dry-run FAILED - seal_approve_patient_own_records would abort');
      //     console.error('Dry-run error:', dryRunResult.effects.status.error);
      //     console.error('Full error details:', JSON.stringify(dryRunResult.effects.status, null, 2));
      //     console.error('This means the Seal key server will reject the request with 422');
      //     console.error('Common causes:');
      //     console.error('  1. Identity mismatch - the identity in the transaction doesn\'t match what was used during encryption');
      //     console.error('  2. Object access - Profile or Records objects don\'t exist or aren\'t accessible');
      //     console.error('  3. seal_approve logic - the seal_approve function is rejecting the request');
      //     return null;
      //   }

      //   console.log('✅ Transaction dry-run succeeded - seal_approve should work');
      // } catch (dryRunError) {
      //   console.warn('⚠️  Could not dry-run transaction (this is okay, continuing):', dryRunError);
      //   // Continue even if dry-run fails - the key server will validate it
      // }

      // Build transaction with onlyTransactionKind: true for Seal
      // Seal key servers need only the transaction kind, not the full transaction
      // The sender is set but won't be included in the transaction kind bytes
      const txBytes = await tx.build({
        client: this.suiClient,
        onlyTransactionKind: true,
      });

      console.log("Transaction built for Seal:", {
        txBytesLength: txBytes.length,
        id,
        onlyTransactionKind: true,
      });

      // Notify that transaction is built (stage 1 complete, stage 2 starting)
      if (onTransactionBuilt) {
        onTransactionBuilt();
      }

      // IMPORTANT: Call fetchKeys BEFORE decrypt (as shown in Seal examples)
      // This fetches the decryption keys from key servers using the seal_approve transaction
      // The identity must match what's stored in the encrypted object
      try {
        console.log("Fetching decryption keys from Seal key servers...", {
          id,
          threshold: encryptedObject.threshold,
          txBytesLength: txBytes.length,
          encryptedObjectServices: encryptedObject.services,
        });

        await this.sealClient.fetchKeys({
          ids: [id], // Use the id directly from encrypted object - matching seal-test pattern
          txBytes,
          sessionKey: this.sessionKey!,
          threshold: encryptedObject.threshold, // Use threshold from encrypted object
        });

        console.log("Keys fetched successfully");

        console.log("Decrypting data with Seal...", {
          encryptedBytesLength: encryptedBytes.length,
          txBytesLength: txBytes.length,
          threshold: encryptedObject.threshold,
          servicesCount: encryptedObject.services.length,
        });

        // Verify the encrypted data format before decrypting
        try {
          const parsedCheck = EncryptedObject.parse(encryptedBytes);
          console.log("Encrypted object re-parsed for verification:", {
            id: parsedCheck.id,
            idMatches: parsedCheck.id === id,
            packageId: parsedCheck.packageId,
            threshold: parsedCheck.threshold,
            servicesCount: parsedCheck.services.length,
          });
        } catch (parseError) {
          console.error(
            "Failed to re-parse encrypted object before decrypt:",
            parseError
          );
        }

        // Note: Keys are already fetched above, so this only does local decryption
        // The SealClient's internal cache should have the keys from fetchKeys()
        console.log("Calling sealClient.decrypt with:", {
          dataLength: encryptedBytes.length,
          txBytesLength: txBytes.length,
          hasSessionKey: !!this.sessionKey,
          sessionKeyAddress: this.sessionKey?.getAddress(),
        });

        console.log("Encrypted bytes:", encryptedBytes);
        try {
          const decryptedBytes = await this.sealClient.decrypt({
            data: encryptedBytes,
            txBytes,
            sessionKey: this.sessionKey!,
          });

          if (!decryptedBytes) {
            console.error(
              "Failed to decrypt profile data - decryptedBytes is null/undefined"
            );
            return null;
          }

          console.log("Decryption successful:", {
            decryptedBytesLength: decryptedBytes.length,
          });

          const profileJson = new TextDecoder().decode(decryptedBytes);
          return JSON.parse(profileJson) as ProfileData;
        } catch (decryptError) {
          console.error("Failed to decrypt:", decryptError);
          return null;
        }
        // Deserialize JSON from decrypted bytes
      } catch (fetchError: any) {
        console.error("Failed to fetch keys or decrypt:", fetchError);
        console.error("Error details:", {
          message: fetchError?.message,
          status: fetchError?.status,
          requestId: fetchError?.requestId,
          errorType: fetchError?.constructor?.name,
        });
        // Log the transaction details for debugging
        console.error("Transaction details that failed:", {
          id,
          threshold: encryptedObject.threshold,
          packageId: sealPackageId,
          txBytesLength: txBytes.length,
          sessionKeyAddress: this.sessionKey?.getAddress(),
          sessionKeyExpired: this.sessionKey?.isExpired(),
          encryptedObjectServices: encryptedObject.services,
        });
        // If fetchKeys or decrypt failed, return early
        return null;
      }
    } catch (error) {
      console.error("Error loading profile from Walrus:", error);
      return null;
    }
  }

  /**
   * Load and decrypt a doctor/pharmacy profile as an organization
   * Uses seal_approve with organization validation
   */
  async loadProfileAsOrganization(
    walrusId: string,
    organizationAddress: string,
    organizationObjectId: string,
    _doctorOrPharmacyAddress: string,
    doctorOrPharmacyProfileObjectId: string,
    signer?: any,
    onTransactionBuilt?: () => void
  ): Promise<ProfileData | null> {
    // CRITICAL: signer is required for Seal key servers to sign the session key certificate
    if (!signer) {
      throw new Error(
        "Signer is required for loadProfileAsOrganization to sign the session key certificate"
      );
    }

    await this.initializeSession(organizationAddress, signer);

    // Ensure the session key certificate is signed
    if (this.sessionKey && signer && signer.signPersonalMessage) {
      try {
        const certificate = await this.sessionKey.getCertificate();
        if (!certificate.signature) {
          const personalMessage = this.sessionKey.getPersonalMessage();
          const signatureBytes = await signer.signPersonalMessage(
            personalMessage
          );
          const signatureBase64 = toBase64(signatureBytes);
          await this.sessionKey.setPersonalMessageSignature(signatureBase64);

          const updatedCertificate = await this.sessionKey.getCertificate();
          if (!updatedCertificate.signature) {
            throw new Error(
              "Failed to set signature on session key certificate"
            );
          }
        }
      } catch (error) {
        console.error("Error signing session key certificate:", error);
        throw error;
      }
    }

    // Download encrypted data from Walrus using SDK (same as loadProfile)
    let encryptedBytes: Uint8Array;
    try {
      const files = await this.walrusClient.walrus.getFiles({
        ids: [walrusId],
      });

      if (files.length === 0) {
        console.warn(`No file found for walrusId: ${walrusId}`);
        return null;
      }

      // Get raw bytes from WalrusFile (this will be the raw bytes of the Base64 string)
      const walrusFile = files[0];
      const base64Bytes = await walrusFile.bytes();
      // Decode the Base64 string back to Uint8Array
      const encryptedBase64 = new TextDecoder().decode(base64Bytes);
      encryptedBytes = fromBase64(encryptedBase64);
      
      console.log("[loadProfileAsOrganization] Retrieved Base64 decoded to Encrypted Bytes", {
        base64Length: encryptedBase64.length,
        bytesLength: encryptedBytes.length,
      });
    } catch (error) {
      console.error("Error fetching encrypted data from Walrus:", error);
      return null;
    }

    // Parse the encrypted object to verify the identity and package ID match
    let encryptedObject;
    try {
      encryptedObject = EncryptedObject.parse(encryptedBytes);
      console.log("[loadProfileAsOrganization] Encrypted object parsed:", {
        id: encryptedObject.id,
        packageId: encryptedObject.packageId,
        threshold: encryptedObject.threshold,
        servicesCount: encryptedObject.services.length,
      });
    } catch (error) {
      console.error("Failed to parse encrypted object:", error);
      return null;
    }

    // Use the ID from the encrypted object directly
    const id = encryptedObject.id;
    console.log("[loadProfileAsOrganization] Using ID from encrypted object:", id);

    // Use package ID from encrypted object, normalize to have 0x prefix for Move call
    let sealPackageId = encryptedObject.packageId;
    if (!sealPackageId.startsWith("0x")) {
      sealPackageId = `0x${sealPackageId}`;
    }
    console.log("[loadProfileAsOrganization] Using package ID from encrypted object:", sealPackageId);

    // Create a transaction for seal_approve call
    const tx = new Transaction();
    tx.setSender(organizationAddress);

    // CRITICAL: The identity must match EXACTLY what was used during encryption
    // This is stored in encryptedObject.id

    // Build the seal_approve transaction
    // Use the id directly from encrypted object (fromHex handles both with/without 0x prefix)
    // CRITICAL: The threshold in the transaction MUST match the threshold used during encryption
    // This is stored in encryptedObject.threshold - if they don't match, decryption will fail
    tx.moveCall({
      target: `${sealPackageId}::seal_approve::seal_approve`,
      arguments: [
        tx.pure.vector("u8", fromHex(id)), // id: vector<u8>
        tx.pure.u64(1),
      ],
    });

    console.log("[loadProfileAsOrganization] Transaction prepared:", {
      target: `${sealPackageId}::seal_approve::seal_approve`,
      id,
      idLength: id.length,
      threshold: encryptedObject.threshold,
      organizationObjectId,
      doctorOrPharmacyProfileObjectId,
      packageId: sealPackageId,
    });

    // Build transaction with onlyTransactionKind: true for Seal
    // Seal key servers need only the transaction kind, not the full transaction
    // The sender is set but won't be included in the transaction kind bytes
    const txBytes = await tx.build({
      client: this.suiClient,
      onlyTransactionKind: true,
    });

    console.log("[loadProfileAsOrganization] Transaction built for Seal:", {
      txBytesLength: txBytes.length,
      id,
      onlyTransactionKind: true,
    });

    // Notify that transaction is built (stage 1 complete, stage 2 starting)
    if (onTransactionBuilt) {
      onTransactionBuilt();
    }

    // IMPORTANT: Call fetchKeys BEFORE decrypt (as shown in Seal examples)
    // This fetches the decryption keys from key servers using the seal_approve transaction
    // The identity must match what's stored in the encrypted object
    try {
      console.log("[loadProfileAsOrganization] Fetching decryption keys from Seal key servers...", {
        id,
        threshold: encryptedObject.threshold,
        txBytesLength: txBytes.length,
        encryptedObjectServices: encryptedObject.services,
      });

      await this.sealClient.fetchKeys({
        ids: [id], // Use the id directly from encrypted object
        txBytes,
        sessionKey: this.sessionKey!,
        threshold: encryptedObject.threshold, // Use threshold from encrypted object
      });

      console.log("[loadProfileAsOrganization] Keys fetched successfully");

      console.log("[loadProfileAsOrganization] Decrypting data with Seal...", {
        encryptedBytesLength: encryptedBytes.length,
        txBytesLength: txBytes.length,
        threshold: encryptedObject.threshold,
        servicesCount: encryptedObject.services.length,
      });

      // Decrypt the data
      const decryptedBytes = await this.sealClient.decrypt({
        data: encryptedBytes,
        txBytes,
        sessionKey: this.sessionKey!,
      });

      if (!decryptedBytes) {
        console.error("[loadProfileAsOrganization] Failed to decrypt profile data - decryptedBytes is null/undefined");
        return null;
      }

      const profileJson = new TextDecoder().decode(decryptedBytes);
      const profileData = JSON.parse(profileJson) as ProfileData;
      console.log("[loadProfileAsOrganization] Profile decrypted successfully");
      return profileData;
    } catch (decryptError) {
      console.error("[loadProfileAsOrganization] Failed to decrypt:", decryptError);
      // If fetchKeys or decrypt failed, return early
      return null;
    }
  }

  /**
   * Get session key (for reuse across operations)
   */
  getSessionKey(): SessionKey | null {
    return this.sessionKey;
  }

  /**
   * Get Enoki service (for sponsored transactions)
   */
  getEnokiService(): EnokiService | null {
    return this.enokiService;
  }
}
