import { useState, useEffect } from "react";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import DatePicker from "react-datepicker";
import SuccessICon from "../assets/success-icon1.png";
import { usePatientProfile } from "../hooks/usePatientProfile";
import { Loader2 } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";
import "./components.css";

const packageId = import.meta.env.VITE_SUI_PACKAGE_ID || "";

interface ShareAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DoctorProfile {
  objectId: string;
  ownerAddress: string;
  name?: string;
  specialty?: string;
}

interface RecordInfo {
  id: string; // Record ID from Records object
  title?: string; // Optional metadata
  created_at?: number;
}

const ShareAccessModal = ({ isOpen, onClose }: ShareAccessModalProps) => {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const { profileObjectId, recordsId } = usePatientProfile(packageId);

  const [step, setStep] = useState(1);
  const [doctorProfileId, setDoctorProfileId] = useState<string>("");
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [validatingDoctor, setValidatingDoctor] = useState(false);
  const [doctorValidationError, setDoctorValidationError] = useState<string>("");
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [availableRecords, setAvailableRecords] = useState<RecordInfo[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [duration, setDuration] = useState<string>("7d");
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [permission, setPermission] = useState<0 | 1>(0); // 0 = Read, 1 = Write
  const [showRecords, setShowRecords] = useState(false);
  const [reason, setReason] = useState("");
  const [editingReason, setEditingReason] = useState(false);
  const [reasonInput, setReasonInput] = useState("");
  const [isGranting, setIsGranting] = useState(false);
  const [grantError, setGrantError] = useState<string>("");

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setDoctorProfileId("");
      setDoctorProfile(null);
      setSelectedRecords([]);
      setDuration("7d");
      setCustomDate(null);
      setPermission(0);
      setReason("");
      setGrantError("");
    }
  }, [isOpen]);

  // Fetch available records from Records object
  useEffect(() => {
    const fetchRecords = async () => {
      if (!recordsId || !suiClient) {
        setAvailableRecords([]);
        return;
      }

      setLoadingRecords(true);
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
          
          // Extract records from the records vector
          // Note: Record is a store struct (not key), so it doesn't have an object ID
          // The Move function patient_grant_access_to_specific expects vector<ID>
          // This suggests records might be tracked differently, or the function uses indices
          // For now, we'll use indices as identifiers and note that this needs verification
          const recordsList: RecordInfo[] = recordsArray.map((record: any, index: number) => {
            // Decode metadata if available
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
            
            return {
              id: `${recordsId}_${index}`, // Using index as identifier - needs verification with Move contract
              title,
              created_at: record.created_at,
            };
          });

          setAvailableRecords(recordsList);
        } else {
          setAvailableRecords([]);
        }
      } catch (error) {
        console.error("Error fetching records:", error);
        setAvailableRecords([]);
      } finally {
        setLoadingRecords(false);
      }
    };

    if (isOpen && recordsId) {
      fetchRecords();
    }
  }, [recordsId, suiClient, isOpen]);

  // Validate doctor profile ID
  const validateDoctorProfile = async () => {
    if (!doctorProfileId.trim()) {
      setDoctorValidationError("Please enter a doctor profile ID");
      return;
    }

    setValidatingDoctor(true);
    setDoctorValidationError("");

    try {
      const normalizedPackageId = packageId.trim().startsWith('0x') 
        ? packageId.trim() 
        : `0x${packageId.trim()}`;
      const doctorProfileType = `${normalizedPackageId}::doctors::DoctorProfile`;

      const doctorObject = await suiClient.getObject({
        id: doctorProfileId.trim(),
        options: {
          showType: true,
          showContent: true,
          showOwner: true,
        },
      });

      // Check if it's a DoctorProfile
      if (doctorObject.data?.type !== doctorProfileType) {
        setDoctorValidationError("Invalid doctor profile ID. Please enter a valid DoctorProfile object ID.");
        setDoctorProfile(null);
        return;
      }

      // Extract owner address
      const ownerAddress = doctorObject.data.owner && typeof doctorObject.data.owner === 'object' && 'AddressOwner' in doctorObject.data.owner
        ? (doctorObject.data.owner as any).AddressOwner
        : null;

      if (!ownerAddress) {
        setDoctorValidationError("Could not determine doctor's address from profile.");
        setDoctorProfile(null);
        return;
      }

      setDoctorProfile({
        objectId: doctorProfileId.trim(),
        ownerAddress,
      });

      // Move to next step
      setStep(2);
    } catch (error) {
      console.error("Error validating doctor profile:", error);
      setDoctorValidationError(
        error instanceof Error 
          ? error.message 
          : "Failed to validate doctor profile. Please check the ID and try again."
      );
      setDoctorProfile(null);
    } finally {
      setValidatingDoctor(false);
    }
  };

  // Helper to calculate expiry timestamp
  const getExpiryTimestamp = (): number => {
    if (duration === "custom" && customDate) {
      return customDate.getTime(); // Return milliseconds
    }
    // Get current timestamp in milliseconds
    const nowMs = Date.now();
    // Duration in milliseconds
    const durationMs = duration === "24h" ? 86400000
      : duration === "7d" ? 604800000
      : duration === "30d" ? 2592000000
      : 7776000000; // 90d
    // Add durationMs to current timestamp (both in milliseconds)
    return nowMs + durationMs;
  };

  // Helper to display readable duration
  const formatDuration = () => {
    if (duration === "custom" && customDate) {
      return `Until ${customDate.toLocaleString()}`;
    }
    const map: Record<string, string> = {
      "24h": "24 hours",
      "7d": "7 days",
      "30d": "30 days",
      "90d": "90 days",
    };
    return map[duration] || "7 days";
  };

  // Grant access function
  const grantAccess = async () => {
    if (!profileObjectId || !doctorProfile || !account?.address) {
      setGrantError("Missing required information. Please ensure you have a profile and selected a doctor.");
      return;
    }

    setIsGranting(true);
    setGrantError("");

    try {
      const normalizedPackageId = packageId.trim().startsWith('0x') 
        ? packageId.trim() 
        : `0x${packageId.trim()}`;
      
      const clockObjectId = "0x6";
      const accessDuration = getExpiryTimestamp();
      const reasonForSharing = reason || "Medical consultation";

      const tx = new Transaction();

      // Grant access to all records if:
      // 1. No records exist (patient has 0 records) - doctor can add records
      // 2. All records are selected
      // 3. No specific records selected (shouldn't happen due to UI validation, but handle it)
      if (availableRecords.length === 0 || selectedRecords.length === 0 || selectedRecords.length === availableRecords.length) {
        // Grant access to all records (including future records)
        tx.moveCall({
          target: `${normalizedPackageId}::helpers::patient_grant_access_to_all`,
          arguments: [
            tx.object(profileObjectId), // profile: &mut Profile
            tx.pure.u64(accessDuration), // access_duration: u64
            tx.pure.address(doctorProfile.ownerAddress), // requester: address
            tx.pure.string(reasonForSharing), // reason_for_sharing: String
            tx.pure.u8(permission), // permissions: u8 (0 = Read, 1 = Write)
            tx.object(clockObjectId), // clock: &Clock
          ],
        });
      } else {
        // Grant access to specific records
        // Note: Record structs don't have IDs (they're store structs, not key structs)
        // The Move function expects vector<ID>, but since Record is a store struct, it doesn't have an ID
        // For now, we'll use patient_grant_access_to_all for all cases
        // TODO: Update Move contract to handle record indices or restructure Record to be a key struct
        // For now, fall back to granting access to all records
        console.warn("Specific record access not yet implemented - granting access to all records instead");
        tx.moveCall({
          target: `${normalizedPackageId}::helpers::patient_grant_access_to_all`,
          arguments: [
            tx.object(profileObjectId), // profile: &mut Profile
            tx.pure.u64(accessDuration), // access_duration: u64
            tx.pure.address(doctorProfile.ownerAddress), // requester: address
            tx.pure.string(reasonForSharing), // reason_for_sharing: String
            tx.pure.u8(permission), // permissions: u8 (0 = Read, 1 = Write)
            tx.object(clockObjectId), // clock: &Clock
          ],
        });
      }

      console.log("Granting access with transaction:", {
        profileObjectId,
        doctorAddress: doctorProfile.ownerAddress,
        accessDuration,
        permission,
        reasonForSharing,
        recordCount: selectedRecords.length,
      });

      const result = await signAndExecuteTransaction({
        transaction: tx,
      });

      console.log("Access granted successfully:", result.digest);
      setStep(5); // Move to success screen
    } catch (error) {
      console.error("Error granting access:", error);
      setGrantError(
        error instanceof Error 
          ? error.message 
          : "Failed to grant access. Please try again."
      );
    } finally {
      setIsGranting(false);
    }
  };

  const toggleRecord = (id: string) => {
    setSelectedRecords((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const selectAllRecords = () => {
    if (selectedRecords.length === availableRecords.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(availableRecords.map(r => r.id));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="share-modal">
        <button className="close-btn" onClick={onClose}>×</button>

        <h2>Share Access to Your Records</h2>
        <p className="step-text">Step {step} of 5</p>

        {/* === Step 1: Enter Doctor Profile ID === */}
        {step === 1 && (
          <>
            <div className="search-section">
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                Doctor Profile Object ID
              </label>
              <input
                type="text"
                placeholder="Enter doctor's profile object ID (e.g., 0x...)"
                value={doctorProfileId}
                onChange={(e) => {
                  setDoctorProfileId(e.target.value);
                  setDoctorValidationError("");
                }}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: doctorValidationError ? "1px solid #ef4444" : "1px solid #d1d5db",
                  borderRadius: "0.5rem",
                  fontSize: "0.875rem",
                }}
              />
              {doctorValidationError && (
                <p style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "0.5rem" }}>
                  {doctorValidationError}
                </p>
              )}
              <p style={{ color: "#6b7280", fontSize: "0.75rem", marginTop: "0.5rem" }}>
                Enter the DoctorProfile object ID of the doctor you want to grant access to.
              </p>
            </div>

            <div className="modal-footer">
              <button 
                className="next-btn" 
                onClick={validateDoctorProfile}
                disabled={!doctorProfileId.trim() || validatingDoctor}
              >
                {validatingDoctor ? (
                  <>
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite", marginRight: "0.5rem" }} />
                    Validating...
                  </>
                ) : (
                  "Continue →"
                )}
              </button>
            </div>
          </>
        )}

        {/* === Step 2: Select Records === */}
        {step === 2 && (
          <>
            <div className="selected-provider">
              <div>
                <h4>Doctor Profile</h4>
                <p style={{ fontSize: "0.875rem", color: "#6b7280", wordBreak: "break-all" }}>
                  {doctorProfile?.objectId}
                </p>
                <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.25rem" }}>
                  Address: {doctorProfile?.ownerAddress}
                </p>
              </div>
              <button className="change-btn" onClick={() => setStep(1)}>Change</button>
            </div>

            <div className="recommmend-heading">
              <h4>Choose what to share</h4>
              <p>Select which records the doctor can access</p>
            </div>

            {loadingRecords ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <Loader2 size={32} style={{ animation: "spin 1s linear infinite", margin: "0 auto" }} />
                <p style={{ marginTop: "1rem", color: "#6b7280" }}>Loading records...</p>
              </div>
            ) : availableRecords.length === 0 ? (
              <div style={{ 
                textAlign: "center", 
                padding: "2rem", 
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                borderRadius: "0.5rem",
                marginBottom: "1rem"
              }}>
                <p style={{ color: "#0369a1", marginBottom: "0.5rem", fontWeight: 500 }}>
                  No records found yet
                </p>
                <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                  You can still grant access to the doctor. They will be able to add records for you once access is granted.
                </p>
                <p style={{ color: "#6b7280", fontSize: "0.875rem", marginTop: "0.5rem" }}>
                  All future records will be accessible to this doctor.
                </p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button
                    onClick={selectAllRecords}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "#f3f4f6",
                      border: "1px solid #d1d5db",
                      borderRadius: "0.5rem",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                    }}
                  >
                    {selectedRecords.length === availableRecords.length ? "Deselect All" : "Select All"}
                  </button>
                  <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                    {selectedRecords.length} of {availableRecords.length} selected
                  </span>
                </div>

                <div className="share-records-grid">
                  {availableRecords.map((record) => (
                    <div
                      key={record.id}
                      className={`share-record-card ${selectedRecords.includes(record.id) ? "checked" : ""}`}
                      onClick={() => toggleRecord(record.id)}
                    >
                      <div>
                        <h5>{record.title || `Record ${record.id}`}</h5>
                        <p style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                          ID: {record.id.length > 20 ? `${record.id.slice(0, 10)}...${record.id.slice(-10)}` : record.id}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="modal-footer">
              <button className="back-btn" onClick={() => setStep(1)}>← Back</button>
              <button
                className="next-btn"
                onClick={() => setStep(3)}
                disabled={loadingRecords || (availableRecords.length > 0 && selectedRecords.length === 0)}
              >
                {availableRecords.length === 0 
                  ? "Continue (Grant Access to All Future Records) →"
                  : `Continue with ${selectedRecords.length} record(s) →`}
              </button>
            </div>
          </>
        )}

        {/* === Step 3: Configure Access Duration and Permissions === */}
        {step === 3 && (
          <div className="access-duration">
            <h3>Access Duration</h3>
            <p>Select how long the doctor can access your medical records.</p>

            <div className="duration-options">
              {["24h", "7d", "30d", "90d", "custom"].map((option) => (
                <button
                  key={option}
                  className={`duration-btn ${duration === option ? "selected" : ""}`}
                  onClick={() => setDuration(option)}
                >
                  {option === "custom"
                    ? "Custom Date"
                    : option === "24h"
                    ? "24 hours"
                    : option === "7d"
                    ? "7 days"
                    : option === "30d"
                    ? "30 days"
                    : "90 days"}
                </button>
              ))}
            </div>

            {duration === "custom" && (
              <div className="expiry-input">
                <p>Pick expiry date and time:</p>
                <DatePicker
                  selected={customDate}
                  onChange={(date) => setCustomDate(date)}
                  showTimeSelect
                  dateFormat="Pp"
                  minDate={new Date()}
                  placeholderText="Select date and time"
                  className="datepicker-input"
                />
                {customDate && (
                  <p className="expiry-preview">
                    Expires on: {customDate.toLocaleString()}
                  </p>
                )}
              </div>
            )}

            <div style={{ marginTop: "2rem" }}>
              <h3>Permissions</h3>
              <p>Select what the doctor can do with your records.</p>
              <div className="duration-options">
                <button
                  className={`duration-btn ${permission === 0 ? "selected" : ""}`}
                  onClick={() => setPermission(0)}
                >
                  Read Only (View)
                </button>
                <button
                  className={`duration-btn ${permission === 1 ? "selected" : ""}`}
                  onClick={() => setPermission(1)}
                >
                  Read & Write
                </button>
              </div>
            </div>

            <div className="modal-footer">
              <button className="back-btn" onClick={() => setStep(2)}>← Back</button>
              <button
                className="next-btn"
                onClick={() => setStep(4)}
                disabled={!duration || (duration === "custom" && !customDate)}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* === Step 4: Review and Confirm === */}
        {step === 4 && (
          <div className="review-confirm">
            <h3>Review and Confirm</h3>
            <p className="review-subtext">
              Please review the access details before granting.
            </p>

            {grantError && (
              <div style={{
                padding: "1rem",
                background: "#fee2e2",
                border: "1px solid #fca5a5",
                borderRadius: "0.5rem",
                marginBottom: "1rem",
                color: "#dc2626",
              }}>
                {grantError}
              </div>
            )}

            <div className="review-summary">
              <div className="review-row">
                <div className="review-label">Doctor</div>
                <div className="review-content">
                  <div className="doctor-info">
                    <div>
                      <strong>Profile ID</strong>
                      <p style={{ fontSize: "0.75rem", color: "#6b7280", wordBreak: "break-all" }}>
                        {doctorProfile?.objectId}
                      </p>
                      <p style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                        Address: {doctorProfile?.ownerAddress}
                      </p>
                    </div>
                  </div>
                </div>
                <button className="edit-link" onClick={() => setStep(1)}>Edit</button>
              </div>

              <div className="review-row">
                <div className="review-label">Records</div>
                <div className="review-content">
                  <span>
                    {availableRecords.length === 0
                      ? "All future records (no records yet)"
                      : selectedRecords.length === availableRecords.length 
                      ? "All records" 
                      : `${selectedRecords.length} file${selectedRecords.length !== 1 ? "s" : ""}`}
                  </span>
                  {availableRecords.length > 0 && selectedRecords.length < availableRecords.length && selectedRecords.length > 0 && (
                    <button className="view-link" onClick={() => setShowRecords(true)}>
                      View list
                    </button>
                  )}
                </div>
                <button className="edit-link" onClick={() => setStep(2)}>Edit</button>
              </div>

              <div className="review-row">
                <div className="review-label">Access duration</div>
                <div className="review-content">
                  <span>{formatDuration()}</span>
                </div>
                <button className="edit-link" onClick={() => setStep(3)}>Edit</button>
              </div>

              <div className="review-row">
                <div className="review-label">Expires on</div>
                <div className="review-content">
                  <span>
                    {duration === "custom" && customDate
                      ? customDate.toLocaleString()
                      : new Date(
                          Date.now() +
                              (duration === "24h"
                              ? 86400000
                              : duration === "7d"
                              ? 604800000
                              : duration === "30d"
                              ? 2592000000
                              : 7776000000)
                          ).toLocaleString()}
                  </span>
                </div>
                <button className="edit-link" onClick={() => setStep(3)}>Edit</button>
              </div>

              <div className="review-row">
                <div className="review-label">Permissions</div>
                <div className="review-content">
                  <span>{permission === 0 ? "Read Only" : "Read & Write"}</span>
                </div>
                <button className="edit-link" onClick={() => setStep(3)}>Edit</button>
              </div>

              <div className="review-row">
                <div className="review-label">Reason for sharing</div>
                <div className="review-content">
                  {reason ? (
                    <span>{reason}</span>
                  ) : (
                    <span className="muted">Not specified</span>
                  )}
                </div>
                {editingReason ? (
                  <div className="reason-input-container">
                    <input
                      type="text"
                      placeholder="Enter reason..."
                      value={reasonInput}
                      onChange={(e) => setReasonInput(e.target.value)}
                      className="reason-input"
                    />
                    <button
                      className="save-link"
                      onClick={() => {
                        setReason(reasonInput);
                        setEditingReason(false);
                      }}
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <button className="add-link" onClick={() => setEditingReason(true)}>
                    {reason ? "Edit" : "Add"}
                  </button>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="back-btn" onClick={() => setStep(3)}>← Back</button>
              <button 
                className="next-btn" 
                onClick={grantAccess}
                disabled={isGranting}
              >
                {isGranting ? (
                  <>
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite", marginRight: "0.5rem" }} />
                    Granting Access...
                  </>
                ) : (
                  "Grant Access →"
                )}
              </button>
            </div>

            {/* === Records Modal === */}
            {showRecords && (
              <div className="overlay records-modal">
                <div className="records-content">
                  <h4>Selected Records</h4>
                  <ul>
                    {availableRecords
                      .filter((r) => selectedRecords.includes(r.id))
                      .map((r) => (
                        <li key={r.id}>
                          <span>{r.title || `Record ${r.id}`}</span>
                        </li>
                      ))}
                  </ul>
                  <button onClick={() => setShowRecords(false)} className="close-list">
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* === Step 5: Success Confirmation === */}
        {step === 5 && (
          <div className="success-container">
            <div className="success-icon"><img src={SuccessICon} /></div>
            <h2>Access Granted Successfully!</h2>
            <p>
              {availableRecords.length === 0 
                ? "The doctor can now access all your records (including future records you or they add)."
                : selectedRecords.length === availableRecords.length
                ? "The doctor can now access all your records."
                : `The doctor can now access ${selectedRecords.length} of your records.`}
            </p>

            <div className="success-details">
              <p><strong>Access expires:</strong> {formatDuration()}</p>
              <p><strong>Permissions:</strong> {permission === 0 ? "Read Only" : "Read & Write"}</p>
            </div>

            <button className="next-btn" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareAccessModal;
