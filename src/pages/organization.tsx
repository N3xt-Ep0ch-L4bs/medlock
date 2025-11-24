import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { useOrganizationProfile } from "../hooks/useOrganizationProfile";
import { useWalletSigner } from "../hooks/useWalletSigner";
import { SealWalrusService } from "../services/sealWalrusService";
import Logo from "../assets/logo.png";
import { Building2, User, Pill, Plus, Search, Settings, Eye, Edit, Trash2, Loader2 } from "lucide-react";
import RegistrationModal from "../components/RegistrationModal";
import "./organization.css";

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  specialty: string;
  organization: string;
  licenseNumber: string;
  status: "active" | "inactive";
  walletAddress?: string;
  profileObjectId?: string;
  walrusId?: string;
  decryptedProfile?: any;
}

interface Pharmacy {
  id: string;
  pharmacyName: string;
  email: string;
  pharmacyType: string;
  licenseNumber: string;
  city: string;
  status: "active" | "inactive";
  walletAddress?: string;
  profileObjectId?: string;
  walrusId?: string;
  decryptedProfile?: any;
}

const OrganizationDashboard = () => {
  const navigate = useNavigate();
  const account = useCurrentAccount();
  const packageId = import.meta.env.VITE_SUI_PACKAGE_ID || "";
  const network = (import.meta.env.VITE_SUI_NETWORK || "testnet") as "testnet" | "mainnet" | "devnet";
  const customSealServerIds = (import.meta.env.VITE_SEAL_SERVER_IDS || "")
    .split(",")
    .filter(Boolean);
  const enokiPrivateApiKey = import.meta.env.VITE_ENOKI_PRIVATE_API_KEY;
  const suiClientFromProvider = useSuiClient();
  const walletSigner = useWalletSigner();
  const { hasProfile, isLoading: isProfileLoading, profileObjectId: organizationObjectId } = useOrganizationProfile(packageId);
  const [hasCheckedProfile, setHasCheckedProfile] = useState(false);
  
  const suiClient = useMemo(() => {
    return suiClientFromProvider || new SuiClient({
      url: getFullnodeUrl(network),
    });
  }, [network, suiClientFromProvider]);

  const sealWalrusService = useMemo(() => {
    if (!packageId) return null;
    return new SealWalrusService(
      packageId,
      network,
      customSealServerIds.length > 0 ? customSealServerIds : undefined,
      enokiPrivateApiKey
    );
  }, [packageId, network, customSealServerIds.join(","), enokiPrivateApiKey]);
  
  // All state hooks must be called before any conditional returns
  const [activeTab, setActiveTab] = useState<"overview" | "doctors" | "pharmacies">("overview");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showDoctorModal, setShowDoctorModal] = useState<boolean>(false);
  const [showPharmacyModal, setShowPharmacyModal] = useState<boolean>(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState<boolean>(false);
  const [decryptingProfileId, setDecryptingProfileId] = useState<string | null>(null);

  // Redirect to registration if profile not found
  useEffect(() => {
    if (!isProfileLoading && account?.address && !hasCheckedProfile) {
      setHasCheckedProfile(true);
      if (!hasProfile && packageId) {
        // Profile not found, redirect to registration
        navigate("/organization/registration", { replace: true });
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

  // Fetch doctors and pharmacies from Organization object
  useEffect(() => {
    if (!organizationObjectId || !account?.address || !suiClient || !packageId) {
      return;
    }

    const fetchOrganizationMembers = async () => {
      setIsLoadingProfiles(true);
      try {
        const normalizedPackageId = packageId.startsWith('0x') ? packageId : `0x${packageId}`;
        
        // Get the Organization object to extract doctors and pharmacies
        const orgObject = await suiClient.getObject({
          id: organizationObjectId,
          options: {
            showContent: true,
            showType: true,
          },
        });

        if (orgObject.data?.content && 'fields' in orgObject.data.content) {
          const fields = orgObject.data.content.fields as Record<string, any>;
          
          // Extract registered_doctors and registered_pharmacies from the Organization object
          // These are vector<ID> which in Sui are represented as arrays of strings
          const registeredDoctorsField = fields.registered_doctors;
          const registeredPharmaciesField = fields.registered_pharmacies;
          
          // Helper function to extract IDs from vector<ID> field
          const extractIds = (field: any): string[] => {
            if (!field) return [];
            // If it's already an array of strings, return it
            if (Array.isArray(field)) {
              return field.filter(id => typeof id === 'string');
            }
            // If it's wrapped in an object (e.g., { fields: [...] } or { contents: [...] })
            if (typeof field === 'object') {
              const array = field.fields || field.contents || field.data || [];
              return Array.isArray(array) ? array.filter(id => typeof id === 'string') : [];
            }
            return [];
          };
          
          const registeredDoctorsIds: string[] = extractIds(registeredDoctorsField);
          const registeredPharmaciesIds: string[] = extractIds(registeredPharmaciesField);

          console.log("Organization registered doctors:", registeredDoctorsIds);
          console.log("Organization registered pharmacies:", registeredPharmaciesIds);

          // Fetch each doctor profile
          const doctorsList: Doctor[] = [];
          for (const doctorProfileId of registeredDoctorsIds) {
            try {
              const doctorProfile = await suiClient.getObject({
                id: doctorProfileId,
                options: {
                  showContent: true,
                  showType: true,
                  showOwner: true,
                },
              });

              if (doctorProfile.data?.content && 'fields' in doctorProfile.data.content) {
                const doctorFields = doctorProfile.data.content.fields as Record<string, any>;
                
                // Extract profile_cid (walrusId) - it's stored as vector<u8>
                // Sui returns vector<u8> as base64-encoded string
                const profileCidField = doctorFields.profile_cid;
                let walrusId: string | undefined;
                
                if (profileCidField) {
                  try {
                    if (typeof profileCidField === 'string') {
                      // Decode base64 to get the original walrusId string
                      const decodedBytes = Uint8Array.from(atob(profileCidField), c => c.charCodeAt(0));
                      walrusId = new TextDecoder().decode(decodedBytes);
                    } else if (Array.isArray(profileCidField)) {
                      // If it's already an array of numbers, decode directly
                      walrusId = new TextDecoder().decode(new Uint8Array(profileCidField));
                    }
                  } catch (error) {
                    console.error("Error extracting walrusId from doctor profile:", error);
                  }
                }
                
                // Extract owner address
                const ownerAddress = doctorProfile.data.owner && typeof doctorProfile.data.owner === 'object' && 'AddressOwner' in doctorProfile.data.owner
                  ? (doctorProfile.data.owner as any).AddressOwner
                  : null;

                // Create doctor object with profile info
                doctorsList.push({
                  id: doctorProfileId,
                  firstName: "", // Will be filled after decryption
                  lastName: "",
                  email: "",
                  specialty: "",
                  organization: "",
                  licenseNumber: "",
                  status: "active",
                  walletAddress: ownerAddress,
                  profileObjectId: doctorProfileId,
                  walrusId: walrusId || undefined,
                });
              }
            } catch (error) {
              console.error(`Error fetching doctor profile ${doctorProfileId}:`, error);
            }
          }

          // Fetch each pharmacy profile
          const pharmaciesList: Pharmacy[] = [];
          for (const pharmacyProfileId of registeredPharmaciesIds) {
            try {
              const pharmacyProfile = await suiClient.getObject({
                id: pharmacyProfileId,
                options: {
                  showContent: true,
                  showType: true,
                  showOwner: true,
                },
              });

              if (pharmacyProfile.data?.content && 'fields' in pharmacyProfile.data.content) {
                const pharmacyFields = pharmacyProfile.data.content.fields as Record<string, any>;
                
                // Extract profile_cid (walrusId) - it's stored as vector<u8>
                // Sui returns vector<u8> as base64-encoded string
                const profileCidField = pharmacyFields.profile_cid;
                let walrusId: string | undefined;
                
                if (profileCidField) {
                  try {
                    if (typeof profileCidField === 'string') {
                      // Decode base64 to get the original walrusId string
                      const decodedBytes = Uint8Array.from(atob(profileCidField), c => c.charCodeAt(0));
                      walrusId = new TextDecoder().decode(decodedBytes);
                    } else if (Array.isArray(profileCidField)) {
                      // If it's already an array of numbers, decode directly
                      walrusId = new TextDecoder().decode(new Uint8Array(profileCidField));
                    }
                  } catch (error) {
                    console.error("Error extracting walrusId from pharmacy profile:", error);
                  }
                }
                
                // Extract owner address
                const ownerAddress = pharmacyProfile.data.owner && typeof pharmacyProfile.data.owner === 'object' && 'AddressOwner' in pharmacyProfile.data.owner
                  ? (pharmacyProfile.data.owner as any).AddressOwner
                  : null;

                // Create pharmacy object with profile info
                pharmaciesList.push({
                  id: pharmacyProfileId,
                  pharmacyName: "", // Will be filled after decryption
                  email: "",
                  pharmacyType: "",
                  licenseNumber: "",
                  city: "",
                  status: "active",
                  walletAddress: ownerAddress,
                  profileObjectId: pharmacyProfileId,
                  walrusId: walrusId || undefined,
                });
              }
            } catch (error) {
              console.error(`Error fetching pharmacy profile ${pharmacyProfileId}:`, error);
            }
          }

          console.log("Fetched doctors:", doctorsList);
          console.log("Fetched pharmacies:", pharmaciesList);

          setDoctors(doctorsList);
          setPharmacies(pharmaciesList);
        }
      } catch (error) {
        console.error("Error fetching organization members:", error);
      } finally {
        setIsLoadingProfiles(false);
      }
    };

    fetchOrganizationMembers();
  }, [organizationObjectId, account?.address, suiClient, packageId]);

  // Function to decrypt a doctor's profile
  const decryptDoctorProfile = async (doctor: Doctor) => {
    if (!sealWalrusService || !walletSigner || !account?.address || !organizationObjectId) {
      alert("Unable to decrypt profile. Please ensure all services are initialized.");
      return;
    }

    if (!doctor.walrusId || !doctor.profileObjectId) {
      alert("Profile information missing. Cannot decrypt.");
      return;
    }

    setDecryptingProfileId(doctor.id);
    try {
      // Since we encrypted with organization's address, we can use loadProfile directly
      // or use loadProfileAsOrganization. Let's use loadProfileAsOrganization for validation
      const decryptedProfile = await sealWalrusService.loadProfileAsOrganization(
        doctor.walrusId,
        account.address, // Organization address
        organizationObjectId,
        doctor.walletAddress || account.address, // Doctor address (may not be needed if encrypted with org address)
        doctor.profileObjectId,
        walletSigner
      );

      if (decryptedProfile) {
        // Update the doctor with decrypted profile data
        setDoctors(prev => prev.map(d => {
          if (d.id === doctor.id) {
            const fullName = decryptedProfile.fullName || "";
            const nameParts = fullName.split(' ');
            return {
              ...d,
              decryptedProfile,
              firstName: nameParts[0] || d.firstName,
              lastName: nameParts.slice(1).join(' ') || d.lastName,
              email: decryptedProfile.email || d.email,
              specialty: decryptedProfile.specialty || d.specialty,
              licenseNumber: decryptedProfile.licenseNumber || d.licenseNumber,
            };
          }
          return d;
        }));
      }
    } catch (error) {
      console.error("Error decrypting doctor profile:", error);
      alert(`Failed to decrypt profile: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setDecryptingProfileId(null);
    }
  };

  // Function to decrypt a pharmacy's profile
  const decryptPharmacyProfile = async (pharmacy: Pharmacy) => {
    if (!sealWalrusService || !walletSigner || !account?.address || !organizationObjectId) {
      alert("Unable to decrypt profile. Please ensure all services are initialized.");
      return;
    }

    if (!pharmacy.walrusId || !pharmacy.profileObjectId) {
      alert("Profile information missing. Cannot decrypt.");
      return;
    }

    setDecryptingProfileId(pharmacy.id);
    try {
      // Since profiles are encrypted with organization's address, we can use loadProfileAsOrganization
      // The profile was encrypted with organization address, so we use organization credentials to decrypt
      const decryptedProfile = await sealWalrusService.loadProfileAsOrganization(
        pharmacy.walrusId,
        account.address, // Organization address (matches encryption address)
        organizationObjectId,
        pharmacy.walletAddress || account.address, // Pharmacy address (for reference, not used for decryption)
        pharmacy.profileObjectId,
        walletSigner
      );

      if (decryptedProfile) {
        // Update the pharmacy with decrypted profile data
        setPharmacies(prev => prev.map(p => {
          if (p.id === pharmacy.id) {
            return {
              ...p,
              decryptedProfile,
              pharmacyName: decryptedProfile.fullName || p.pharmacyName,
              email: decryptedProfile.email || p.email,
              pharmacyType: decryptedProfile.pharmacyType || p.pharmacyType,
              licenseNumber: decryptedProfile.licenseNumber || p.licenseNumber,
              city: decryptedProfile.city || p.city,
            };
          }
          return p;
        }));
      }
    } catch (error) {
      console.error("Error decrypting pharmacy profile:", error);
      alert(`Failed to decrypt profile: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setDecryptingProfileId(null);
    }
  };

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
            Loading your organization profile...
          </p>
        </div>
      </div>
    );
  }

  // If no account after initialization, don't render (redirect will happen)
  if (!account) {
    return null;
  }

  // Use fetched doctors/pharmacies from the Organization object
  const displayDoctors = doctors;
  const displayPharmacies = pharmacies;

  const stats = {
    totalDoctors: displayDoctors.length,
    activeDoctors: displayDoctors.filter(d => d.status === "active").length,
    totalPharmacies: displayPharmacies.length,
    activePharmacies: displayPharmacies.filter(p => p.status === "active").length,
  };

  const filteredDoctors = displayDoctors.filter(
    (doctor) =>
      doctor.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doctor.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doctor.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doctor.specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPharmacies = displayPharmacies.filter(
    (pharmacy) =>
      pharmacy.pharmacyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pharmacy.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pharmacy.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="organization-dashboard">
      {/* Sidebar */}
      <aside className="org-sidebar">
        <div className="org-sidebar-header">
          <img src={Logo} alt="MedLock Logo" className="org-sidebar-logo" />
          <h1 className="org-sidebar-title">MedLock</h1>
        </div>
        <nav className="org-sidebar-nav">
          <button
            className={`org-sidebar-link ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <Building2 size={20} />
            Overview
          </button>
          <button
            className={`org-sidebar-link ${activeTab === "doctors" ? "active" : ""}`}
            onClick={() => setActiveTab("doctors")}
          >
            <User size={20} />
            Doctors
          </button>
          <button
            className={`org-sidebar-link ${activeTab === "pharmacies" ? "active" : ""}`}
            onClick={() => setActiveTab("pharmacies")}
          >
            <Pill size={20} />
            Pharmacies
          </button>
        </nav>
        <div className="org-sidebar-footer">
          <button className="org-sidebar-link" onClick={() => navigate("/admin")}>
            <Settings size={20} />
            Settings
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="org-main-area">
        {/* Header */}
        <header className="org-header">
          <div>
            <h2 style={{ 
              fontSize: "1.5rem",
              fontWeight: 600,
              color: "#111827",
              fontFamily: '"Figtree", sans-serif',
              margin: 0,
            }}>
              {activeTab === "overview" && "Organization Dashboard"}
              {activeTab === "doctors" && "Doctors Management"}
              {activeTab === "pharmacies" && "Pharmacies Management"}
            </h2>
            <p style={{ 
              fontSize: "0.875rem",
              color: "#6b7280",
              margin: "0.25rem 0 0 0",
              fontFamily: '"Figtree", sans-serif',
            }}>
              City Medical Center
            </p>
          </div>
          <div className="org-header-actions">
            <div className="org-search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              className="org-add-btn"
              onClick={() => {
                if (activeTab === "doctors") {
                  setShowDoctorModal(true);
                } else if (activeTab === "pharmacies") {
                  setShowPharmacyModal(true);
                } else {
                  setShowDoctorModal(true);
                }
              }}
            >
              <Plus size={18} />
              Add {activeTab === "doctors" ? "Doctor" : activeTab === "pharmacies" ? "Pharmacy" : "Member"}
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="org-content">
          {activeTab === "overview" && (
            <div className="org-overview">
              {/* Stats Cards */}
              <div className="org-stats-grid">
                <div className="org-stat-card">
                  <div className="org-stat-icon" style={{ background: "#dbeafe" }}>
                    <User size={24} color="#2563eb" />
                  </div>
                  <div className="org-stat-content">
                    <h3>{stats.totalDoctors}</h3>
                    <p>Total Doctors</p>
                    <span className="org-stat-badge">{stats.activeDoctors} Active</span>
                  </div>
                </div>

                <div className="org-stat-card">
                  <div className="org-stat-icon" style={{ background: "#fce7f3" }}>
                    <Pill size={24} color="#db2777" />
                  </div>
                  <div className="org-stat-content">
                    <h3>{stats.totalPharmacies}</h3>
                    <p>Total Pharmacies</p>
                    <span className="org-stat-badge">{stats.activePharmacies} Active</span>
                  </div>
                </div>

                <div className="org-stat-card">
                  <div className="org-stat-icon" style={{ background: "#dcfce7" }}>
                    <Building2 size={24} color="#16a34a" />
                  </div>
                  <div className="org-stat-content">
                    <h3>1</h3>
                    <p>Organization</p>
                    <span className="org-stat-badge">Active</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="org-section">
                <div className="org-section-header">
                  <h3>Quick Actions</h3>
                </div>
                <div className="org-actions-grid">
                  <button className="org-action-card" onClick={() => setShowDoctorModal(true)}>
                    <Plus size={32} color="#4338ca" />
                    <h4>Register Doctor</h4>
                    <p>Add a new doctor to your organization</p>
                  </button>
                  <button className="org-action-card" onClick={() => setShowPharmacyModal(true)}>
                    <Plus size={32} color="#4338ca" />
                    <h4>Register Pharmacy</h4>
                    <p>Add a new pharmacy to your organization</p>
                  </button>
                  <button className="org-action-card" onClick={() => setActiveTab("doctors")}>
                    <User size={32} color="#4338ca" />
                    <h4>View Doctors</h4>
                    <p>Manage all doctors in your organization</p>
                  </button>
                  <button className="org-action-card" onClick={() => setActiveTab("pharmacies")}>
                    <Pill size={32} color="#4338ca" />
                    <h4>View Pharmacies</h4>
                    <p>Manage all pharmacies in your organization</p>
                  </button>
                </div>
              </div>

              {/* Recent Doctors */}
              <div className="org-section">
                <div className="org-section-header">
                  <h3>Recent Doctors</h3>
                  <button className="org-view-all" onClick={() => setActiveTab("doctors")}>
                    View All
                  </button>
                </div>
                <div className="org-table-container">
                  <table className="org-table">
                    <thead>
                      <tr>
                        <th>Profile ID</th>
                        <th>Name</th>
                        <th>Specialty</th>
                        <th>Email</th>
                        <th>License</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayDoctors.slice(0, 5).map((doctor) => (
                        <tr key={doctor.id}>
                          <td>
                            <code style={{ 
                              fontSize: "0.75rem", 
                              color: "#6b7280"
                            }}>
                              {(() => {
                                const id = doctor.profileObjectId || doctor.id;
                                if (id.length > 20) {
                                  return `${id.slice(0, 8)}...${id.slice(-8)}`;
                                }
                                return id;
                              })()}
                            </code>
                          </td>
                          <td>
                            {doctor.decryptedProfile ? (
                              <strong>{doctor.decryptedProfile.fullName || `${doctor.firstName} ${doctor.lastName}`}</strong>
                            ) : (
                              <span style={{ color: "#9ca3af", fontStyle: "italic" }}>
                                {doctor.firstName || "Not decrypted"}
                              </span>
                            )}
                          </td>
                          <td>
                            {doctor.decryptedProfile ? (
                              doctor.decryptedProfile.specialty || doctor.specialty || "N/A"
                            ) : (
                              <span style={{ color: "#9ca3af", fontStyle: "italic" }}>—</span>
                            )}
                          </td>
                          <td>
                            {doctor.decryptedProfile ? (
                              doctor.decryptedProfile.email || doctor.email || "N/A"
                            ) : (
                              <span style={{ color: "#9ca3af", fontStyle: "italic" }}>—</span>
                            )}
                          </td>
                          <td>
                            {doctor.decryptedProfile ? (
                              doctor.decryptedProfile.licenseNumber || doctor.licenseNumber || "N/A"
                            ) : (
                              <span style={{ color: "#9ca3af", fontStyle: "italic" }}>—</span>
                            )}
                          </td>
                          <td>
                            <span className={`org-status-badge ${doctor.status}`}>
                              {doctor.status}
                            </span>
                          </td>
                          <td>
                            <div className="org-action-buttons">
                              <button 
                                className="org-action-btn" 
                                title={doctor.decryptedProfile ? "View Decrypted Profile" : "Decrypt & View Profile"}
                                onClick={() => {
                                  if (doctor.decryptedProfile) {
                                    const profile = doctor.decryptedProfile;
                                    alert(`Decrypted Profile:\n\nName: ${profile.fullName || "N/A"}\nEmail: ${profile.email || "N/A"}\nPhone: ${profile.phone || "N/A"}\nSpecialty: ${profile.specialty || "N/A"}`);
                                  } else if (doctor.walrusId && doctor.profileObjectId) {
                                    decryptDoctorProfile(doctor);
                                  } else {
                                    alert("Profile information not available. Cannot decrypt.");
                                  }
                                }}
                                disabled={decryptingProfileId === doctor.id}
                              >
                                {decryptingProfileId === doctor.id ? (
                                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                                ) : (
                                  <Eye size={16} />
                                )}
                              </button>
                              <button className="org-action-btn" title="Edit">
                                <Edit size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "doctors" && (
            <div className="org-list-view">
              <div className="org-list-header">
                <h3>All Doctors ({filteredDoctors.length})</h3>
                <button className="org-add-btn" onClick={() => setShowDoctorModal(true)}>
                  <Plus size={18} />
                  Add Doctor
                </button>
              </div>
              <div className="org-table-container">
                <table className="org-table">
                  <thead>
                    <tr>
                      <th>Profile ID</th>
                      <th>Name</th>
                      <th>Specialty</th>
                      <th>Email</th>
                      <th>License Number</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDoctors.length > 0 ? (
                      filteredDoctors.map((doctor) => (
                        <tr key={doctor.id}>
                          <td>
                            <code style={{ 
                              fontSize: "0.75rem", 
                              color: "#6b7280"
                            }}>
                              {(() => {
                                const id = doctor.profileObjectId || doctor.id;
                                if (id.length > 20) {
                                  return `${id.slice(0, 8)}...${id.slice(-8)}`;
                                }
                                return id;
                              })()}
                            </code>
                          </td>
                          <td>
                            {doctor.decryptedProfile ? (
                              <strong>{doctor.decryptedProfile.fullName || `${doctor.firstName} ${doctor.lastName}`}</strong>
                            ) : (
                              <span style={{ color: "#9ca3af", fontStyle: "italic" }}>
                                {doctor.firstName || "Not decrypted"}
                              </span>
                            )}
                          </td>
                          <td>
                            {doctor.decryptedProfile ? (
                              doctor.decryptedProfile.specialty || doctor.specialty || "N/A"
                            ) : (
                              <span style={{ color: "#9ca3af", fontStyle: "italic" }}>—</span>
                            )}
                          </td>
                          <td>
                            {doctor.decryptedProfile ? (
                              doctor.decryptedProfile.email || doctor.email || "N/A"
                            ) : (
                              <span style={{ color: "#9ca3af", fontStyle: "italic" }}>—</span>
                            )}
                          </td>
                          <td>
                            {doctor.decryptedProfile ? (
                              doctor.decryptedProfile.licenseNumber || doctor.licenseNumber || "N/A"
                            ) : (
                              <span style={{ color: "#9ca3af", fontStyle: "italic" }}>—</span>
                            )}
                          </td>
                          <td>
                            <span className={`org-status-badge ${doctor.status}`}>
                              {doctor.status}
                            </span>
                          </td>
                          <td>
                            <div className="org-action-buttons">
                              <button 
                                className="org-action-btn" 
                                title={doctor.decryptedProfile ? "View Decrypted Profile" : "Decrypt & View Profile"}
                                onClick={() => {
                                  if (doctor.decryptedProfile) {
                                    // Show decrypted profile in modal or alert
                                    const profile = doctor.decryptedProfile;
                                    alert(`Decrypted Profile:\n\nName: ${profile.fullName || "N/A"}\nEmail: ${profile.email || "N/A"}\nPhone: ${profile.phone || "N/A"}\nSpecialty: ${profile.specialty || "N/A"}\nLicense Number: ${profile.licenseNumber || "N/A"}\nLicense State: ${profile.licenseState || "N/A"}\nCredentials: ${profile.credentials || "N/A"}\nYears of Experience: ${profile.yearsOfExperience || "N/A"}\nDepartment: ${profile.department || "N/A"}`);
                                  } else if (doctor.walrusId && doctor.profileObjectId) {
                                    decryptDoctorProfile(doctor);
                                  } else {
                                    alert("Profile information not available. Cannot decrypt.");
                                  }
                                }}
                                disabled={decryptingProfileId === doctor.id}
                              >
                                {decryptingProfileId === doctor.id ? (
                                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                                ) : (
                                  <Eye size={16} />
                                )}
                              </button>
                              <button className="org-action-btn" title="Edit">
                                <Edit size={16} />
                              </button>
                              <button className="org-action-btn" title="Delete">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: "2rem" }}>
                          No doctors found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "pharmacies" && (
            <div className="org-list-view">
              <div className="org-list-header">
                <h3>All Pharmacies ({filteredPharmacies.length})</h3>
                <button className="org-add-btn" onClick={() => setShowPharmacyModal(true)}>
                  <Plus size={18} />
                  Add Pharmacy
                </button>
              </div>
              <div className="org-table-container">
                <table className="org-table">
                  <thead>
                    <tr>
                      <th>Profile ID</th>
                      <th>Pharmacy Name</th>
                      <th>Type</th>
                      <th>Email</th>
                      <th>City</th>
                      <th>License Number</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPharmacies.length > 0 ? (
                      filteredPharmacies.map((pharmacy) => (
                        <tr key={pharmacy.id}>
                          <td>
                            <code style={{ 
                              fontSize: "0.75rem", 
                              color: "#6b7280"
                            }}>
                              {(() => {
                                const id = pharmacy.profileObjectId || pharmacy.id;
                                if (id.length > 20) {
                                  return `${id.slice(0, 8)}...${id.slice(-8)}`;
                                }
                                return id;
                              })()}
                            </code>
                          </td>
                          <td>
                            {pharmacy.decryptedProfile ? (
                              <strong>{pharmacy.decryptedProfile.fullName || pharmacy.pharmacyName}</strong>
                            ) : (
                              <span style={{ color: "#9ca3af", fontStyle: "italic" }}>
                                {pharmacy.pharmacyName || "Not decrypted"}
                              </span>
                            )}
                          </td>
                          <td>
                            {pharmacy.decryptedProfile ? (
                              pharmacy.decryptedProfile.pharmacyType || pharmacy.pharmacyType || "N/A"
                            ) : (
                              <span style={{ color: "#9ca3af", fontStyle: "italic" }}>—</span>
                            )}
                          </td>
                          <td>
                            {pharmacy.decryptedProfile ? (
                              pharmacy.decryptedProfile.email || pharmacy.email || "N/A"
                            ) : (
                              <span style={{ color: "#9ca3af", fontStyle: "italic" }}>—</span>
                            )}
                          </td>
                          <td>
                            {pharmacy.decryptedProfile ? (
                              pharmacy.decryptedProfile.city || pharmacy.city || "N/A"
                            ) : (
                              <span style={{ color: "#9ca3af", fontStyle: "italic" }}>—</span>
                            )}
                          </td>
                          <td>
                            {pharmacy.decryptedProfile ? (
                              pharmacy.decryptedProfile.licenseNumber || pharmacy.licenseNumber || "N/A"
                            ) : (
                              <span style={{ color: "#9ca3af", fontStyle: "italic" }}>—</span>
                            )}
                          </td>
                          <td>
                            <span className={`org-status-badge ${pharmacy.status}`}>
                              {pharmacy.status}
                            </span>
                          </td>
                          <td>
                            <div className="org-action-buttons">
                              <button 
                                className="org-action-btn" 
                                title={pharmacy.decryptedProfile ? "View Decrypted Profile" : "Decrypt & View Profile"}
                                onClick={() => {
                                  if (pharmacy.decryptedProfile) {
                                    // Show decrypted profile in modal or alert
                                    alert(`Decrypted Profile:\n\nName: ${pharmacy.decryptedProfile.fullName || pharmacy.pharmacyName}\nEmail: ${pharmacy.decryptedProfile.email || pharmacy.email}\nPhone: ${pharmacy.decryptedProfile.phone || "N/A"}\nType: ${pharmacy.decryptedProfile.pharmacyType || pharmacy.pharmacyType}`);
                                  } else if (pharmacy.walrusId && pharmacy.profileObjectId) {
                                    decryptPharmacyProfile(pharmacy);
                                  } else {
                                    alert("Profile information not available. Cannot decrypt.");
                                  }
                                }}
                                disabled={decryptingProfileId === pharmacy.id}
                              >
                                {decryptingProfileId === pharmacy.id ? (
                                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                                ) : (
                                  <Eye size={16} />
                                )}
                              </button>
                              <button className="org-action-btn" title="Edit">
                                <Edit size={16} />
                              </button>
                              <button className="org-action-btn" title="Delete">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", padding: "2rem" }}>
                          No pharmacies found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Registration Modals */}
      <RegistrationModal
        isOpen={showDoctorModal}
        onClose={() => setShowDoctorModal(false)}
        type="doctor"
        onSuccess={() => {
          // Refresh data or show success message
          console.log("Doctor registered successfully");
        }}
      />
      <RegistrationModal
        isOpen={showPharmacyModal}
        onClose={() => setShowPharmacyModal(false)}
        type="pharmacy"
        onSuccess={() => {
          // Refresh data or show success message
          console.log("Pharmacy registered successfully");
        }}
      />
    </div>
  );
};

export default OrganizationDashboard;

