import { getFullnodeUrl } from '@mysten/sui/client';
import { createNetworkConfig } from '@mysten/dapp-kit';

// Get package ID from environment variable
const TESTNET_PACKAGE_ID = import.meta.env.VITE_SUI_PACKAGE_ID || '';
const DEVNET_PACKAGE_ID = import.meta.env.VITE_SUI_PACKAGE_ID || '';
const MAINNET_PACKAGE_ID = import.meta.env.VITE_SUI_PACKAGE_ID || '';

const { networkConfig, useNetworkVariable, useNetworkVariables } = createNetworkConfig({
  testnet: {
    url: getFullnodeUrl('testnet'),
    variables: {
      packageId: TESTNET_PACKAGE_ID,
      gqlClient: 'https://sui-testnet.mystenlabs.com/graphql',
    },
  },
  devnet: {
    url: getFullnodeUrl('devnet'),
    variables: {
      packageId: DEVNET_PACKAGE_ID,
      gqlClient: 'https://sui-devnet.mystenlabs.com/graphql',
    },
  },
  mainnet: {
    url: getFullnodeUrl('mainnet'),
    variables: {
      packageId: MAINNET_PACKAGE_ID,
      gqlClient: 'https://sui-mainnet.mystenlabs.com/graphql',
    },
  },
});

export { useNetworkVariable, useNetworkVariables, networkConfig };

