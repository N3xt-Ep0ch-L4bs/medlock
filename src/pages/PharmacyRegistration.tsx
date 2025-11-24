import { useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { Copy, Check, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Logo from "../assets/logo.png";
import "./pages.css";

const PharmacyRegistration = () => {
  const account = useCurrentAccount();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const walletAddress = account?.address || "";

  const copyToClipboard = async () => {
    if (walletAddress) {
      try {
        await navigator.clipboard.writeText(walletAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  return (
    <div className="login-container" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ 
        maxWidth: "600px", 
        width: "100%", 
        padding: "2rem",
        background: "white",
        borderRadius: "16px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
      }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <img src={Logo} alt="MedLock Logo" style={{ width: "80px", height: "80px", marginBottom: "1rem" }} />
          <h2 style={{ 
            fontSize: "1.75rem", 
            fontWeight: 700, 
            color: "#111827",
            marginBottom: "0.5rem"
          }}>
            Pharmacy Registration Required
          </h2>
          <p style={{ color: "#6b7280", fontSize: "1rem" }}>
            Your wallet is not registered as a pharmacy
          </p>
        </div>

        <div style={{ 
          background: "#f9fafb", 
          borderRadius: "12px", 
          padding: "1.5rem",
          marginBottom: "2rem"
        }}>
          <p style={{ 
            color: "#374151", 
            fontSize: "0.95rem", 
            lineHeight: "1.6",
            marginBottom: "1.5rem"
          }}>
            To access the pharmacy dashboard, you need to be registered by an authorized organization. 
            Please contact your healthcare organization or MedLock support to complete your registration.
          </p>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ 
              display: "block", 
              fontSize: "0.875rem", 
              fontWeight: 600, 
              color: "#374151",
              marginBottom: "0.5rem"
            }}>
              Your Wallet Address
            </label>
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "0.5rem",
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "0.75rem 1rem"
            }}>
              <code style={{ 
                flex: 1, 
                fontSize: "0.875rem", 
                color: "#111827",
                wordBreak: "break-all",
                fontFamily: "monospace"
              }}>
                {walletAddress || "Not connected"}
              </code>
              <button
                onClick={copyToClipboard}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem 1rem",
                  background: copied ? "#10b981" : "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  transition: "background 0.2s"
                }}
              >
                {copied ? (
                  <>
                    <Check size={16} /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} /> Copy
                  </>
                )}
              </button>
            </div>
          </div>

          <div style={{ 
            background: "#eff6ff", 
            border: "1px solid #bfdbfe", 
            borderRadius: "8px", 
            padding: "1rem",
            marginBottom: "1rem"
          }}>
            <p style={{ 
              fontSize: "0.875rem", 
              color: "#1e40af",
              margin: 0,
              lineHeight: "1.5"
            }}>
              <strong>Next Steps:</strong>
            </p>
            <ul style={{ 
              fontSize: "0.875rem", 
              color: "#1e40af",
              margin: "0.5rem 0 0 0",
              paddingLeft: "1.5rem",
              lineHeight: "1.8"
            }}>
              <li>Copy your wallet address above</li>
              <li>Contact your healthcare organization or MedLock support</li>
              <li>Provide them with your wallet address for registration</li>
              <li>Once registered, you'll be able to access the pharmacy dashboard</li>
            </ul>
          </div>
        </div>

        <button
          onClick={() => navigate("/login")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            width: "100%",
            padding: "0.75rem 1rem",
            background: "transparent",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            color: "#374151",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#f9fafb";
            e.currentTarget.style.borderColor = "#d1d5db";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "#e5e7eb";
          }}
        >
          <ArrowLeft size={16} /> Back to Login
        </button>
      </div>
    </div>
  );
};

export default PharmacyRegistration;

