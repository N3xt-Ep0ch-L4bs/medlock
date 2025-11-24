import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

// Get network from environment
const network = (import.meta.env.VITE_SUI_NETWORK || 'testnet') as 'testnet' | 'mainnet' | 'devnet';

// Create Sui client with network URL to avoid localhost connection issues
const suiClient = new SuiClient({
  url: getFullnodeUrl(network),
});

interface ProfileData {
  fullName?: string;
  email?: string;
  phone?: string;
  patientId?: string;
  bloodType?: string;
  allergies?: string;
}

interface ProfileCheckResult {
  hasProfile: boolean;
  isLoading: boolean;
  error: Error | null;
  profileObjectId: string | null;
  profileData: ProfileData | null;
  walrusId: string | null;
  recordsId: string | null; // Records object ID from Profile
  refresh: () => void; // Function to manually refresh the profile
}

// Global event emitter for profile updates
const profileUpdateListeners = new Set<() => void>();

/**
 * Hook to check if a patient has a Profile object in their wallet
 * Uses suix_getOwnedObjects to query for objects of type packageId::patients::Profile
 */
export function usePatientProfile(packageId: string): ProfileCheckResult {
  const account = useCurrentAccount();
  // Use the client created with the network URL to avoid localhost connection issues
  const client = useMemo(() => suiClient, []);
  
  const [hasProfile, setHasProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [profileObjectId, setProfileObjectId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [walrusId, setWalrusId] = useState<string | null>(null);
  const [recordsId, setRecordsId] = useState<string | null>(null);
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

    // Check localStorage for walrusId first
    const storedWalrusId = localStorage.getItem(`walrusId_${account.address}`);
    if (storedWalrusId) {
      setWalrusId(storedWalrusId);
    }

    try {
      // Query for objects of type packageId::patients::Profile
      // Ensure packageId is properly formatted (remove 0x if needed, or ensure it's there)
      const normalizedPackageId = packageId.startsWith('0x') ? packageId : `0x${packageId}`;
      const profileType = `${normalizedPackageId}::patients::Profile`;
      
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
        console.log('profileObject:', profileObject);
        const objectId = profileObject.data?.objectId || null;
        setProfileObjectId(objectId);
        setHasProfile(true);
        
        // Extract profile data from the object content
        if (profileObject.data?.content && 'fields' in profileObject.data.content) {
          const fields = profileObject.data.content.fields as Record<string, any>;
          setProfileData({
            fullName: fields.full_name || fields.fullName || '',
            email: fields.email || '',
            phone: fields.phone || '',
            patientId: fields.patient_id || fields.patientId || '',
            bloodType: fields.blood_type || fields.bloodType || '',
            allergies: fields.allergies || '',
          });
          // Extract walrusId from profile_cid (it's stored as vector<u8>)
          // Sui returns vector<u8> as base64-encoded string
          const profileCid = fields.profile_cid;
          if (profileCid) {
            try {
              // profile_cid is vector<u8> which Sui returns as base64 string
              // We need to decode it from base64 to get the original walrusId string
              if (typeof profileCid === 'string') {
                // Decode base64 to get the original string
                const decodedBytes = Uint8Array.from(atob(profileCid), c => c.charCodeAt(0));
                const decoded = new TextDecoder().decode(decodedBytes);
                setWalrusId(decoded);
              } else if (Array.isArray(profileCid)) {
                // If it's already an array of numbers, decode directly
                const decoded = new TextDecoder().decode(new Uint8Array(profileCid));
                setWalrusId(decoded);
              }
            } catch (e) {
              console.warn('Failed to decode profile_cid:', e, profileCid);
            }
          }
          // Extract records ID from Profile object
          // records is an ID type, which Sui returns as a string
          const recordsIdValue = fields.records;
          if (recordsIdValue) {
            // ID fields are returned as strings
            const recordsIdStr = typeof recordsIdValue === 'string' 
              ? recordsIdValue 
              : recordsIdValue?.id || String(recordsIdValue);
            setRecordsId(recordsIdStr);
          }
        } else {
          setProfileData(null);
          setWalrusId(null);
          setRecordsId(null);
        }
      } else {
        // No profile found
        setHasProfile(false);
        setProfileObjectId(null);
        setProfileData(null);
        setWalrusId(null);
        setRecordsId(null);
      }
    } catch (err) {
      console.error('Error checking for patient profile:', err);
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
    profileData,
    walrusId,
    recordsId,
    refresh,
  };
}

// Export function to trigger profile refresh across all hook instances
export function triggerProfileRefresh() {
  profileUpdateListeners.forEach(listener => listener());
}

