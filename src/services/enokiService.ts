import { EnokiClient } from '@mysten/enoki';
import { Transaction } from '@mysten/sui/transactions';
import { fromB64, toB64 } from '@mysten/sui/utils';

/**
 * Service for handling Enoki sponsored transactions
 * 
 * Note: For production, the private API key should be kept on a backend server.
 * This service is designed to work with a backend API that handles the private key.
 * For development, you can use it directly with a private key (not recommended for production).
 */
export class EnokiService {
  private enokiClient: EnokiClient | null = null;
  private network: 'testnet' | 'mainnet' | 'devnet';
  private privateApiKey: string | null = null;

  constructor(
    network: 'testnet' | 'mainnet' | 'devnet' = 'testnet',
    privateApiKey?: string
  ) {
    this.network = network;
    
    // Only initialize if private API key is provided
    // In production, this should be handled by a backend
    if (privateApiKey) {
      this.privateApiKey = privateApiKey;
      this.enokiClient = new EnokiClient({
        apiKey: privateApiKey,
      });
    }
  }

  /**
   * Create a sponsored transaction
   * This should typically be called from a backend service
   * 
   * Based on: https://docs.enoki.mystenlabs.com/ts-sdk/examples
   */
  async createSponsoredTransaction(
    transaction: Transaction,
    sender: string,
    client?: any, // SuiClient for building transaction
    allowedMoveCallTargets?: string[],
    allowedAddresses?: string[]
  ): Promise<{ bytes: string; digest: string }> {
    if (!this.enokiClient) {
      throw new Error('EnokiClient not initialized. Private API key required for sponsored transactions.');
    }

    // Build transaction with onlyTransactionKind: true
    // If client is provided, use it; otherwise build without client (may fail for some transactions)
    const txBytes = client
      ? await transaction.build({
          client,
          onlyTransactionKind: true,
        })
      : await transaction.build({
          onlyTransactionKind: true,
        });

    const resp = await this.enokiClient.createSponsoredTransaction({
      network: this.network,
      transactionKindBytes: toB64(txBytes),
      sender,
      allowedMoveCallTargets: allowedMoveCallTargets || [],
      allowedAddresses: allowedAddresses || [],
    });

    return {
      bytes: resp.bytes,
      digest: resp.digest,
    };
  }

  /**
   * Execute a sponsored transaction
   * This should typically be called from a backend service after receiving the signature
   */
  async executeSponsoredTransaction(
    digest: string,
    signature: string
  ): Promise<void> {
    if (!this.enokiClient) {
      throw new Error('EnokiClient not initialized. Private API key required for sponsored transactions.');
    }

    await this.enokiClient.executeSponsoredTransaction({
      digest,
      signature,
    });
  }

  /**
   * Check if Enoki service is available
   */
  isAvailable(): boolean {
    return this.enokiClient !== null;
  }

  /**
   * Get the network this service is configured for
   */
  getNetwork(): 'testnet' | 'mainnet' | 'devnet' {
    return this.network;
  }
}

