import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import {
  useCurrentAccount,
  useCurrentWallet,
  useSuiClient,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { usePatientProfile } from "../hooks/usePatientProfile";
import { useWalletSigner } from "../hooks/useWalletSigner";
import { SealWalrusService } from "../services/sealWalrusService";
import { DashboardSidebar } from "./dashboard/components/DashboardSidebar.tsx";
import { DashboardHeader } from "./dashboard/components/DashboardHeader.tsx";
import Logo from "../assets/logo.png";
import RecordIcon from "../assets/stat-icon1.png";
import PrecriptionIcon from "../assets/stat-icon2.png";
import DoctorIcon from "../assets/stat-icon3.png";
import ActivityIcon from "../assets/stat-icon4.png";
import ResultIcon from "../assets/record-icon1.png";
import XrayIcon from "../assets/record-icon2.png";
import LisinoprilIcon from "../assets/record-icon3.png";
import LipidIcon from "../assets/record-icon4.png";
import ECGIcon from "../assets/record-icon5.png";
import UrinalysisIcon from "../assets/record-icon6.png";
import AishaDp from "../assets/kile-dp.png";
import JamesDp from "../assets/lin-dp.png";
import KileDp from "../assets/aisha-dp.png";
import GrantAccess from "../components/access";
import {
  Camera,
  Check,
  Download,
  Printer,
  Trash2,
  BadgeQuestionMark,
  Bell,
  Calendar,
  CloudUpload,
  Loader2,
  File,
  Settings,
  Lock,
  LogOut,
  Copy,
  Plus,
  ShieldCheck,
  User,
  FileText,
  ClipboardCheck,
  Activity,
  Heart,
  Eye,
  UserLock,
  UserX,
  Pill,
  XCircle,
} from "lucide-react";
import "./dashboard.css";


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

// SettingsPage has been moved to DashboardSettings.tsx

const Dashboard = () => {
  const [isShareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>("");
  const account = useCurrentAccount();
  const navigate = useNavigate();

  // Get package ID from environment variables
  const packageId = import.meta.env.VITE_SUI_PACKAGE_ID || "";
  const network = (import.meta.env.VITE_SUI_NETWORK || "testnet") as "testnet" | "mainnet" | "devnet";
  const customSealServerIds = (import.meta.env.VITE_SEAL_SERVER_IDS || "")
    .split(",")
    .filter(Boolean);
  const enokiPrivateApiKey = import.meta.env.VITE_ENOKI_PRIVATE_API_KEY;
  const suiClientFromProvider = useSuiClient();
  const walletSigner = useWalletSigner();

  // Check for patient profile
  const { hasProfile, isLoading: isProfileLoading, walrusId, profileObjectId, recordsId } =
    usePatientProfile(packageId);
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

  // Redirect to settings if profile not found (only for patients)
  useEffect(() => {
    if (!isProfileLoading && account?.address && !hasCheckedProfile) {
      setHasCheckedProfile(true);
      if (!hasProfile && packageId) {
        // Profile not found, redirect to settings
        navigate("/dashboard/settings", { replace: true });
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

  const handlePharmacyRequest = () => {
    setPendingTransaction({
      recipient: "CVS Pharmacy - Downtown",
      amount: 24.5,
      networkFee: 0.001,
    });
    setTransactionModalOpen(true);
  };


  // Redirect to login if wallet is disconnected
  useEffect(() => {
    if (!account && !isProfileLoading) {
      navigate("/login");
    }
  }, [account, isProfileLoading, navigate]);

  const [isTransactionModalOpen, setTransactionModalOpen] =
    useState<boolean>(false);
  const [pendingTransaction, setPendingTransaction] =
    useState<TransactionData | null>(null);

  // Show loading state while checking for profile
  if (isProfileLoading && !hasCheckedProfile) {
    return (
      <div className="dashboard">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            gap: "2rem",
            background: "linear-gradient(to bottom, #f9fbff, #ffffff)",
          }}
        >
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
              fontFamily: '"Plus Jakarta Sans", sans-serif',
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
              Loading your secure profile...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <DashboardSidebar />
      <div>
        <DashboardHeader />
        <div className="main-area">
          <main className="main-content">
            <>
                <div className="welcome-card">
                  <div className="welcome-text">
                    <h2>{getGreeting()}, {getDisplayName()} 👋</h2>
                    <p>Your health data is secure and encrypted</p>
                  </div>
                </div>

                <div className="caads">
                  <div className="stats-container">
                    <div className="stat-card">
                      <img src={RecordIcon} />
                      <h4 className="stat-title">Records</h4>
                      <p className="stat-value">12</p>
                      <p className="stat-note">↑ 2 this month</p>
                    </div>

                    <div className="stat-card">
                      <img src={PrecriptionIcon} />
                      <h4 className="stat-title">Active Prescriptions</h4>
                      <p className="stat-value">3</p>
                      <p className="stat-note">No change</p>
                    </div>

                    <div className="stat-card">
                      <img src={DoctorIcon} />
                      <h4 className="stat-title">Doctors</h4>
                      <p className="stat-value">2</p>
                      <p className="stat-note">Current access</p>
                    </div>

                    <div className="stat-card">
                      <img src={ActivityIcon} />
                      <h4 className="stat-title">Activity Events</h4>
                      <p className="stat-value">24</p>
                      <p className="stat-note">Last 7 days</p>
                    </div>
                  </div>

                  <div className="records-header">
                    <h3>My Health Records</h3>
                    <a href="#" className="view-all">
                      View All 12 Records →
                    </a>
                  </div>

                  <div className="records-section">
                    <div className="records-grid">
                      <div className="record-card">
                        <img src={ResultIcon} />
                        <h4 className="record-title">Blood Test Results</h4>
                        <p className="record-meta">
                          <Calendar size={14} /> Oct 23, 2024 •{" "}
                          <File size={13} /> 4 MB
                        </p>
                        <div className="record-tags">
                          <span className="record-tag">
                            Shared with 2 doctors
                          </span>
                          <span className="record-tag">Encrypted</span>
                        </div>
                        <div className="record-footer">
                          <span>
                            <Lock size={13} /> Private
                          </span>
                          <span>⋯</span>
                        </div>
                      </div>

                      <div className="record-card">
                        <img src={XrayIcon} />
                        <h4 className="record-title">Chest X-Ray</h4>
                        <p className="record-meta">
                          <Calendar size={14} /> Oct 15, 2024 •{" "}
                          <File size={13} /> 7 MB
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

                      <div className="record-card">
                        <img src={LisinoprilIcon} />
                        <h4 className="record-title">
                          Prescription - Lisinopril
                        </h4>
                        <p className="record-meta">
                          <Calendar size={14} /> Oct 10, 2024 •{" "}
                          <File size={13} /> 3.4 KB
                        </p>
                        <div className="record-tags">
                          <span className="record-tag">
                            Shared with 1 pharmacy
                          </span>
                          <span className="record-tag">Encrypted</span>
                        </div>
                        <div className="record-footer">
                          <span>
                            <Lock size={13} /> Private
                          </span>
                          <span>⋯</span>
                        </div>
                      </div>

                      <div className="record-card">
                        <img src={LipidIcon} />
                        <h4 className="record-title">Lipid Panel</h4>
                        <p className="record-meta">
                          <Calendar size={14} /> Sep 22, 2024 •
                          <File size={13} />4 MB
                        </p>
                        <div className="record-tags">
                          <span className="record-tag">Encrypted</span>
                        </div>
                        <div className="record-footer">
                          <span> Shared with 1 Doctor</span>
                          <span>⋯</span>
                        </div>
                      </div>

                      <div className="record-card">
                        <img src={ECGIcon} />
                        <h4 className="record-title">ECG Report</h4>
                        <p className="record-meta">
                          <Calendar size={14} /> Sep 10, 2024 •
                          <File size={13} /> 2 MB
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

                      <div className="record-card">
                        <img src={UrinalysisIcon} />
                        <h4 className="record-title">Urinalysis</h4>
                        <p className="record-meta">
                          <Calendar size={14} /> Sep 10, 2024 •{" "}
                          <File size={13} /> 2 MB
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
                    </div>
                  </div>
                </div>
                <section className="prescriptions-section">
                  <div className="section-header">
                    <h3>Active Prescriptions</h3>
                    <a href="#" className="view-all">
                      View All Prescriptions →
                    </a>
                  </div>

                  <div className="prescription-card">
                    <div className="prescription-info">
                      <div className="doc">
                        <img
                          src={KileDp}
                          alt="Dr. Aisha"
                          className="doctor-avatar"
                        />
                        <div>
                          <h4>Dr. Aisha Mahmoud</h4>
                          <p>Cardiologist</p>
                        </div>
                      </div>
                      <div className="med-info">
                        <h4>Lisinopril 10mg</h4>
                        <p>Once daily, take with food</p>
                        <small>30 days supply</small>
                      </div>
                    </div>
                    <div className="prescription-meta">
                      <span className="status active">● Active</span>
                      <p>Oct 28, 2024</p>
                      <button>View Details</button>
                    </div>
                  </div>
                  <div className="prescription-card">
                    <div className="prescription-info">
                      <div className="doc">
                        <img
                          src={JamesDp}
                          alt="Dr. James"
                          className="doctor-avatar"
                        />
                        <div>
                          <h4>Dr. James Lin</h4>
                          <p>Primary Care</p>
                        </div>
                      </div>
                      <div className="med-info">
                        <h4>Metformin 500mg</h4>
                        <p>Twice daily with meals</p>
                        <small>90 days supply</small>
                      </div>
                    </div>
                    <div className="prescription-meta">
                      <span className="status active">● Active</span>
                      <p>Oct 15, 2024</p>
                      <button>View Details</button>
                    </div>
                  </div>

                  <div className="prescription-card">
                    <div className="prescription-info">
                      <div className="doc">
                        <img
                          src={AishaDp}
                          alt="Dr. Aisha"
                          className="doctor-avatar"
                        />
                        <div>
                          <h4>Dr. Aisha Mahmoud</h4>
                          <p>Cardiologist</p>
                        </div>
                      </div>
                      <div className="med-info">
                        <h4>Atorvastatin 20mg</h4>
                        <p>Once daily at bedtime</p>
                        <small>30 days supply</small>
                      </div>
                    </div>
                    <div className="prescription-meta">
                      <span className="status dispensed">✔ Dispensed</span>
                      <p>Oct 10, 2024</p>
                      <button>View Details</button>
                    </div>
                  </div>
                </section>
                <section className="doctors-access">
                  <h3>Doctors with Access</h3>

                  <div className="doctor-access-grid">
                    <div className="doctor-card">
                      <div className="doctor-info">
                        <img
                          src={AishaDp}
                          alt="Dr. Aisha"
                          className="doctor-avatar"
                        />
                        <div>
                          <h4>Dr. Aisha Mahmoud</h4>
                          <p>Cardiology • City Medical Center</p>
                        </div>
                      </div>
                      <div className="doctor-details">
                        <div>
                          <p>Access granted</p>
                          <strong>Oct 15, 2024</strong>
                        </div>
                        <div>
                          <p>Expires in</p>
                          <strong className="expiring">6 days</strong>
                        </div>
                        <div>
                          <p>Records shared</p>
                          <strong>8 files</strong>
                        </div>
                      </div>
                      <div className="doctor-actions">
                        <button className="view-btn">View What's Shared</button>
                        <button className="revoke-btn">Revoke</button>
                      </div>
                    </div>

                    <div className="doctor-card">
                      <div className="doctor-info">
                        <img
                          src={JamesDp}
                          alt="Dr. James"
                          className="doctor-avatar"
                        />
                        <div>
                          <h4>Dr. James Lin</h4>
                          <p>Primary Care • Wellness Clinic</p>
                        </div>
                      </div>
                      <div className="doctor-details">
                        <div>
                          <p>Access granted</p>
                          <strong>Oct 1, 2024</strong>
                        </div>
                        <div>
                          <p>Expires in</p>
                          <strong className="expiring">22 days</strong>
                        </div>
                        <div>
                          <p>Records shared</p>
                          <strong>5 files</strong>
                        </div>
                      </div>
                      <div className="doctor-actions">
                        <button className="view-btn">View What's Shared</button>
                        <button className="revoke-btn">Revoke</button>
                      </div>
                    </div>
                  </div>
                  <button
                    className="grant-btn"
                    onClick={() => setShareModalOpen(true)}
                  >
                    + Grant New Access
                  </button>
                </section>

                <section className="recent-activity">
                  <div className="recent-heading">
                    <h3>Recent Activity</h3>
                    <a href="#" className="view-all">
                      View All Activity →
                    </a>
                  </div>

                  <div className="activity-timeline">
                    <div className="activity-item">
                      <div className="activity-icon">
                        <CloudUpload size={15} />
                      </div>
                      <div className="activity-content">
                        <p>Uploaded Blood Test Results</p>
                        <span className="activity-time">2 hours ago</span>
                        <div className="activity-hash">
                          0xA2B3C4... <Copy size={11} />
                        </div>
                      </div>
                    </div>

                    <div className="activity-item">
                      <div className="activity-icon">
                        <UserLock size={15} />
                      </div>
                      <div className="activity-content">
                        <p>Granted Dr. Aisha access to ECG Report</p>
                        <span className="activity-time">1 day ago</span>
                        <div className="activity-hash">
                          0xD4E5F6... <Copy size={11} />
                        </div>
                      </div>
                    </div>

                    <div className="activity-item">
                      <div className="activity-icon">
                        <Eye size={15} />
                      </div>
                      <div className="activity-content">
                        <p>Dr. James viewed Metformin Prescription</p>
                        <span className="activity-time">2 days ago</span>
                        <div className="activity-hash">
                          0xG7H8I9... <Copy size={11} />
                        </div>
                      </div>
                    </div>

                    <div className="activity-item">
                      <div className="activity-icon">
                        <Pill size={15} />
                      </div>
                      <div className="activity-content">
                        <p>Dispensed Atorvastatin to Pharmacy</p>
                        <span className="activity-time">3 days ago</span>
                        <div className="activity-hash">
                          0xJ1K2L3... <Copy size={11} />
                        </div>
                      </div>
                    </div>

                    <div className="activity-item">
                      <div className="activity-icon">
                        <UserX size={15} />
                      </div>
                      <div className="activity-content">
                        <p>Revoked Dr. Aisha access to Urinalysis</p>
                        <span className="activity-time">4 days ago</span>
                        <div className="activity-hash">
                          0xM4N5O6... <Copy size={11} />
                        </div>
                      </div>
                    </div>
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
              </>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
