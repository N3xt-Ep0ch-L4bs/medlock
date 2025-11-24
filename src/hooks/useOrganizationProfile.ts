import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

// Get network from environment
const network = (import.meta.env.VITE_SUI_NETWORK || 'testnet') as 'testnet' | 'mainnet' | 'devnet';

// Create Sui client with network URL to avoid localhost connection issues
const suiClient = new SuiClient({
  url: getFullnodeUrl(network),
});

interface ProfileCheckResult {
  hasProfile: boolean;
  isLoading: boolean;
  error: Error | null;
  profileObjectId: string | null;
  refresh: () => void; // Function to manually refresh the profile
}

// Global event emitter for profile updates
const profileUpdateListeners = new Set<() => void>();

/**
 * Hook to check if an organization has an Organization object in their wallet
 * Uses suix_getOwnedObjects to query for objects of type packageId::organization::Organization
 */
export function useOrganizationProfile(packageId: string): ProfileCheckResult {
  const account = useCurrentAccount();
  // Use the client created with the network URL to avoid localhost connection issues
  const client = useMemo(() => suiClient, []);
  
  const [hasProfile, setHasProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [profileObjectId, setProfileObjectId] = useState<string | null>(null);
  const refreshTriggerRef = useRef(0);

  const checkProfile = useCallback(async () => {
    if (!account?.address || !packageId || !packageId.trim()) {
      setIsLoading(false);
      if (!packageId || !packageId.trim()) {
        setError(new Error('Package ID is not configured. Please set VITE_SUI_PACKAGE_ID in your .env file.'));
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Query for objects of type packageId::organization::Organization
      const normalizedPackageId = packageId.startsWith('0x') ? packageId : `0x${packageId}`;
      const profileType = `${normalizedPackageId}::organization::Organization`;
      
      const result = await client.getOwnedObjects({
        owner: account.address,
        filter: {
          StructType: profileType,
        },
        options: {
          showType: true,
          showContent: true,
          showOwner: false,
        },
      });

      if (result.data && result.data.length > 0) {
        // Profile found - get the first one
        const profileObject = result.data[0];
        const objectId = profileObject.data?.objectId || null;
        setProfileObjectId(objectId);
        setHasProfile(true);
        
        // Try to extract doctors and pharmacies from the Organization object
        // This will be used by the organization dashboard
        if (profileObject.data?.content && 'fields' in profileObject.data.content) {
          const fields = profileObject.data.content.fields as Record<string, any>;
          // Store organization data for later use
          // The Organization object may have doctors and pharmacies fields
        }
      } else {
        // No profile found
        setHasProfile(false);
        setProfileObjectId(null);
      }
    } catch (err) {
      console.error('Error checking for organization profile:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setHasProfile(false);
    } finally {
      setIsLoading(false);
    }
  }, [account?.address, packageId, client]);

  // Refresh function that can be called externally
  const refresh = useCallback(() => {
    refreshTriggerRef.current += 1;
    checkProfile();
  }, [checkProfile]);

  useEffect(() => {
    checkProfile();
  }, [checkProfile]);

  // Listen for profile update events
  useEffect(() => {
    const listener = () => {
      refresh();
    };
    profileUpdateListeners.add(listener);
    return () => {
      profileUpdateListeners.delete(listener);
    };
  }, [refresh]);

  return {
    hasProfile,
    isLoading,
    error,
    profileObjectId,
    refresh,
  };
}

// Export function to trigger profile refresh across all hook instances
export function triggerOrganizationProfileRefresh() {
  profileUpdateListeners.forEach(listener => listener());
}

