import { useState } from "react";
import {
  Calendar,
  Pill,
  Search,
  Filter,
  Eye,
  Download,
  Printer,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  BarChart3,
  TrendingUp,
  Activity,
  FileText,
} from "lucide-react";
import AishaDp from "../../assets/aisha-dp.png";
import JamesDp from "../../assets/lin-dp.png";
import KileDp from "../../assets/kile-dp.png";
import "../dashboard.css";

interface Prescription {
  id: string;
  medication: string;
  dosage: string;
  instructions: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorAvatar: string;
  date: string;
  supply: string;
  status: "active" | "dispensed" | "expired" | "completed";
  refills: number;
  pharmacy?: string;
  rxNumber?: string;
  quantity?: string;
  frequency?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

const mockPrescriptions: Prescription[] = [
  {
    id: "1",
    medication: "Lisinopril 10mg",
    dosage: "10mg",
    instructions: "Once daily, take with food",
    doctorName: "Dr. Aisha Mahmoud",
    doctorSpecialty: "Cardiologist",
    doctorAvatar: KileDp,
    date: "Oct 28, 2024",
    supply: "30 days supply",
    status: "active",
    refills: 2,
    rxNumber: "RX-2024-001234",
    quantity: "30 tablets",
    frequency: "Once daily",
    startDate: "Oct 28, 2024",
    endDate: "Nov 27, 2024",
    notes: "Monitor blood pressure regularly",
  },
  {
    id: "2",
    medication: "Metformin 500mg",
    dosage: "500mg",
    instructions: "Twice daily with meals",
    doctorName: "Dr. James Lin",
    doctorSpecialty: "Primary Care",
    doctorAvatar: JamesDp,
    date: "Oct 15, 2024",
    supply: "90 days supply",
    status: "active",
    refills: 1,
    rxNumber: "RX-2024-001189",
    quantity: "180 tablets",
    frequency: "Twice daily",
    startDate: "Oct 15, 2024",
    endDate: "Jan 13, 2025",
    notes: "Take with food to reduce stomach upset",
  },
  {
    id: "3",
    medication: "Atorvastatin 20mg",
    dosage: "20mg",
    instructions: "Once daily at bedtime",
    doctorName: "Dr. Aisha Mahmoud",
    doctorSpecialty: "Cardiologist",
    doctorAvatar: AishaDp,
    date: "Oct 10, 2024",
    supply: "30 days supply",
    status: "dispensed",
    refills: 0,
    pharmacy: "CVS Pharmacy - Downtown",
    rxNumber: "RX-2024-001156",
    quantity: "30 tablets",
    frequency: "Once daily",
    startDate: "Oct 10, 2024",
    endDate: "Nov 9, 2024",
    notes: "Dispensed on Oct 10, 2024",
  },
  {
    id: "4",
    medication: "Amlodipine 5mg",
    dosage: "5mg",
    instructions: "Once daily",
    doctorName: "Dr. James Lin",
    doctorSpecialty: "Primary Care",
    doctorAvatar: JamesDp,
    date: "Sep 20, 2024",
    supply: "30 days supply",
    status: "completed",
    refills: 0,
    rxNumber: "RX-2024-000987",
    quantity: "30 tablets",
    frequency: "Once daily",
    startDate: "Sep 20, 2024",
    endDate: "Oct 19, 2024",
    notes: "Course completed successfully",
  },
  {
    id: "5",
    medication: "Omeprazole 20mg",
    dosage: "20mg",
    instructions: "Once daily before breakfast",
    doctorName: "Dr. Aisha Mahmoud",
    doctorSpecialty: "Cardiologist",
    doctorAvatar: AishaDp,
    date: "Sep 5, 2024",
    supply: "30 days supply",
    status: "expired",
    refills: 0,
    rxNumber: "RX-2024-000845",
    quantity: "30 capsules",
    frequency: "Once daily",
    startDate: "Sep 5, 2024",
    endDate: "Oct 4, 2024",
    notes: "Prescription expired, consult doctor for renewal",
  },
];

export default function DashboardPrescriptions() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(mockPrescriptions);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);

  const filteredPrescriptions = prescriptions.filter((prescription) => {
    const matchesSearch =
      prescription.medication.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prescription.doctorName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === "all" || prescription.status === filterStatus;
    const matchesTab = activeTab === "all" || prescription.status === activeTab;
    return matchesSearch && matchesFilter && matchesTab;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "#10b981";
      case "dispensed":
        return "#3b82f6";
      case "completed":
        return "#6b7280";
      case "expired":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "● Active";
      case "dispensed":
        return "✔ Dispensed";
      case "completed":
        return "✓ Completed";
      case "expired":
        return "✕ Expired";
      default:
        return status;
    }
  };

  const prescriptionStats = {
    total: prescriptions.length,
    active: prescriptions.filter((p) => p.status === "active").length,
    dispensed: prescriptions.filter((p) => p.status === "dispensed").length,
    completed: prescriptions.filter((p) => p.status === "completed").length,
    expired: prescriptions.filter((p) => p.status === "expired").length,
    totalRefills: prescriptions.reduce((acc, p) => acc + p.refills, 0),
  };

  const tabs = [
    { id: "all", label: "All Prescriptions", count: prescriptionStats.total, icon: FileText },
    { id: "active", label: "Active", count: prescriptionStats.active, icon: Activity },
    { id: "dispensed", label: "Dispensed", count: prescriptionStats.dispensed, icon: CheckCircle },
    { id: "completed", label: "Completed", count: prescriptionStats.completed, icon: Clock },
    { id: "expired", label: "Expired", count: prescriptionStats.expired, icon: XCircle },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="section-header">
        <div>
          <h3>My Prescriptions</h3>
          <p style={{ color: "#6b7280", fontSize: "0.9rem", marginTop: "0.25rem", margin: 0 }}>
            Manage your prescription medications and refills
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            background: "white",
            padding: "1.5rem",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <Pill size={20} color="#3b82f6" />
            <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>Total Prescriptions</span>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111827" }}>{prescriptionStats.total}</div>
        </div>
        <div
          style={{
            background: "white",
            padding: "1.5rem",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <Activity size={20} color="#10b981" />
            <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>Active</span>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111827" }}>{prescriptionStats.active}</div>
        </div>
        <div
          style={{
            background: "white",
            padding: "1.5rem",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <CheckCircle size={20} color="#3b82f6" />
            <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>Dispensed</span>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111827" }}>{prescriptionStats.dispensed}</div>
        </div>
        <div
          style={{
            background: "white",
            padding: "1.5rem",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <TrendingUp size={20} color="#f59e0b" />
            <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>Total Refills</span>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111827" }}>{prescriptionStats.totalRefills}</div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "2rem",
          borderBottom: "2px solid #e5e7eb",
          overflowX: "auto",
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "0.75rem 1.5rem",
                background: "none",
                border: "none",
                borderBottom: activeTab === tab.id ? "2px solid #3b82f6" : "2px solid transparent",
                color: activeTab === tab.id ? "#3b82f6" : "#6b7280",
                fontWeight: activeTab === tab.id ? 600 : 400,
                cursor: "pointer",
                fontSize: "0.9rem",
                whiteSpace: "nowrap",
                marginBottom: "-2px",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "all 0.2s ease",
                fontFamily: '"Figtree", sans-serif',
              }}
            >
              <Icon size={16} />
              {tab.label}
              <span
                style={{
                  background: activeTab === tab.id ? "#dbeafe" : "#f3f4f6",
                  color: activeTab === tab.id ? "#3b82f6" : "#6b7280",
                  padding: "0.125rem 0.5rem",
                  borderRadius: "12px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search and Filter Bar */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "2rem",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            position: "relative",
            flex: "1",
            minWidth: "300px",
          }}
        >
          <Search
            size={18}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#9ca3af",
            }}
          />
          <input
            type="text"
            placeholder="Search by medication or doctor name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem 1rem 0.75rem 2.5rem",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              fontSize: "0.9rem",
              outline: "none",
              fontFamily: '"Figtree", sans-serif',
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
          }}
        >
          <Filter size={18} color="#6b7280" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: "0.75rem 1rem",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              fontSize: "0.9rem",
              outline: "none",
              cursor: "pointer",
              fontFamily: '"Figtree", sans-serif',
            }}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="dispensed">Dispensed</option>
            <option value="completed">Completed</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Prescriptions Count */}
      <div style={{ marginBottom: "1rem", color: "#6b7280", fontSize: "0.9rem" }}>
        Showing {filteredPrescriptions.length} of {prescriptions.length} prescriptions
      </div>

      {/* Prescriptions List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%" }}>
        {filteredPrescriptions.map((prescription) => (
          <div
            key={prescription.id}
            className="prescription-card"
            onClick={() => setSelectedPrescription(prescription)}
            style={{ cursor: "pointer" }}
          >
            <div className="prescription-info">
              <div className="doc">
                <img
                  src={prescription.doctorAvatar}
                  alt={prescription.doctorName}
                  className="doctor-avatar"
                />
                <div>
                  <h4>{prescription.doctorName}</h4>
                  <p>{prescription.doctorSpecialty}</p>
                  {prescription.rxNumber && (
                    <small style={{ color: "#6b7280", fontSize: "0.75rem" }}>RX: {prescription.rxNumber}</small>
                  )}
                </div>
              </div>
              <div className="med-info">
                <h4>{prescription.medication}</h4>
                <p>{prescription.instructions}</p>
                <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                  <small>{prescription.supply}</small>
                  {prescription.quantity && <small style={{ color: "#6b7280" }}>Qty: {prescription.quantity}</small>}
                  {prescription.frequency && (
                    <small style={{ color: "#6b7280" }}>Frequency: {prescription.frequency}</small>
                  )}
                  {prescription.refills > 0 && (
                    <small style={{ color: "#3b82f6", fontWeight: 600 }}>
                      {prescription.refills} refill{prescription.refills > 1 ? "s" : ""} remaining
                    </small>
                  )}
                  {prescription.pharmacy && (
                    <small style={{ color: "#6b7280" }}>📍 {prescription.pharmacy}</small>
                  )}
                </div>
                {prescription.startDate && prescription.endDate && (
                  <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "#9ca3af" }}>
                    Valid: {prescription.startDate} - {prescription.endDate}
                  </div>
                )}
              </div>
            </div>
            <div className="prescription-meta">
              <span
                className="status"
                style={{
                  color: getStatusColor(prescription.status),
                  background: `${getStatusColor(prescription.status)}15`,
                  padding: "0.5rem 1rem",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              >
                {getStatusLabel(prescription.status)}
              </span>
              <p>
                <Calendar size={14} style={{ marginRight: "0.25rem" }} />
                {prescription.date}
              </p>
              <div style={{ display: "flex", gap: "0.5rem" }} onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPrescription(prescription);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    padding: "0.5rem 1rem",
                    background: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    fontFamily: '"Figtree", sans-serif',
                  }}
                >
                  <Eye size={14} /> View
                </button>
                <button
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    padding: "0.5rem 1rem",
                    background: "#f3f4f6",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontFamily: '"Figtree", sans-serif',
                  }}
                >
                  <Download size={14} /> Download
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPrescriptions.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            color: "#6b7280",
          }}
        >
          <Pill size={48} style={{ marginBottom: "1rem", opacity: 0.5 }} />
          <p style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>No prescriptions found</p>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      )}

      {/* Prescription Viewing Modal */}
      {selectedPrescription && (
        <div
          className="modal-overlay"
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
          onClick={() => setSelectedPrescription(null)}
        >
          <div
            className="view-prescription-modal"
            style={{
              background: "white",
              borderRadius: "16px",
              padding: 0,
              maxWidth: "900px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "1.5rem 2rem",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f9fafb",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: "#eef2ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Pill size={24} color="#4338ca" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 600, color: "#111827" }}>
                    {selectedPrescription.medication}
                  </h3>
                  <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.9rem", color: "#6b7280" }}>
                    {selectedPrescription.doctorName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPrescription(null)}
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
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f3f4f6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "none";
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: "2rem", overflowY: "auto", flex: 1 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1.5rem", marginBottom: "2rem" }}>
                <div
                  style={{
                    padding: "1rem",
                    background: "#f9fafb",
                    borderRadius: "10px",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <label style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase", fontWeight: 600 }}>
                    Dosage
                  </label>
                  <p style={{ margin: "0.5rem 0 0 0", fontSize: "1rem", fontWeight: 600, color: "#111827" }}>
                    {selectedPrescription.dosage}
                  </p>
                </div>
                <div
                  style={{
                    padding: "1rem",
                    background: "#f9fafb",
                    borderRadius: "10px",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <label style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase", fontWeight: 600 }}>
                    Frequency
                  </label>
                  <p style={{ margin: "0.5rem 0 0 0", fontSize: "1rem", fontWeight: 600, color: "#111827" }}>
                    {selectedPrescription.frequency || selectedPrescription.instructions}
                  </p>
                </div>
                {selectedPrescription.quantity && (
                  <div
                    style={{
                      padding: "1rem",
                      background: "#f9fafb",
                      borderRadius: "10px",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <label style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase", fontWeight: 600 }}>
                      Quantity
                    </label>
                    <p style={{ margin: "0.5rem 0 0 0", fontSize: "1rem", fontWeight: 600, color: "#111827" }}>
                      {selectedPrescription.quantity}
                    </p>
                  </div>
                )}
                <div
                  style={{
                    padding: "1rem",
                    background: "#f9fafb",
                    borderRadius: "10px",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <label style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase", fontWeight: 600 }}>
                    Supply
                  </label>
                  <p style={{ margin: "0.5rem 0 0 0", fontSize: "1rem", fontWeight: 600, color: "#111827" }}>
                    {selectedPrescription.supply}
                  </p>
                </div>
              </div>

              <div
                style={{
                  padding: "1.5rem",
                  background: "#f9fafb",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  marginBottom: "1.5rem",
                }}
              >
                <label style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase", fontWeight: 600 }}>
                  Prescribing Doctor
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "1rem" }}>
                  <img
                    src={selectedPrescription.doctorAvatar}
                    alt={selectedPrescription.doctorName}
                    style={{ width: "50px", height: "50px", borderRadius: "50%" }}
                  />
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "1rem" }}>{selectedPrescription.doctorName}</p>
                    <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.9rem", color: "#6b7280" }}>
                      {selectedPrescription.doctorSpecialty}
                    </p>
                  </div>
                </div>
              </div>

              {selectedPrescription.rxNumber && (
                <div
                  style={{
                    padding: "1rem",
                    background: "#f9fafb",
                    borderRadius: "10px",
                    border: "1px solid #e5e7eb",
                    marginBottom: "1.5rem",
                  }}
                >
                  <label style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase", fontWeight: 600 }}>
                    Prescription Number
                  </label>
                  <p style={{ margin: "0.5rem 0 0 0", fontSize: "1rem", fontFamily: "monospace", fontWeight: 600 }}>
                    {selectedPrescription.rxNumber}
                  </p>
                </div>
              )}

              {selectedPrescription.startDate && selectedPrescription.endDate && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
                  <div
                    style={{
                      padding: "1rem",
                      background: "#f9fafb",
                      borderRadius: "10px",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <label style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase", fontWeight: 600 }}>
                      Start Date
                    </label>
                    <p style={{ margin: "0.5rem 0 0 0", fontSize: "1rem", fontWeight: 600, color: "#111827" }}>
                      <Calendar size={16} style={{ marginRight: "0.5rem", verticalAlign: "middle" }} />
                      {selectedPrescription.startDate}
                    </p>
                  </div>
                  <div
                    style={{
                      padding: "1rem",
                      background: "#f9fafb",
                      borderRadius: "10px",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <label style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase", fontWeight: 600 }}>
                      End Date
                    </label>
                    <p style={{ margin: "0.5rem 0 0 0", fontSize: "1rem", fontWeight: 600, color: "#111827" }}>
                      <Calendar size={16} style={{ marginRight: "0.5rem", verticalAlign: "middle" }} />
                      {selectedPrescription.endDate}
                    </p>
                  </div>
                </div>
              )}

              {selectedPrescription.refills > 0 && (
                <div
                  style={{
                    padding: "1rem",
                    background: "#dbeafe",
                    borderRadius: "10px",
                    border: "1px solid #bfdbfe",
                    marginBottom: "1.5rem",
                  }}
                >
                  <label style={{ fontSize: "0.75rem", color: "#1e40af", textTransform: "uppercase", fontWeight: 600 }}>
                    Refills Remaining
                  </label>
                  <p style={{ margin: "0.5rem 0 0 0", fontSize: "1.25rem", fontWeight: 700, color: "#1e40af" }}>
                    {selectedPrescription.refills} refill{selectedPrescription.refills > 1 ? "s" : ""}
                  </p>
                </div>
              )}

              {selectedPrescription.pharmacy && (
                <div
                  style={{
                    padding: "1rem",
                    background: "#f9fafb",
                    borderRadius: "10px",
                    border: "1px solid #e5e7eb",
                    marginBottom: "1.5rem",
                  }}
                >
                  <label style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase", fontWeight: 600 }}>
                    Pharmacy
                  </label>
                  <p style={{ margin: "0.5rem 0 0 0", fontSize: "1rem", fontWeight: 600, color: "#111827" }}>
                    {selectedPrescription.pharmacy}
                  </p>
                </div>
              )}

              {selectedPrescription.notes && (
                <div
                  style={{
                    padding: "1rem",
                    background: "#fef3c7",
                    borderRadius: "10px",
                    border: "1px solid #fde68a",
                    marginBottom: "1.5rem",
                  }}
                >
                  <label style={{ fontSize: "0.75rem", color: "#92400e", textTransform: "uppercase", fontWeight: 600 }}>
                    Important Notes
                  </label>
                  <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.95rem", color: "#78350f" }}>
                    {selectedPrescription.notes}
                  </p>
                </div>
              )}

              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <span
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    background: `${getStatusColor(selectedPrescription.status)}15`,
                    color: getStatusColor(selectedPrescription.status),
                  }}
                >
                  {getStatusLabel(selectedPrescription.status)}
                </span>
              </div>

              {/* Prescription Preview Area */}
              <div
                style={{
                  background: "#f9fafb",
                  border: "2px dashed #d1d5db",
                  borderRadius: "12px",
                  padding: "4rem 2rem",
                  textAlign: "center",
                  marginTop: "2rem",
                }}
              >
                <Pill size={64} style={{ color: "#9ca3af", marginBottom: "1rem" }} />
                <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: 0 }}>
                  Prescription document preview would appear here
                </p>
                <p style={{ color: "#9ca3af", fontSize: "0.85rem", margin: "0.5rem 0 0 0" }}>
                  Click "View Full Prescription" to see complete details
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "1.5rem 2rem",
                borderTop: "1px solid #e5e7eb",
                display: "flex",
                gap: "0.75rem",
                justifyContent: "flex-end",
                background: "#f9fafb",
              }}
            >
              <button
                onClick={() => setSelectedPrescription(null)}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                }}
              >
                Close
              </button>
              <button
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "#f3f4f6",
                  color: "#111827",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Printer size={16} /> Print
              </button>
              <button
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "#f3f4f6",
                  color: "#111827",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Download size={16} /> Download PDF
              </button>
              <button
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Eye size={16} /> View Full Prescription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
