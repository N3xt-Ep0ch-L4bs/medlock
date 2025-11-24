import React from "react";
import Logo from "../assets/logo.png"
import "./pharmacy.css";

interface Record {
  date: string;
  id: string;
  initials: string;
  patient: string;
  medication: string;
  qty: number;
  pharmacist: string;
  status: string;
  blockchain: string;
}

const PharmacyHistory = () => {
  const records: Record[] = [
    { date: "Jan 16, 2025", id: "RX-02457896", initials: "JS", patient: "John Smith", medication: "Lisinopril", qty: 30, pharmacist: "Maria Rodriguez", status: "Dispensed", blockchain: "0x84a5...a39c" },
    { date: "Jan 16, 2025", id: "RX-23487901", initials: "EM", patient: "Emily Martinez", medication: "Metformin", qty: 30, pharmacist: "Maria Rodriguez", status: "Dispensed", blockchain: "0x9bd4...cb22" },
    { date: "Jan 16, 2025", id: "RX-89203164", initials: "MT", patient: "Michael Thompson", medication: "Levothyroxine", qty: 20, pharmacist: "James Chen", status: "Dispensed", blockchain: "0x10a8...9f74" },
    { date: "Jan 16, 2025", id: "RX-56321984", initials: "JD", patient: "Jennifer Davis", medication: "Omeprazole", qty: 30, pharmacist: "Maria Rodriguez", status: "Dispensed", blockchain: "0x97b2...e4d1" },
  ];

  return (
    <div className="pharmacy-history">
        <header className="pharmacy-header">
                <div className="logo-section">
                  <img src={Logo} alt="MedLock Logo" className="logo" />
                  <h2>MedLock</h2>
                  <span className="portal-text">Pharmacy Portal</span>
                </div>
                <div className="user-section">
                  <span className="username">Maria Rodriguez</span>
                  <span className="roles">PharmD</span>
                  <div className="profile-circle">MR</div>
                </div>
              </header>
      <header className="ph-header">
        <h2>Dispensation History & Audit Log</h2>
        <p className="sub">Pharmacy Dashboard / Dispensation Log</p>
      </header>

      <section className="ph-filters">
        <select>
          <option>This month</option>
          <option>Last month</option>
          <option>Last 3 months</option>
        </select>
        <select>
          <option>All Pharmacies</option>
        </select>
        <select>
          <option>All Branches</option>
        </select>
        <input type="text" placeholder="Search patient, drug or record" />
      </section>

      <section className="ph-table">
        <div className="ph-table-header">
          <span>Date & Time</span>
          <span>Prescription ID</span>
          <span>Patient Name</span>
          <span>Medication</span>
          <span>Qty</span>
          <span>Pharmacist</span>
          <span>Status</span>
          <span>Blockchain Record</span>
          <span>Action</span>
        </div>

        {records.map((r, i) => (
          <div key={i} className="ph-row">
            <span>{r.date}</span>
            <span className="record-id">{r.id}</span>
            <span className="patient">
              <div className="circle">{r.initials}</div>
              {r.patient}
            </span>
            <span>{r.medication}</span>
            <span>{r.qty}</span>
            <span>{r.pharmacist}</span>
            <span>
              <span className="status-badge">{r.status}</span>
            </span>
            <span className="blockchain">{r.blockchain}</span>
            <span>
              <button className="view-btn">View</button>
            </span>
          </div>
        ))}
      </section>

      <div className="pagination">
        <button>{"<"}</button>
        <button className="active">1</button>
        <button>2</button>
        <button>{">"}</button>
      </div>

      <div className="verification-summary">
        <h4>Blockchain Verification Summary</h4>
        <div className="summary-card">
          <div className="summary-item">
            <p>Total Verified Transactions</p>
            <strong>267</strong>
          </div>
          <div className="summary-item">
            <p>Verification Status</p>
            <span className="verified">100% Verified</span>
          </div>
          <div className="summary-item">
            <p>Average Confirmation Time</p>
            <strong>2.3 seconds</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacyHistory;

