import { useEffect, useState, useMemo, useCallback } from 'react';
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
  name?: string; // Will be populated after decryption if needed
  specialty?: string;
}

interface AllDoctorsResult {
  doctors: DoctorInfo[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Hook to fetch all DoctorProfile objects
 * Note: This queries all DoctorProfile objects on the blockchain
 * In production, you might want to filter by organization or use an index
 */
export function useAllDoctors(packageId: string): AllDoctorsResult {
  const client = useMemo(() => suiClient, []);
  
  const [doctors, setDoctors] = useState<DoctorInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const refreshTriggerRef = useState(0)[0];

  const fetchDoctors = useCallback(async () => {
    if (!packageId || !packageId.trim()) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const normalizedPackageId = packageId.startsWith('0x') ? packageId : `0x${packageId}`;
      const doctorProfileType = `${normalizedPackageId}::doctors::DoctorProfile`;
      
      // Query for all DoctorProfile objects
      // Note: This will get all doctors on the blockchain
      // In production, you might want to use a paginated query or filter
      const result = await client.getOwnedObjects({
        owner: "0x0000000000000000000000000000000000000000000000000000000000000000", // This won't work for getting all
        filter: {
          StructType: doctorProfileType,
        },
        options: {
          showType: true,
          showContent: true,
          showOwner: true,
        },
      });

      // TODO: Sui doesn't support querying all objects of a type directly
      // We need to either:
      // 1. Use a Move function that returns all doctor IDs
      // 2. Query by organization and aggregate
      // 3. Use an index/registry object
      // For now, return empty array - this needs to be implemented
      setDoctors([]);
    } catch (err) {
      console.error('Error fetching all doctors:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setDoctors([]);
    } finally {
      setIsLoading(false);
    }
  }, [packageId, client]);

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

