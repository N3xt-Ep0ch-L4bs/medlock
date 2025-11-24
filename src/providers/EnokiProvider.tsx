import { ReactNode, useEffect } from 'react';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createNetworkConfig,
  SuiClientProvider,
  useSuiClientContext,
  WalletProvider,
} from '@mysten/dapp-kit';
import { isEnokiNetwork, registerEnokiWallets } from '@mysten/enoki';

// Create a query client for dapp-kit
const queryClient = new QueryClient();

// Get configuration from environment variables
const enokiApiKey = import.meta.env.VITE_ENOKI_API_KEY;
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const defaultNetwork = (import.meta.env.VITE_SUI_NETWORK || 'testnet') as 'testnet' | 'mainnet' | 'devnet';

// Create network configuration
const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
  devnet: { url: getFullnodeUrl('devnet') },
});

// Component to register Enoki wallets - must be rendered inside SuiClientProvider
function RegisterEnokiWallets() {
  const { client, network } = useSuiClientContext();

  useEffect(() => {
    if (!isEnokiNetwork(network)) return;

    if (!enokiApiKey || !googleClientId) return;

    const { unregister } = registerEnokiWallets({
      apiKey: enokiApiKey,
      providers: {
        google: {
          clientId: googleClientId,
        },
      },
      client,
      network,
    });

    return unregister;
  }, [client, network]);

  return null;
}

interface EnokiProviderProps {
  children: ReactNode;
}

export function EnokiProvider({ children }: EnokiProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork={defaultNetwork}>
        <RegisterEnokiWallets />
        <WalletProvider autoConnect>
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

