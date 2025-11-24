import { useMemo, useEffect, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, Bell, Settings } from "lucide-react";
import { usePatientProfile } from "../../../hooks/usePatientProfile";
import { useWalletSigner } from "../../../hooks/useWalletSigner";
import { SealWalrusService } from "../../../services/sealWalrusService";
import { useSuiClient } from "@mysten/dapp-kit";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import "../../dashboard.css";

export const DashboardHeader = () => {
  const account = useCurrentAccount();
  const location = useLocation();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const packageId = import.meta.env.VITE_SUI_PACKAGE_ID || "";
  const network = (import.meta.env.VITE_SUI_NETWORK || "testnet") as
    | "testnet"
    | "mainnet"
    | "devnet";
  const customSealServerIds = (import.meta.env.VITE_SEAL_SERVER_IDS || "")
    .split(",")
    .filter(Boolean);
  const enokiPrivateApiKey = import.meta.env.VITE_ENOKI_PRIVATE_API_KEY;
  const suiClientFromProvider = useSuiClient();
  const walletSigner = useWalletSigner();

  const { walrusId, profileObjectId, recordsId } = usePatientProfile(packageId);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string>("");

  // Get route name from location
  const getRouteName = () => {
    const path = location.pathname;
    if (path === "/dashboard" || path === "/dashboard/") {
      return "Dashboard";
    }
    const route = path.split("/dashboard/")[1] || "";
    if (!route) return "Dashboard";
    
    // Map route names to display names
    const routeMap: { [key: string]: string } = {
      "records": "My Records",
      "prescriptions": "Prescriptions",
      "shared": "Shared Access",
      "activity": "Activity Log",
      "settings": "Settings",
    };
    
    return routeMap[route] || route
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

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

  // Load profile image and name
  useEffect(() => {
    if (!walrusId || !profileObjectId || !recordsId || !sealWalrusService || !account?.address || !walletSigner) {
      return;
    }

    const loadProfile = async () => {
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

          if (walrusProfileData) {
            if (walrusProfileData.profileImage) {
              setProfileImage(walrusProfileData.profileImage);
            }
            if (walrusProfileData.fullName) {
              setProfileName(walrusProfileData.fullName);
            }
          }
        }
      } catch (error) {
        console.error("Error loading profile for header:", error);
      }
    };

    loadProfile();
  }, [walrusId, profileObjectId, recordsId, sealWalrusService, account?.address, walletSigner]);

  // Get initials from profile name or account address
  const getInitials = () => {
    if (profileName) {
      return profileName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (account?.address) {
      return account.address.slice(2, 4).toUpperCase();
    }
    return "EO";
  };

  // Mock notifications data
  const notifications = [
    { id: 1, message: "New record shared with Dr. Aisha Mahmoud", time: "2 hours ago", read: false },
    { id: 2, message: "Prescription refill reminder: Lisinopril", time: "1 day ago", read: false },
    { id: 3, message: "Access granted to CVS Pharmacy", time: "3 days ago", read: true },
    { id: 4, message: "Your health record was viewed", time: "5 days ago", read: true },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="topbar">
      <h2 style={{ 
        fontSize: "1.5rem",
        fontWeight: 600,
        color: "#111827",
        fontFamily: '"Figtree", sans-serif',
        margin: 0,
      }}>
        {getRouteName()}
      </h2>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search your record, prescriptions…"
          />
        </div>
        <div className="topbar-right">
          <div style={{ position: "relative" }}>
            <Bell 
              size={20} 
              className="icon" 
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              style={{ cursor: "pointer" }}
            />
            {unreadCount > 0 && (
              <span style={{
                position: "absolute",
                top: "-4px",
                right: "-4px",
                background: "#ef4444",
                color: "white",
                borderRadius: "50%",
                width: "18px",
                height: "18px",
                fontSize: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 600,
              }}>
                {unreadCount}
              </span>
            )}
            {notificationsOpen && (
              <>
                <div
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 999,
                  }}
                  onClick={() => setNotificationsOpen(false)}
                />
                <div style={{
                  position: "absolute",
                  top: "calc(100% + 10px)",
                  right: 0,
                  background: "white",
                  borderRadius: "12px",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                  width: "360px",
                  maxHeight: "400px",
                  overflowY: "auto",
                  zIndex: 1000,
                  border: "1px solid #e5e7eb",
                }}>
                <div style={{
                  padding: "1rem 1.5rem",
                  borderBottom: "1px solid #e5e7eb",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Notifications</h3>
                  <button
                    onClick={() => setNotificationsOpen(false)}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: "0.875rem",
                      color: "#3b82f6",
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                  >
                    Close
                  </button>
                </div>
                <div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
                      No notifications
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        style={{
                          padding: "1rem 1.5rem",
                          borderBottom: "1px solid #f3f4f6",
                          cursor: "pointer",
                          background: notification.read ? "white" : "#f9fafb",
                          transition: "background 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#f3f4f6";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = notification.read ? "white" : "#f9fafb";
                        }}
                      >
                        <p style={{ margin: 0, fontSize: "0.9rem", color: "#111827", fontWeight: notification.read ? 400 : 600 }}>
                          {notification.message}
                        </p>
                        <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.75rem", color: "#6b7280" }}>
                          {notification.time}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
              </>
            )}
          </div>
          <Settings 
            size={20} 
            className="icon" 
            onClick={() => navigate("/dashboard/settings")}
            style={{ cursor: "pointer" }}
          />
          <div className="profile">
            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                backgroundColor: "#4338ca",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: 600,
              }}>
                {getInitials()}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

