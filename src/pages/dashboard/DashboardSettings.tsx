import { useState, useEffect, useMemo, useRef } from "react";
import {
  useCurrentAccount,
  useCurrentWallet,
  useSuiClient,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import {
  Camera,
  Check,
  Download,
  Printer,
  Trash2,
  Settings,
  Loader2,
} from "lucide-react";
import { usePatientProfile, triggerProfileRefresh } from "../../hooks/usePatientProfile";
import { useWalletSigner } from "../../hooks/useWalletSigner";
import { SealWalrusService } from "../../services/sealWalrusService";
import "../dashboard.css";

export const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState<string>("personal");
  const [emailNotif, setEmailNotif] = useState<boolean>(true);
  const [smsNotif, setSmsNotif] = useState<boolean>(false);

  // Default profile data - all fields empty by default
  const defaultProfileData = {
    fullName: "",
    email: "",
    phone: "",
    patientId: "",
    profileImage: "",
  };

  // Profile form state
  const [profileData, setProfileData] = useState(defaultProfileData);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState(defaultProfileData);
  const [dataInitialized, setDataInitialized] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    phone?: string;
  }>({});
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [originalProfileImage, setOriginalProfileImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Check if profile exists and load profile data
  const packageId = import.meta.env.VITE_SUI_PACKAGE_ID || "";
  const network = (import.meta.env.VITE_SUI_NETWORK || "testnet") as
    | "testnet"
    | "mainnet"
    | "devnet";
  // Optional: allow custom Seal server IDs via environment variable
  const customSealServerIds = (import.meta.env.VITE_SEAL_SERVER_IDS || "")
    .split(",")
    .filter(Boolean);
  // Enoki private API key for sponsored transactions (should be on backend in production)
  const enokiPrivateApiKey = import.meta.env.VITE_ENOKI_PRIVATE_API_KEY;
  const {
    hasProfile,
    isLoading: isProfileLoading,
    profileData: blockchainProfileData,
    walrusId,
    recordsId,
    profileObjectId,
  } = usePatientProfile(packageId);
  const account = useCurrentAccount();
  const { currentWallet } = useCurrentWallet();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  // Use useSuiClient to get the client from the provider (with correct network)
  const suiClientFromProvider = useSuiClient();

  // Create Sui client for the correct network (testnet/mainnet/devnet)
  // Use the client from provider if available, otherwise create one with network URL
  const suiClient = useMemo(() => {
    // If provider client is available and connected to the correct network, use it
    // Otherwise, create a new client with the correct network URL
    return suiClientFromProvider || new SuiClient({
      url: getFullnodeUrl(network),
    });
  }, [network, suiClientFromProvider]);

  // Initialize Seal/Walrus service using getAllowlistedKeyServers
  const sealWalrusService = useMemo(() => {
    if (!packageId) return null;
    return new SealWalrusService(
      packageId,
      network,
      customSealServerIds.length > 0 ? customSealServerIds : undefined,
      enokiPrivateApiKey
    );
  }, [packageId, network, customSealServerIds.join(","), enokiPrivateApiKey]);

  // Get wallet signer for Walrus operations
  const walletSigner = useWalletSigner();

  // Load profile from Walrus if walrusId exists
  useEffect(() => {
    if (
      isProfileLoading ||
      dataInitialized ||
      isEditing ||
      !sealWalrusService ||
      !account?.address
    )
      return;

    const loadFromWalrus = async () => {
      // Check both hook walrusId and localStorage
      const storedWalrusId = localStorage.getItem(
        `walrusId_${account.address}`
      );
      const profileWalrusId = walrusId || storedWalrusId;

      if (profileWalrusId && profileObjectId && recordsId) {
        setIsLoadingProfile(true);
        try {
          const walrusProfileData = await sealWalrusService.loadProfile(
            profileWalrusId,
            account.address,
            profileObjectId,
            recordsId,
            walletSigner,
            () => {
              // Callback when transaction is built - transition from stage 1 to stage 2
              setIsLoadingProfile(false);
              setIsDecrypting(true);
            }
          );

          if (walrusProfileData) {
            const mergedData = {
              ...defaultProfileData,
              fullName: walrusProfileData.fullName || defaultProfileData.fullName,
              email: walrusProfileData.email || defaultProfileData.email,
              phone: walrusProfileData.phone || defaultProfileData.phone,
              patientId:
                walrusProfileData.patientId || defaultProfileData.patientId,
              profileImage: walrusProfileData.profileImage || defaultProfileData.profileImage,
            };
            setProfileData(mergedData);
            setOriginalData(mergedData);
            // Set profile image if it exists
            if (walrusProfileData.profileImage) {
              setProfileImage(walrusProfileData.profileImage);
              setOriginalProfileImage(walrusProfileData.profileImage);
            }
            setDataInitialized(true);
            setIsDecrypting(false);
            setIsLoadingProfile(false);
            // Trigger profile refresh to update other components
            triggerProfileRefresh();
            return;
          }
        } catch (error) {
          console.error("Error loading profile from Walrus:", error);
          setIsDecrypting(false);
          setIsLoadingProfile(false);
        } finally {
          setIsDecrypting(false);
          setIsLoadingProfile(false);
        }
      }

      // Fallback to blockchain data or defaults
      if (
        blockchainProfileData &&
        Object.keys(blockchainProfileData).length > 0
      ) {
        const mergedData = {
          ...defaultProfileData,
          fullName: blockchainProfileData.fullName || defaultProfileData.fullName,
          email: blockchainProfileData.email || defaultProfileData.email,
          phone: blockchainProfileData.phone || defaultProfileData.phone,
          patientId:
            blockchainProfileData.patientId || defaultProfileData.patientId,
          profileImage: (blockchainProfileData as any).profileImage || defaultProfileData.profileImage,
        };
        setProfileData(mergedData);
        setOriginalData(mergedData);
        // Set profile image if it exists
        if ((blockchainProfileData as any).profileImage) {
          setProfileImage((blockchainProfileData as any).profileImage);
          setOriginalProfileImage((blockchainProfileData as any).profileImage);
        }
        setDataInitialized(true);
      } else if (!hasProfile && !isProfileLoading) {
        setProfileData(defaultProfileData);
        setOriginalData(defaultProfileData);
        setProfileImage(null);
        setOriginalProfileImage(null);
        setDataInitialized(true);
      }
    };

    loadFromWalrus();
  }, [
    walrusId,
    blockchainProfileData,
    hasProfile,
    isProfileLoading,
    isEditing,
    dataInitialized,
    sealWalrusService,
    account?.address,
    currentWallet,
    profileObjectId,
    recordsId,
    walletSigner,
  ]);

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate phone number (only numbers, +, -, spaces, parentheses)
  const validatePhone = (phone: string): boolean => {
    // Allow numbers, +, -, spaces, parentheses
    const phoneRegex = /^[\d\s\+\-\(\)]*$/;
    return phoneRegex.test(phone);
  };

  // Handle input changes with validation
  const handleInputChange = (field: string, value: string) => {
    // Clear previous validation error for this field
    setValidationErrors((prev) => ({ ...prev, [field]: undefined }));

    if (field === "phone") {
      // Only allow numbers, +, -, spaces, and parentheses
      if (value === "" || validatePhone(value)) {
        setProfileData((prev) => ({ ...prev, [field]: value }));
        setHasChanges(true);
      }
    } else if (field === "email") {
      setProfileData((prev) => ({ ...prev, [field]: value }));
      setHasChanges(true);
      // Validate email on blur or when user finishes typing
      if (value && !validateEmail(value)) {
        setValidationErrors((prev) => ({
          ...prev,
          email: "Please enter a valid email address",
        }));
      }
    } else {
      setProfileData((prev) => ({ ...prev, [field]: value }));
      setHasChanges(true);
    }
  };

  // Handle email blur to validate
  const handleEmailBlur = () => {
    if (profileData.email && !validateEmail(profileData.email)) {
      setValidationErrors((prev) => ({
        ...prev,
        email: "Please enter a valid email address",
      }));
    }
  };

  // Handle profile image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB.");
      return;
    }

    // Read file as data URL for preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileImage(reader.result as string);
      setHasChanges(true);
    };
    reader.onerror = () => {
      alert("Error reading image file.");
    };
    reader.readAsDataURL(file);
  };

  // Trigger file input when button is clicked
  const handleChangePhotoClick = () => {
    if (isEditing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Start editing
  const handleEdit = () => {
    // Prevent editing if profile already exists on-chain
    if (hasProfile) {
      alert("Profile can only be created and edited once. Editing is disabled.");
      return;
    }
    setOriginalData(profileData);
    setOriginalProfileImage(profileImage);
    setIsEditing(true);
    setHasChanges(false);
  };

  // Cancel editing
  const handleCancel = () => {
    setProfileData(originalData);
    setProfileImage(originalProfileImage);
    setIsEditing(false);
    setHasChanges(false);
  };

  // Save profile
  const handleSave = async () => {
    if (!account?.address || !sealWalrusService || !walletSigner) {
      alert("Wallet not connected. Please connect your wallet first.");
      return;
    }

    // Validate email before saving
    if (profileData.email && !validateEmail(profileData.email)) {
      setValidationErrors({ email: "Please enter a valid email address" });
      alert("Please enter a valid email address before saving.");
      return;
    }

    // Validate phone format
    if (profileData.phone && !validatePhone(profileData.phone)) {
      setValidationErrors({ phone: "Phone number can only contain numbers and formatting characters (+, -, spaces, parentheses)" });
      alert("Please enter a valid phone number.");
      return;
    }

    setIsSaving(true);
    try {
      if (!walletSigner) {
        throw new Error("Wallet signer not available. Please ensure your wallet is connected.");
      }

      // Prepare profile data for saving (exclude health information fields)
      const profileDataToSave = {
        fullName: profileData.fullName,
        email: profileData.email,
        phone: profileData.phone,
        patientId: profileData.patientId || account.address,
        bloodType: "",
        allergies: "",
        profileImage: profileImage || "",
      };

      // Encrypt and save to Walrus
      const { walrusId: newWalrusId, backupKey } =
        await sealWalrusService.saveProfile(
          profileDataToSave,
          account.address,
          walletSigner,
          2, // threshold
          3 // epochs
        );

      // Store walrusId in localStorage
      if (newWalrusId) {
        localStorage.setItem(`walrusId_${account.address}`, newWalrusId);
        if (backupKey) {
          localStorage.setItem(`backupKey_${account.address}`, backupKey);
          console.log(
            "Backup key saved. Store this securely for disaster recovery."
          );
        }
      }

      // Call create_profile after saving to walrus
      if (newWalrusId && packageId) {
        try {
          console.log("Calling create_profile after saving to walrus...");
          
          // Normalize packageId to ensure it has 0x prefix
          const normalizedPackageId = packageId.trim().startsWith('0x') 
            ? packageId.trim() 
            : `0x${packageId.trim()}`;
          
          // Convert walrusId (string) to vector<u8> (bytes)
          const profileCidBytes = Array.from(new TextEncoder().encode(newWalrusId));
          
          // Create transaction to call create_profile
          const tx = new Transaction();
          
          // Clock object ID (standard Sui Clock object)
          const clockObjectId = "0x6";
          
          tx.moveCall({
            target: `${normalizedPackageId}::patients::create_profile`,
            arguments: [
              tx.pure.vector("u8", profileCidBytes),
              tx.object(clockObjectId), // Clock object
            ],
          });

          // Sign and execute the transaction
          const result = await signAndExecuteTransaction({
            transaction: tx,
          });

          console.log("create_profile called successfully:", result.digest);
        } catch (error) {
          console.error("Error calling create_profile:", error);
          // Don't fail the entire save if on-chain call fails
          // The profile is already saved to Walrus
          alert(
            `Profile saved to Walrus, but failed to call create_profile: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }

      setOriginalData(profileData);
      setOriginalProfileImage(profileImage);
      setIsEditing(false);
      setHasChanges(false);

      alert("Profile encrypted and saved successfully!");
    } catch (error) {
      console.error("Error saving profile:", error);
      alert(
        `Failed to save profile: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="settings-container" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      {/* TITLE */}
      <h2 className="settings-page-title">Settings</h2>

      {/* Profile Setup Alert */}
      {!isProfileLoading && !hasProfile && packageId && (
        <div
          style={{
            backgroundColor: "#fff3cd",
            border: "1px solid #ffc107",
            borderRadius: "8px",
            padding: "1rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div style={{ flex: 1 }}>
            <strong style={{ display: "block", marginBottom: "0.5rem" }}>
              Profile Setup Required
            </strong>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#666" }}>
              You need to set up your patient profile to continue using MedLock.
              Please fill out the information below to create your profile. Note: Your profile can only be created and edited once.
            </p>
          </div>
        </div>
      )}

      {/* Profile Locked Alert */}
      {!isProfileLoading && hasProfile && (
        <div
          style={{
            backgroundColor: "#e0f2fe",
            border: "1px solid #0ea5e9",
            borderRadius: "8px",
            padding: "1rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div style={{ flex: 1 }}>
            <strong style={{ display: "block", marginBottom: "0.5rem" }}>
              Profile Locked
            </strong>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#666" }}>
              Your profile has been created on-chain and is now locked. Profile can only be created and edited once for security purposes.
            </p>
          </div>
        </div>
      )}

      {/* SETTINGS CONTENT WRAPPER */}
      <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
        {/* TABS */}
        <div className="settings-tabs">
          <button
            className={activeTab === "personal" ? "active" : ""}
            onClick={() => setActiveTab("personal")}
          >
            Personal
          </button>

          <button
            className={activeTab === "preferences" ? "active" : ""}
            onClick={() => setActiveTab("preferences")}
          >
            Preferences
          </button>
        </div>

        {activeTab === "personal" && (
        <div className="settings-card">
          {/* Stage 1: Loading Profile Object - Show Spinner */}
          {isLoadingProfile && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "4rem 2rem",
              gap: "1rem",
            }}>
              <Loader2 size={32} style={{ 
                color: "#4338ca",
                animation: "spin 1s linear infinite",
              }} />
              <p style={{ 
                color: "#6b7280",
                fontSize: "0.875rem",
                margin: 0,
              }}>
                Loading profile...
              </p>
            </div>
          )}

          {/* Stage 2: Decrypting - Show Form with Skeleton Loaders */}
          {!isLoadingProfile && (
            <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
              }}
            >
              <h3 className="section-title" style={{ margin: 0 }}>
                Profile
              </h3>
            {!isEditing ? (
              <button
                className="field-action-btn"
                onClick={handleEdit}
                disabled={hasProfile}
                style={{ 
                  margin: 0,
                  opacity: hasProfile ? 0.6 : 1,
                  cursor: hasProfile ? "not-allowed" : "pointer",
                }}
                title={hasProfile ? "Profile can only be created and edited once. Editing is disabled." : ""}
              >
                <Settings size={14} style={{ marginRight: "0.5rem" }} />
                Edit Profile
              </button>
            ) : (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  className="field-action-btn"
                  onClick={handleCancel}
                  disabled={isSaving}
                  style={{
                    margin: 0,
                    backgroundColor: "#f3f4f6",
                    color: "#374151",
                  }}
                >
                  Cancel
                </button>
                <button
                  className="field-action-btn"
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges}
                  style={{
                    margin: 0,
                    backgroundColor: "#3b82f6",
                    color: "white",
                    opacity: !hasChanges || isSaving ? 0.6 : 1,
                  }}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>

          <div className="profile-header">
            {isDecrypting ? (
              <div className="profile-image-skeleton">
                <div className="skeleton-shimmer"></div>
              </div>
            ) : profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div className="initial-circle">
                {profileData.fullName
                  ? profileData.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  : "??"}
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageChange}
              style={{ display: "none" }}
            />
            <button
              className="change-photo-btn"
              disabled={!isEditing}
              onClick={handleChangePhotoClick}
              type="button"
              style={{
                opacity: isEditing ? 1 : 0.6,
                cursor: isEditing ? "pointer" : "not-allowed",
              }}
            >
              <Camera size={16} /> Change Photo
            </button>
          </div>

          <div className="settings-field">
            <label>Full Name</label>
            {isDecrypting ? (
              <div className="input-skeleton">
                <div className="skeleton-shimmer"></div>
              </div>
            ) : (
              <input
                type="text"
                value={profileData.fullName}
                readOnly={!isEditing}
                onChange={(e) => handleInputChange("fullName", e.target.value)}
                placeholder="Enter your full name"
                required
                style={{
                  cursor: isEditing ? "text" : "not-allowed",
                  backgroundColor: isEditing ? "white" : "#f9fafb",
                }}
              />
            )}
          </div>

          <div className="settings-field">
            <label>Email Address</label>
            {isDecrypting ? (
              <div className="input-skeleton">
                <div className="skeleton-shimmer"></div>
              </div>
            ) : (
              <div className="field-row">
                <input
                  type="email"
                  value={profileData.email}
                  readOnly={!isEditing}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  onBlur={handleEmailBlur}
                  placeholder="Enter your email address"
                  required
                  style={{
                    cursor: isEditing ? "text" : "not-allowed",
                    backgroundColor: isEditing ? "white" : "#f9fafb",
                    borderColor: validationErrors.email ? "#ef4444" : undefined,
                  }}
                />
                {profileData.email && 
                 !validationErrors.email && 
                 validateEmail(profileData.email) && (
                  <span className="verified">
                    <Check size={14} /> Verified
                  </span>
                )}
                {!isEditing && (
                  <button className="field-action-btn">Change</button>
                )}
              </div>
            )}
            {!isDecrypting && validationErrors.email && (
              <small
                style={{
                  display: "block",
                  marginTop: "0.25rem",
                  color: "#ef4444",
                  fontSize: "0.75rem",
                }}
              >
                {validationErrors.email}
              </small>
            )}
          </div>

          <div className="settings-field">
            <label>Phone Number</label>
            {isDecrypting ? (
              <div className="input-skeleton">
                <div className="skeleton-shimmer"></div>
              </div>
            ) : (
              <div className="field-row">
                <input
                  type="tel"
                  value={profileData.phone}
                  readOnly={!isEditing}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  onKeyDown={(e) => {
                    // Prevent typing letters and special characters except allowed ones
                    if (!isEditing) return;
                    const allowedKeys = [
                      "Backspace",
                      "Delete",
                      "Tab",
                      "Escape",
                      "Enter",
                      "ArrowLeft",
                      "ArrowRight",
                      "ArrowUp",
                      "ArrowDown",
                      "Home",
                      "End",
                    ];
                    const allowedChars = /[\d\s\+\-\(\)]/;
                    
                    if (
                      !allowedKeys.includes(e.key) &&
                      !allowedChars.test(e.key) &&
                      !e.ctrlKey &&
                      !e.metaKey
                    ) {
                      e.preventDefault();
                    }
                  }}
                  placeholder="Enter your phone number (numbers only)"
                  required
                  style={{
                    cursor: isEditing ? "text" : "not-allowed",
                    backgroundColor: isEditing ? "white" : "#f9fafb",
                    borderColor: validationErrors.phone ? "#ef4444" : undefined,
                  }}
                />
                {profileData.phone && 
                 !validationErrors.phone && 
                 validatePhone(profileData.phone) && (
                  <span className="verified">
                    <Check size={14} /> Verified
                  </span>
                )}
                {!isEditing && (
                  <button className="field-action-btn">Change</button>
                )}
              </div>
            )}
            {!isDecrypting && validationErrors.phone && (
              <small
                style={{
                  display: "block",
                  marginTop: "0.25rem",
                  color: "#ef4444",
                  fontSize: "0.75rem",
                }}
              >
                {validationErrors.phone}
              </small>
            )}
          </div>

          <div className="settings-field">
            <label>Wallet Address</label>
            <input
              type="text"
              className="readonly-input"
              value={account?.address || ""}
              readOnly
              style={{
                cursor: "not-allowed",
                backgroundColor: "#f9fafb",
              }}
            />
            <small
              style={{
                display: "block",
                marginTop: "0.25rem",
                color: "#6b7280",
                fontSize: "0.75rem",
              }}
            >
              Wallet address cannot be changed
            </small>
          </div>

          {!isEditing && (
            <button className="view-profile-btn">
              View Complete Medical Profile
            </button>
          )}
            </>
          )}
        </div>
      )}

      {activeTab === "preferences" && (
        <div className="preferences-wrapper">
          <div className="pref-card">
            <h3 className="section-title">Notifications</h3>

            <div className="pref-row">
              <div>
                <p className="pref-label">Email Notifications</p>
                <button className="pref-link">Customize Email</button>
              </div>

              <label className="switch">
                <input
                  type="checkbox"
                  checked={emailNotif}
                  onChange={() => setEmailNotif(!emailNotif)}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="pref-row">
              <div>
                <p className="pref-label">SMS Notifications</p>
                <button className="pref-link">Customize SMS</button>
              </div>

              <label className="switch">
                <input
                  type="checkbox"
                  checked={smsNotif}
                  onChange={() => setSmsNotif(!smsNotif)}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          {/* RIGHT CARD — SUPPORT & FEEDBACK */}
          <div className="pref-card">
            <h3 className="section-title">Support & Feedback</h3>

            <div className="support-row">
              <p>Contact Support</p>
              <button className="support-btn">Contact Support</button>
            </div>

            <div className="support-row">
              <p>Provide Feedback</p>
              <button className="support-btn">Provide Feedback</button>
            </div>

            <div className="support-row">
              <p>Help Center Resources</p>
              <button className="pref-link">Visit Help Center</button>
            </div>
          </div>
        </div>
      )}

        {/* FOOTER BUTTONS */}
        <div className="settings-footer-actions">
          <button className="download-btn">
            <Download size={16} /> Download My Data
          </button>

          <button className="print-btn">
            <Printer size={16} /> Print Health Summary
          </button>

          <button className="delete-btn">
            <Trash2 size={16} /> Delete Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
