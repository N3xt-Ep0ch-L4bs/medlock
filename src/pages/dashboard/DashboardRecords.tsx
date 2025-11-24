import { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  File,
  Lock,
  Search,
  Filter,
  Download,
  Eye,
  Share2,
  Trash2,
  Plus,
  CloudUpload,
  BarChart3,
  FileText,
  Image,
  Pill,
  TrendingUp,
  Shield,
  Users,
  Loader2,
} from "lucide-react";
import { useSuiClient } from "@mysten/dapp-kit";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { usePatientProfile } from "../../hooks/usePatientProfile";
import ResultIcon from "../../assets/record-icon1.png";
import XrayIcon from "../../assets/record-icon2.png";
import LisinoprilIcon from "../../assets/record-icon3.png";
import LipidIcon from "../../assets/record-icon4.png";
import ECGIcon from "../../assets/record-icon5.png";
import UrinalysisIcon from "../../assets/record-icon6.png";
import "../dashboard.css";

interface Record {
  id: string;
  title: string;
  type: string;
  date: string;
  size: string;
  icon: string;
  sharedWith: number;
  encrypted: boolean;
  status: "private" | "shared";
  provider?: string;
  description?: string;
  lastAccessed?: string;
}

const packageId = import.meta.env.VITE_SUI_PACKAGE_ID || "";
const network = (import.meta.env.VITE_SUI_NETWORK || "testnet") as "testnet" | "mainnet" | "devnet";

// Helper function to get icon based on record type
const getRecordIcon = (type: string) => {
  if (type.toLowerCase().includes("prescription") || type.toLowerCase().includes("pill")) {
    return LisinoprilIcon;
  }
  if (type.toLowerCase().includes("x-ray") || type.toLowerCase().includes("imaging") || type.toLowerCase().includes("scan") || type.toLowerCase().includes("ecg")) {
    return XrayIcon;
  }
  if (type.toLowerCase().includes("lipid")) {
    return LipidIcon;
  }
  if (type.toLowerCase().includes("ecg")) {
    return ECGIcon;
  }
  if (type.toLowerCase().includes("urinalysis") || type.toLowerCase().includes("urine")) {
    return UrinalysisIcon;
  }
  return ResultIcon;
};

export default function DashboardRecords() {
  const suiClientFromProvider = useSuiClient();
  const { recordsId } = usePatientProfile(packageId);
  
  const suiClient = useMemo(() => {
    return suiClientFromProvider || new SuiClient({
      url: getFullnodeUrl(network),
    });
  }, [network, suiClientFromProvider]);

  const [records, setRecords] = useState<Record[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedRecord, setSelectedRecord] = useState<Record | null>(null);

  // Fetch records from blockchain
  useEffect(() => {
    const fetchRecords = async () => {
      if (!recordsId || !suiClient) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const recordsObject = await suiClient.getObject({
          id: recordsId,
          options: {
            showContent: true,
            showType: true,
          },
        });

        if (recordsObject.data?.content && 'fields' in recordsObject.data.content) {
          const fields = recordsObject.data.content.fields as Record<string, any>;
          const recordsArray = fields.records || [];
          
          // Convert blockchain records to UI format
          const recordsList: Record[] = recordsArray.map((record: any, index: number) => {
            // Decode metadata if available
            let title = `Record ${index + 1}`;
            let description = "";
            let type = "Unknown";
            
            if (record.metadata && Array.isArray(record.metadata)) {
              try {
                const metadataBytes = new Uint8Array(record.metadata);
                const decoded = new TextDecoder().decode(metadataBytes);
                if (decoded) {
                  try {
                    const metadataObj = JSON.parse(decoded);
                    title = metadataObj.title || metadataObj.name || title;
                    description = metadataObj.description || "";
                    type = metadataObj.type || metadataObj.category || "Unknown";
                  } catch {
                    // If not JSON, use as title
                    title = decoded;
                  }
                }
              } catch (e) {
                console.warn("Failed to decode record metadata:", e);
              }
            }

            // Determine type from title if not in metadata
            if (type === "Unknown") {
              const titleLower = title.toLowerCase();
              if (titleLower.includes("prescription") || titleLower.includes("pill") || titleLower.includes("medication")) {
                type = "Prescription";
              } else if (titleLower.includes("x-ray") || titleLower.includes("scan") || titleLower.includes("mri") || titleLower.includes("ct") || titleLower.includes("imaging") || titleLower.includes("ecg")) {
                type = "Imaging";
              } else if (titleLower.includes("test") || titleLower.includes("lab") || titleLower.includes("blood") || titleLower.includes("panel") || titleLower.includes("urinalysis")) {
                type = "Lab Results";
              }
            }

            // Format date
            const createdDate = record.created_at 
              ? new Date(Number(record.created_at) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : "Unknown date";

            // Estimate size (we don't have actual size, so we'll show "Encrypted")
            const size = "Encrypted";

            return {
              id: `${recordsId}_${index}`,
              title,
              type,
              date: createdDate,
              size,
              icon: getRecordIcon(type),
              sharedWith: 0, // TODO: Calculate from access_granted
              encrypted: true,
              status: "private" as const, // TODO: Determine from access_granted
              description,
            };
          });

          // Sort by date (newest first)
          recordsList.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateB - dateA;
          });

          setRecords(recordsList);
        } else {
          setRecords([]);
        }
      } catch (error) {
        console.error("Error fetching records:", error);
        setRecords([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (recordsId) {
      fetchRecords();
    } else {
      setIsLoading(false);
    }
  }, [recordsId, suiClient]);

  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      record.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (record.provider && record.provider.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filterType === "all" || record.type === filterType;
    const matchesTab = activeTab === "all" || record.type === activeTab;
    return matchesSearch && matchesFilter && matchesTab;
  });

  const recordStats = {
    total: records.length,
    labResults: records.filter((r) => r.type === "Lab Results").length,
    imaging: records.filter((r) => r.type === "Imaging").length,
    prescriptions: records.filter((r) => r.type === "Prescription").length,
    shared: records.filter((r) => r.status === "shared").length,
    private: records.filter((r) => r.status === "private").length,
    totalSize: records.reduce((acc, r) => {
      const size = parseFloat(r.size);
      return acc + (r.size.includes("MB") ? size : size / 1000);
    }, 0),
  };

  const tabs = [
    { id: "all", label: "All Records", count: recordStats.total, icon: FileText },
    { id: "Lab Results", label: "Lab Results", count: recordStats.labResults, icon: FileText },
    { id: "Imaging", label: "Imaging", count: recordStats.imaging, icon: Image },
    { id: "Prescription", label: "Prescriptions", count: recordStats.prescriptions, icon: Pill },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="records-header">
        <div>
          <h3>My Health Records</h3>
          <p style={{ color: "#6b7280", fontSize: "0.9rem", marginTop: "0.25rem", margin: 0 }}>
            Manage and organize your health records
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
            <FileText size={20} color="#3b82f6" />
            <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>Total Records</span>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111827" }}>{recordStats.total}</div>
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
            <Users size={20} color="#10b981" />
            <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>Shared Records</span>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111827" }}>{recordStats.shared}</div>
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
            <Shield size={20} color="#8b5cf6" />
            <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>Private Records</span>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111827" }}>{recordStats.private}</div>
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
            <BarChart3 size={20} color="#f59e0b" />
            <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>Total Storage</span>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111827" }}>
            {recordStats.totalSize.toFixed(1)} MB
          </div>
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
            placeholder="Search records by name, type, or provider..."
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
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
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
            <option value="all">All Types</option>
            <option value="Lab Results">Lab Results</option>
            <option value="Imaging">Imaging</option>
            <option value="Prescription">Prescription</option>
          </select>
        </div>
      </div>

      {/* Records Count */}
      <div style={{ marginBottom: "1rem", color: "#6b7280", fontSize: "0.9rem" }}>
        {isLoading ? (
          "Loading records..."
        ) : (
          `Showing ${filteredRecords.length} of ${records.length} records`
        )}
      </div>

      {/* Records Grid */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#6b7280" }}>
          <Loader2 size={48} style={{ margin: "0 auto 1rem", animation: "spin 1s linear infinite" }} />
          <p>Loading records from blockchain...</p>
        </div>
      ) : (
        <div className="records-grid">
        {filteredRecords.map((record) => (
          <div
            key={record.id}
            className="record-card"
            onClick={() => setSelectedRecord(record)}
            style={{ cursor: "pointer" }}
          >
            <img src={record.icon} alt={record.type} />
            <h4 className="record-title">{record.title}</h4>
            <p className="record-meta">
              <Calendar size={14} /> {record.date} • <File size={13} /> {record.size}
            </p>
            {record.provider && (
              <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: "0.5rem 0" }}>
                Provider: {record.provider}
              </p>
            )}
            {record.description && (
              <p style={{ fontSize: "0.8rem", color: "#9ca3af", margin: "0.25rem 0", fontStyle: "italic" }}>
                {record.description}
              </p>
            )}
            <div className="record-tags">
              {record.sharedWith > 0 && (
                <span className="record-tag">
                  Shared with {record.sharedWith} {record.sharedWith === 1 ? "doctor" : "doctors"}
                </span>
              )}
              {record.encrypted && <span className="record-tag">Encrypted</span>}
              <span className="record-tag">{record.type}</span>
            </div>
            <div className="record-footer">
              <span>
                <Lock size={13} /> {record.status === "private" ? "Private" : "Shared"}
              </span>
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "center",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRecord(record);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "0.25rem",
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="View"
                >
                  <Eye size={16} color="#6b7280" />
                </button>
                <button
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "0.25rem",
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Share"
                >
                  <Share2 size={16} color="#6b7280" />
                </button>
                <button
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "0.25rem",
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Download"
                >
                  <Download size={16} color="#6b7280" />
                </button>
                <button
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "0.25rem",
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="More options"
                >
                  ⋯
                </button>
              </div>
            </div>
          </div>
        ))}
        </div>
      )}

      {!isLoading && filteredRecords.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            color: "#6b7280",
          }}
        >
          <File size={48} style={{ marginBottom: "1rem", opacity: 0.5 }} />
          <p style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>No records found</p>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      )}

      {/* Record Viewing Modal */}
      {selectedRecord && (
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
          onClick={() => setSelectedRecord(null)}
        >
          <div
            className="view-record-modal"
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
                <img src={selectedRecord.icon} alt={selectedRecord.type} style={{ width: "48px", height: "48px" }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 600, color: "#111827" }}>
                    {selectedRecord.title}
                  </h3>
                  <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.9rem", color: "#6b7280" }}>{selectedRecord.type}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
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
                    Date
                  </label>
                  <p style={{ margin: "0.5rem 0 0 0", fontSize: "1rem", fontWeight: 600, color: "#111827" }}>
                    <Calendar size={16} style={{ marginRight: "0.5rem", verticalAlign: "middle" }} />
                    {selectedRecord.date}
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
                    File Size
                  </label>
                  <p style={{ margin: "0.5rem 0 0 0", fontSize: "1rem", fontWeight: 600, color: "#111827" }}>
                    <File size={16} style={{ marginRight: "0.5rem", verticalAlign: "middle" }} />
                    {selectedRecord.size}
                  </p>
                </div>
                {selectedRecord.provider && (
                  <div
                    style={{
                      padding: "1rem",
                      background: "#f9fafb",
                      borderRadius: "10px",
                      border: "1px solid #e5e7eb",
                      gridColumn: "span 2",
                    }}
                  >
                    <label style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase", fontWeight: 600 }}>
                      Provider
                    </label>
                    <p style={{ margin: "0.5rem 0 0 0", fontSize: "1rem", fontWeight: 600, color: "#111827" }}>
                      {selectedRecord.provider}
                    </p>
                  </div>
                )}
              </div>

              {selectedRecord.description && (
                <div style={{ marginBottom: "2rem" }}>
                  <label style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase", fontWeight: 600 }}>
                    Description
                  </label>
                  <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.95rem", color: "#374151", lineHeight: "1.6" }}>
                    {selectedRecord.description}
                  </p>
                </div>
              )}

              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "2rem" }}>
                {selectedRecord.sharedWith > 0 && (
                  <span
                    style={{
                      padding: "0.5rem 1rem",
                      background: "#dbeafe",
                      color: "#1e40af",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <Users size={14} />
                    Shared with {selectedRecord.sharedWith} {selectedRecord.sharedWith === 1 ? "doctor" : "doctors"}
                  </span>
                )}
                {selectedRecord.encrypted && (
                  <span
                    style={{
                      padding: "0.5rem 1rem",
                      background: "#d1fae5",
                      color: "#065f46",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <Lock size={14} />
                    Encrypted
                  </span>
                )}
                <span
                  style={{
                    padding: "0.5rem 1rem",
                    background: selectedRecord.status === "shared" ? "#dbeafe" : "#f3f4f6",
                    color: selectedRecord.status === "shared" ? "#1e40af" : "#374151",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Lock size={14} />
                  {selectedRecord.status === "shared" ? "Shared" : "Private"}
                </span>
                <span
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#f3f4f6",
                    color: "#374151",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                  }}
                >
                  {selectedRecord.type}
                </span>
              </div>

              {/* Record Preview Area */}
              <div
                style={{
                  background: "#f9fafb",
                  border: "2px dashed #d1d5db",
                  borderRadius: "12px",
                  padding: "4rem 2rem",
                  textAlign: "center",
                  marginBottom: "2rem",
                }}
              >
                <File size={64} style={{ color: "#9ca3af", marginBottom: "1rem" }} />
                <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: 0 }}>
                  Record preview would appear here
                </p>
                <p style={{ color: "#9ca3af", fontSize: "0.85rem", margin: "0.5rem 0 0 0" }}>
                  Click "View Full Record" to see complete details
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
                onClick={() => setSelectedRecord(null)}
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
                <Share2 size={16} /> Share
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
                <Download size={16} /> Download
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
                <Eye size={16} /> View Full Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
