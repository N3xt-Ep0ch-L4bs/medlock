import React, { useState } from "react";
import NavBar from "../components/navbar";
import FraudIcon from "../assets/fraud.png";
import PrivacyIcon from "../assets/privacy.png";
import TransferIcon from "../assets/transfer.png";
import UserVerified from "../assets/userverified.png";
import "./How.css";
import {
  Upload,
  Share2,
  Stethoscope,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface TechCard {
  title: string;
  content: string;
  list?: string[];
}

const How = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleCard = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const techCards: TechCard[] = [
    {
      title: "Sui Blockchain: The Foundation of Immutability",
      content:
        "HealthLock leverages the Sui Blockchain for its unparalleled speed, security, and scalability. Sui offers:",
      list: [
        "Transparent Transactions: Every record access request and approval are logged.",
        "Immutable History: Once recorded, an event cannot be altered.",
        "Decentralised Trust: Data integrityis maintained across a global network.",
      ],
    },
    {
      title: "Walrus Decentralized Storage: Encrypted Data Resilience",
      content:
        "Your actual medical documents are stored on Walrus, a highly resilient, decentralized storage network. This means:.",
    list: [
        "No Single Point of Failure: Your data is distributed across multiple nodes.",
        "Enhanced Privacy: data is encrypted before leaving your device.",
        "Guaranteed Availabity: Your records are always accessible to you."
    ]
    },
    {
      title: "Seal Encryption: End-to-End Data Protection",
      content:
        "Every piece of data you upload to HealthLock is secured using Seal Encryption. This is an end-to-end encryption protocol that guaratees:",
      list: [
        "Device-Side Encryption: Your data is encrypted on your device and stays encrypted.",
        "Zero-Knowledge Access: Only you (and those you explicitly grant access to) can decrypt your data.",
        "Confidentiality: HealthLock cannot view your raw medical content.",
      ]
    },
    {
      title: "Zero-Knowledge Proofs: Privacy-Preserving Verification",
      content:
        "Medlock employs Zero-Knowledege Proofs (ZKPs) to verify identities and permissions without revealing sensitive underlying information. This means:",
      list: [
        "Identity Verification without Disclosure: Prove who you are without sharing personal details.",
        "Secure Access Grants: doctors can verify patient consents without seeing unnecessary data.",
        "Enhanced Anonymity: Focuses on proving Veracity rather than revealing data."
      ]
    },
  ];

  return (
    <>
    <NavBar />
    <div className="how-page">
      <section className="how-intro">
        <h2>
          How <span>HealthLock</span> Works
        </h2>
        <p>
          Seamlessly combining patient control, transparency, and security through blockchain technology.
        </p>
      </section>

      <section className="how-steps">
        <div className="step-card">
          <Upload className="step-icon" />
          <div>
            <h4>Step 1: Patient Owns & Uploads Data</h4>
            <p>
              Patients upload their medical data, lab results, scans, and prescriptions to
              their personal HealthLock wallet — fully encrypted and controlled by them.
            </p>
          </div>
        </div>

        <div className="step-card">
          <Share2 className="step-icon" />
          <div>
            <h4>Step 2: Patient Grants & Manages Access</h4>
            <p>
              Using blockchain-based permissions, patients can securely grant and revoke
              access to healthcare providers and specialists as needed. Access is time-bound
              and traceable for transparency.
            </p>
          </div>
        </div>

        <div className="step-card">
          <Stethoscope className="step-icon" />
          <div>
            <h4>Step 3: Doctor Views Records & Prescribes</h4>
            <p>
              Doctors view verified patient data directly from the blockchain, ensuring
              accuracy and trust. Prescriptions are digitally signed and stored immutably.
            </p>
          </div>
        </div>

        <div className="step-card">
          <CheckCircle className="step-icon" />
          <div>
            <h4>Step 4: Pharmacy Verifies & Dispenses</h4>
            <p>
              Pharmacies verify prescriptions on-chain before dispensing medications.
              This confirms authenticity, prevents fraud, and ensures patient safety.
            </p>
          </div>
        </div>
      </section>

      <section className="tech-section">
        <h3>The Technology Behind Your Trust</h3>
        <div className="tech-cards">
          {techCards.map((card, index) => (
            <div
              key={index}
              className={`tech-card ${openIndex === index ? "open" : ""}`}
              onClick={() => toggleCard(index)}
            >
              <div className="tech-header">
                <h4>{card.title}</h4>
                {openIndex === index ? (
                  <ChevronUp className="chevron" />
                ) : (
                  <ChevronDown className="chevron" />
                )}
              </div>
              <div
                className="tech-content"
                style={{
                  maxHeight: openIndex === index ? "300px" : "0px",
                }}
              >
                <p>{card.content}</p>
                {card.list && (
                  <ul>
                    {card.list.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="benefits">
        <h3>Key Benefits of HealthLock</h3>
        <div className="benefit-cards">
          <div className="benefit-card">
            <img src={PrivacyIcon} />
            <h4>Unshakeable Privacy</h4>
            <p>
              Patient data never leaves your control. Each transaction is encrypted,
              auditable, and owned by you.
            </p>
          </div>

          <div className="benefit-card">
            <img src={FraudIcon} />
            <h4>Fraud Prevention</h4>
            <p>
              Immutable blockchain records make it impossible for prescriptions or
              medical documents to be forged or tampered with.
            </p>
          </div>

          <div className="benefit-card">
            <img src={TransferIcon} />
            <h4>Seamless Coordination</h4>
            <p>
              Healthcare providers, labs, and pharmacies can securely collaborate without
              compromising privacy or data integrity.
            </p>
          </div>
          
          <div className="benefit-card">
            <img src={UserVerified} />
            <h4>Patient Empowerment</h4>
            <p>
             Gain complete ownership and over your health data, making informed decisions
             about your care journey.
            </p>
          </div>
        </div>
      </section>
    </div>
    </>
  );
};

export default How;

