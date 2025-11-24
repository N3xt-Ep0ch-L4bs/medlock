import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { useDoctorProfile } from "../hooks/useDoctorProfile";
import { useWalletSigner } from "../hooks/useWalletSigner";
import { SealWalrusService } from "../services/sealWalrusService";
import Logo from "../assets/logo.png";
import { Pill, Settings, Users, Grid2x2, ArrowLeft, Loader2, Upload, X, FileText } from "lucide-react";
import "./doctor.css";

const packageId = import.meta.env.VITE_SUI_PACKAGE_ID || "";
const network = (import.meta.env.VITE_SUI_NETWORK || "testnet") as "testnet" | "mainnet" | "devnet";

interface Patient {
  id: string; // AccessControl object ID
  patientAddress: string; // owner from AccessControl
  name: string;
  age?: number;
  gender?: string;
  lastVisit: string;
  initials: string;
  accessGranted: string;
  expiresIn: string;
  recordsShared: number;
  allRecords: boolean;
  status: "active" | "expiring" | "expired";
  permissions: string[];
  reasonForSharing?: string;
  hasWriteAccess: boolean; // true if permissions includes "Write Records"
  recordsId?: string; // Patient's Records object ID
}

interface Stat {
  img: string;
  label: string;
  value: number;
}

interface Activity {
  img: string;
  text: string;
  time: string;
}

interface Notification {
  icon: string;
  text: string;
  time: string;
}

interface PrescriptionData {
  date: string;
  patient: string;
  medication: string;
  dosage: string;
  status: string;
  dispensed: string;
}

interface Document {
  id: number;
  title: string;
  provider: string;
  date: string;
  size: string;
}

interface Prescription {
  id: number;
  name: string;
  note: string;
  started: string;
  status: string;
}

interface Note {
  id: number;
  date: string;
  text: string;
}

interface Vitals {
  bp: string;
  heartRate: string;
  weight: string;
  height: string;
  bmi: string;
}

interface PatientDetail {
  id: number;
  name: string;
  age: number;
  gender: string;
  initials: string;
  patientId: string;
  allergies: string;
  lastSeen: string;
  documents: Document[];
  prescriptions: Prescription[];
  notes: Note[];
  vitals: Vitals;
  medicalHistory: string[];
}

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const account = useCurrentAccount();
  const suiClientFromProvider = useSuiClient();
  const { hasProfile, isLoading: isProfileLoading, profileObjectId } = useDoctorProfile(packageId);
  const [hasCheckedProfile, setHasCheckedProfile] = useState(false);
  
  const suiClient = useMemo(() => {
    return suiClientFromProvider || new SuiClient({
      url: getFullnodeUrl(network),
    });
  }, [network, suiClientFromProvider]);
  
  // All state hooks must be called before any conditional returns
  const [activePage, setActivePage] = useState<string>("dashboard");
  const [selectedPatient, setSelectedPatient] = useState<PatientDetail | null>(null);
  const [selectedPatientData, setSelectedPatientData] = useState<Patient | null>(null); // Store full patient data including AccessControl ID
  const [newNote, setNewNote] = useState<string>("");
  const [expandedNoteId, setExpandedNoteId] = useState<number | null>(null);
  const [searchPatient, setSearchPatient] = useState<string>("");
  const [searchMedication, setSearchMedication] = useState<string>("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState<boolean>(true);
  const [doctorProfile, setDoctorProfile] = useState<{
    fullName?: string;
    specialty?: string;
    organization?: string;
    email?: string;
    licenseNumber?: string;
  } | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState<string>("");
  const [uploadDescription, setUploadDescription] = useState<string>("");
  const [uploadType, setUploadType] = useState<string>("General");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>("");
  
  const walletSigner = useWalletSigner();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  
  const sealWalrusService = useMemo(() => {
    if (!packageId) return null;
    return new SealWalrusService(
      packageId,
      network
    );
  }, [packageId, network]);

  // Redirect to registration if profile not found
  useEffect(() => {
    if (!isProfileLoading && account?.address && !hasCheckedProfile) {
      setHasCheckedProfile(true);
      if (!hasProfile && packageId) {
        // Profile not found, redirect to registration
        navigate("/doctor/registration", { replace: true });
      }
    }
  }, [
    hasProfile,
    isProfileLoading,
    account?.address,
    hasCheckedProfile,
    packageId,
    navigate,
  ]);

  // Redirect to login if wallet is disconnected
  useEffect(() => {
    if (!account && !isProfileLoading) {
      navigate("/login");
    }
  }, [account, isProfileLoading, navigate]);

  // Fetch AccessControl objects owned by doctor
  useEffect(() => {
    const fetchPatientsWithAccess = async () => {
      if (!account?.address || !suiClient || !packageId) {
        setIsLoadingPatients(false);
        return;
      }

      setIsLoadingPatients(true);
      try {
        const normalizedPackageId = packageId.startsWith('0x') ? packageId : `0x${packageId}`;
        const accessControlType = `${normalizedPackageId}::access_control::AcessControl`;

        // Query for all AccessControl objects owned by the doctor
        const result = await suiClient.getOwnedObjects({
          owner: account.address,
          filter: {
            StructType: accessControlType,
          },
          options: {
            showType: true,
            showContent: true,
            showOwner: true,
          },
        });

        const patientsList: Patient[] = [];
        
        if (result.data && result.data.length > 0) {
          // Process each AccessControl object
          for (const accessControlObj of result.data) {
            try {
              if (!accessControlObj.data?.content || !('fields' in accessControlObj.data.content)) {
                continue;
              }

              const fields = accessControlObj.data.content.fields as Record<string, any>;
              const accessControlId = accessControlObj.data.objectId;
              
              // Extract fields from AccessControl
              const patientAddress = fields.owner || ""; // owner is the patient who granted access
              const allRecords = fields.all_records || false;
              const recordsField = fields.records || [];
              const accessDuration = fields.access_duration || 0; // timestamp in milliseconds
              const reasonForSharing = fields.reason_for_sharing || "";
              const permissions = fields.permissions || 0; // 0 = Read, 1 = Write
              const createdAt = fields.created_at || 0; // timestamp in milliseconds

              // Calculate expiry
              const now = Date.now();
              const expiryTimestamp = Number(accessDuration);
              const isExpired = expiryTimestamp < now;
              const daysUntilExpiry = Math.floor((expiryTimestamp - now) / (1000 * 60 * 60 * 24));
              
              let expiresIn = "Expired";
              let status: "active" | "expiring" | "expired" = "expired";
              
              if (!isExpired) {
                if (daysUntilExpiry <= 7) {
                  status = "expiring";
                  expiresIn = `${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""}`;
                } else {
                  status = "active";
                  expiresIn = `${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""}`;
                }
              }

              // Format access granted date
              const accessGrantedDate = createdAt 
                ? new Date(Number(createdAt)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : "Unknown";

              // Calculate last visit (use access granted date for now)
              const lastVisit = createdAt 
                ? (() => {
                    const daysAgo = Math.floor((now - Number(createdAt)) / (1000 * 60 * 60 * 24));
                    if (daysAgo === 0) return "Today";
                    if (daysAgo === 1) return "Yesterday";
                    if (daysAgo < 7) return `${daysAgo} days ago`;
                    if (daysAgo < 30) return `${Math.floor(daysAgo / 7)} weeks ago`;
                    return `${Math.floor(daysAgo / 30)} months ago`;
                  })()
                : "Unknown";

              // Decode reason_for_sharing (String = vector<u8>)
              let reasonText = "";
              if (reasonForSharing && Array.isArray(reasonForSharing)) {
                try {
                  const reasonBytes = new Uint8Array(reasonForSharing);
                  reasonText = new TextDecoder().decode(reasonBytes);
                } catch (e) {
                  console.warn("Failed to decode reason_for_sharing:", e);
                }
              }

              // Determine permissions text
              const permissionsList = permissions === 1 
                ? ["View Records", "Write Records"] 
                : ["View Records"];

              // Count records shared
              const recordsShared = allRecords ? -1 : (Array.isArray(recordsField) ? recordsField.length : 0);

              // Generate initials from address
              const initials = patientAddress 
                ? patientAddress.slice(2, 4).toUpperCase()
                : "PT";

              // Try to fetch patient profile to get name and Records object ID
              // Shorten address: first 4 chars + ... + last 4 chars
              const shortAddress = patientAddress 
                ? `${patientAddress.slice(0, 4)}...${patientAddress.slice(-4)}`
                : "Unknown";
              let patientName = `Patient (${shortAddress})`;
              let recordsId: string | undefined = undefined;
              
              try {
                const patientProfileType = `${normalizedPackageId}::profile::Profile`;
                const profileResult = await suiClient.getOwnedObjects({
                  owner: patientAddress,
                  filter: { StructType: patientProfileType },
                  options: { showType: true, showContent: true },
                });

                // Extract Records object ID from Profile
                if (profileResult.data && profileResult.data.length > 0) {
                  const profileObj = profileResult.data[0];
                  if (profileObj.data?.content && 'fields' in profileObj.data.content) {
                    const profileFields = profileObj.data.content.fields as Record<string, any>;
                    const recordsIdValue = profileFields.records;
                    if (recordsIdValue) {
                      recordsId = typeof recordsIdValue === 'string' 
                        ? recordsIdValue 
                        : recordsIdValue?.id || String(recordsIdValue);
                    }
                  }
                }
              } catch (error) {
                console.warn("Error fetching patient profile:", error);
              }

              patientsList.push({
                id: accessControlId,
                patientAddress,
                name: patientName,
                lastVisit,
                initials,
                accessGranted: accessGrantedDate,
                expiresIn,
                recordsShared: recordsShared === -1 ? 999 : recordsShared,
                allRecords,
                status,
                permissions: permissionsList,
                reasonForSharing: reasonText,
                hasWriteAccess: permissions === 1, // Write = 1
                recordsId,
              });
            } catch (error) {
              console.error(`Error processing AccessControl ${accessControlObj.data?.objectId}:`, error);
            }
          }
        }

        // Sort by created_at (newest first)
        patientsList.sort((a, b) => {
          // Sort by access granted date
          return 0; // Keep order from blockchain
        });

        setPatients(patientsList);
      } catch (error) {
        console.error("Error fetching patients with access:", error);
        setPatients([]);
      } finally {
        setIsLoadingPatients(false);
      }
    };

    if (account?.address && hasProfile) {
      fetchPatientsWithAccess();
    } else {
      setIsLoadingPatients(false);
    }
  }, [account?.address, suiClient, packageId, hasProfile]);

  // Fetch and decrypt doctor's own profile
  useEffect(() => {
    const fetchDoctorProfile = async () => {
      if (!profileObjectId || !suiClient || !account?.address || !walletSigner || !sealWalrusService || !packageId) {
        return;
      }

      setIsLoadingProfile(true);
      try {
        const normalizedPackageId = packageId.startsWith('0x') ? packageId : `0x${packageId}`;

        // Fetch DoctorProfile object
        const profileObject = await suiClient.getObject({
          id: profileObjectId,
          options: {
            showContent: true,
            showType: true,
          },
        });

        if (!profileObject.data?.content || !('fields' in profileObject.data.content)) {
          setIsLoadingProfile(false);
          return;
        }

        const fields = profileObject.data.content.fields as Record<string, any>;
        
        // Extract profile_cid (walrusId) - it's stored as vector<u8>
        let walrusId: string | null = null;
        const profileCidField = fields.profile_cid;
        
        if (profileCidField) {
          if (typeof profileCidField === 'string') {
            walrusId = profileCidField;
          } else if (Array.isArray(profileCidField)) {
            // Decode from vector<u8> (array of numbers) to string
            try {
              const bytes = new Uint8Array(profileCidField);
              walrusId = new TextDecoder().decode(bytes);
            } catch (e) {
              console.warn("Failed to decode profile_cid from array:", e);
              // Try as base64
              try {
                const base64String = String.fromCharCode(...profileCidField);
                walrusId = atob(base64String);
              } catch (e2) {
                console.warn("Failed to decode profile_cid as base64:", e2);
              }
            }
          } else if (typeof profileCidField === 'object') {
            // Try to extract from object structure
            const data = profileCidField.fields || profileCidField.data || profileCidField.contents || [];
            if (Array.isArray(data)) {
              try {
                const bytes = new Uint8Array(data);
                walrusId = new TextDecoder().decode(bytes);
              } catch (e) {
                console.warn("Failed to decode profile_cid from object:", e);
              }
            }
          }
        }

        if (!walrusId) {
          console.warn("Could not extract walrusId from DoctorProfile");
          setIsLoadingProfile(false);
          return;
        }

        // Try to decrypt the profile
        // Note: If the profile was encrypted with organization's address, this might fail
        // In that case, we'll need to use loadProfileAsOrganization or change encryption approach
        try {
          // For now, try with doctor's address - if it fails, we'll handle it
          // The profile might have been encrypted with the doctor's address during registration
          // or we might need to use a different decryption method
          
          // Since doctor profiles are encrypted with organization's address,
          // we cannot decrypt with doctor's address directly.
          // We'll need to either:
          // 1. Store a separate encrypted copy for the doctor
          // 2. Use organization's credentials (not practical)
          // 3. Display non-encrypted fields from the DoctorProfile object
          
          // For now, let's just extract what we can from the DoctorProfile object itself
          // The profile_cid is there, but we can't decrypt it without organization credentials
          
          // We could try to decrypt anyway - if it fails, we'll catch and continue
          // But since it's encrypted with org address, it will likely fail
          
          // Let's just set basic info from what we can see
          // The actual profile data is encrypted, so we'll show placeholder or try to decrypt
          
          // Try to decrypt the profile
          // Note: Doctor profiles are encrypted with organization's address during registration
          // So decryption with doctor's address will likely fail
          // We'll need to either:
          // 1. Encrypt doctor profiles with doctor's address (requires registration change)
          // 2. Use organization's credentials (not practical for doctor to access)
          // 3. Store a separate encrypted copy for the doctor
          
          // For now, try with doctor's address - if it fails, we'll catch and continue
          // The profile might have been encrypted with doctor's address in some cases
          try {
            const decryptedProfile = await sealWalrusService.loadProfile(
              walrusId,
              account.address, // Doctor's address
              profileObjectId,
              undefined, // No records object for doctor profiles
              walletSigner
            );

            if (decryptedProfile) {
              setDoctorProfile({
                fullName: decryptedProfile.fullName,
                specialty: (decryptedProfile as any).specialty,
                organization: (decryptedProfile as any).organization,
                email: decryptedProfile.email,
                licenseNumber: (decryptedProfile as any).licenseNumber,
              });
            }
          } catch (decryptError) {
            console.warn("Could not decrypt doctor profile:", decryptError);
            // Profile is likely encrypted with organization's address
            // Doctor cannot decrypt their own profile in this case
          }
        } catch (decryptError) {
          console.warn("Could not decrypt doctor profile (may be encrypted with organization address):", decryptError);
          // Profile might be encrypted with organization's address
          // In that case, we can't decrypt it here
          // We'll just show placeholder info
        }
      } catch (error) {
        console.error("Error fetching doctor profile:", error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    if (profileObjectId && hasProfile) {
      fetchDoctorProfile();
    }
  }, [profileObjectId, hasProfile, suiClient, account?.address, walletSigner, sealWalrusService, packageId]);

  // Show loading state while checking for profile
  if (isProfileLoading && !hasCheckedProfile) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        gap: "2rem",
        background: "linear-gradient(to bottom, #f9fbff, #ffffff)",
      }}>
        <div style={{ textAlign: "center" }}>
          <img 
            src={Logo} 
            alt="MedLock Logo" 
            style={{ 
              width: "80px", 
              height: "80px", 
              marginBottom: "2rem" 
            }} 
          />
          <h1 style={{ 
            fontSize: "2rem", 
            fontWeight: 700,
            color: "#111827",
            marginBottom: "1rem",
            fontFamily: '"Figtree", sans-serif',
          }}>
            MedLock
          </h1>
        </div>
        
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.5rem",
        }}>
          <Loader2
            size={48}
            style={{
              color: "#4338ca",
              animation: "spin 1s linear infinite",
            }}
          />
          <p style={{
            fontSize: "1.125rem",
            color: "#6b7280",
            margin: 0,
            fontFamily: '"Figtree", sans-serif',
          }}>
            Loading your doctor profile...
          </p>
        </div>
      </div>
    );
  }

  // If no account after initialization, don't render (redirect will happen)
  if (!account) {
    return null;
  }

  const stats: Stat[] = [
    { img: "src/assets/stat-header1.png", label: "Active Patients", value: patients.filter(p => p.status === "active").length },
    { img: "src/assets/stat-icon2 (1).png", label: "Prescriptions (This Week)", value: 0 }, // TODO: Fetch from blockchain
    { img: "src/assets/stat-header3.png", label: "Expiring Soon", value: patients.filter(p => p.status === "expiring").length },
  ];

  const activities: Activity[] = [
    { img: "src/assets/record-icon3.png", text: "You prescribed Lisinopril 10mg to Sarah Chen", time: "1 hour ago" },
    { img: "src/assets/activity-icon2.png", text: "Access granted by John Doe", time: "3 hours ago" },
    { img: "src/assets/record-icon4.png", text: "You viewed lab results for Michael Park", time: "Yesterday, 4:32 PM" },
    { img: "src/assets/stat-icon2 (1).png", text: "You prescribed Metformin 500mg to Ezekiel Okon", time: "2 days ago" },
  ];

  const notifications: Notification[] = [
    { icon: "🔓", text: "Lisa Johnson granted you access to medical records", time: "15 minutes ago" },
    { icon: "💊", text: "Prescription for Sarah Chen dispensed by CityMed Pharmacy", time: "1 hour ago" },
    { icon: "⚙️", text: "System maintenance scheduled for tonight at 11 PM", time: "3 hours ago" },
    { icon: "🧾", text: "New lab results uploaded for Michael Park", time: "Yesterday" },
  ];

  const prescriptionData: PrescriptionData[] = [
    { date: "Nov 1, 2024 10:30 AM", patient: "Ezekiel Okon", medication: "Lisinopril 10mg", dosage: "Once daily", status: "Active", dispensed: "Not yet" },
    { date: "Oct 30, 2024 2:15 PM", patient: "Sarah Chen", medication: "Atorvastatin 20mg", dosage: "Once daily", status: "Dispensed", dispensed: "Oct 31, 2024" },
  ];

  const samplePatientDetail: PatientDetail = {
    id: 1,
    name: "Ezekiel Okon",
    age: 34,
    gender: "Male",
    initials: "EO",
    patientId: "MLK-2547",
    allergies: "Penicillin, Peanuts",
    lastSeen: "6 days ago",
    documents: [
      { id: 1, title: "Blood Test Results", provider: "City Medical Center", date: "Oct 28, 2024", size: "2.4 MB" },
      { id: 2, title: "ECG Report", provider: "CardioCenter Clinic", date: "Sep 10, 2024", size: "3.2 MB" },
      { id: 3, title: "Lipid Panel", provider: "Quest Diagnostics", date: "Sep 22, 2024", size: "1.6 MB" },
      { id: 4, title: "Chest X-Ray", provider: "City Medical Center - Radiology", date: "Oct 15, 2024", size: "8.7 MB" },
    ],
    prescriptions: [
      { id: 1, name: "Lisinopril 10mg", note: "Once daily", started: "Oct 1, 2024", status: "Active" },
      { id: 2, name: "Metformin 500mg", note: "Twice daily", started: "Sep 15, 2024", status: "Active" },
    ],
    notes: [
      { id: 1, date: "Oct 28, 2024", text: "Patient reports improved symptoms since starting Lisinopril. Blood pressure readings have stabilized." },
      { id: 2, date: "Sep 10, 2024", text: "Initial consultation for hypertension management. Patient has family history of cardiovascular disease." },
    ],
    vitals: { bp: "120/80 mmHg", heartRate: "72 bpm", weight: "165 lbs", height: "5'10\"", bmi: "23.7" },
    medicalHistory: ["Hypertension", "Appendectomy (2015)", "Family history: Father - CAD, Mother - Type 2 Diabetes"],
  };

  const handleOpenPatient = (p: Patient) => {
    setSelectedPatientData(p); // Store full patient data
    setSelectedPatient({
      id: parseInt(p.id.slice(-4), 16) || 1, // Use last 4 chars of object ID as number
      name: p.name,
      age: p.age,
      gender: p.gender,
      initials: p.initials,
      patientId: `MLK-${p.patientAddress.slice(2, 5).toUpperCase()}${p.patientAddress.slice(-3)}`,
      allergies: "Unknown", // TODO: Fetch from patient profile
      lastSeen: p.lastVisit,
      documents: [], // TODO: Fetch from Records object
      prescriptions: [], // TODO: Fetch from blockchain
      notes: [],
      vitals: { bp: "—", heartRate: "—", weight: "—", height: "—", bmi: "—" },
      medicalHistory: [],
    });
    window.scrollTo(0, 0);
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const newNoteObj: Note = { id: Date.now(), date: new Date().toLocaleDateString(), text: newNote.trim() };
    setSelectedPatient(prev => prev ? ({ ...prev, notes: [...prev.notes, newNoteObj] }) : null);
    setNewNote("");
  };

  const toggleExpanded = (id: number) => setExpandedNoteId(expandedNoteId === id ? null : id);
  const handleBack = () => {
    setSelectedPatient(null);
    setSelectedPatientData(null);
  };

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      if (!uploadTitle) {
        // Auto-fill title from filename
        setUploadTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  // Upload record function
  const handleUploadRecord = async () => {
    if (!uploadFile || !uploadTitle || !selectedPatientData || !selectedPatientData.recordsId || !account?.address || !walletSigner || !sealWalrusService) {
      setUploadError("Please fill in all required fields and ensure you have write access.");
      return;
    }

    setIsUploading(true);
    setUploadError("");

    try {
      const normalizedPackageId = packageId.startsWith('0x') ? packageId : `0x${packageId}`;
      const clockObjectId = "0x6";

      // Read file as ArrayBuffer
      const fileBuffer = await uploadFile.arrayBuffer();
      const fileBytes = new Uint8Array(fileBuffer);

      // TODO: Encrypt file and store on Walrus to get file_cid
      // TODO: Encrypt key and store on Walrus to get sealed_key and sealed_key_cid
      // TODO: Get policy_id from Seal
      // For now, using placeholder values
      console.log("Uploading file to Walrus...");
      
      // Create metadata
      const metadata = {
        title: uploadTitle,
        description: uploadDescription || "",
        type: uploadType,
        uploadedBy: account.address,
        uploadedAt: Date.now(),
      };
      const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));
      const metadataVector = Array.from(metadataBytes);

      // Placeholder values - these should be properly generated from Walrus/Seal encryption
      const fileCidBytes = Array.from(new TextEncoder().encode("placeholder_file_cid"));
      const sealedKeyBytes = Array.from(new TextEncoder().encode("placeholder_sealed_key"));
      const sealedKeyCidBytes = Array.from(new TextEncoder().encode("placeholder_sealed_key_cid"));
      const policyIdBytes = Array.from(new TextEncoder().encode("placeholder_policy_id"));

      const tx = new Transaction();
      tx.setSender(account.address);

      tx.moveCall({
        target: `${normalizedPackageId}::helpers::create_record`,
        arguments: [
          tx.object(selectedPatientData.recordsId), // records: &mut Records
          tx.object(selectedPatientData.id), // access_control: &AcessControl
          tx.pure.vector("u8", fileCidBytes), // file_cid: vector<u8>
          tx.pure.vector("u8", sealedKeyBytes), // sealed_key: vector<u8>
          tx.pure.vector("u8", sealedKeyCidBytes), // sealed_key_cid: vector<u8>
          tx.pure.vector("u8", policyIdBytes), // policy_id: vector<u8>
          tx.pure.vector("u8", metadataVector), // metadata: vector<u8>
          tx.object(clockObjectId), // clock: &Clock
        ],
      });

      const result = await signAndExecuteTransaction({
        transaction: tx,
      });

      console.log("Record uploaded successfully:", result.digest);
      
      // Reset form
      setUploadFile(null);
      setUploadTitle("");
      setUploadDescription("");
      setUploadType("General");
      setIsUploadModalOpen(false);
      
      alert("Record uploaded successfully!");
    } catch (error) {
      console.error("Error uploading record:", error);
      setUploadError(
        error instanceof Error 
          ? error.message 
          : "Failed to upload record. Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const filteredData = prescriptionData.filter(
    item => item.patient.toLowerCase().includes(searchPatient.toLowerCase()) &&
            item.medication.toLowerCase().includes(searchMedication.toLowerCase())
  );

  // ---------------- Page content ----------------
  let mainContent: React.ReactNode;
  if (selectedPatient) {
    mainContent = (
      <div className="patient-page">
        <button className="back-btn" onClick={handleBack}><ArrowLeft size={16} /> Back to Dashboard</button>
        <div className="patient-details">
          <div className="patient-main">
            {/* Patient Top */}
            <div className="patient-top card">
              <div className="avatar-large">{selectedPatient.initials}</div>
              <div>
                <h2>{selectedPatient.name} <small>• {selectedPatient.patientId}</small></h2>
                <p className="patient-meta-row">{selectedPatient.age} • {selectedPatient.gender} • Last seen: {selectedPatient.lastSeen}</p>
                <span className="allergy">⚠️ Allergies: {selectedPatient.allergies}</span>
              </div>
            </div>

            {/* Documents */}
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ margin: 0 }}>Documents</h3>
                {selectedPatientData?.hasWriteAccess && selectedPatientData?.recordsId && (
                  <button 
                    className="btn" 
                    onClick={() => setIsUploadModalOpen(true)}
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                  >
                    <Upload size={16} /> Upload Record
                  </button>
                )}
              </div>
              {selectedPatient.documents.length ? selectedPatient.documents.map((d) => (
                <div className="doc-item" key={d.id}>
                  <div className="doc-left">
                    <div className="doc-icon">PDF</div>
                    <div className="doc-meta">
                      <h4>{d.title}</h4>
                      <p>{d.provider} • {d.date} • {d.size}</p>
                    </div>
                  </div>
                  <div className="btn-row">
                    <button className="btn">View</button>
                    <button className="btn">Download</button>
                  </div>
                </div>
              )) : <p className="small-muted">No documents yet.</p>}
            </div>

            <div className="notes-card card">
              <h3>My Notes for This Patient</h3>
              <div className="add-note">
                <textarea placeholder="Write a new note about this patient..." value={newNote} onChange={e => setNewNote(e.target.value)}></textarea>
                <button className="btn" onClick={handleAddNote}>Add Note</button>
              </div>
              <div className="notes-list">
                {selectedPatient.notes.length ? selectedPatient.notes.map(n => (
                  <div key={n.id} className="note-item">
                    <div className="note-header">
                      <strong>{n.date}</strong>
                      <button className="read-more" onClick={() => toggleExpanded(n.id)}>
                        {expandedNoteId === n.id ? "Show less" : "Read more"}
                      </button>
                    </div>
                    <p>{expandedNoteId === n.id ? n.text : n.text.length > 120 ? `${n.text.slice(0,120)}...` : n.text}</p>
                  </div>
                )) : <p className="small-muted">No notes yet.</p>}
              </div>
            </div>
          </div>

          <aside className="patient-right">
            <div className="vitals-card">
              <h3>Active Prescriptions</h3>
              {selectedPatient.prescriptions.length ? selectedPatient.prescriptions.map(rx => (
                <div className="prescription-item" key={rx.id}>
                  <div>
                    <strong>{rx.name}</strong>
                    <p className="small-muted">{rx.note} • Started: {rx.started}</p>
                  </div>
                  <div className="rx-right">
                    <span className="rx-status">{rx.status}</span>
                    <button className="btn">Refill</button>
                  </div>
                </div>
              )) : <p className="small-muted">No active prescriptions.</p>}
            </div>

            <div className="vitals-card">
              <h3>Latest Vitals</h3>
              <div className="vitals-grid">
                <div className="vital"><strong>BP</strong><p>{selectedPatient.vitals.bp}</p></div>
                <div className="vital"><strong>Heart Rate</strong><p>{selectedPatient.vitals.heartRate}</p></div>
                <div className="vital"><strong>Weight</strong><p>{selectedPatient.vitals.weight}</p></div>
                <div className="vital"><strong>Height</strong><p>{selectedPatient.vitals.height}</p></div>
                <div className="vital"><strong>BMI</strong><p>{selectedPatient.vitals.bmi}</p></div>
              </div>
            </div>

            <div className="history-card card">
              <div className="history-header">
                <h3>Medical History</h3>
                <p className="small-muted">Past conditions, surgeries & family background</p>
              </div>
              {selectedPatient.medicalHistory.length ? (
                <ul className="history-list">
                  {selectedPatient.medicalHistory.map((item,i) => (
                    <li key={i} className="history-item"><span className="history-icon">🩺</span> <span className="history-text">{item}</span></li>
                  ))}
                </ul>
              ) : <p className="small-muted">No medical history recorded.</p>}
            </div>

            <div className="action-container">
              <div className="main-card">
                <h2 className="main-card-title">Patient Actions</h2>
                <div className="nested-cards">
                  <div className="nested-card request-records"><h3>Request Records</h3></div>
                  <div className="nested-card send-message"><h3>Send Message</h3></div>
                  <div className="nested-card schedule"><h3>Schedule</h3></div>
                </div>
              </div>
            </div>
          </aside>
        </div>

      </div>
    );
  } else if (activePage === "prescriptions") {
    mainContent = (
      <div className="prescriptions-container">
        <h2>Prescriptions</h2>
        <p>Manage all prescriptions you've created</p>

        <div className="prescriptions-summary">
          <div className="summary-card total"><h3>47</h3><p>Total Prescriptions This Month</p></div>
          <div className="summary-card active"><h3>15</h3><p>Active Prescriptions</p></div>
          <div className="summary-card dispensed"><h3>32</h3><p>Dispensed This Month</p></div>
        </div>

        <div className="filters">
          <input type="text" placeholder="Search patients by name..." value={searchPatient} onChange={e=>setSearchPatient(e.target.value)} />
          <input type="text" placeholder="Search medication..." value={searchMedication} onChange={e=>setSearchMedication(e.target.value)} />
        </div>

        <table className="prescriptions-table">
          <thead>
            <tr>
              <th>Date</th><th>Patient Name</th><th>Medication</th><th>Dosage</th><th>Status</th><th>Dispensed</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length ? filteredData.map((item, idx) => (
              <tr key={idx}>
                <td>{item.date}</td>
                <td>{item.patient}</td>
                <td>{item.medication}</td>
                <td>{item.dosage}</td>
                <td className={item.status.toLowerCase()}>{item.status}</td>
                <td>{item.dispensed}</td>
                <td><button className="view-btn">View</button></td>
              </tr>
            )) : (
              <tr><td colSpan={7} style={{textAlign:"center"}}>No prescriptions found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    );
  } else {
    mainContent = (
      <>
        <div className="stats-container">
          {stats.map((stat, i) => (
            <div className="stat-card" key={i}>
              <div className="stat-header">
                <img src={stat.img} alt={stat.label} className="stat-icon" />
                <h3 className="stat-title">{stat.label}</h3>
              </div>
              <p className="stat-value">{stat.value}</p>
            </div>
          ))}
        </div>

        <section className="patients-section">
          <h3>Patients with Access</h3>
          {isLoadingPatients ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
              <Loader2 size={32} style={{ margin: "0 auto 1rem", animation: "spin 1s linear infinite" }} />
              <p>Loading patients with access...</p>
            </div>
          ) : patients.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
              <p>No patients have granted you access yet.</p>
            </div>
          ) : (
          <div className="records-grid">
            {patients.map(p => (
              <div className="patient-card" key={p.id} onClick={() => handleOpenPatient(p)}>
                <div className="patient-info">
                  <div className="avatar">{p.initials}</div>
                  <div>
                    <h4>{p.name}</h4>
                      <p className="patient-meta">Last visit: {p.lastVisit}</p>
                      <span className={`status ${p.status}`}>
                        {p.status === "active" ? "🟢" : p.status === "expiring" ? "🟡" : "🔴"} {p.status === "active" ? "Active" : p.status === "expiring" ? "Expiring" : "Expired"} • Expires: {p.expiresIn}
                      </span>
                    </div>
                  </div>
                  <span className="chevron">›</span>
              </div>
            ))}
          </div>
          )}
        </section>

        <section className="activity-notifications">
          <div className="activity" style={{ flex: 2 }}>
            <h3>Recent Activity</h3>
            {activities.map((a,i) => (
              <div className="activity-content" key={i}>
                <img src={a.img} alt="activity" className="activity-img" />
                <div className="activity-details">
                  <p>{a.text}</p>
                  <span className="small-muted">{a.time}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="notifications">
            <h3>Notifications</h3>
            {notifications.map((n,i) => (
              <div className="notification-item" key={i}>
                <p>{n.icon} {n.text}</p>
                <span className="notification-time small-muted">{n.time}</span>
              </div>
            ))}
          </div>
        </section>
      </>
    );
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src={Logo} alt="MedLock Logo" style={{ width: "26px", height: "26px" }} />
          <h1>MedLock</h1>
        </div>
        <nav className="sidebar-nav">
          <div className={`sidebar-link ${activePage==="dashboard"?"active":""}`} onClick={()=>setActivePage("dashboard")}><Grid2x2 width={16}/> Dashboard</div>
          <div className={`sidebar-link ${activePage==="patients"?"active":""}`} onClick={()=>setActivePage("patients")}><Users width={16}/> Patients</div>
          <div className={`sidebar-link ${activePage==="prescriptions"?"active":""}`} onClick={()=>setActivePage("prescriptions")}><Pill width={16}/> Prescriptions</div>
          <div className={`sidebar-link ${activePage==="settings"?"active":""}`} onClick={()=>setActivePage("settings")}><Settings width={16}/> Settings</div>
        </nav>
        <div className="doctor-info" style={{ marginTop: "auto", padding: "1rem", borderTop: "1px solid #e5e7eb" }}>
          {isLoadingProfile ? (
            <>
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite", marginBottom: "0.5rem" }} />
              <p className="small-muted">Loading profile...</p>
            </>
          ) : doctorProfile ? (
            <>
              <h4>{doctorProfile.fullName ? `Dr. ${doctorProfile.fullName}` : "Doctor"}</h4>
              <p>{doctorProfile.specialty || "Specialty not set"}</p>
              {doctorProfile.organization && (
                <p className="small-muted" style={{ marginTop: "0.25rem" }}>
                  {doctorProfile.organization.startsWith('0x') && doctorProfile.organization.length > 20
                    ? `${doctorProfile.organization.slice(0, 6)}...${doctorProfile.organization.slice(-4)}`
                    : doctorProfile.organization}
                </p>
              )}
              {account?.address && (
                <small className="small-muted" style={{ marginTop: "0.25rem", display: "block" }}>
                  Wallet: {account.address.slice(0, 6)}...{account.address.slice(-4)}
                </small>
              )}
              {profileObjectId && (
                <small className="small-muted" style={{ marginTop: "0.25rem", display: "block" }}>
                  ID: {profileObjectId.slice(0, 6)}...{profileObjectId.slice(-4)}
                </small>
              )}
              {doctorProfile.licenseNumber && (
                <small className="small-muted" style={{ display: "block" }}>
                  License: {doctorProfile.licenseNumber.length > 12 
                    ? `${doctorProfile.licenseNumber.slice(0, 8)}...${doctorProfile.licenseNumber.slice(-4)}`
                    : doctorProfile.licenseNumber}
                </small>
              )}
            </>
          ) : (
            <>
              <h4>Doctor</h4>
              <p className="small-muted">Profile not available</p>
              {profileObjectId && (
                <small className="small-muted" style={{ marginTop: "0.25rem", display: "block" }}>
                  ID: {profileObjectId.slice(0, 6)}...{profileObjectId.slice(-4)}
                </small>
              )}
            </>
          )}
        </div>
      </aside>

      <main className="main-area">
        <header className="doctor-topbar">
          <h2 style={{ 
            fontSize: "1.5rem",
            fontWeight: 600,
            color: "#111827",
            fontFamily: '"Figtree", sans-serif',
            margin: 0,
          }}>
            {activePage === "dashboard" ? "Dashboard" : activePage === "prescriptions" ? "Prescriptions" : activePage === "patients" ? "Patients" : "Settings"}
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div className="search-bar" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input type="text" placeholder="Search patients by name or ID" style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: "14px" }}/>
            </div>
            <button className="filter-btn">Filter</button>
          </div>
        </header>

        <div style={{ padding: "2rem 2.5rem", width: "100%", boxSizing: "border-box" }}>
          {mainContent}
        </div>
      </main>

      {/* Upload Record Modal */}
      {isUploadModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            padding: "2rem",
          }}
          onClick={() => !isUploading && setIsUploadModalOpen(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "2rem",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 600 }}>Upload Patient Record</h3>
              <button
                onClick={() => !isUploading && setIsUploadModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  color: "#6b7280",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "6px",
                }}
                disabled={isUploading}
              >
                <X size={20} />
              </button>
            </div>

            {uploadError && (
              <div style={{
                padding: "0.75rem 1rem",
                background: "#fee2e2",
                color: "#991b1b",
                borderRadius: "8px",
                marginBottom: "1rem",
                fontSize: "0.875rem",
              }}>
                {uploadError}
              </div>
            )}

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, fontSize: "0.875rem" }}>
                File *
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                disabled={isUploading}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                }}
              />
              {uploadFile && (
                <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>
                  Selected: {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, fontSize: "0.875rem" }}>
                Title *
              </label>
              <input
                type="text"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="e.g., Blood Test Results"
                disabled={isUploading}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                }}
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, fontSize: "0.875rem" }}>
                Type
              </label>
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
                disabled={isUploading}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                }}
              >
                <option value="General">General</option>
                <option value="Lab Results">Lab Results</option>
                <option value="Imaging">Imaging</option>
                <option value="Prescription">Prescription</option>
                <option value="Note">Note</option>
              </select>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, fontSize: "0.875rem" }}>
                Description
              </label>
              <textarea
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                placeholder="Optional description..."
                disabled={isUploading}
                rows={3}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  resize: "vertical",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                disabled={isUploading}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  borderRadius: "8px",
                  cursor: isUploading ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleUploadRecord}
                disabled={isUploading || !uploadFile || !uploadTitle}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: isUploading || !uploadFile || !uploadTitle ? "#d1d5db" : "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: isUploading || !uploadFile || !uploadTitle ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                {isUploading ? (
                  <>
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Upload Record
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;

