import React, { useState, useEffect, useMemo } from "react";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { useOrganizationProfile } from "../hooks/useOrganizationProfile";
import { useWalletSigner } from "../hooks/useWalletSigner";
import { SealWalrusService } from "../services/sealWalrusService";
import { X, ArrowLeft, ArrowRight, Check, User, Briefcase, FileCheck, Building2, Pill } from "lucide-react";
import "../pages/admin/admin.css";

interface DoctorFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialty: string;
  walletAddress: string;
  organization: string;
  licenseNumber: string;
  licenseState: string;
  credentials: string;
  yearsOfExperience: string;
  department: string;
}

interface PharmacyFormData {
  pharmacyName: string;
  email: string;
  phone: string;
  pharmacyType: string;
  walletAddress: string;
  licenseNumber: string;
  licenseState: string;
  npiNumber: string;
  address: string;
  city: string;
  zipCode: string;
  yearsInOperation: string;
  chainName: string;
}

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "doctor" | "pharmacy";
  onSuccess?: () => void;
}

const RegistrationModal: React.FC<RegistrationModalProps> = ({ isOpen, onClose, type, onSuccess }) => {
  const account = useCurrentAccount();
  const packageId = import.meta.env.VITE_SUI_PACKAGE_ID || "";
  const network = (import.meta.env.VITE_SUI_NETWORK || "testnet") as "testnet" | "mainnet" | "devnet";
  const customSealServerIds = (import.meta.env.VITE_SEAL_SERVER_IDS || "")
    .split(",")
    .filter(Boolean);
  const enokiPrivateApiKey = import.meta.env.VITE_ENOKI_PRIVATE_API_KEY;
  const suiClientFromProvider = useSuiClient();
  const walletSigner = useWalletSigner();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const { profileObjectId: organizationObjectId } = useOrganizationProfile(packageId);
  
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
  
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [doctorErrors, setDoctorErrors] = useState<Partial<Record<keyof DoctorFormData, string>>>({});
  const [pharmacyErrors, setPharmacyErrors] = useState<Partial<Record<keyof PharmacyFormData, string>>>({});

  const [doctorFormData, setDoctorFormData] = useState<DoctorFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    specialty: "",
    walletAddress: "",
    organization: "",
    licenseNumber: "",
    licenseState: "",
    credentials: "",
    yearsOfExperience: "",
    department: "",
  });

  // Auto-fill the organization field with organization ID
  useEffect(() => {
    if (organizationObjectId) {
      setDoctorFormData(prev => ({
        ...prev,
        organization: organizationObjectId,
      }));
    }
  }, [organizationObjectId ?? ""]);

  const [pharmacyFormData, setPharmacyFormData] = useState<PharmacyFormData>({
    pharmacyName: "",
    email: "",
    phone: "",
    pharmacyType: "",
    walletAddress: "",
    licenseNumber: "",
    licenseState: "",
    npiNumber: "",
    address: "",
    city: "",
    zipCode: "",
    yearsInOperation: "",
    chainName: "",
  });

  const specialties = [
    "Cardiology", "Dermatology", "Endocrinology", "Family Medicine",
    "Gastroenterology", "Internal Medicine", "Neurology", "Oncology",
    "Orthopedics", "Pediatrics", "Psychiatry", "Pulmonology",
    "Radiology", "Surgery", "Urology", "Other",
  ];

  const pharmacyTypes = [
    "Retail Pharmacy", "Hospital Pharmacy", "Chain Pharmacy",
    "Independent Pharmacy", "Mail Order Pharmacy", "Specialty Pharmacy", "Other",
  ];

  const states = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  ];

  const credentials = [
    "MD", "DO", "MBBS", "DDS", "DMD", "PharmD", "NP", "PA", "Other",
  ];

  const handleDoctorInputChange = (field: keyof DoctorFormData, value: string) => {
    setDoctorFormData((prev) => ({ ...prev, [field]: value }));
    if (doctorErrors[field]) {
      setDoctorErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handlePharmacyInputChange = (field: keyof PharmacyFormData, value: string) => {
    setPharmacyFormData((prev) => ({ ...prev, [field]: value }));
    if (pharmacyErrors[field]) {
      setPharmacyErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateDoctorStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof DoctorFormData, string>> = {};

    if (step === 1) {
      if (!doctorFormData.firstName.trim()) newErrors.firstName = "First name is required";
      if (!doctorFormData.lastName.trim()) newErrors.lastName = "Last name is required";
      if (!doctorFormData.email.trim()) {
        newErrors.email = "Email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(doctorFormData.email)) {
        newErrors.email = "Please enter a valid email address";
      }
      if (!doctorFormData.phone.trim()) {
        newErrors.phone = "Phone number is required";
      } else if (!/^[\d\s\-\(\)]+$/.test(doctorFormData.phone.replace(/\s/g, ""))) {
        newErrors.phone = "Please enter a valid phone number";
      }
      if (!doctorFormData.specialty) newErrors.specialty = "Specialty is required";
      if (!doctorFormData.walletAddress.trim()) {
        newErrors.walletAddress = "Wallet address is required";
      } else if (!/^0x[a-fA-F0-9]{64}$/.test(doctorFormData.walletAddress.trim())) {
        newErrors.walletAddress = "Please enter a valid Sui wallet address (0x followed by 64 hex characters)";
      }
    } else if (step === 2) {
      if (!doctorFormData.organization.trim()) newErrors.organization = "Organization is required";
      if (!doctorFormData.licenseNumber.trim()) newErrors.licenseNumber = "License number is required";
      if (!doctorFormData.licenseState) newErrors.licenseState = "License state is required";
      if (!doctorFormData.credentials) newErrors.credentials = "Credentials are required";
      if (!doctorFormData.yearsOfExperience) newErrors.yearsOfExperience = "Years of experience is required";
      if (!doctorFormData.department.trim()) newErrors.department = "Department is required";
    }

    setDoctorErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePharmacyStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof PharmacyFormData, string>> = {};

    if (step === 1) {
      if (!pharmacyFormData.pharmacyName.trim()) newErrors.pharmacyName = "Pharmacy name is required";
      if (!pharmacyFormData.email.trim()) {
        newErrors.email = "Email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pharmacyFormData.email)) {
        newErrors.email = "Please enter a valid email address";
      }
      if (!pharmacyFormData.phone.trim()) {
        newErrors.phone = "Phone number is required";
      } else if (!/^[\d\s\-\(\)]+$/.test(pharmacyFormData.phone.replace(/\s/g, ""))) {
        newErrors.phone = "Please enter a valid phone number";
      }
      if (!pharmacyFormData.pharmacyType) newErrors.pharmacyType = "Pharmacy type is required";
      if (!pharmacyFormData.walletAddress.trim()) {
        newErrors.walletAddress = "Wallet address is required";
      } else if (!/^0x[a-fA-F0-9]{64}$/.test(pharmacyFormData.walletAddress.trim())) {
        newErrors.walletAddress = "Please enter a valid Sui wallet address (0x followed by 64 hex characters)";
      }
    } else if (step === 2) {
      if (!pharmacyFormData.licenseNumber.trim()) newErrors.licenseNumber = "License number is required";
      if (!pharmacyFormData.licenseState) newErrors.licenseState = "License state is required";
      if (!pharmacyFormData.npiNumber.trim()) newErrors.npiNumber = "NPI number is required";
      if (!pharmacyFormData.address.trim()) newErrors.address = "Address is required";
      if (!pharmacyFormData.city.trim()) newErrors.city = "City is required";
      if (!pharmacyFormData.zipCode.trim()) {
        newErrors.zipCode = "ZIP code is required";
      }
      if (!pharmacyFormData.yearsInOperation) newErrors.yearsInOperation = "Years in operation is required";
      if (!pharmacyFormData.chainName.trim()) newErrors.chainName = "Chain name is required (enter 'Independent' if not part of a chain)";
    }

    setPharmacyErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (type === "doctor") {
      if (validateDoctorStep(currentStep)) {
        setCurrentStep((prev) => Math.min(prev + 1, 3));
      }
    } else {
      if (validatePharmacyStep(currentStep)) {
        setCurrentStep((prev) => Math.min(prev + 1, 3));
      }
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (type === "doctor") {
      if (!validateDoctorStep(3)) return;
    } else {
      if (!validatePharmacyStep(3)) return;
    }

    if (!organizationObjectId) {
      alert("Organization profile not found. Please ensure you are logged in as an organization.");
      return;
    }

    if (!account?.address) {
      alert("Wallet not connected. Please connect your wallet first.");
      return;
    }

    if (!sealWalrusService || !walletSigner) {
      alert("Seal/Walrus service not available. Please ensure your environment is properly configured.");
      return;
    }

    setIsSubmitting(true);
    try {
      const ownerAddress = type === "doctor" 
        ? doctorFormData.walletAddress.trim()
        : pharmacyFormData.walletAddress.trim();
      
      // Validate owner address format
      if (!ownerAddress.startsWith('0x') || ownerAddress.length !== 66) {
        throw new Error("Invalid wallet address format");
      }

      // Prepare profile data for encryption
      let profileDataToSave;
      if (type === "doctor") {
        profileDataToSave = {
          fullName: `${doctorFormData.firstName} ${doctorFormData.lastName}`,
          email: doctorFormData.email,
          phone: doctorFormData.phone,
          patientId: ownerAddress, // Using owner address as ID
          bloodType: "",
          allergies: "",
          profileImage: "",
          // Additional doctor-specific fields
          specialty: doctorFormData.specialty,
          organization: doctorFormData.organization,
          licenseNumber: doctorFormData.licenseNumber,
          licenseState: doctorFormData.licenseState,
          credentials: doctorFormData.credentials,
          yearsOfExperience: doctorFormData.yearsOfExperience,
          department: doctorFormData.department,
        };
      } else {
        profileDataToSave = {
          fullName: pharmacyFormData.pharmacyName,
          email: pharmacyFormData.email,
          phone: pharmacyFormData.phone,
          patientId: ownerAddress, // Using owner address as ID
          bloodType: "",
          allergies: "",
          profileImage: "",
          // Additional pharmacy-specific fields
          pharmacyType: pharmacyFormData.pharmacyType,
          licenseNumber: pharmacyFormData.licenseNumber,
          licenseState: pharmacyFormData.licenseState,
          npiNumber: pharmacyFormData.npiNumber,
          address: pharmacyFormData.address,
          city: pharmacyFormData.city,
          zipCode: pharmacyFormData.zipCode,
          yearsInOperation: pharmacyFormData.yearsInOperation,
          chainName: pharmacyFormData.chainName,
        };
      }

      // Encrypt and save profile to Walrus using the organization's address
      // The organization can decrypt it using loadProfileAsOrganization
      console.log(`Encrypting and saving ${type} profile to Walrus...`);
      const { walrusId: profileCid, backupKey } = await sealWalrusService.saveProfile(
        profileDataToSave,
        account.address, // Use the organization's address for encryption
        walletSigner, // Organization's signer
        2, // threshold
        3 // epochs
      );

      if (!profileCid) {
        throw new Error("Failed to save profile to Walrus");
      }

      console.log(`Profile saved to Walrus with ID: ${profileCid}`);

      // Convert walrusId (string) to vector<u8> (bytes) for the smart contract
      const profileCidBytes = Array.from(new TextEncoder().encode(profileCid));

      const normalizedPackageId = packageId.trim().startsWith('0x') 
        ? packageId.trim() 
        : `0x${packageId.trim()}`;
      
      // Clock object ID (standard Sui Clock object)
      const clockObjectId = "0x6";

      // Create transaction to register doctor/pharmacy
      const tx = new Transaction();
      
      if (type === "doctor") {
        tx.moveCall({
          target: `${normalizedPackageId}::doctors::register_doctor`,
          arguments: [
            tx.object(organizationObjectId), // organization: &mut organization::Organization
            tx.pure.vector("u8", profileCidBytes), // profile_cid: vector<u8>
            tx.pure.address(ownerAddress), // owner: address
            tx.object(clockObjectId), // clock: &Clock
          ],
        });
      } else {
        tx.moveCall({
          target: `${normalizedPackageId}::pharmacy::register_pharmacy`,
          arguments: [
            tx.object(organizationObjectId), // organization: &mut organization::Organization
            tx.pure.vector("u8", profileCidBytes), // profile_cid: vector<u8>
            tx.pure.address(ownerAddress), // owner: address
            tx.object(clockObjectId), // clock: &Clock
          ],
        });
      }

      // Sign and execute the transaction
      console.log(`Calling register_${type} smart contract...`);
      const result = await signAndExecuteTransaction({
        transaction: tx,
      });

      console.log(`${type === "doctor" ? "Doctor" : "Pharmacy"} registered successfully:`, result.digest);
      
      if (type === "doctor") {
        console.log("Doctor profile created:", doctorFormData);
      } else {
        console.log("Pharmacy profile created:", pharmacyFormData);
      }
      
      setSubmitSuccess(true);
      setTimeout(() => {
        // Reset form
        if (type === "doctor") {
          setDoctorFormData({
            firstName: "", lastName: "", email: "", phone: "", specialty: "",
            walletAddress: "", organization: "", licenseNumber: "", licenseState: "",
            credentials: "", yearsOfExperience: "", department: "",
          });
        } else {
          setPharmacyFormData({
            pharmacyName: "", email: "", phone: "", pharmacyType: "",
            walletAddress: "", licenseNumber: "", licenseState: "", npiNumber: "",
            address: "", city: "", zipCode: "", yearsInOperation: "", chainName: "",
          });
        }
        setCurrentStep(1);
        setSubmitSuccess(false);
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (error) {
      console.error(`Error registering ${type}:`, error);
      alert(
        `Failed to register ${type}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setCurrentStep(1);
      setSubmitSuccess(false);
      setDoctorErrors({});
      setPharmacyErrors({});
      onClose();
    }
  };

  const renderStepIndicator = () => {
    return (
      <div className="step-indicator" style={{ marginBottom: "2rem" }}>
        {[1, 2, 3].map((step) => (
          <React.Fragment key={step}>
            <div className={`step-item ${currentStep >= step ? "active" : ""} ${currentStep > step ? "completed" : ""}`}>
              <div className="step-number">
                {currentStep > step ? <Check size={16} /> : step}
              </div>
              <div className="step-label">
                {step === 1 && "Basic Info"}
                {step === 2 && "Professional"}
                {step === 3 && "Review"}
              </div>
            </div>
            {step < 3 && <div className={`step-connector ${currentStep > step ? "completed" : ""}`} />}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // Doctor Form Steps
  const renderDoctorStep1 = () => {
    return (
      <div className="form-step">
        <div className="step-header">
          <User size={24} className="step-icon" />
          <h2>Basic Information</h2>
          <p>Enter the doctor's personal and contact details</p>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="firstName">First Name *</label>
            <input
              type="text"
              id="firstName"
              value={doctorFormData.firstName}
              onChange={(e) => handleDoctorInputChange("firstName", e.target.value)}
              className={doctorErrors.firstName ? "error" : ""}
              placeholder="Enter first name"
            />
            {doctorErrors.firstName && <span className="error-message">{doctorErrors.firstName}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="lastName">Last Name *</label>
            <input
              type="text"
              id="lastName"
              value={doctorFormData.lastName}
              onChange={(e) => handleDoctorInputChange("lastName", e.target.value)}
              className={doctorErrors.lastName ? "error" : ""}
              placeholder="Enter last name"
            />
            {doctorErrors.lastName && <span className="error-message">{doctorErrors.lastName}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              value={doctorFormData.email}
              onChange={(e) => handleDoctorInputChange("email", e.target.value)}
              className={doctorErrors.email ? "error" : ""}
              placeholder="doctor@example.com"
            />
            {doctorErrors.email && <span className="error-message">{doctorErrors.email}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="phone">Phone Number *</label>
            <input
              type="tel"
              id="phone"
              value={doctorFormData.phone}
              onChange={(e) => handleDoctorInputChange("phone", e.target.value)}
              className={doctorErrors.phone ? "error" : ""}
              placeholder="(555) 123-4567"
            />
            {doctorErrors.phone && <span className="error-message">{doctorErrors.phone}</span>}
          </div>
          <div className="form-group full-width">
            <label htmlFor="specialty">Medical Specialty *</label>
            <select
              id="specialty"
              value={doctorFormData.specialty}
              onChange={(e) => handleDoctorInputChange("specialty", e.target.value)}
              className={doctorErrors.specialty ? "error" : ""}
            >
              <option value="">Select a specialty</option>
              {specialties.map((spec) => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
            {doctorErrors.specialty && <span className="error-message">{doctorErrors.specialty}</span>}
          </div>
          <div className="form-group full-width">
            <label htmlFor="walletAddress">Wallet Address *</label>
            <input
              type="text"
              id="walletAddress"
              value={doctorFormData.walletAddress}
              onChange={(e) => handleDoctorInputChange("walletAddress", e.target.value)}
              className={doctorErrors.walletAddress ? "error" : ""}
              placeholder="0x..."
            />
            {doctorErrors.walletAddress && <span className="error-message">{doctorErrors.walletAddress}</span>}
            <small style={{ color: "#6b7280", fontSize: "12px", marginTop: "4px" }}>
              Enter the doctor's Sui wallet address (0x followed by 64 hexadecimal characters)
            </small>
          </div>
        </div>
      </div>
    );
  };

  const renderDoctorStep2 = () => {
    return (
      <div className="form-step">
        <div className="step-header">
          <Briefcase size={24} className="step-icon" />
          <h2>Professional Details</h2>
          <p>Enter the doctor's professional credentials and organization information</p>
        </div>
        <div className="form-grid">
          <div className="form-group full-width">
            <label htmlFor="organization">Organization *</label>
            <input
              type="text"
              id="organization"
              value={doctorFormData.organization}
              onChange={(e) => handleDoctorInputChange("organization", e.target.value)}
              className={doctorErrors.organization ? "error" : ""}
              placeholder="Organization name will be auto-filled"
              readOnly
              style={{ backgroundColor: "#f3f4f6", cursor: "not-allowed" }}
            />
            {doctorErrors.organization && <span className="error-message">{doctorErrors.organization}</span>}
            <small style={{ color: "#6b7280", fontSize: "0.875rem", marginTop: "0.25rem", display: "block" }}>
              This field is automatically filled with your organization ID
            </small>
          </div>
          <div className="form-group">
            <label htmlFor="department">Department *</label>
            <input
              type="text"
              id="department"
              value={doctorFormData.department}
              onChange={(e) => handleDoctorInputChange("department", e.target.value)}
              className={doctorErrors.department ? "error" : ""}
              placeholder="e.g., Cardiology, Pediatrics"
            />
            {doctorErrors.department && <span className="error-message">{doctorErrors.department}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="credentials">Credentials *</label>
            <select
              id="credentials"
              value={doctorFormData.credentials}
              onChange={(e) => handleDoctorInputChange("credentials", e.target.value)}
              className={doctorErrors.credentials ? "error" : ""}
            >
              <option value="">Select credentials</option>
              {credentials.map((cred) => (
                <option key={cred} value={cred}>{cred}</option>
              ))}
            </select>
            {doctorErrors.credentials && <span className="error-message">{doctorErrors.credentials}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="licenseNumber">License Number *</label>
            <input
              type="text"
              id="licenseNumber"
              value={doctorFormData.licenseNumber}
              onChange={(e) => handleDoctorInputChange("licenseNumber", e.target.value)}
              className={doctorErrors.licenseNumber ? "error" : ""}
              placeholder="Enter license number"
            />
            {doctorErrors.licenseNumber && <span className="error-message">{doctorErrors.licenseNumber}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="licenseState">License State *</label>
            <select
              id="licenseState"
              value={doctorFormData.licenseState}
              onChange={(e) => handleDoctorInputChange("licenseState", e.target.value)}
              className={doctorErrors.licenseState ? "error" : ""}
            >
              <option value="">Select state</option>
              {states.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
            {doctorErrors.licenseState && <span className="error-message">{doctorErrors.licenseState}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="yearsOfExperience">Years of Experience *</label>
            <select
              id="yearsOfExperience"
              value={doctorFormData.yearsOfExperience}
              onChange={(e) => handleDoctorInputChange("yearsOfExperience", e.target.value)}
              className={doctorErrors.yearsOfExperience ? "error" : ""}
            >
              <option value="">Select years</option>
              {Array.from({ length: 50 }, (_, i) => i + 1).map((year) => (
                <option key={year} value={year}>
                  {year} {year === 1 ? "year" : "years"}
                </option>
              ))}
            </select>
            {doctorErrors.yearsOfExperience && <span className="error-message">{doctorErrors.yearsOfExperience}</span>}
          </div>
        </div>
      </div>
    );
  };

  const renderDoctorStep3 = () => {
    return (
      <div className="form-step">
        <div className="step-header">
          <FileCheck size={24} className="step-icon" />
          <h2>Review & Submit</h2>
          <p>Please review all information before submitting</p>
        </div>
        <div className="review-section">
          <div className="review-card">
            <div className="review-card-header">
              <User size={20} />
              <h3>Basic Information</h3>
            </div>
            <div className="review-content">
              <div className="review-item">
                <span className="review-label">Name:</span>
                <span className="review-value">{doctorFormData.firstName} {doctorFormData.lastName}</span>
              </div>
              <div className="review-item">
                <span className="review-label">Email:</span>
                <span className="review-value">{doctorFormData.email}</span>
              </div>
              <div className="review-item">
                <span className="review-label">Phone:</span>
                <span className="review-value">{doctorFormData.phone}</span>
              </div>
              <div className="review-item">
                <span className="review-label">Specialty:</span>
                <span className="review-value">{doctorFormData.specialty}</span>
              </div>
              <div className="review-item">
                <span className="review-label">Wallet Address:</span>
                <span className="review-value" style={{ fontFamily: "monospace", fontSize: "12px", wordBreak: "break-all" }}>
                  {doctorFormData.walletAddress}
                </span>
              </div>
            </div>
          </div>
          <div className="review-card">
            <div className="review-card-header">
              <Briefcase size={20} />
              <h3>Professional Details</h3>
            </div>
            <div className="review-content">
              <div className="review-item">
                <span className="review-label">Organization:</span>
                <span className="review-value">{doctorFormData.organization}</span>
              </div>
              <div className="review-item">
                <span className="review-label">Department:</span>
                <span className="review-value">{doctorFormData.department}</span>
              </div>
              <div className="review-item">
                <span className="review-label">Credentials:</span>
                <span className="review-value">{doctorFormData.credentials}</span>
              </div>
              <div className="review-item">
                <span className="review-label">License Number:</span>
                <span className="review-value">{doctorFormData.licenseNumber}</span>
              </div>
              <div className="review-item">
                <span className="review-label">License State:</span>
                <span className="review-value">{doctorFormData.licenseState}</span>
              </div>
              <div className="review-item">
                <span className="review-label">Years of Experience:</span>
                <span className="review-value">{doctorFormData.yearsOfExperience} {doctorFormData.yearsOfExperience === "1" ? "year" : "years"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Pharmacy Form Steps
  const renderPharmacyStep1 = () => {
    return (
      <div className="form-step">
        <div className="step-header">
          <Pill size={24} className="step-icon" />
          <h2>Basic Information</h2>
          <p>Enter the pharmacy's contact and basic details</p>
        </div>
        <div className="form-grid">
          <div className="form-group full-width">
            <label htmlFor="pharmacyName">Pharmacy Name *</label>
            <input
              type="text"
              id="pharmacyName"
              value={pharmacyFormData.pharmacyName}
              onChange={(e) => handlePharmacyInputChange("pharmacyName", e.target.value)}
              className={pharmacyErrors.pharmacyName ? "error" : ""}
              placeholder="Enter pharmacy name"
            />
            {pharmacyErrors.pharmacyName && <span className="error-message">{pharmacyErrors.pharmacyName}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="pharmacyEmail">Email Address *</label>
            <input
              type="email"
              id="pharmacyEmail"
              value={pharmacyFormData.email}
              onChange={(e) => handlePharmacyInputChange("email", e.target.value)}
              className={pharmacyErrors.email ? "error" : ""}
              placeholder="pharmacy@example.com"
            />
            {pharmacyErrors.email && <span className="error-message">{pharmacyErrors.email}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="pharmacyPhone">Phone Number *</label>
            <input
              type="tel"
              id="pharmacyPhone"
              value={pharmacyFormData.phone}
              onChange={(e) => handlePharmacyInputChange("phone", e.target.value)}
              className={pharmacyErrors.phone ? "error" : ""}
              placeholder="(555) 123-4567"
            />
            {pharmacyErrors.phone && <span className="error-message">{pharmacyErrors.phone}</span>}
          </div>
          <div className="form-group full-width">
            <label htmlFor="pharmacyType">Pharmacy Type *</label>
            <select
              id="pharmacyType"
              value={pharmacyFormData.pharmacyType}
              onChange={(e) => handlePharmacyInputChange("pharmacyType", e.target.value)}
              className={pharmacyErrors.pharmacyType ? "error" : ""}
            >
              <option value="">Select pharmacy type</option>
              {pharmacyTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            {pharmacyErrors.pharmacyType && <span className="error-message">{pharmacyErrors.pharmacyType}</span>}
          </div>
          <div className="form-group full-width">
            <label htmlFor="pharmacyWalletAddress">Wallet Address *</label>
            <input
              type="text"
              id="pharmacyWalletAddress"
              value={pharmacyFormData.walletAddress}
              onChange={(e) => handlePharmacyInputChange("walletAddress", e.target.value)}
              className={pharmacyErrors.walletAddress ? "error" : ""}
              placeholder="0x..."
            />
            {pharmacyErrors.walletAddress && <span className="error-message">{pharmacyErrors.walletAddress}</span>}
            <small style={{ color: "#6b7280", fontSize: "12px", marginTop: "4px" }}>
              Enter the pharmacy's Sui wallet address (0x followed by 64 hexadecimal characters)
            </small>
          </div>
        </div>
      </div>
    );
  };

  const renderPharmacyStep2 = () => {
    return (
      <div className="form-step">
        <div className="step-header">
          <Building2 size={24} className="step-icon" />
          <h2>Professional Details</h2>
          <p>Enter the pharmacy's license, location, and operational information</p>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="pharmacyLicenseNumber">License Number *</label>
            <input
              type="text"
              id="pharmacyLicenseNumber"
              value={pharmacyFormData.licenseNumber}
              onChange={(e) => handlePharmacyInputChange("licenseNumber", e.target.value)}
              className={pharmacyErrors.licenseNumber ? "error" : ""}
              placeholder="Enter license number"
            />
            {pharmacyErrors.licenseNumber && <span className="error-message">{pharmacyErrors.licenseNumber}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="pharmacyLicenseState">License State *</label>
            <select
              id="pharmacyLicenseState"
              value={pharmacyFormData.licenseState}
              onChange={(e) => handlePharmacyInputChange("licenseState", e.target.value)}
              className={pharmacyErrors.licenseState ? "error" : ""}
            >
              <option value="">Select state</option>
              {states.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
            {pharmacyErrors.licenseState && <span className="error-message">{pharmacyErrors.licenseState}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="npiNumber">NPI Number *</label>
            <input
              type="text"
              id="npiNumber"
              value={pharmacyFormData.npiNumber}
              onChange={(e) => handlePharmacyInputChange("npiNumber", e.target.value)}
              className={pharmacyErrors.npiNumber ? "error" : ""}
              placeholder="Enter NPI number"
            />
            {pharmacyErrors.npiNumber && <span className="error-message">{pharmacyErrors.npiNumber}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="yearsInOperation">Years in Operation *</label>
            <select
              id="yearsInOperation"
              value={pharmacyFormData.yearsInOperation}
              onChange={(e) => handlePharmacyInputChange("yearsInOperation", e.target.value)}
              className={pharmacyErrors.yearsInOperation ? "error" : ""}
            >
              <option value="">Select years</option>
              {Array.from({ length: 100 }, (_, i) => i + 1).map((year) => (
                <option key={year} value={year}>
                  {year} {year === 1 ? "year" : "years"}
                </option>
              ))}
            </select>
            {pharmacyErrors.yearsInOperation && <span className="error-message">{pharmacyErrors.yearsInOperation}</span>}
          </div>
          <div className="form-group full-width">
            <label htmlFor="address">Street Address *</label>
            <input
              type="text"
              id="address"
              value={pharmacyFormData.address}
              onChange={(e) => handlePharmacyInputChange("address", e.target.value)}
              className={pharmacyErrors.address ? "error" : ""}
              placeholder="Enter street address"
            />
            {pharmacyErrors.address && <span className="error-message">{pharmacyErrors.address}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="city">City *</label>
            <input
              type="text"
              id="city"
              value={pharmacyFormData.city}
              onChange={(e) => handlePharmacyInputChange("city", e.target.value)}
              className={pharmacyErrors.city ? "error" : ""}
              placeholder="Enter city"
            />
            {pharmacyErrors.city && <span className="error-message">{pharmacyErrors.city}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="zipCode">ZIP Code *</label>
            <input
              type="text"
              id="zipCode"
              value={pharmacyFormData.zipCode}
              onChange={(e) => handlePharmacyInputChange("zipCode", e.target.value)}
              className={pharmacyErrors.zipCode ? "error" : ""}
              placeholder="12345"
            />
            {pharmacyErrors.zipCode && <span className="error-message">{pharmacyErrors.zipCode}</span>}
          </div>
          <div className="form-group full-width">
            <label htmlFor="chainName">Chain Name *</label>
            <input
              type="text"
              id="chainName"
              value={pharmacyFormData.chainName}
              onChange={(e) => handlePharmacyInputChange("chainName", e.target.value)}
              className={pharmacyErrors.chainName ? "error" : ""}
              placeholder="Enter chain name (or 'Independent' if not part of a chain)"
            />
            {pharmacyErrors.chainName && <span className="error-message">{pharmacyErrors.chainName}</span>}
          </div>
        </div>
      </div>
    );
  };

  const renderPharmacyStep3 = () => {
    return (
      <div className="form-step">
        <div className="step-header">
          <FileCheck size={24} className="step-icon" />
          <h2>Review & Submit</h2>
          <p>Please review all information before submitting</p>
        </div>
        <div className="review-section">
          <div className="review-card">
            <div className="review-card-header">
              <Pill size={20} />
              <h3>Basic Information</h3>
            </div>
            <div className="review-content">
              <div className="review-item">
                <span className="review-label">Pharmacy Name:</span>
                <span className="review-value">{pharmacyFormData.pharmacyName}</span>
              </div>
              <div className="review-item">
                <span className="review-label">Email:</span>
                <span className="review-value">{pharmacyFormData.email}</span>
              </div>
              <div className="review-item">
                <span className="review-label">Phone:</span>
                <span className="review-value">{pharmacyFormData.phone}</span>
              </div>
              <div className="review-item">
                <span className="review-label">Pharmacy Type:</span>
                <span className="review-value">{pharmacyFormData.pharmacyType}</span>
              </div>
              <div className="review-item">
                <span className="review-label">Wallet Address:</span>
                <span className="review-value" style={{ fontFamily: "monospace", fontSize: "12px", wordBreak: "break-all" }}>
                  {pharmacyFormData.walletAddress}
                </span>
              </div>
            </div>
          </div>
          <div className="review-card">
            <div className="review-card-header">
              <Building2 size={20} />
              <h3>Professional Details</h3>
            </div>
            <div className="review-content">
              <div className="review-item">
                <span className="review-label">License Number:</span>
                <span className="review-value">{pharmacyFormData.licenseNumber}</span>
              </div>
              <div className="review-item">
                <span className="review-label">License State:</span>
                <span className="review-value">{pharmacyFormData.licenseState}</span>
              </div>
              <div className="review-item">
                <span className="review-label">NPI Number:</span>
                <span className="review-value">{pharmacyFormData.npiNumber}</span>
              </div>
              <div className="review-item">
                <span className="review-label">Address:</span>
                <span className="review-value">{pharmacyFormData.address}</span>
              </div>
              <div className="review-item">
                <span className="review-label">City:</span>
                <span className="review-value">{pharmacyFormData.city}</span>
              </div>
              <div className="review-item">
                <span className="review-label">ZIP Code:</span>
                <span className="review-value">{pharmacyFormData.zipCode}</span>
              </div>
              <div className="review-item">
                <span className="review-label">Years in Operation:</span>
                <span className="review-value">{pharmacyFormData.yearsInOperation} {pharmacyFormData.yearsInOperation === "1" ? "year" : "years"}</span>
              </div>
              <div className="review-item">
                <span className="review-label">Chain Name:</span>
                <span className="review-value">{pharmacyFormData.chainName}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
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
      onClick={handleClose}
    >
      <div
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
          <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 600, color: "#111827", fontFamily: '"Figtree", sans-serif' }}>
            Register {type === "doctor" ? "Doctor" : "Pharmacy"}
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "0.5rem",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#6b7280",
            }}
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: "2rem", overflowY: "auto", flex: 1 }}>
          {submitSuccess ? (
            <div className="success-message">
              <Check size={48} className="success-icon" />
              <h2>{type === "doctor" ? "Doctor" : "Pharmacy"} Profile Created Successfully!</h2>
              <p>The {type === "doctor" ? "doctor" : "pharmacy"} has been added to your organization.</p>
            </div>
          ) : (
            <>
              {renderStepIndicator()}
              <div className="form-container">
                {type === "doctor" && (
                  <>
                    {currentStep === 1 && renderDoctorStep1()}
                    {currentStep === 2 && renderDoctorStep2()}
                    {currentStep === 3 && renderDoctorStep3()}
                  </>
                )}
                {type === "pharmacy" && (
                  <>
                    {currentStep === 1 && renderPharmacyStep1()}
                    {currentStep === 2 && renderPharmacyStep2()}
                    {currentStep === 3 && renderPharmacyStep3()}
                  </>
                )}

                <div className="form-actions">
                  {currentStep > 1 && (
                    <button type="button" className="btn-secondary" onClick={handleBack} disabled={isSubmitting}>
                      <ArrowLeft size={18} />
                      Back
                    </button>
                  )}
                  <div className="form-actions-right">
                    {currentStep < 3 ? (
                      <button type="button" className="btn-primary" onClick={handleNext} disabled={isSubmitting}>
                        Next
                        <ArrowRight size={18} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="spinner"></span>
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Check size={18} />
                            Submit
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegistrationModal;

