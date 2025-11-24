import { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  CloudUpload,
  Copy,
  Eye,
  File,
  Lock,
  Pill,
  UserLock,
  UserX,
  XCircle,
  Check,
} from "lucide-react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useSuiClient } from "@mysten/dapp-kit";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { usePatientProfile } from "../../hooks/usePatientProfile";
import { useWalletSigner } from "../../hooks/useWalletSigner";
import { SealWalrusService } from "../../services/sealWalrusService";
import GrantAccess from "../../components/access";
import RecordIcon from "../../assets/stat-icon1.png";
import PrecriptionIcon from "../../assets/stat-icon2.png";
import DoctorIcon from "../../assets/stat-icon3.png";
import ActivityIcon from "../../assets/stat-icon4.png";
import ResultIcon from "../../assets/record-icon1.png";
import XrayIcon from "../../assets/record-icon2.png";
import LisinoprilIcon from "../../assets/record-icon3.png";
import LipidIcon from "../../assets/record-icon4.png";
import ECGIcon from "../../assets/record-icon5.png";
import UrinalysisIcon from "../../assets/record-icon6.png";
import AishaDp from "../../assets/kile-dp.png";
import JamesDp from "../../assets/lin-dp.png";
import KileDp from "../../assets/aisha-dp.png";
import "../dashboard.css";

interface TransactionData {
  recipient: string;
  amount: number;
  networkFee: number;
}

interface TransactionApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionData | null;
}

const TransactionApprovalModal = ({
  isOpen,
  onClose,
  transaction,
}: TransactionApprovalModalProps) => {
  if (!isOpen || !transaction) return null;

  const { recipient, amount, networkFee } = transaction;
  const total = ((Number(amount) || 0) + (Number(networkFee) || 0)).toFixed(3);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="transaction-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Please approve the transaction</h2>
        <div className="transaction-details">
          <p>
            <strong>Recipient:</strong> {recipient}
          </p>
          <p>
            <strong>Amount:</strong> {amount} SUI
          </p>
          <p>
            <strong>Estimated Network Fee:</strong> {networkFee} SUI
          </p>
          <p>
            <strong>Total to Approve:</strong> {total} SUI
          </p>
        </div>
        <div className="transaction-actions">
          <button
            className="confirm-btn"
            onClick={() => {
              console.log("Transaction confirmed!");
              onClose();
            }}
          >
            <Check size={16} /> Confirm Transaction
          </button>
          <button className="cancel-btn" onClick={onClose}>
            <XCircle size={16} /> Cancel Transaction
          </button>
        </div>
      </div>
    </div>
  );
};

export default function DashboardHome() {
  const [isShareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [isTransactionModalOpen, setTransactionModalOpen] = useState<boolean>(false);
  const [pendingTransaction, setPendingTransaction] = useState<TransactionData | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [recordsCount, setRecordsCount] = useState<number>(0);
  const [doctorsCount, setDoctorsCount] = useState<number>(0);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(true);
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [doctorsWithAccess, setDoctorsWithAccess] = useState<any[]>([]);
  
  const account = useCurrentAccount();
  const packageId = import.meta.env.VITE_SUI_PACKAGE_ID || "";
  const network = (import.meta.env.VITE_SUI_NETWORK || "testnet") as "testnet" | "mainnet" | "devnet";
  const customSealServerIds = (import.meta.env.VITE_SEAL_SERVER_IDS || "")
    .split(",")
    .filter(Boolean);
  const enokiPrivateApiKey = import.meta.env.VITE_ENOKI_PRIVATE_API_KEY;
  const suiClientFromProvider = useSuiClient();
  const walletSigner = useWalletSigner();
  
  const { walrusId, profileObjectId, recordsId } = usePatientProfile(packageId);

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

  // Load profile name from decrypted data
  useEffect(() => {
    if (!walrusId || !profileObjectId || !recordsId || !sealWalrusService || !account?.address || !walletSigner) {
      return;
    }

    const loadProfileName = async () => {
      try {
        const storedWalrusId = localStorage.getItem(`walrusId_${account.address}`);
        const profileWalrusId = walrusId || storedWalrusId;

        if (profileWalrusId && profileObjectId && recordsId) {
          const walrusProfileData = await sealWalrusService.loadProfile(
            profileWalrusId,
            account.address,
            profileObjectId,
            recordsId,
            walletSigner
          );

          if (walrusProfileData?.fullName) {
            // Extract first name from full name
            const firstName = walrusProfileData.fullName.split(" ")[0];
            setUserName(firstName);
          }
        }
      } catch (error) {
        console.error("Error loading profile name:", error);
      }
    };

    loadProfileName();
  }, [walrusId, profileObjectId, recordsId, sealWalrusService, account?.address, walletSigner]);

  // Fetch real data from blockchain
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!profileObjectId || !recordsId || !suiClient || !packageId) {
        setIsLoadingStats(false);
        return;
      }

      setIsLoadingStats(true);
      try {
        const normalizedPackageId = packageId.startsWith('0x') ? packageId : `0x${packageId}`;

        // Fetch Profile object to get access_granted
        const profileObject = await suiClient.getObject({
          id: profileObjectId,
          options: {
            showContent: true,
            showType: true,
          },
        });

        // Fetch Records object to get records count
        const recordsObject = await suiClient.getObject({
          id: recordsId,
          options: {
            showContent: true,
            showType: true,
          },
        });

        // Extract access_granted from Profile
        let accessGrantedIds: string[] = [];
        if (profileObject.data?.content && 'fields' in profileObject.data.content) {
          const profileFields = profileObject.data.content.fields as Record<string, any>;
          const accessGrantedField = profileFields.access_granted;
          
          // Extract IDs from vector<ID>
          if (accessGrantedField) {
            if (Array.isArray(accessGrantedField)) {
              accessGrantedIds = accessGrantedField.filter(id => typeof id === 'string');
            } else if (typeof accessGrantedField === 'object') {
              const array = accessGrantedField.fields || accessGrantedField.contents || accessGrantedField.data || [];
              accessGrantedIds = Array.isArray(array) ? array.filter(id => typeof id === 'string') : [];
            }
          }
        }

        // Extract records from Records object
        let recordsArray: any[] = [];
        if (recordsObject.data?.content && 'fields' in recordsObject.data.content) {
          const recordsFields = recordsObject.data.content.fields as Record<string, any>;
          recordsArray = recordsFields.records || [];
        }

        setRecordsCount(recordsArray.length);
        setDoctorsCount(accessGrantedIds.length);

        // Fetch recent records (last 6)
        const recent = recordsArray.slice(-6).reverse();
        setRecentRecords(recent);

        // Fetch doctor profiles for access_granted
        const doctorsList: any[] = [];
        for (const doctorProfileId of accessGrantedIds.slice(0, 2)) { // Limit to 2 for home page
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
              const ownerAddress = doctorProfile.data.owner && typeof doctorProfile.data.owner === 'object' && 'AddressOwner' in doctorProfile.data.owner
                ? (doctorProfile.data.owner as any).AddressOwner
                : null;

              doctorsList.push({
                id: doctorProfileId,
                ownerAddress,
                profileObjectId: doctorProfileId,
              });
            }
          } catch (error) {
            console.error(`Error fetching doctor profile ${doctorProfileId}:`, error);
          }
        }

        setDoctorsWithAccess(doctorsList);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    if (profileObjectId && recordsId) {
      fetchDashboardData();
    }
  }, [profileObjectId, recordsId, suiClient, packageId]);

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Get display name (first name or fallback)
  const getDisplayName = () => {
    if (userName) return userName;
    return "there";
  };

  const handlePharmacyRequest = () => {
    setPendingTransaction({
      recipient: "CVS Pharmacy - Downtown",
      amount: 24.5,
      networkFee: 0.001,
    });
    setTransactionModalOpen(true);
  };

  return (
    <div className="page-container">
      <div className="welcome-card">
        <div className="welcome-text">
          <h2>{getGreeting()}, {getDisplayName()} 👋</h2>
          <p>Your health data is secure and encrypted</p>
        </div>
      </div>

      <div>
        <div className="stats-container">
          <div className="stat-card">
            <img src={RecordIcon} />
            <h4 className="stat-title">Records</h4>
            <p className="stat-value">{isLoadingStats ? "..." : recordsCount}</p>
            <p className="stat-note">{isLoadingStats ? "Loading..." : "Total records"}</p>
          </div>

          <div className="stat-card">
            <img src={PrecriptionIcon} />
            <h4 className="stat-title">Active Prescriptions</h4>
            <p className="stat-value">{isLoadingStats ? "..." : "0"}</p>
            <p className="stat-note">{isLoadingStats ? "Loading..." : "No change"}</p>
          </div>

          <div className="stat-card">
            <img src={DoctorIcon} />
            <h4 className="stat-title">Doctors</h4>
            <p className="stat-value">{isLoadingStats ? "..." : doctorsCount}</p>
            <p className="stat-note">{isLoadingStats ? "Loading..." : "Current access"}</p>
          </div>

          <div className="stat-card">
            <img src={ActivityIcon} />
            <h4 className="stat-title">Activity Events</h4>
            <p className="stat-value">{isLoadingStats ? "..." : "0"}</p>
            <p className="stat-note">{isLoadingStats ? "Loading..." : "Last 7 days"}</p>
          </div>
        </div>

        <div className="records-header">
          <h3>My Health Records</h3>
          {recordsCount > 0 && (
            <a href="/dashboard/records" className="view-all">
              View All {recordsCount} Records →
            </a>
          )}
        </div>

        <div className="records-section">
          {isLoadingStats ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
              Loading records...
            </div>
          ) : recentRecords.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
              <p>No records found. Records will appear here once they are added.</p>
            </div>
          ) : (
            <div className="records-grid">
              {recentRecords.slice(0, 6).map((record, index) => {
                // Try to decode metadata if available
                let title = `Record ${index + 1}`;
                if (record.metadata && Array.isArray(record.metadata)) {
                  try {
                    const metadataBytes = new Uint8Array(record.metadata);
                    const decoded = new TextDecoder().decode(metadataBytes);
                    if (decoded) title = decoded;
                  } catch (e) {
                    console.warn("Failed to decode record metadata:", e);
                  }
                }

                const createdDate = record.created_at 
                  ? new Date(Number(record.created_at) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : "Unknown date";

                return (
                  <div key={index} className="record-card">
                    <img src={ResultIcon} />
                    <h4 className="record-title">{title}</h4>
                    <p className="record-meta">
                      <Calendar size={14} /> {createdDate} •{" "}
                      <File size={13} /> Encrypted
                    </p>
                    <div className="record-tags">
                      <span className="record-tag">Encrypted</span>
                    </div>
                    <div className="record-footer">
                      <span>
                        <Lock size={13} /> Private
                      </span>
                      <span>⋯</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <section className="prescriptions-section" style={{ marginTop: "2rem" }}>
        <div className="section-header">
          <div>
            <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 600, color: "#111827" }}>Active Prescriptions</h3>
          </div>
          <a href="/dashboard/prescriptions" className="view-all">
            View All Prescriptions →
          </a>
        </div>

        <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
          <p>No prescriptions found. Prescriptions will appear here once they are added.</p>
        </div>
      </section>
      <section className="doctors-access" style={{ marginTop: "2rem" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 600, color: "#111827" }}>Doctors with Access</h3>
        </div>

        {isLoadingStats ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
            Loading doctors with access...
          </div>
        ) : doctorsWithAccess.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
            <p>No doctors have access yet. Grant access to share your records.</p>
          </div>
        ) : (
          <div className="doctor-access-grid">
            {doctorsWithAccess.map((doctor, index) => (
              <div key={doctor.id || index} className="doctor-card">
                <div className="doctor-info">
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "#e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#6b7280",
                    fontSize: "1.2rem",
                    fontWeight: 600
                  }}>
                    {doctor.ownerAddress ? doctor.ownerAddress.slice(2, 4).toUpperCase() : "DR"}
                  </div>
                  <div>
                    <h4>Doctor Profile</h4>
                    <p style={{ fontSize: "0.75rem", color: "#6b7280", wordBreak: "break-all" }}>
                      {doctor.profileObjectId?.slice(0, 20)}...
                    </p>
                  </div>
                </div>
                <div className="doctor-details">
                  <div>
                    <p>Address</p>
                    <strong style={{ fontSize: "0.75rem", wordBreak: "break-all" }}>
                      {doctor.ownerAddress?.slice(0, 10)}...
                    </strong>
                  </div>
                </div>
                <div className="doctor-actions">
                  <button className="view-btn">View Details</button>
                  <button className="revoke-btn">Revoke</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <button
          className="grant-btn"
          onClick={() => setShareModalOpen(true)}
        >
          + Grant New Access
        </button>
      </section>

      <section className="recent-activity">
        <div className="recent-heading">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <h3>Recent Activity</h3>
            <a href="/dashboard/activity" className="view-all">
              View All Activity →
            </a>
          </div>
        </div>

        <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
          <p>No recent activity. Activity will appear here as you interact with your records.</p>
        </div>
      </section>
      <TransactionApprovalModal
        isOpen={isTransactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
        transaction={pendingTransaction}
      />
      <GrantAccess
        isOpen={isShareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />
    </div>
  );
}

