import { useEffect, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import {
  useCurrentAccount,
} from "@mysten/dapp-kit";
import { usePatientProfile } from "../../hooks/usePatientProfile";
import { DashboardLayout } from "./DashboardLayout";
import { Loader2 } from "lucide-react";
import Logo from "../../assets/logo.png";
import "../dashboard.css";

const Dashboard = () => {
  const account = useCurrentAccount();
  const navigate = useNavigate();
  const packageId = import.meta.env.VITE_SUI_PACKAGE_ID || "";
  const { hasProfile, isLoading: isProfileLoading } = usePatientProfile(packageId);
  const [hasCheckedProfile, setHasCheckedProfile] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Wait for account to load before checking authentication
  useEffect(() => {
    // Give time for autoConnect to work
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Redirect to settings if profile not found (only for patients)
  useEffect(() => {
    if (!isProfileLoading && account?.address && !hasCheckedProfile && !isInitializing) {
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
    isInitializing,
    navigate,
  ]);

  // Redirect to login if wallet is disconnected (but wait for initialization)
  useEffect(() => {
    if (!isInitializing && !account && !isProfileLoading) {
      navigate("/login", { replace: true });
    }
  }, [account, isProfileLoading, isInitializing, navigate]);

  // Show loading state while initializing or checking for profile
  if (isInitializing || (isProfileLoading && !hasCheckedProfile)) {
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
              Loading your secure profile...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If no account after initialization, don't render (redirect will happen)
  if (!account) {
    return null;
  }

  return (
    <DashboardLayout />
  );
};

export default Dashboard;

