import { useState } from "react";
import {
  CloudUpload,
  UserLock,
  Eye,
  Pill,
  UserX,
  File,
  Share2,
  Download,
  Copy,
  Search,
  Filter,
  Calendar,
  Clock,
  TrendingUp,
  BarChart3,
  Activity,
  Shield,
  AlertCircle,
} from "lucide-react";
import "../dashboard.css";

interface Activity {
  id: string;
  type: "upload" | "share" | "view" | "dispense" | "revoke" | "download";
  description: string;
  timestamp: string;
  exactTime: string;
  hash: string;
  user?: string;
  userRole?: string;
  record?: string;
  recordType?: string;
  ipAddress?: string;
  location?: string;
  status: "success" | "pending" | "failed";
  details?: string;
}

export default function DashboardActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  const filteredActivities = activities.filter((activity) => {
    const matchesSearch =
      activity.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (activity.user && activity.user.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (activity.record && activity.record.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filterType === "all" || activity.type === filterType;
    const matchesTab = activeTab === "all" || activity.type === activeTab;
    return matchesSearch && matchesFilter && matchesTab;
  });

  const getActivityIcon = (type: string) => {
    const iconProps = { size: 18 };
    switch (type) {
      case "upload":
        return <CloudUpload {...iconProps} />;
      case "share":
        return <UserLock {...iconProps} />;
      case "view":
        return <Eye {...iconProps} />;
      case "dispense":
        return <Pill {...iconProps} />;
      case "revoke":
        return <UserX {...iconProps} />;
      case "download":
        return <Download {...iconProps} />;
      default:
        return <File {...iconProps} />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "upload":
        return "#3b82f6";
      case "share":
        return "#10b981";
      case "view":
        return "#6366f1";
      case "dispense":
        return "#8b5cf6";
      case "revoke":
        return "#ef4444";
      case "download":
        return "#f59e0b";
      default:
        return "#6b7280";
    }
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    alert("Transaction hash copied to clipboard!");
  };

  const activityStats = {
    total: activities.length,
    uploads: activities.filter((a) => a.type === "upload").length,
    shares: activities.filter((a) => a.type === "share").length,
    views: activities.filter((a) => a.type === "view").length,
    dispensations: activities.filter((a) => a.type === "dispense").length,
    revocations: activities.filter((a) => a.type === "revoke").length,
    downloads: activities.filter((a) => a.type === "download").length,
  };

  const tabs = [
    { id: "all", label: "All Activities", count: activityStats.total },
    { id: "upload", label: "Uploads", count: activityStats.uploads },
    { id: "share", label: "Shares", count: activityStats.shares },
    { id: "view", label: "Views", count: activityStats.views },
    { id: "dispense", label: "Dispensations", count: activityStats.dispensations },
    { id: "revoke", label: "Revocations", count: activityStats.revocations },
    { id: "download", label: "Downloads", count: activityStats.downloads },
  ];

  return (
    <div className="page-container">
      {/* Header with Stats */}
      <div className="recent-heading">
        <div>
          <h3>Activity Log</h3>
          <p style={{ color: "#6b7280", fontSize: "0.9rem", marginTop: "0.25rem", margin: 0 }}>
            Complete history of all activities on your health records
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
            <Activity size={20} color="#3b82f6" />
            <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>Total Activities</span>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111827" }}>{activityStats.total}</div>
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
            <TrendingUp size={20} color="#10b981" />
            <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>This Week</span>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111827" }}>
            {activities.filter((a) => a.timestamp.includes("hour") || a.timestamp.includes("day")).length}
          </div>
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
            <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>Secure Actions</span>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111827" }}>
            {activities.filter((a) => a.status === "success").length}
          </div>
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
            <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>Active Shares</span>
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111827" }}>
            {activities.filter((a) => a.type === "share").length}
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
        {tabs.map((tab) => (
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
            }}
          >
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
        ))}
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
            placeholder="Search activities by description, user, or record..."
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
            <option value="upload">Uploads</option>
            <option value="share">Shares</option>
            <option value="view">Views</option>
            <option value="dispense">Dispensations</option>
            <option value="revoke">Revocations</option>
            <option value="download">Downloads</option>
          </select>
        </div>
      </div>

      {/* Activity Count */}
      <div style={{ marginBottom: "1rem", color: "#6b7280", fontSize: "0.9rem" }}>
        {activities.length > 0 
          ? `Showing ${filteredActivities.length} of ${activities.length} activities`
          : "No activities found"}
      </div>

      {/* Activity Timeline */}
      {activities.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            color: "#6b7280",
          }}
        >
          <Activity size={48} style={{ marginBottom: "1rem", opacity: 0.5 }} />
          <p style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>No activity found</p>
          <p>Activity logs will appear here as you interact with your health records.</p>
          <p style={{ fontSize: "0.85rem", marginTop: "0.5rem", color: "#9ca3af" }}>
            Activities include granting access, viewing records, and other interactions.
          </p>
        </div>
      ) : (
        <div className="activity-timeline">
        {filteredActivities.map((activity) => (
          <div
            key={activity.id}
            className="activity-item"
            onClick={() => setSelectedActivity(activity)}
            style={{ cursor: "pointer" }}
          >
            <div
              className="activity-icon"
              style={{
                background: `${getActivityColor(activity.type)}15`,
                color: getActivityColor(activity.type),
              }}
            >
              {getActivityIcon(activity.type)}
            </div>
            <div className="activity-content" style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                <p style={{ margin: 0, fontWeight: 600, color: "#111827" }}>{activity.description}</p>
                <span
                  style={{
                    padding: "0.25rem 0.75rem",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    background: activity.status === "success" ? "#d1fae5" : activity.status === "pending" ? "#fef3c7" : "#fee2e2",
                    color: activity.status === "success" ? "#065f46" : activity.status === "pending" ? "#92400e" : "#991b1b",
                  }}
                >
                  {activity.status.toUpperCase()}
                </span>
              </div>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                <span className="activity-time" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <Calendar size={12} />
                  {activity.timestamp}
                </span>
                {activity.user && (
                  <span style={{ fontSize: "0.85rem", color: "#6b7280", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <Eye size={12} />
                    {activity.user} {activity.userRole && `(${activity.userRole})`}
                  </span>
                )}
                {activity.record && (
                  <span style={{ fontSize: "0.85rem", color: "#6b7280", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <File size={12} />
                    {activity.record} {activity.recordType && `(${activity.recordType})`}
                  </span>
                )}
              </div>
              {activity.details && (
                <div style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "0.5rem", fontStyle: "italic" }}>
                  {activity.details}
                </div>
              )}
              <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                {activity.ipAddress && (
                  <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>IP: {activity.ipAddress}</span>
                )}
                {activity.location && (
                  <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>📍 {activity.location}</span>
                )}
                <div className="activity-hash" style={{ marginLeft: "auto" }}>
                  {activity.hash.slice(0, 12)}...
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyHash(activity.hash);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      marginLeft: "0.5rem",
                      padding: "0.25rem",
                    }}
                    title="Copy hash"
                  >
                    <Copy size={11} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        </div>
      )}

      {activities.length > 0 && filteredActivities.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            color: "#6b7280",
          }}
        >
          <File size={48} style={{ marginBottom: "1rem", opacity: 0.5 }} />
          <p style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>No activities found</p>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      )}

      {/* Activity Viewing Modal */}
      {selectedActivity && (
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
          onClick={() => setSelectedActivity(null)}
        >
          <div
            className="view-activity-modal"
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
                  <Activity size={24} color="#4338ca" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 600, color: "#111827" }}>
                    Activity Details
                  </h3>
                  <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.9rem", color: "#6b7280" }}>
                    {selectedActivity.description}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedActivity(null)}
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
                    Timestamp
                  </label>
                  <p style={{ margin: "0.5rem 0 0 0", fontSize: "1rem", fontWeight: 600, color: "#111827" }}>
                    <Clock size={16} style={{ marginRight: "0.5rem", verticalAlign: "middle" }} />
                    {selectedActivity.timestamp}
                  </p>
                  <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "#6b7280" }}>
                    {selectedActivity.exactTime}
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
                    Status
                  </label>
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: "0.5rem",
                      padding: "0.5rem 1rem",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      background:
                        selectedActivity.status === "success"
                          ? "#d1fae5"
                          : selectedActivity.status === "pending"
                          ? "#fef3c7"
                          : "#fee2e2",
                      color:
                        selectedActivity.status === "success"
                          ? "#065f46"
                          : selectedActivity.status === "pending"
                          ? "#92400e"
                          : "#991b1b",
                    }}
                  >
                    {selectedActivity.status.toUpperCase()}
                  </span>
                </div>
                {selectedActivity.user && (
                  <div
                    style={{
                      padding: "1rem",
                      background: "#f9fafb",
                      borderRadius: "10px",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <label style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase", fontWeight: 600 }}>
                      User
                    </label>
                    <p style={{ margin: "0.5rem 0 0 0", fontSize: "1rem", fontWeight: 600, color: "#111827" }}>
                      {selectedActivity.user}
                    </p>
                    {selectedActivity.userRole && (
                      <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "#6b7280" }}>
                        {selectedActivity.userRole}
                      </p>
                    )}
                  </div>
                )}
                {selectedActivity.record && (
                  <div
                    style={{
                      padding: "1rem",
                      background: "#f9fafb",
                      borderRadius: "10px",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <label style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase", fontWeight: 600 }}>
                      Record
                    </label>
                    <p style={{ margin: "0.5rem 0 0 0", fontSize: "1rem", fontWeight: 600, color: "#111827" }}>
                      {selectedActivity.record}
                    </p>
                    {selectedActivity.recordType && (
                      <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "#6b7280" }}>
                        {selectedActivity.recordType}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {selectedActivity.details && (
                <div
                  style={{
                    padding: "1.5rem",
                    background: "#fef3c7",
                    borderRadius: "12px",
                    border: "1px solid #fde68a",
                    marginBottom: "1.5rem",
                  }}
                >
                  <label style={{ fontSize: "0.75rem", color: "#92400e", textTransform: "uppercase", fontWeight: 600 }}>
                    Additional Details
                  </label>
                  <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.95rem", color: "#78350f" }}>{selectedActivity.details}</p>
                </div>
              )}

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
                  Transaction Hash
                </label>
                <div
                  style={{
                    margin: "0.5rem 0 0 0",
                    padding: "0.75rem",
                    background: "white",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                  }}
                >
                  <code style={{ fontSize: "0.85rem", color: "#111827", wordBreak: "break-all", fontFamily: "monospace" }}>
                    {selectedActivity.hash}
                  </code>
                  <button
                    onClick={() => copyHash(selectedActivity.hash)}
                    style={{
                      background: "#3b82f6",
                      color: "white",
                      border: "none",
                      padding: "0.5rem",
                      borderRadius: "6px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#2563eb";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#3b82f6";
                    }}
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>

              {selectedActivity.ipAddress && (
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
                    IP Address & Location
                  </label>
                  <p style={{ margin: "0.5rem 0 0 0", fontSize: "1rem", fontWeight: 600, color: "#111827" }}>
                    {selectedActivity.ipAddress}
                  </p>
                  {selectedActivity.location && (
                    <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "#6b7280" }}>
                      {selectedActivity.location}
                    </p>
                  )}
                </div>
              )}
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
                onClick={() => setSelectedActivity(null)}
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
                onClick={() => copyHash(selectedActivity.hash)}
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
                <Copy size={16} /> Copy Hash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
