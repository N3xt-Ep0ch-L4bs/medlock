/**
 * Get allowlisted Seal key server object IDs for a given network
 * 
 * These are the official Seal key servers provided by Mysten Labs
 * For production, you may want to use your own key servers or contact
 * Seal key server operators for permissioned servers
 */
export function getAllowlistedKeyServers(
  network: 'testnet' | 'mainnet' | 'devnet'
): string[] {
  switch (network) {
    case 'testnet':
      return [
        '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75', // mysten-testnet-1
        '0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8', // mysten-testnet-2
      ];
    case 'mainnet':
      // Add mainnet key server IDs when available
      // For now, return empty array - you'll need to configure these
      return [];
    case 'devnet':
      // Add devnet key server IDs when available
      // For now, return empty array - you'll need to configure these
      return [];
    default:
      return [];
  }
}

