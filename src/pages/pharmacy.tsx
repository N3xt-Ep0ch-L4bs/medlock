import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { usePharmacyProfile } from "../hooks/usePharmacyProfile";
import "./pharmacy.css";
import SuccessIcon from "../assets/success.png"
import DollarLogo from "../assets/dollar.png"
import CounterLogo from "../assets/counter.png"
import Logo from "../assets/logo.png";
import {
  CheckCircle,
  Search,
  QrCode,
  ArrowLeft,
  ClipboardCopy,
  Loader2,
} from "lucide-react";

interface Prescription {
  id: string;
  patient: string;
  initials: string;
  doctor: string;
  medication: string;
  date: string;
  status: string;
}

interface RecentActivity {
  name: string;
  action: string;
}

const PharmacyDashboard = () => {
  const navigate = useNavigate();
  const account = useCurrentAccount();
  const packageId = import.meta.env.VITE_SUI_PACKAGE_ID || "";
  const { hasProfile, isLoading: isProfileLoading } = usePharmacyProfile(packageId);
  const [hasCheckedProfile, setHasCheckedProfile] = useState(false);

  const [activeTab, setActiveTab] = useState<string>("Active Prescriptions");
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [showPaymentPopup, setShowPaymentPopup] = useState<boolean>(false);
  const [showConfirmPopup, setShowConfirmPopup] = useState<boolean>(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState<boolean>(false);

  // Redirect to registration if profile not found
  useEffect(() => {
    if (!isProfileLoading && account?.address && !hasCheckedProfile) {
      setHasCheckedProfile(true);
      if (!hasProfile && packageId) {
        // Profile not found, redirect to registration
        navigate("/pharmacy/registration", { replace: true });
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

  // Payment popup timer effect - must be before any conditional returns
  useEffect(() => {
    if (showPaymentPopup) {
      const timer = setTimeout(() => {
        setShowPaymentPopup(false);
        setShowPaymentSuccess(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showPaymentPopup]);

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
            Loading your pharmacy profile...
          </p>
        </div>
      </div>
    );
  }

  // If no account after initialization, don't render (redirect will happen)
  if (!account) {
    return null;
  }

  const prescriptions: Prescription[] = [
    {
      id: "RX-2847392",
      patient: "John Smith",
      initials: "JS",
      doctor: "Dr. Sarah Chen",
      medication: "Lisinopril 10mg, 30 tablets",
      date: "Jan 15, 2025",
      status: "Ready",
    },
    {
      id: "RX-2847391",
      patient: "Emily Martinez",
      initials: "EM",
      doctor: "Dr. Michael Lee",
      medication: "Metformin 500mg, 60 tablets",
      date: "Jan 15, 2025",
      status: "Active",
    },
    {
      id: "RX-2847390",
      patient: "David Park",
      initials: "DP",
      doctor: "Dr. Lisa Johnson",
      medication: "Atorvastatin 20mg, 90 tablets",
      date: "Jan 14, 2025",
      status: "Flagged",
    },
    {
      id: "RX-2847389",
      patient: "Sarah Johnson",
      initials: "SJ",
      doctor: "Dr. James Wilson",
      medication: "Amoxicillin 500mg, 21 capsules",
      date: "Jan 14, 2025",
      status: "Ready",
    },
  ];

  const recentActivity: RecentActivity[] = [
    { name: "Michael Thompson", action: "Dispensed 15 minutes ago" },
    { name: "Linda White", action: "Dispensed 45 minutes ago" },
    { name: "Patricia Garcia", action: "Dispensed 1 hour ago" },
    { name: "Thomas Anderson", action: "Dispensed 2 hours ago" },
  ];

  const getStatusClass = (status: string): string => {
    switch (status) {
      case "Ready":
        return "status-ready";
      case "Active":
        return "status-active";
      case "Flagged":
        return "status-flagged";
      case "Dispensed":
        return "status-dispensed";
      default:
        return "";
    }
  };


  const handleOpenPrescription = (p: Prescription) => {
    setSelectedPrescription(p);
    setShowPopup(true);
  };

  const handleClosePopup = () => setShowPopup(false);

  return (
    <div className="pharmacy-dashboard">
      {/* HEADER */}
      <header className="pharmacy-header">
        <h2 style={{ 
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "#111827",
          fontFamily: '"Figtree", sans-serif',
          margin: 0,
        }}>
          Pharmacy Portal
        </h2>
        <div className="user-section">
          <span className="username">Maria Rodriguez</span>
          <span className="roles">PharmD</span>
          <div className="profile-circle">MR</div>
        </div>
      </header>

      {!selectedPrescription ? (
        <>
          <div className="search">
            <div className="search-input">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search by patient name, ID, or prescription number"
              />
            </div>
            <button className="qr-button">
              <QrCode size={18} />
              Scan Prescription QR Code
            </button>
             <Link to="/pharmacyHistory">
              <button className="history-btn">History</button>
            </Link>
          </div>

          <div className="tabs">
            {["Active Prescriptions", "Pending Verification", "Dispensed Today", "All"].map(
              (tab) => (
                <button
                  key={tab}
                  className={`tab-button ${activeTab === tab ? "active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              )
            )}
          </div>

          <div className="dashboard-content">
            <div className="prescription-section">
              <div className="section-header">
                <h3>Prescription Queue</h3>
                <p>Showing 1–8 of 24 prescriptions</p>
              </div>

              <table className="prescription-table">
                <thead>
                  <tr>
                    <th>Prescription ID</th>
                    <th>Patient Name</th>
                    <th>Doctor Name</th>
                    <th>Medication</th>
                    <th>Date Prescribed</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {prescriptions.map((p) => (
                    <tr key={p.id}>
                      <td className="id">{p.id}</td>
                      <td>
                        <div className="patient-info">
                          <div className="patient-initials">{p.initials}</div>
                          <span>{p.patient}</span>
                        </div>
                      </td>
                      <td>{p.doctor}</td>
                      <td>{p.medication}</td>
                      <td>{p.date}</td>
                      <td>
                        <span className={`status-badge ${getStatusClass(p.status)}`}>
                          {p.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="verify-btn"
                          onClick={() => handleOpenPrescription(p)}
                        >
                          {p.status === "Ready"
                            ? "Verify & Dispense"
                            : "View Details"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="activity-section">
              <h3>Recent Activity</h3>
              <ul>
                {recentActivity.map((a, i) => (
                  <li key={i}>
                    <div>
                      <p className="activity-name">{a.name}</p>
                      <span className="activity-time">{a.action}</span>
                    </div>
                    <CheckCircle className="check-icon" size={18} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Prescription Selected Background */}
          <div className="prescription-selected-container">
            <button
              className="back-button"
              onClick={() => setSelectedPrescription(null)}
            >
              <ArrowLeft size={16} /> Back to Dashboard
            </button>

            <div className="prescription-selected-card">
              <h2>Prescription Selected</h2>
              <p className="instruction">
                Review prescription details in the right panel. Click{" "}
                <strong>"Mark as Dispensed"</strong> when ready to complete
                transaction.
              </p>

              <div className="details-grid">
                <div className="detail-box">
                  <span className="label">Patient Name</span>
                  <p className="value">{selectedPrescription.patient}</p>
                </div>
                <div className="detail-box">
                  <span className="label">Prescription ID</span>
                  <p className="value id">{selectedPrescription.id}</p>
                </div>
                <div className="detail-box">
                  <span className="label">Medication</span>
                  <p className="value">{selectedPrescription.medication}</p>
                </div>
                <div className="detail-box">
                  <span className="label">Prescribed By</span>
                  <p className="value">{selectedPrescription.doctor}</p>
                </div>
                <div className="detail-box">
                  <span className="label">Date Prescribed</span>
                  <p className="value">{selectedPrescription.date}</p>
                </div>
                <div className="detail-box">
                  <span className="label">Status</span>
                  <p className="value status">{selectedPrescription.status}</p>
                </div>
              </div>

              <div className="blockchain-box">
                <div className="blockchain-header">
                  <div className="dot"></div>
                  <h4>Blockchain Verified Prescription</h4>
                </div>
                <p className="blockchain-subtext">Authenticated on Sui Network</p>
                <p className="blockchain-description">
                  This prescription has been cryptographically verified and is stored
                  immutably on the blockchain. All dispensation actions will be
                  permanently recorded for audit compliance.
                </p>
              </div>
            </div>
            {showPopup && (
              <div className="popup-overlay">
                <div className="popup-panel">
                  <div className="popup-header">
                    <div>
                      <p className="popup-id">{selectedPrescription.id}</p>
                      <p className="popup-date">Prescribed on Oct 28, 2024</p>
                    </div>
                    <button className="close-btn" onClick={handleClosePopup}>
                      ✕
                    </button>
                  </div>
                    <div className="popup-section info-card">
                      <div className="info-card-row">
                        <div className="info-box patient-box">
                          <span className="label">Patient Name</span>
                          <p className="value">{selectedPrescription.patient}</p>
                        </div>
                        <div className="info-box doctor-box">
                          <span className="label">Doctor Name</span>
                          <p className="value">{selectedPrescription.doctor}</p>
                        </div>
                      </div>
                    </div>

                  <div className="popup-section">
                    <h4>Medication Details</h4>
                    <div className="medication-box">
                      <p className="med-name">{selectedPrescription.medication}</p>
                      <p className="med-info">Strength: 10mg | Form: Tablet</p>
                      <p className="med-info">
                        Quantity: 30 tablets | Refills: 2 remaining
                      </p>
                    </div>
                  </div>

                  <div className="popup-section">
                    <h4>Dosage Instructions</h4>
                    <ul className="dosage-list">
                      <li>Take one tablet by mouth once daily</li>
                      <li>Take with food</li>
                      <li>For high blood pressure management</li>
                    </ul>
                  </div>

                  <div className="popup-section">
                    <h4>Blockchain Verification</h4>
                    <div className="verification-box">
                      <div className="verified-header">
                        <CheckCircle className="verified-icon" />
                        <div>
                          <p className="verified-text">Authentic Prescription ✓</p>
                          <p className="verified-sub">Verified on Sui Blockchain</p>
                        </div>
                      </div>

                      <div className="hash-box">
                        <p className="hash">
                          0x784ac6e4bdf0a3e4dc9e5e8a21cb178a25de43dc32b1199e87b9f5d54
                        </p>
                        <ClipboardCopy size={16} className="copy-icon" />
                      </div>

                      <p className="view-chain">View on Chain ↗</p>
                      <p className="verified-time">
                        Verified: Oct 28, 2024 10:42 AM
                      </p>
                    </div>
                  </div>

                  <div className="popup-section">
                    <h4>Drug Interaction Check</h4>
                    <div className="safe-box">
                      <CheckCircle className="safe-icon" />
                      <p>Safe to dispense – No interactions detected</p>
                    </div>
                    <p className="subtext">
                      Checked against patient's current medications and allergies.
                    </p>
                  </div>
                  <button className="dispense-btn" onClick={() => setShowConfirmPopup(true)}>
                    Mark as Dispensed
                  </button>
                  <div className="action-links">
                    <p className="contact">📞 Contact Doctor</p>
                    <p className="report">⚠️ Report Issue</p>
                  </div>

                  <div className="popup-section">
                    <h4>Pharmacy Notes</h4>
                    <textarea
                      className="notes-box"
                      placeholder="Add notes for record..."
                    ></textarea>
                    <p className="autosave-note">🕒 Notes auto-save with timestamp</p>
                  </div>
                  {showConfirmPopup && (
                      <div className="popup-overlay">
                        <div className="confirm-popup">
                          <h3>Confirm Dispensation</h3>
                          <p className="note">This action will be recorded on the blockchain.</p>

                          <div className="confirm-info">
                            <div><strong>Patient Name:</strong> Ezekiel Okon</div>
                            <div><strong>Medication:</strong> Lisinopril 10mg, 30 tablets</div>
                            <div><strong>Prescription ID:</strong> RX-2847392</div>
                          </div>

                          <h4>Verification Checklist</h4>
                          <div className="checklist">
                            <label><input type="checkbox" /> Verified patient identity</label>
                            <label><input type="checkbox" /> Counseled patient on medication usage</label>
                            <label >                                                                <input type="checkbox" /> Checked for drug interactions </label>
                            <label><input type="checkbox" /> Patient signature obtained</label>
                          </div>

                          <div className="payment-section">
                            <label>Amount to be paid</label>
                            <input type="text" defaultValue="$15.00" />
                            <p className="warning">
                              Once patient confirms payment, this dispensation will be permanently recorded
                              on the blockchain and cannot be reversed.
                            </p>
                          </div>

                          <div className="confirm-actions">
                            <button
                                className="confirm-btn"
                                onClick={() => {
                                  setShowConfirmPopup(false);
                                  setShowPaymentPopup(true);
                                }}
                              >
                                Confirm Dispensation
                              </button>
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            )}
            {/* Awaiting Patient Payment Popup */}
            {showPaymentPopup && (
              <div className="popup-overlay fade-in">
                <div className="payment-popup slide-up">
                  <h3>Awaiting Patient Payment</h3>
                  <div className="animated-line">
                    <div className="icon-box"><img src={DollarLogo} /></div>
                    <div className="progress-line"></div>
                    <div className="icon-box"><img src={CounterLogo} /></div>
                  </div>

                  <p className="payment-text">
                    Payment request sent to <strong>Ezekiel Okon</strong>.
                  </p>
                  <p className="subtext">
                    Please ask Ezekiel to confirm the payment on their device.
                  </p>

                  <div className="payment-summary">
                    <h4>Payment Details Summary</h4>
                    <p><strong>From:</strong> CVS Pharmacy - Downtown (0xabc1...def2)</p>
                    <p><strong>To:</strong> Ezekiel Okon (0x1234...5678)</p>
                    <p><strong>Amount:</strong> 24.50 SUI</p>
                    <p><strong>Memo:</strong> Prescription RX-8847-2024 for Lisinopril 10mg</p>
                  </div>

                  <div className="payment-id-box">
                    <label>Payment Request ID</label>
                    <div className="id-row">
                      <input type="text" readOnly value="PR-20241101-00123" />
                      <button className="copy-btn">Copy</button>
                    </div>
                  </div>

                  <button
                    className="cancel-payment-btn"
                    onClick={() => setShowPaymentPopup(false)}>
                    Cancel Request
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
      {showPaymentSuccess && (
  <div className="popup-overlay">
    <div className="success-popup">
      <div className="success-img"><img src={SuccessIcon} /></div>
      <h2>Payment Successful!</h2>
      <p className="success-subtext">
        Transaction confirmed on Sui blockchain.
      </p>

      <div className="success-summary">
        <h4>Payment Summary</h4>
        <div className="summary-row">
          <span>Patient Name:</span>
          <p>Ezekiel Okon (HLK-2847)</p>
        </div>
        <div className="summary-row">
          <span>Medication:</span>
          <p>Lisinopril 10mg, 30 tablets</p>
        </div>
        <div className="summary-row">
          <span>Prescription ID:</span>
          <p>RX-8847-2024</p>
        </div>
        <div className="summary-row">
          <span>Requested By:</span>
          <p>You (Maria Rodriguez, PharmD)</p>
        </div>
        <div className="amount-box">
          <p>Total Amount Paid</p>
          <h3>24.50 SUI</h3>
        </div>

        <div className="hash-box">
          <label>Transaction Hash</label>
          <div className="hash-row">
            <input
              type="text"
              readOnly
              value="0xde83ac0f19e243b9da5c6d7e8f09123456789abcde0f123456789debc7"
            />
            <button className="copy-btn">Copy</button>
          </div>
          <p className="verified-text">
            Payment verified on Sui blockchain.{" "}
            <a href="#" className="explorer-link">
              View on Explorer
            </a>
          </p>
        </div>
      </div>

      <div className="success-buttons">
        <button className="receipt-btn">🧾 Print Patient Receipt</button>
        <button
          className="close-button"
          onClick={() => setShowPaymentSuccess(false)}>
          Close & Dispense Next →
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
};

export default PharmacyDashboard;

