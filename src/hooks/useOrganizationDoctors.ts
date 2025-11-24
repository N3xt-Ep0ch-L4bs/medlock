import { useEffect, useState, useMemo, useCallback } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

// Get network from environment
const network = (import.meta.env.VITE_SUI_NETWORK || 'testnet') as 'testnet' | 'mainnet' | 'devnet';

// Create Sui client with network URL
const suiClient = new SuiClient({
  url: getFullnodeUrl(network),
});

interface DoctorInfo {
  profileObjectId: string;
  ownerAddress: string;
  profileCid: string; // walrusId
}

interface OrganizationDoctorsResult {
  doctors: DoctorInfo[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Hook to fetch all doctors registered under an organization
 */
export function useOrganizationDoctors(
  packageId: string,
  organizationObjectId: string | null
): OrganizationDoctorsResult {
  const account = useCurrentAccount();
  const client = useMemo(() => suiClient, []);
  
  const [doctors, setDoctors] = useState<DoctorInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const refreshTriggerRef = useState(0)[0];

  const fetchDoctors = useCallback(async () => {
    if (!account?.address || !packageId || !organizationObjectId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const normalizedPackageId = packageId.startsWith('0x') ? packageId : `0x${packageId}`;
      const doctorProfileType = `${normalizedPackageId}::doctors::DoctorProfile`;
      
      // Query for all DoctorProfile objects
      // Note: We'll need to filter by organization on-chain or use a different query method
      // For now, we'll get all doctor profiles and filter client-side
      const result = await client.getOwnedObjects({
        owner: account.address, // This won't work - we need to query by organization
        filter: {
          StructType: doctorProfileType,
        },
        options: {
          showType: true,
          showContent: true,
          showOwner: false,
        },
      });

      // TODO: This approach won't work because doctors are owned by their own addresses
      // We need to query the Organization object to get the list of registered doctors
      // For now, return empty array - this needs to be implemented via Move function
      setDoctors([]);
    } catch (err) {
      console.error('Error fetching organization doctors:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setDoctors([]);
    } finally {
      setIsLoading(false);
    }
  }, [account?.address, packageId, organizationObjectId, client]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors, refreshTriggerRef]);

  const refresh = useCallback(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  return {
    doctors,
    isLoading,
    error,
    refresh,
  };
}

